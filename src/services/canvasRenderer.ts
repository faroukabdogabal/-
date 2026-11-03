import QRCode from 'qrcode';
import { BACKGROUNDS, QURAN_FONTS, TRANSLATIONS } from '../data/quranCatalog';
import {
  ExportResolution,
  ParticleEffect,
  PreparedReelData,
  ReelChunk,
  StudioSettings,
  VideoAspectRatio,
  WordRevealMode,
  WordTiming,
} from '../types/quran';

interface CachedQrMatrix {
  size: number;
  data: Uint8Array;
}

const qrMatrixCache = new Map<string, CachedQrMatrix>();

function getOrCreateQrMatrix(url: string): CachedQrMatrix | null {
  const cleanUrl = url.trim();
  if (!cleanUrl) return null;
  const cached = qrMatrixCache.get(cleanUrl);
  if (cached) return cached;

  try {
    const createFn =
      QRCode.create ||
      (QRCode as unknown as { default?: { create?: typeof QRCode.create } }).default?.create;
    if (!createFn) return null;
    const qr = createFn(cleanUrl, { errorCorrectionLevel: 'L' });
    const entry: CachedQrMatrix = {
      size: qr.modules.size,
      data: qr.modules.data,
    };
    if (qrMatrixCache.size >= 32) {
      const oldestKey = qrMatrixCache.keys().next().value;
      if (oldestKey) qrMatrixCache.delete(oldestKey);
    }
    qrMatrixCache.set(cleanUrl, entry);
    return entry;
  } catch {
    return null;
  }
}

export function resolveStudioQrUrl(settings: StudioSettings): string {
  if (typeof window === 'undefined') {
    return 'https://quran-reels.app';
  }
  const basePage =
    (window.location.origin + window.location.pathname).replace(/\/+$/, '') ||
    window.location.origin;

  if (settings.qrCodeLinkMode === 'reel') {
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set('surah', String(settings.surahId));
    u.searchParams.set('from', String(settings.fromAyah));
    u.searchParams.set('to', String(settings.toAyah));
    u.searchParams.set('reciter', settings.reciterId);
    return u.toString();
  }

  return basePage;
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function getQrBadgeMetrics(settings: StudioSettings, baseUnit: number) {
  const url = resolveStudioQrUrl(settings);
  const matrix = getOrCreateQrMatrix(url);
  if (!matrix) return null;

  const quietModules = 2;
  const totalModules = matrix.size + quietModules * 2;
  // Crisp integer module pixel size so every QR module stays razor-sharp in H.264 MP4
  const targetQrPx = Math.round(72 * baseUnit);
  const modulePx = Math.max(2, Math.round(targetQrPx / totalModules));
  const qrBoxPx = totalModules * modulePx;
  const padPx = Math.max(4, Math.round(5 * baseUnit));
  const labelHeightPx = Math.max(13, Math.round(15 * baseUnit));
  const cardW = qrBoxPx + padPx * 2;
  const cardH = qrBoxPx + padPx * 2 + labelHeightPx;

  return {
    matrix,
    quietModules,
    modulePx,
    qrBoxPx,
    padPx,
    labelHeightPx,
    cardW,
    cardH,
  };
}

function drawRightSidePageQrBadge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseUnit: number,
  settings: StudioSettings
) {
  const metrics = getQrBadgeMetrics(settings, baseUnit);
  if (!metrics) return;

  const { matrix, quietModules, modulePx, qrBoxPx, padPx, cardW, cardH } = metrics;
  const rightMargin = Math.round(16 * baseUnit);
  const cardX = w - rightMargin - cardW;

  let cardY = h - Math.round(20 * baseUnit) - cardH;
  if (settings.qrCodePosition === 'top-right') {
    cardY = Math.round(20 * baseUnit);
  } else if (settings.qrCodePosition === 'middle-right') {
    cardY = Math.round(h * 0.5 - cardH * 0.5);
  }

  ctx.save();

  // Subtle dark slate badge frame with warm gold hairline border
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = Math.round(10 * baseUnit);
  ctx.fillStyle = 'rgba(8, 13, 21, 0.84)';
  fillRoundedRect(ctx, cardX, cardY, cardW, cardH, Math.round(9 * baseUnit));
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(243, 207, 122, 0.42)';
  ctx.lineWidth = Math.max(1, 1.1 * baseUnit);
  fillRoundedRect(ctx, cardX, cardY, cardW, cardH, Math.round(9 * baseUnit));
  ctx.stroke();

  // Pure white quiet-zone square for reliable phone camera scanning
  const qrX = cardX + padPx;
  const qrY = cardY + padPx;
  ctx.fillStyle = '#FFFFFF';
  fillRoundedRect(ctx, qrX, qrY, qrBoxPx, qrBoxPx, Math.round(5 * baseUnit));
  ctx.fill();

  // Crisp integer-aligned dark QR modules
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#070B12';
  const modulesStartX = qrX + quietModules * modulePx;
  const modulesStartY = qrY + quietModules * modulePx;

  for (let row = 0; row < matrix.size; row++) {
    const rowOffset = row * matrix.size;
    const py = modulesStartY + row * modulePx;
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.data[rowOffset + col]) {
        ctx.fillRect(modulesStartX + col * modulePx, py, modulePx, modulePx);
      }
    }
  }

  // Compact Arabic micro-label underneath QR square
  const captionPx = Math.max(9, Math.round(10.5 * baseUnit));
  ctx.font = `600 ${captionPx}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(243, 207, 122, 0.95)';
  const captionY = qrY + qrBoxPx + (cardH - padPx - qrBoxPx) * 0.52;
  ctx.fillText(
    settings.qrCodeLinkMode === 'reel' ? 'امسح للمقطع' : 'امسح للصفحة',
    cardX + cardW * 0.5,
    captionY
  );

  ctx.restore();
}

export interface RenderDimensions {
  width: number;
  height: number;
}

export function getTargetDimensions(
  aspectRatio: VideoAspectRatio,
  _resolution: ExportResolution = ExportResolution.HD720
): RenderDimensions {
  switch (aspectRatio) {
    case VideoAspectRatio.Square1x1:
      return { width: 720, height: 720 };
    case VideoAspectRatio.Landscape16x9:
      return { width: 1280, height: 720 };
    case VideoAspectRatio.Vertical9x16:
    default:
      return { width: 720, height: 1280 };
  }
}

export interface LoadedVisualAssets {
  bgImage: HTMLImageElement | null;
  customVideo: HTMLVideoElement | null;
}

function drawCoverSource(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement | HTMLVideoElement,
  srcW: number,
  srcH: number,
  destW: number,
  destH: number,
  scaleFactor = 1.0,
  panX = 0,
  panY = 0
) {
  if (!srcW || !srcH) return;
  const srcRatio = srcW / srcH;
  const destRatio = destW / destH;

  let drawW = destW;
  let drawH = destH;
  if (srcRatio > destRatio) {
    drawH = destH;
    drawW = destH * srcRatio;
  } else {
    drawW = destW;
    drawH = destW / srcRatio;
  }

  drawW *= scaleFactor;
  drawH *= scaleFactor;

  const x = (destW - drawW) / 2 + panX;
  const y = (destH - drawH) / 2 + panY;

  ctx.drawImage(source, x, y, drawW, drawH);
}

function drawProceduralBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number,
  variant: 'stars' | 'dawn' | 'noor',
  colors: [string, string, string]
) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.55, colors[1]);
  grad.addColorStop(1, colors[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  if (variant === 'stars') {
    const aura = ctx.createRadialGradient(
      w * 0.5 + Math.sin(timeSec * 0.25) * w * 0.08,
      h * 0.35,
      w * 0.05,
      w * 0.5,
      h * 0.4,
      w * 0.75
    );
    aura.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
    aura.addColorStop(0.5, 'rgba(16, 185, 129, 0.05)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 85; i++) {
      const seed = (i * 9301 + 49297) % 233280;
      const rx = ((seed * 31) % 1000) / 1000;
      const ry = ((seed * 73) % 1000) / 1000;
      const twinkle =
        0.25 + 0.65 * (0.5 + 0.5 * Math.sin(timeSec * (1.1 + (i % 5) * 0.35) + i));
      const radius = (1 + (i % 3) * 0.7) * (w / 720);

      ctx.beginPath();
      ctx.arc(rx * w, ry * h * 0.85, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(248, 250, 252, ${twinkle.toFixed(3)})`;
      ctx.fill();
    }
  } else if (variant === 'dawn') {
    for (let layer = 0; layer < 3; layer++) {
      const yCenter = h * (0.62 + layer * 0.11);
      const glow = ctx.createRadialGradient(
        w * (0.5 + 0.12 * Math.sin(timeSec * 0.2 + layer)),
        yCenter,
        w * 0.05,
        w * 0.5,
        yCenter,
        w * 0.85
      );
      glow.addColorStop(0, `rgba(243, 207, 122, ${0.12 - layer * 0.03})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    const cx = w * 0.5;
    const cy = h * 0.45;
    const glow = ctx.createRadialGradient(cx, cy, w * 0.04, cx, cy, w * 0.72);
    glow.addColorStop(0, 'rgba(52, 211, 153, 0.13)');
    glow.addColorStop(0.6, 'rgba(243, 207, 122, 0.05)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(243, 207, 122, 0.08)';
    ctx.lineWidth = Math.max(1, 1.3 * (w / 720));
    for (let r = 1; r <= 3; r++) {
      const rad = w * (0.22 + r * 0.09) + Math.sin(timeSec * 0.4 + r) * 5;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number,
  effect: ParticleEffect
) {
  if (effect === ParticleEffect.None) return;
  ctx.save();

  const scale = w / 720;
  if (effect === ParticleEffect.Dust) {
    for (let i = 0; i < 34; i++) {
      const seedX = ((i * 7919) % 997) / 997;
      const seedY = ((i * 6151) % 991) / 991;
      const speedY = 0.018 + (i % 5) * 0.006;
      const x = ((seedX + Math.sin(timeSec * 0.45 + i) * 0.03 + 1) % 1) * w;
      const y = ((seedY - timeSec * speedY + 100) % 1) * h;
      const alpha = 0.14 + 0.24 * (0.5 + 0.5 * Math.sin(timeSec * 1.4 + i * 2));
      const r = (1.3 + (i % 3) * 0.9) * scale;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(243, 207, 122, ${alpha.toFixed(3)})`;
      ctx.fill();
    }
  } else if (effect === ParticleEffect.Rain) {
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.18)';
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    for (let i = 0; i < 44; i++) {
      const seedX = ((i * 4999) % 983) / 983;
      const seedY = ((i * 3571) % 977) / 977;
      const speed = 0.48 + (i % 4) * 0.12;
      const x = ((seedX - timeSec * 0.04 + 100) % 1) * w;
      const y = ((seedY + timeSec * speed) % 1) * h;
      const len = (18 + (i % 4) * 7) * scale;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2.5 * scale, y + len);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function layoutArabicWordLines(
  ctx: CanvasRenderingContext2D,
  words: WordTiming[],
  maxWidth: number
): WordTiming[][] {
  const lines: WordTiming[][] = [];
  let currentLine: WordTiming[] = [];
  let currentWidth = 0;
  const spaceWidth = ctx.measureText(' ').width * 1.38;

  for (const w of words) {
    const wordW = ctx.measureText(w.text).width;
    const projected = currentLine.length === 0 ? wordW : currentWidth + spaceWidth + wordW;

    if (currentLine.length > 0 && projected > maxWidth) {
      lines.push(currentLine);
      currentLine = [w];
      currentWidth = wordW;
    } else {
      currentLine.push(w);
      currentWidth = projected;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  return lines;
}

function wrapPlainTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const lines: string[] = [];
  let current = tokens[0];

  for (let i = 1; i < tokens.length; i++) {
    const test = `${current} ${tokens[i]}`;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = tokens[i];
    } else {
      current = test;
    }
  }
  lines.push(current);
  return lines;
}

function findActiveChunk(chunks: ReelChunk[], timeSec: number): ReelChunk | null {
  if (chunks.length === 0) return null;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (timeSec >= c.startSec && timeSec < c.endSec) {
      return c;
    }
  }
  if (timeSec < chunks[0].startSec) return chunks[0];
  return chunks[chunks.length - 1];
}

export function renderReelFrame(params: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timeSec: number;
  settings: StudioSettings;
  reelData: PreparedReelData | null;
  visuals: LoadedVisualAssets;
  isIdlePreview?: boolean;
  isReadingMode?: boolean;
  readingFontBoost?: number;
}) {
  const {
    ctx,
    width: w,
    height: h,
    timeSec,
    settings,
    reelData,
    visuals,
    isIdlePreview = false,
    isReadingMode = false,
    readingFontBoost = 1.35,
  } = params;
  const baseUnit = Math.min(w, h) / 720;

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // 1. Background Layer
  const bgPreset = BACKGROUNDS.find((b) => b.id === settings.backgroundId) || BACKGROUNDS[0];
  const totalDur = reelData?.totalDurationSec || 18;
  const progressRatio = Math.max(0, Math.min(1, timeSec / Math.max(totalDur, 1)));
  const kenBurnsScale = settings.kenBurnsMotion ? 1.0 + progressRatio * 0.075 : 1.0;
  const kenBurnsPanX = settings.kenBurnsMotion ? Math.sin(timeSec * 0.15) * (8 * baseUnit) : 0;

  if (
    settings.customBgType === 'video' &&
    visuals.customVideo &&
    visuals.customVideo.videoWidth > 0
  ) {
    drawCoverSource(
      ctx,
      visuals.customVideo,
      visuals.customVideo.videoWidth,
      visuals.customVideo.videoHeight,
      w,
      h,
      1.0
    );
  } else if (
    (settings.customBgType === 'image' || bgPreset.category === 'photo') &&
    visuals.bgImage &&
    visuals.bgImage.naturalWidth > 0
  ) {
    drawCoverSource(
      ctx,
      visuals.bgImage,
      visuals.bgImage.naturalWidth,
      visuals.bgImage.naturalHeight,
      w,
      h,
      kenBurnsScale,
      kenBurnsPanX,
      0
    );
  } else {
    drawProceduralBackground(
      ctx,
      w,
      h,
      timeSec,
      bgPreset.animatedVariant || 'stars',
      bgPreset.fallbackGradient
    );
  }

  // 2. Contrast Scrim & Soft Radial Vignette (slightly calmer, deeper contrast in Reading Mode)
  const effectiveDimming = isReadingMode
    ? Math.max(settings.dimming, 0.65)
    : settings.dimming;
  ctx.fillStyle = `rgba(6, 10, 16, ${effectiveDimming.toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);

  const vignette = ctx.createRadialGradient(
    w * 0.5,
    h * 0.5,
    Math.min(w, h) * 0.25,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.72
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(3, 6, 12, 0.52)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // 3. Ambient Particles
  drawParticles(ctx, w, h, timeSec, settings.particleEffect);

  if (!reelData) {
    if (settings.showPageQrCode && !isReadingMode) {
      drawRightSidePageQrBadge(ctx, w, h, baseUnit, settings);
    }
    ctx.restore();
    return;
  }

  const qrMetrics =
    settings.showPageQrCode && !isReadingMode
      ? getQrBadgeMetrics(settings, baseUnit)
      : null;

  const fontChoice = QURAN_FONTS.find((f) => f.id === settings.fontId) || QURAN_FONTS[0];
  const translationMeta =
    TRANSLATIONS.find((t) => t.id === settings.translationId) || TRANSLATIONS[0];

  // 4. Top Surah Title Header
  if (settings.showSurahHeader) {
    const headerY = isReadingMode ? h * 0.095 : h * 0.125;
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const headerFontPx = Math.round(28 * baseUnit);
    ctx.font = `700 ${headerFontPx}px ${fontChoice.fontFamily}`;
    ctx.fillStyle = 'rgba(243, 207, 122, 0.94)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 8 * baseUnit;

    const surahTitle = `سُورَةُ ${reelData.surah.nameArabic}`;
    ctx.fillText(surahTitle, w * 0.5, headerY);

    const lineHalfW = 50 * baseUnit;
    const lineY = headerY + 23 * baseUnit;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(243, 207, 122, 0.32)';
    ctx.lineWidth = Math.max(1, 1.2 * baseUnit);
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - lineHalfW, lineY);
    ctx.lineTo(w * 0.5 + lineHalfW, lineY);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Active Quranic Verse & Synchronized Word-by-Word Writing
  const activeChunk = findActiveChunk(reelData.chunks, timeSec);
  if (activeChunk) {
    ctx.save();

    const middleRightClearance =
      qrMetrics && settings.qrCodePosition === 'middle-right'
        ? qrMetrics.cardW + 24 * baseUnit
        : 0;
    const verseCenterX =
      middleRightClearance > 0 ? (w - middleRightClearance) * 0.5 + 8 * baseUnit : w * 0.5;
    const maxTextWidth = isReadingMode
      ? w * 0.89
      : middleRightClearance > 0
      ? Math.max(w * 0.58, w - middleRightClearance - 42 * baseUnit)
      : w * 0.85;
    const maxTransWidth = isReadingMode
      ? w * 0.86
      : middleRightClearance > 0
      ? Math.max(w * 0.56, w - middleRightClearance - 48 * baseUnit)
      : w * 0.82;

    const wordCount = activeChunk.words.length;
    const autoSizeFactor =
      wordCount > 24 ? 0.72 : wordCount > 16 ? 0.84 : wordCount > 10 ? 0.94 : 1.06;
    const effectiveFontMultiplier =
      settings.arabicFontSize * (isReadingMode ? readingFontBoost : 1);

    const transPx = Math.round(
      21 * baseUnit * settings.translationFontSize * (isReadingMode ? 1.12 : 1)
    );
    const transLineHeight = transPx * 1.52;
    const hasTranslation = Boolean(
      translationMeta.quranComTranslationId && activeChunk.translationText
    );

    let fullTransLines: string[] = [];
    if (hasTranslation) {
      ctx.save();
      ctx.font = `500 ${transPx}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
      fullTransLines = wrapPlainTextLines(
        ctx,
        activeChunk.translationText,
        maxTransWidth
      );
      ctx.restore();
    }

    const transBlockH =
      fullTransLines.length > 0
        ? 24 * baseUnit + fullTransLines.length * transLineHeight
        : 0;

    let arabicPx = Math.round(44 * baseUnit * autoSizeFactor * effectiveFontMultiplier);
    let arabicLineHeight = arabicPx * (isReadingMode ? 1.78 : 1.88);
    ctx.font = `400 ${arabicPx}px ${fontChoice.fontFamily}`;
    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';

    let wordLines = layoutArabicWordLines(ctx, activeChunk.words, maxTextWidth);

    // Safe vertical fit guard so enlarged Reading Mode text never collides with header or footer
    const maxSafeCenterH = h * (isReadingMode ? 0.73 : 0.66);
    let fitPass = 0;
    while (
      wordLines.length * arabicLineHeight + transBlockH > maxSafeCenterH &&
      arabicPx > Math.round(25 * baseUnit) &&
      fitPass < 5
    ) {
      arabicPx = Math.max(Math.round(25 * baseUnit), Math.floor(arabicPx * 0.9));
      arabicLineHeight = arabicPx * (isReadingMode ? 1.76 : 1.88);
      ctx.font = `400 ${arabicPx}px ${fontChoice.fontFamily}`;
      wordLines = layoutArabicWordLines(ctx, activeChunk.words, maxTextWidth);
      fitPass++;
    }

    // Prepare translation text (revealed progressively in Progressive mode outside Reading Mode)
    let transLines: string[] = [];

    if (hasTranslation) {
      let visibleTranslation = activeChunk.translationText;

      if (
        settings.wordRevealMode === WordRevealMode.Progressive &&
        !isIdlePreview &&
        !isReadingMode
      ) {
        const spokenWordsOnly = activeChunk.words.filter((wd) => !wd.isEndMarker);
        const revealedSpokenCount = spokenWordsOnly.filter(
          (wd) => timeSec >= wd.startSec - 0.05
        ).length;

        const allTransTokens = activeChunk.translationText.trim().split(/\s+/).filter(Boolean);
        if (revealedSpokenCount === 0) {
          visibleTranslation = '';
        } else if (spokenWordsOnly.length > 0 && revealedSpokenCount < spokenWordsOnly.length) {
          const targetTokens = Math.max(
            1,
            Math.ceil((revealedSpokenCount / spokenWordsOnly.length) * allTransTokens.length)
          );
          visibleTranslation = allTransTokens.slice(0, targetTokens).join(' ');
        }
      }

      if (visibleTranslation) {
        ctx.save();
        ctx.font = `500 ${transPx}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
        transLines = wrapPlainTextLines(
          ctx,
          visibleTranslation,
          maxTransWidth
        );
        ctx.restore();

        const arabicBlockH = wordLines.length * arabicLineHeight;
        const totalCenterH = arabicBlockH + transBlockH;
        const startY = h * 0.5 - totalCenterH * 0.5 + arabicLineHeight * 0.5;

        drawArabicWordLines({
          ctx,
          w,
          centerX: verseCenterX,
          wordLines,
          startY,
          arabicPx,
          arabicLineHeight,
          fontFamily: fontChoice.fontFamily,
          timeSec,
          settings,
          baseUnit,
          isIdlePreview,
          isReadingMode,
        });

        const transStartY = startY + arabicBlockH - arabicLineHeight * 0.5 + 32 * baseUnit;
        ctx.save();
        ctx.font = `500 ${transPx}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.direction = translationMeta.dir;
        ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.82)';
        ctx.shadowBlur = 8 * baseUnit;

        transLines.forEach((tLine, tIdx) => {
          ctx.fillText(tLine, verseCenterX, transStartY + tIdx * transLineHeight);
        });
        ctx.restore();
      } else {
        const arabicBlockH = wordLines.length * arabicLineHeight;
        const totalCenterH = arabicBlockH + transBlockH;
        const startY = h * 0.5 - totalCenterH * 0.5 + arabicLineHeight * 0.5;

        drawArabicWordLines({
          ctx,
          w,
          centerX: verseCenterX,
          wordLines,
          startY,
          arabicPx,
          arabicLineHeight,
          fontFamily: fontChoice.fontFamily,
          timeSec,
          settings,
          baseUnit,
          isIdlePreview,
          isReadingMode,
        });
      }
    } else {
      const arabicBlockH = wordLines.length * arabicLineHeight;
      const startY = h * 0.5 - arabicBlockH * 0.5 + arabicLineHeight * 0.5;

      drawArabicWordLines({
        ctx,
        w,
        centerX: verseCenterX,
        wordLines,
        startY,
        arabicPx,
        arabicLineHeight,
        fontFamily: fontChoice.fontFamily,
        timeSec,
        settings,
        baseUnit,
        isIdlePreview,
        isReadingMode,
      });
    }

    ctx.restore();
  }

  // 6. Bottom Reciter Attribution & Sadaqah Jariyah Dedication
  const footerBaseY = isReadingMode ? h * 0.905 : h * 0.885;
  const bottomRightReserve =
    qrMetrics && settings.qrCodePosition === 'bottom-right'
      ? qrMetrics.cardW + 26 * baseUnit
      : 0;
  const maxFooterLineW =
    bottomRightReserve > 0
      ? Math.max(w * 0.48, w - bottomRightReserve - 24 * baseUnit)
      : w * 0.88;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
  ctx.shadowBlur = 7 * baseUnit;

  if (settings.showReciterFooter) {
    const reciterPx = Math.round(17 * baseUnit);
    ctx.font = `500 ${reciterPx}px "IBM Plex Sans Arabic", sans-serif`;
    ctx.fillStyle = 'rgba(241, 245, 249, 0.88)';
    const ayahRangeLabel =
      reelData.fromAyah === reelData.toAyah
        ? `الآية ${reelData.fromAyah}`
        : `الآيات ${reelData.fromAyah}–${reelData.toAyah}`;
    const reciterLine = `القارئ ${reelData.reciter.nameArabic} · ${ayahRangeLabel}`;
    const measuredW = Math.min(maxFooterLineW, ctx.measureText(reciterLine).width);
    const lineCenterX =
      bottomRightReserve > 0
        ? Math.min(w * 0.5, w - bottomRightReserve - measuredW * 0.5)
        : w * 0.5;
    ctx.fillText(reciterLine, lineCenterX, footerBaseY, maxFooterLineW);
  }

  const cleanSadaqah = settings.sadaqahText.trim();
  if (cleanSadaqah) {
    const sadaqahPx = Math.round(15 * baseUnit);
    ctx.font = `400 ${sadaqahPx}px "IBM Plex Sans Arabic", sans-serif`;
    ctx.fillStyle = 'rgba(243, 207, 122, 0.86)';
    const yPos = settings.showReciterFooter ? footerBaseY + 26 * baseUnit : footerBaseY;
    const measuredW = Math.min(maxFooterLineW, ctx.measureText(cleanSadaqah).width);
    const lineCenterX =
      bottomRightReserve > 0
        ? Math.min(w * 0.5, w - bottomRightReserve - measuredW * 0.5)
        : w * 0.5;
    ctx.fillText(cleanSadaqah, lineCenterX, yPos, maxFooterLineW);
  }
  ctx.restore();

  // 7. Right-Side Page QR Code Badge (for easy discovery on published Reels/Shorts)
  if (settings.showPageQrCode && !isReadingMode) {
    drawRightSidePageQrBadge(ctx, w, h, baseUnit, settings);
  }

  // 8. Optional Bottom Progress Line
  if (settings.showProgressBar && reelData.totalDurationSec > 0) {
    const barH = Math.max(3, Math.round(4.5 * baseUnit));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(0, h - barH, w, barH);

    ctx.fillStyle = settings.highlightColor;
    ctx.fillRect(0, h - barH, w * progressRatio, barH);
  }

  ctx.restore();
}

function drawArabicWordLines(params: {
  ctx: CanvasRenderingContext2D;
  w: number;
  centerX?: number;
  wordLines: WordTiming[][];
  startY: number;
  arabicPx: number;
  arabicLineHeight: number;
  fontFamily: string;
  timeSec: number;
  settings: StudioSettings;
  baseUnit: number;
  isIdlePreview: boolean;
  isReadingMode?: boolean;
}) {
  const {
    ctx,
    w,
    centerX,
    wordLines,
    startY,
    arabicPx,
    arabicLineHeight,
    fontFamily,
    timeSec,
    settings,
    baseUnit,
    isIdlePreview,
    isReadingMode = false,
  } = params;
  const lineCenter = typeof centerX === 'number' ? centerX : w * 0.5;

  ctx.save();
  ctx.font = `400 ${arabicPx}px ${fontFamily}`;
  ctx.textBaseline = 'middle';
  const spaceGap = ctx.measureText(' ').width * 1.38;

  wordLines.forEach((lineWords, lineIdx) => {
    const baseLineY = startY + lineIdx * arabicLineHeight;

    if (settings.wordRevealMode === WordRevealMode.StaticFull && !isReadingMode) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.fillStyle = settings.textColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
      ctx.shadowBlur = 12 * baseUnit;
      const lineStr = lineWords.map((lw) => lw.text).join(' ');
      ctx.fillText(lineStr, lineCenter, baseLineY);
      ctx.restore();
      return;
    }

    const widths = lineWords.map((lw) => ctx.measureText(lw.text).width);
    const totalLineW =
      widths.reduce((a, b) => a + b, 0) + Math.max(0, lineWords.length - 1) * spaceGap;

    let rightCursor = lineCenter + totalLineW * 0.5;
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';

    lineWords.forEach((lw, wIdx) => {
      const wordX = rightCursor;
      rightCursor -= widths[wIdx] + spaceGap;

      const onsetSec = lw.startSec - 0.05;
      const isSpokenOrCurrent = timeSec >= onsetSec;
      const isActivelyPronounced =
        timeSec >= onsetSec && timeSec <= lw.endSec + 0.1;

      if (
        settings.wordRevealMode === WordRevealMode.Progressive &&
        !isIdlePreview &&
        !isReadingMode
      ) {
        // Hide unspoken future words completely until the reciter pronounces them
        if (!isSpokenOrCurrent) {
          return;
        }

        const appearProgress = Math.min(1, Math.max(0.08, (timeSec - onsetSec) / 0.14));
        const slideOffsetY = (1 - appearProgress) * (7 * baseUnit);

        ctx.save();
        ctx.globalAlpha = appearProgress;

        if (lw.isEndMarker) {
          ctx.fillStyle = '#F3CF7A';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          ctx.shadowBlur = 10 * baseUnit;
        } else if (isActivelyPronounced) {
          ctx.fillStyle = settings.highlightColor;
          ctx.shadowColor = settings.highlightColor;
          ctx.shadowBlur = 18 * baseUnit;
        } else {
          ctx.fillStyle = settings.textColor;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
          ctx.shadowBlur = 11 * baseUnit;
        }

        ctx.fillText(lw.text, wordX, baseLineY + slideOffsetY);
        ctx.restore();
      } else {
        // HighlightFull mode, Reading Mode (full verse visible for calm reading along), or paused poster preview
        ctx.save();
        if (lw.isEndMarker) {
          ctx.globalAlpha = isIdlePreview ? 0.9 : isSpokenOrCurrent ? 1 : isReadingMode ? 0.65 : 0.4;
          ctx.fillStyle = '#F3CF7A';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
          ctx.shadowBlur = 9 * baseUnit;
        } else if (isIdlePreview && lineIdx === 0 && wIdx === 0) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = settings.highlightColor;
          ctx.shadowColor = settings.highlightColor;
          ctx.shadowBlur = 16 * baseUnit;
        } else if (!isIdlePreview && isActivelyPronounced) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = settings.highlightColor;
          ctx.shadowColor = settings.highlightColor;
          ctx.shadowBlur = 18 * baseUnit;
        } else if (!isIdlePreview && isSpokenOrCurrent) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = settings.textColor;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          ctx.shadowBlur = 10 * baseUnit;
        } else {
          ctx.globalAlpha = isIdlePreview ? 0.85 : isReadingMode ? 0.58 : 0.38;
          ctx.fillStyle = settings.textColor;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
          ctx.shadowBlur = 9 * baseUnit;
        }

        ctx.fillText(lw.text, wordX, baseLineY);
        ctx.restore();
      }
    });
  });

  ctx.restore();
}
