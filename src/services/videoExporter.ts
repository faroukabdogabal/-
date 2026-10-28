import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { QURAN_FONTS } from '../data/quranCatalog';
import {
  ExportProgressState,
  ExportResolution,
  PreparedReelData,
  StudioSettings,
} from '../types/quran';
import {
  getTargetDimensions,
  LoadedVisualAssets,
  renderReelFrame,
} from './canvasRenderer';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

async function ensureCanvasFontsLoaded(fontId: string) {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    const fontChoice = QURAN_FONTS.find((f) => f.id === fontId) || QURAN_FONTS[0];
    await Promise.allSettled([
      document.fonts.load(`400 44px ${fontChoice.fontFamily}`, 'بِسْمِ ٱللَّهِ'),
      document.fonts.load(`700 28px ${fontChoice.fontFamily}`, 'سُورَةُ'),
      document.fonts.load('500 20px "IBM Plex Sans Arabic"', 'القارئ'),
      document.fonts.ready,
    ]);
  } catch {
    // Proceed cleanly if font preload times out
  }
}

export function exportAudioWav(reelData: PreparedReelData) {
  const buffer = reelData.audioBuffer;
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }
  }

  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  const filename = `quran-audio-${reelData.surah.nameSimple}-${reelData.fromAyah}-${reelData.toAyah}.wav`;
  triggerBlobDownload(blob, filename);
}

async function canUseWebCodecsMp4(
  width: number,
  height: number,
  sampleRate: number
): Promise<string | null> {
  if (
    typeof window === 'undefined' ||
    typeof VideoEncoder === 'undefined' ||
    typeof AudioEncoder === 'undefined'
  ) {
    return null;
  }

  const candidateCodecs = ['avc1.42001f', 'avc1.4d001f', 'avc1.4d002a', 'avc1.42002a'];
  let supportedVideoCodec: string | null = null;

  for (const codec of candidateCodecs) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate: 3_500_000,
        framerate: 30,
      });
      if (support.supported) {
        supportedVideoCodec = codec;
        break;
      }
    } catch {
      // Try next codec profile
    }
  }

  if (!supportedVideoCodec) return null;

  try {
    const audioSupport = await AudioEncoder.isConfigSupported({
      codec: 'mp4a.40.2',
      sampleRate,
      numberOfChannels: 2,
      bitrate: 128_000,
    });
    if (!audioSupport.supported) return null;
  } catch {
    return null;
  }

  return supportedVideoCodec;
}

async function seekVideoElement(video: HTMLVideoElement, targetSec: number): Promise<void> {
  if (!video.duration || Number.isNaN(video.duration)) return;
  const wrappedTime = targetSec % video.duration;
  if (Math.abs(video.currentTime - wrappedTime) < 0.03) return;

  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    const timeout = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    }, 120);
    video.addEventListener(
      'seeked',
      () => {
        clearTimeout(timeout);
        onSeeked();
      },
      { once: true }
    );
    video.currentTime = wrappedTime;
  });
}

async function exportWithWebCodecsMp4(params: {
  width: number;
  height: number;
  videoCodec: string;
  reelData: PreparedReelData;
  settings: StudioSettings;
  visuals: LoadedVisualAssets;
  onProgress: (p: ExportProgressState) => void;
  signal?: AbortSignal;
}): Promise<Blob> {
  const { width, height, videoCodec, reelData, settings, visuals, onProgress, signal } = params;
  const fps = 30;
  const durationSec = reelData.totalDurationSec;
  const totalFrames = Math.max(1, Math.ceil(durationSec * fps));
  const audioBuffer = reelData.audioBuffer;
  const sampleRate = audioBuffer.sampleRate;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
    },
    audio: {
      codec: 'aac',
      numberOfChannels: 2,
      sampleRate,
    },
    fastStart: 'in-memory',
  });

  let encoderError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      encoderError = err;
    },
  });

  videoEncoder.configure({
    codec: videoCodec,
    width,
    height,
    bitrate: 3_500_000,
    framerate: fps,
  });

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (err) => {
      encoderError = err;
    },
  });

  audioEncoder.configure({
    codec: 'mp4a.40.2',
    sampleRate,
    numberOfChannels: 2,
    bitrate: 128_000,
  });

  // 1. Encode Audio Track
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
  const chunkFrames = 4096;

  for (let offset = 0; offset < audioBuffer.length; offset += chunkFrames) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (encoderError) throw encoderError;

    const frameLen = Math.min(chunkFrames, audioBuffer.length - offset);
    const planarData = new Float32Array(frameLen * 2);
    planarData.set(ch0.subarray(offset, offset + frameLen), 0);
    planarData.set(ch1.subarray(offset, offset + frameLen), frameLen);

    const timestampUs = Math.round((offset / sampleRate) * 1_000_000);
    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate,
      numberOfFrames: frameLen,
      numberOfChannels: 2,
      timestamp: timestampUs,
      data: planarData,
    });

    audioEncoder.encode(audioData);
    audioData.close();
  }

  // 2. Render & Encode 720p HD Video Frames with synchronized progressive words
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
  const ctx = offscreenCanvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('تعذر تهيئة محرك الرسم لتصدير الفيديو');

  await ensureCanvasFontsLoaded(settings.fontId);

  let exportVisuals = visuals;
  if (settings.customBgType === 'video' && settings.customBgUrl) {
    const clonedVid = document.createElement('video');
    clonedVid.src = settings.customBgUrl;
    clonedVid.muted = true;
    clonedVid.playsInline = true;
    await new Promise<void>((res) => {
      clonedVid.onloadeddata = () => res();
      clonedVid.onerror = () => res();
    });
    exportVisuals = { ...visuals, customVideo: clonedVid };
  }

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    if (signal?.aborted) {
      videoEncoder.close();
      audioEncoder.close();
      throw new DOMException('Aborted', 'AbortError');
    }
    if (encoderError) throw encoderError;

    const timeSec = frameIdx / fps;

    if (settings.customBgType === 'video' && exportVisuals.customVideo) {
      await seekVideoElement(exportVisuals.customVideo, timeSec);
    }

    renderReelFrame({
      ctx,
      width,
      height,
      timeSec,
      settings,
      reelData,
      visuals: exportVisuals,
      isIdlePreview: false,
    });

    const timestampUs = Math.round((frameIdx / fps) * 1_000_000);
    const durationUs = Math.round((1 / fps) * 1_000_000);

    const videoFrame = new VideoFrame(offscreenCanvas, {
      timestamp: timestampUs,
      duration: durationUs,
    });

    videoEncoder.encode(videoFrame, { keyFrame: frameIdx % 60 === 0 });
    videoFrame.close();

    while (videoEncoder.encodeQueueSize > 12) {
      await new Promise((r) => setTimeout(r, 6));
    }

    if (frameIdx % 8 === 0 || frameIdx === totalFrames - 1) {
      const pct = Math.min(96, Math.round(((frameIdx + 1) / totalFrames) * 94));
      onProgress({
        status: 'rendering',
        percent: pct,
        message: `جاري تصدير الفيديو السريع 720p HD (${pct}%)...`,
      });
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress({
    status: 'muxing',
    percent: 97,
    message: 'جاري تجميع ملف الفيديو MP4 النهائي...',
  });

  await Promise.all([videoEncoder.flush(), audioEncoder.flush()]);
  videoEncoder.close();
  audioEncoder.close();
  muxer.finalize();

  return new Blob([target.buffer], { type: 'video/mp4' });
}

async function exportWithMediaRecorderFallback(params: {
  width: number;
  height: number;
  reelData: PreparedReelData;
  settings: StudioSettings;
  visuals: LoadedVisualAssets;
  onProgress: (p: ExportProgressState) => void;
  signal?: AbortSignal;
}): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const { width, height, reelData, settings, visuals, onProgress, signal } = params;

  await ensureCanvasFontsLoaded(settings.fontId);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('تعذر تهيئة محرك الرسم');

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const dest = audioCtx.createMediaStreamDestination();

  const source = audioCtx.createBufferSource();
  source.buffer = reelData.audioBuffer;
  source.connect(dest);

  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeCandidates = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];

  const chosenMime =
    mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const ext: 'mp4' | 'webm' = chosenMime.includes('mp4') ? 'mp4' : 'webm';

  const recorder = new MediaRecorder(combinedStream, {
    ...(chosenMime ? { mimeType: chosenMime } : {}),
    videoBitsPerSecond: 3_200_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  return new Promise((resolve, reject) => {
    let rafId = 0;
    const totalDur = reelData.totalDurationSec;

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      audioCtx.close().catch(() => {});
    };

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          if (recorder.state !== 'inactive') recorder.stop();
          cleanup();
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true }
      );
    }

    recorder.onstop = () => {
      cleanup();
      const blob = new Blob(chunks, {
        type: ext === 'mp4' ? 'video/mp4' : 'video/webm',
      });
      resolve({ blob, ext });
    };

    recorder.onerror = () => {
      cleanup();
      reject(new Error('حدث خطأ أثناء تسجيل الفيديو'));
    };

    recorder.start(250);
    const startTime = audioCtx.currentTime;
    source.start(startTime);

    const drawTick = () => {
      const elapsed = audioCtx.currentTime - startTime;
      renderReelFrame({
        ctx,
        width,
        height,
        timeSec: Math.min(elapsed, totalDur),
        settings,
        reelData,
        visuals,
        isIdlePreview: false,
      });

      const pct = Math.min(98, Math.round((elapsed / totalDur) * 98));
      onProgress({
        status: 'rendering',
        percent: pct,
        message: `جاري تسجيل المقطع بدقة 720p HD (${pct}%)...`,
      });

      if (elapsed < totalDur) {
        rafId = requestAnimationFrame(drawTick);
      } else if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    };

    drawTick();
  });
}

export async function exportQuranReelVideo(params: {
  reelData: PreparedReelData;
  settings: StudioSettings;
  visuals: LoadedVisualAssets;
  onProgress: (p: ExportProgressState) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { reelData, settings, visuals, onProgress, signal } = params;
  const { width, height } = getTargetDimensions(
    settings.aspectRatio,
    ExportResolution.HD720
  );

  onProgress({
    status: 'preparing',
    percent: 3,
    message: 'جاري تجهيز التصدير السريع 720p HD...',
  });

  const webCodecsCodec = await canUseWebCodecsMp4(
    width,
    height,
    reelData.audioBuffer.sampleRate
  );

  let finalBlob: Blob;
  let extension: 'mp4' | 'webm' = 'mp4';

  if (webCodecsCodec) {
    finalBlob = await exportWithWebCodecsMp4({
      width,
      height,
      videoCodec: webCodecsCodec,
      reelData,
      settings,
      visuals,
      onProgress,
      signal,
    });
  } else {
    const fallbackResult = await exportWithMediaRecorderFallback({
      width,
      height,
      reelData,
      settings,
      visuals,
      onProgress,
      signal,
    });
    finalBlob = fallbackResult.blob;
    extension = fallbackResult.ext;
  }

  const filename = `quran-reel-720p-${reelData.surah.nameSimple}-${reelData.fromAyah}-${reelData.toAyah}.${extension}`;
  triggerBlobDownload(finalBlob, filename);

  onProgress({
    status: 'done',
    percent: 100,
    message: 'تم تصدير وتنزيل الفيديو السريع (720p HD) بنجاح وبدون علامة مائية',
  });
}
