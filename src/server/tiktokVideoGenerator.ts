import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import QRCode from 'qrcode';
import {
  OFFICIAL_TIKTOK_DISPLAY,
  type SequentialKhatmahBatch,
} from '../utils/tiktokKhatmahPlanner.ts';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_IMAGES_DIR = path.resolve(__dirname, '../assets/images');

const BACKGROUND_IMAGE_FILES = [
  'bg_starry_night_mosque_1793212154514.jpg',
  'bg_misty_pine_dawn_1793212156595.jpg',
  'bg_twilight_desert_dunes_1793212157728.jpg',
  'bg_calm_ocean_horizon_1793212159201.jpg',
  'bg_emerald_rain_leaves_1793212159500.jpg',
];

let fontsRegistered = false;

function ensureArabicFontsRegistered() {
  if (fontsRegistered) return;
  const fontCandidates: Array<{ file: string; family: string }> = [
    {
      file: '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf',
      family: 'QuranNaskhBold',
    },
    {
      file: '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',
      family: 'QuranNaskh',
    },
    {
      file: '/usr/share/fonts/truetype/noto/NotoKufiArabic-Bold.ttf',
      family: 'QuranKufiBold',
    },
    {
      file: '/usr/share/fonts/truetype/noto/NotoKufiArabic-Regular.ttf',
      family: 'QuranKufi',
    },
  ];

  for (const candidate of fontCandidates) {
    try {
      GlobalFonts.registerFromPath(candidate.file, candidate.family);
    } catch {
      // Fallback system font will still render if path differs
    }
  }
  fontsRegistered = true;
}

function toArabicIndicNumerals(num: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0) - 48;
      return code >= 0 && code <= 9 ? digits[code] : ch;
    })
    .join('');
}

async function fetchAyahTextsUthmani(
  surahId: number,
  fromAyah: number,
  toAyah: number
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const count = toAyah - fromAyah + 1;
  const offset = fromAyah - 1;
  const url = `https://api.alquran.cloud/v1/surah/${surahId}/quran-uthmani?offset=${offset}&limit=${count}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'QuranReels-TikTokPublisher/1.0' },
  });
  if (!res.ok) {
    throw new Error(`فشل جلب النص القرآني العثماني (HTTP ${res.status})`);
  }

  const json = (await res.json()) as {
    data?: {
      ayahs?: Array<{ numberInSurah: number; text: string }>;
    };
  };

  const ayahs = json.data?.ayahs || [];
  for (const item of ayahs) {
    let cleanText = (item.text || '').trim();
    // Strip leading Bismillah on ayah 1 for Surahs other than Al-Fatihah (1) and At-Tawbah (9)
    if (surahId !== 1 && surahId !== 9 && item.numberInSurah === 1) {
      const bismillahVariants = [
        'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      ];
      for (const b of bismillahVariants) {
        if (cleanText.startsWith(b) && cleanText.length > b.length + 3) {
          cleanText = cleanText.slice(b.length).trim();
          break;
        }
      }
    }
    map.set(item.numberInSurah, cleanText);
  }

  return map;
}

async function downloadAyahAudioWithFallback(
  everyAyahFolder: string,
  surahId: number,
  ayahNum: number,
  destPath: string
): Promise<void> {
  const pad3 = (n: number) => String(n).padStart(3, '0');
  const fileCode = `${pad3(surahId)}${pad3(ayahNum)}.mp3`;
  const foldersToTry = [everyAyahFolder, 'Alafasy_128kbps'];

  let lastErr: unknown = null;
  for (const folder of foldersToTry) {
    try {
      const audioUrl = `https://everyayah.com/data/${folder}/${fileCode}`;
      const res = await fetch(audioUrl, {
        headers: { 'User-Agent': 'QuranReels-TikTokPublisher/1.0' },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${audioUrl}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 512) {
        throw new Error('Audio buffer unexpectedly small');
      }
      await fs.writeFile(destPath, buf);
      return;
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(
    `تعذر تحميل الملف الصوتي للآية ${ayahNum} من سورة رقم ${surahId}: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`
  );
}

async function probeAudioDurationSec(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    const parsed = parseFloat(stdout.trim());
    if (Number.isFinite(parsed) && parsed > 0.2) {
      return parsed;
    }
  } catch {
    // Fallback estimate
  }
  return 5.0;
}

function wrapArabicLines(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const testLine = current ? `${current} ${word}` : word;
    const width = ctx.measureText(testLine).width;
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = testLine;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

function drawRoundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function renderVerticalSlidePng(options: {
  width: number;
  height: number;
  bgImagePath: string | null;
  batch: SequentialKhatmahBatch;
  ayahNumber: number;
  ayahText: string;
  ayahIndexInBatch: number;
  qrDataUrl: string | null;
  sadaqahLabel: string;
}): Promise<Buffer> {
  ensureArabicFontsRegistered();
  const { width, height, batch, ayahNumber, ayahText, ayahIndexInBatch, qrDataUrl } =
    options;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Background image or deep atmospheric gradient
  let drewBg = false;
  if (options.bgImagePath) {
    try {
      const img = await loadImage(options.bgImagePath);
      const scale = Math.max(width / img.width, height / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      drewBg = true;
    } catch {
      drewBg = false;
    }
  }

  if (!drewBg) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#060B16');
    grad.addColorStop(0.5, '#0D1C2E');
    grad.addColorStop(1, '#071318');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Contemplative dark dimming + vignette for crisp Quranic contrast
  const overlayGrad = ctx.createLinearGradient(0, 0, 0, height);
  overlayGrad.addColorStop(0, 'rgba(6, 10, 18, 0.76)');
  overlayGrad.addColorStop(0.45, 'rgba(7, 12, 20, 0.62)');
  overlayGrad.addColorStop(1, 'rgba(5, 9, 15, 0.86)');
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle top ornamental glow
  const glow = ctx.createRadialGradient(
    width / 2,
    height * 0.46,
    30,
    width / 2,
    height * 0.46,
    width * 0.65
  );
  glow.addColorStop(0, 'rgba(243, 207, 122, 0.10)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Set RTL direction if supported
  try {
    (ctx as unknown as { direction: string }).direction = 'rtl';
  } catch {
    // Ignore if unavailable
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 3. Top Header: Surah Name + Ayah Range + Khatmah Cycle
  const topY = 112;
  ctx.font = 'bold 30px QuranKufiBold, sans-serif';
  ctx.fillStyle = '#F3CF7A';
  ctx.fillText(`سورة ${batch.surahNameArabic}`, width / 2, topY);

  const rangeText =
    batch.fromAyah === batch.toAyah
      ? `الآية ${toArabicIndicNumerals(batch.fromAyah)}`
      : `الآيات ${toArabicIndicNumerals(batch.fromAyah)} – ${toArabicIndicNumerals(
          batch.toAyah
        )}`;

  ctx.font = '20px QuranKufi, sans-serif';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
  ctx.fillText(
    `${rangeText}  ·  الختمة المتسلسلة (${toArabicIndicNumerals(batch.khatmahCycle)})`,
    width / 2,
    topY + 44
  );

  // Subtle hairline separator under header
  ctx.strokeStyle = 'rgba(243, 207, 122, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width * 0.28, topY + 76);
  ctx.lineTo(width * 0.72, topY + 76);
  ctx.stroke();

  // 4. Center Uthmani Verse with Soft Golden Glow
  const fullAyahWithMarker = `${ayahText} ﴿${toArabicIndicNumerals(ayahNumber)}﴾`;
  const maxTextWidth = width - 116;

  // Dynamically size font so long ayahs (like 2:282) fit cleanly inside 9:16 frame
  let fontSize = 44;
  let lines: string[] = [];
  let lineHeight = 78;

  while (fontSize >= 22) {
    ctx.font = `bold ${fontSize}px QuranNaskhBold, serif`;
    lines = wrapArabicLines(ctx, fullAyahWithMarker, maxTextWidth);
    lineHeight = Math.round(fontSize * 1.78);
    if (lines.length * lineHeight <= 660) {
      break;
    }
    fontSize -= 2;
  }

  const totalTextBlockHeight = lines.length * lineHeight;
  const centerRegionY = height * 0.49;
  const startY = centerRegionY - totalTextBlockHeight / 2 + lineHeight / 2;

  // Soft golden glow pass
  ctx.save();
  ctx.shadowColor = 'rgba(243, 207, 122, 0.55)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#FFFDF7';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], width / 2, startY + i * lineHeight);
  }
  ctx.restore();

  // Crisp foreground text pass
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], width / 2, startY + i * lineHeight);
  }

  // 5. Batch Progress Indicator Bar
  const progressFraction = Math.min(
    1,
    Math.max(0.08, (ayahIndexInBatch + 1) / Math.max(1, batch.ayahCount))
  );
  const barW = 280;
  const barH = 4;
  const barX = (width - barW) / 2;
  const barY = height - 252;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  drawRoundedRect(ctx, barX, barY, barW, barH, 2);
  ctx.fill();

  ctx.fillStyle = '#34D399';
  drawRoundedRect(ctx, barX + barW * (1 - progressFraction), barY, barW * progressFraction, barH, 2);
  ctx.fill();

  // 6. Footer Attribution (Reciter + Channel Handle + Sadaqah)
  const footerCenterX = qrDataUrl ? width * 0.43 : width / 2;
  ctx.font = 'bold 22px QuranKufiBold, sans-serif';
  ctx.fillStyle = '#F3CF7A';
  ctx.fillText(`القارئ: ${batch.reciter.nameArabic}`, footerCenterX, height - 195);

  ctx.font = '18px QuranKufi, sans-serif';
  ctx.fillStyle = '#34D399';
  ctx.fillText(OFFICIAL_TIKTOK_DISPLAY, footerCenterX, height - 156);

  ctx.font = '16px QuranKufi, sans-serif';
  ctx.fillStyle = 'rgba(203, 213, 225, 0.82)';
  ctx.fillText(options.sadaqahLabel, footerCenterX, height - 118);

  // 7. Bottom-Right QR Code Badge (matching StudioWorkspace right-side QR feature)
  if (qrDataUrl) {
    try {
      const qrImg = await loadImage(qrDataUrl);
      const qrBoxSize = 98;
      const qrX = width - qrBoxSize - 38;
      const qrY = height - qrBoxSize - 104;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      drawRoundedRect(ctx, qrX - 6, qrY - 6, qrBoxSize + 12, qrBoxSize + 12, 12);
      ctx.fill();

      ctx.drawImage(qrImg, qrX, qrY, qrBoxSize, qrBoxSize);
    } catch {
      // Ignore QR draw failure
    }
  }

  return canvas.toBuffer('image/png');
}

export interface GeneratedTikTokVideoResult {
  mp4Buffer: Buffer;
  durationSec: number;
  fileName: string;
}

export async function generateSequentialKhatmahMp4(options: {
  batch: SequentialKhatmahBatch;
  appBaseUrl: string;
  sadaqahLabel?: string;
}): Promise<GeneratedTikTokVideoResult> {
  const { batch } = options;
  const sadaqahLabel =
    options.sadaqahLabel?.trim() || 'صدقة جارية عن عائلة فاروق جبل';

  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `quran-tiktok-s${batch.surahId}-a${batch.fromAyah}-`)
  );

  try {
    // 1. Fetch Uthmani verses for [fromAyah..toAyah]
    const versesMap = await fetchAyahTextsUthmani(
      batch.surahId,
      batch.fromAyah,
      batch.toAyah
    );

    // 2. Pick a serene background image deterministically per Surah
    const bgFileName =
      BACKGROUND_IMAGE_FILES[(batch.surahId - 1) % BACKGROUND_IMAGE_FILES.length];
    const candidateBgPath = path.join(ASSETS_IMAGES_DIR, bgFileName);
    let bgImagePath: string | null = candidateBgPath;
    try {
      await fs.access(candidateBgPath);
    } catch {
      bgImagePath = null;
    }

    // 3. Build share QR code pointing to this exact Surah & 10-ayah range on the platform
    let qrDataUrl: string | null = null;
    try {
      const cleanBase = (options.appBaseUrl || 'https://www.tiktok.com/@superboda0').replace(
        /\/$/,
        ''
      );
      const shareUrl = `${cleanBase}/?surah=${batch.surahId}&from=${batch.fromAyah}&to=${batch.toAyah}&reciter=${batch.reciter.id}`;
      qrDataUrl = await QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#0B0F14', light: '#FFFFFF' },
      });
    } catch {
      qrDataUrl = null;
    }

    // 4. For each ayah in batch, download audio + render slide PNG + create segment MP4
    const segmentPaths: string[] = [];
    let totalDurationSec = 0;

    for (let idx = 0; idx < batch.ayahCount; idx++) {
      const ayahNum = batch.fromAyah + idx;
      const ayahText = versesMap.get(ayahNum) || '';
      const audioPath = path.join(tmpDir, `ayah_${idx}.mp3`);
      const slidePath = path.join(tmpDir, `slide_${idx}.png`);
      const segMp4Path = path.join(tmpDir, `seg_${idx}.mp4`);

      await downloadAyahAudioWithFallback(
        batch.reciter.everyAyahFolder,
        batch.surahId,
        ayahNum,
        audioPath
      );

      const durationSec = await probeAudioDurationSec(audioPath);
      totalDurationSec += durationSec;

      const pngBuffer = await renderVerticalSlidePng({
        width: 720,
        height: 1280,
        bgImagePath,
        batch,
        ayahNumber: ayahNum,
        ayahText,
        ayahIndexInBatch: idx,
        qrDataUrl,
        sadaqahLabel,
      });

      await fs.writeFile(slidePath, pngBuffer);

      // Encode individual ayah segment cleanly (720x1280 24fps H.264 + 44.1kHz stereo AAC)
      await execFileAsync(
        'ffmpeg',
        [
          '-y',
          '-loop',
          '1',
          '-framerate',
          '24',
          '-i',
          slidePath,
          '-i',
          audioPath,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-tune',
          'stillimage',
          '-pix_fmt',
          'yuv420p',
          '-vf',
          'scale=720:1280',
          '-c:a',
          'aac',
          '-ar',
          '44100',
          '-ac',
          '2',
          '-b:a',
          '128k',
          '-shortest',
          segMp4Path,
        ],
        { timeout: 120000 }
      );

      segmentPaths.push(segMp4Path);
    }

    // 5. Concatenate all ayah segments into a single seamless vertical MP4
    const concatListPath = path.join(tmpDir, 'concat_list.txt');
    const concatBody = segmentPaths
      .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
      .join('\n');
    await fs.writeFile(concatListPath, concatBody, 'utf8');

    const finalMp4Path = path.join(tmpDir, 'final_reel.mp4');
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        concatListPath,
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        finalMp4Path,
      ],
      { timeout: 120000 }
    );

    const mp4Buffer = await fs.readFile(finalMp4Path);
    const fileName = `quran-khatmah-c${batch.khatmahCycle}-s${String(
      batch.surahId
    ).padStart(3, '0')}-${batch.fromAyah}-${batch.toAyah}-${batch.reciter.id}.mp4`;

    return {
      mp4Buffer,
      durationSec: Math.max(1, Math.round(totalDurationSec)),
      fileName,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
