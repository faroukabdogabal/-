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

  // 2. Contrast Scrim & Soft Radial Vignette
  ctx.fillStyle = `rgba(6, 10, 16, ${settings.dimming.toFixed(3)})`;
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
    ctx.restore();
    return;
  }

  const fontChoice = QURAN_FONTS.find((f) => f.id === settings.fontId) || QURAN_FONTS[0];
  const translationMeta =
    TRANSLATIONS.find((t) => t.id === settings.translationId) || TRANSLATIONS[0];

  // 4. Top Surah Title Header
  if (settings.showSurahHeader) {
    const headerY = h * 0.125;
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

    const maxTextWidth = w * 0.85;
    const wordCount = activeChunk.words.length;
    const autoSizeFactor =
      wordCount > 24 ? 0.72 : wordCount > 16 ? 0.84 : wordCount > 10 ? 0.94 : 1.06;
    const arabicPx = Math.round(44 * baseUnit * autoSizeFactor * settings.arabicFontSize);
    const arabicLineHeight = arabicPx * 1.88;

    ctx.font = `400 ${arabicPx}px ${fontChoice.fontFamily}`;
    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';

    const wordLines = layoutArabicWordLines(ctx, activeChunk.words, maxTextWidth);

    // Prepare translation text (revealed progressively in Progressive mode!)
    let transLines: string[] = [];
    const transPx = Math.round(21 * baseUnit * settings.translationFontSize);
    const transLineHeight = transPx * 1.52;

    if (translationMeta.quranComTranslationId && activeChunk.translationText) {
      let visibleTranslation = activeChunk.translationText;

      if (settings.wordRevealMode === WordRevealMode.Progressive && !isIdlePreview) {
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
        // Always compute vertical block height from full translation so vertical centering never jumps!
        const fullTransLines = wrapPlainTextLines(
          ctx,
          activeChunk.translationText,
          w * 0.82
        );
        transLines = wrapPlainTextLines(ctx, visibleTranslation, w * 0.82);
        // Pad array height reference via fullTransLines length below
        ctx.restore();

        const arabicBlockH = wordLines.length * arabicLineHeight;
        const transBlockH =
          fullTransLines.length > 0
            ? 24 * baseUnit + fullTransLines.length * transLineHeight
            : 0;
        const totalCenterH = arabicBlockH + transBlockH;
        const startY = h * 0.5 - totalCenterH * 0.5 + arabicLineHeight * 0.5;

        drawArabicWordLines({
          ctx,
          w,
          wordLines,
          startY,
          arabicPx,
          arabicLineHeight,
          fontFamily: fontChoice.fontFamily,
          timeSec,
          settings,
          baseUnit,
          isIdlePreview,
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
          ctx.fillText(tLine, w * 0.5, transStartY + tIdx * transLineHeight);
        });
        ctx.restore();
      } else {
        // Reserve full translation height so Arabic lines stay steadily centered as translation starts
        ctx.save();
        ctx.font = `500 ${transPx}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
        const fullTransLines = wrapPlainTextLines(
          ctx,
          activeChunk.translationText,
          w * 0.82
        );
        ctx.restore();

        const arabicBlockH = wordLines.length * arabicLineHeight;
        const transBlockH =
          fullTransLines.length > 0
            ? 24 * baseUnit + fullTransLines.length * transLineHeight
            : 0;
        const totalCenterH = arabicBlockH + transBlockH;
        const startY = h * 0.5 - totalCenterH * 0.5 + arabicLineHeight * 0.5;

        drawArabicWordLines({
          ctx,
          w,
          wordLines,
          startY,
          arabicPx,
          arabicLineHeight,
          fontFamily: fontChoice.fontFamily,
          timeSec,
          settings,
          baseUnit,
          isIdlePreview,
        });
      }
    } else {
      const arabicBlockH = wordLines.length * arabicLineHeight;
      const startY = h * 0.5 - arabicBlockH * 0.5 + arabicLineHeight * 0.5;

      drawArabicWordLines({
        ctx,
        w,
        wordLines,
        startY,
        arabicPx,
        arabicLineHeight,
        fontFamily: fontChoice.fontFamily,
        timeSec,
        settings,
        baseUnit,
        isIdlePreview,
      });
    }

    ctx.restore();
  }

  // 6. Bottom Reciter Attribution & Sadaqah Jariyah Dedication
  const footerBaseY = h * 0.885;
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
    ctx.fillText(
      `القارئ ${reelData.reciter.nameArabic} · ${ayahRangeLabel}`,
      w * 0.5,
      footerBaseY
    );
  }

  const cleanSadaqah = settings.sadaqahText.trim();
  if (cleanSadaqah) {
    const sadaqahPx = Math.round(15 * baseUnit);
    ctx.font = `400 ${sadaqahPx}px "IBM Plex Sans Arabic", sans-serif`;
    ctx.fillStyle = 'rgba(243, 207, 122, 0.86)';
    const yPos = settings.showReciterFooter ? footerBaseY + 26 * baseUnit : footerBaseY;
    ctx.fillText(cleanSadaqah, w * 0.5, yPos);
  }
  ctx.restore();

  // 7. Optional Bottom Progress Line
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
  wordLines: WordTiming[][];
  startY: number;
  arabicPx: number;
  arabicLineHeight: number;
  fontFamily: string;
  timeSec: number;
  settings: StudioSettings;
  baseUnit: number;
  isIdlePreview: boolean;
}) {
  const {
    ctx,
    w,
    wordLines,
    startY,
    arabicPx,
    arabicLineHeight,
    fontFamily,
    timeSec,
    settings,
    baseUnit,
    isIdlePreview,
  } = params;

  ctx.save();
  ctx.font = `400 ${arabicPx}px ${fontFamily}`;
  ctx.textBaseline = 'middle';
  const spaceGap = ctx.measureText(' ').width * 1.38;

  wordLines.forEach((lineWords, lineIdx) => {
    const baseLineY = startY + lineIdx * arabicLineHeight;

    if (settings.wordRevealMode === WordRevealMode.StaticFull) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.fillStyle = settings.textColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
      ctx.shadowBlur = 12 * baseUnit;
      const lineStr = lineWords.map((lw) => lw.text).join(' ');
      ctx.fillText(lineStr, w * 0.5, baseLineY);
      ctx.restore();
      return;
    }

    const widths = lineWords.map((lw) => ctx.measureText(lw.text).width);
    const totalLineW =
      widths.reduce((a, b) => a + b, 0) + Math.max(0, lineWords.length - 1) * spaceGap;

    let rightCursor = w * 0.5 + totalLineW * 0.5;
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';

    lineWords.forEach((lw, wIdx) => {
      const wordX = rightCursor;
      rightCursor -= widths[wIdx] + spaceGap;

      const onsetSec = lw.startSec - 0.05;
      const isSpokenOrCurrent = timeSec >= onsetSec;
      const isActivelyPronounced =
        timeSec >= onsetSec && timeSec <= lw.endSec + 0.1;

      if (settings.wordRevealMode === WordRevealMode.Progressive && !isIdlePreview) {
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
        // HighlightFull mode (or paused poster preview at 00:00 before Play is pressed)
        ctx.save();
        if (lw.isEndMarker) {
          ctx.globalAlpha = isIdlePreview ? 0.9 : isSpokenOrCurrent ? 1 : 0.4;
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
          ctx.globalAlpha = isIdlePreview ? 0.85 : 0.38;
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
