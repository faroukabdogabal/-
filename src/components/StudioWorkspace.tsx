import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileAudio,
  Film,
  ImagePlus,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Sliders,
  Type,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  BACKGROUNDS,
  HIGHLIGHT_COLORS,
  QURAN_FONTS,
  RECITERS,
  TRANSLATIONS,
} from '../data/quranCatalog';
import {
  getTargetDimensions,
  LoadedVisualAssets,
  renderReelFrame,
} from '../services/canvasRenderer';
import { exportAudioWav, exportQuranReelVideo } from '../services/videoExporter';
import {
  ExportProgressState,
  ExportResolution,
  ParticleEffect,
  PreparedReelData,
  StudioSettings,
  SurahMeta,
  VideoAspectRatio,
  WordRevealMode,
} from '../types/quran';

type StudioTab = 'quran' | 'visuals' | 'typography' | 'sadaqah';

interface StudioWorkspaceProps {
  surahs: SurahMeta[];
  settings: StudioSettings;
  onUpdateSettings: (patch: Partial<StudioSettings>) => void;
  reelData: PreparedReelData | null;
  isLoadingReel: boolean;
  loadingMessage: string;
  reelError: string | null;
  onReloadReel: () => void;
  onCopyShareLink: () => Promise<boolean>;
}

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function StudioWorkspace({
  surahs,
  settings,
  onUpdateSettings,
  reelData,
  isLoadingReel,
  loadingMessage,
  reelError,
  onReloadReel,
  onCopyShareLink,
}: StudioWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('quran');
  const [surahQuery, setSurahQuery] = useState('');
  const [reciterQuery, setReciterQuery] = useState('');

  const [draftSurahId, setDraftSurahId] = useState(settings.surahId);
  const [draftFromAyah, setDraftFromAyah] = useState(settings.fromAyah);
  const [draftToAyah, setDraftToAyah] = useState(settings.toAyah);
  const [draftReciterId, setDraftReciterId] = useState(settings.reciterId);

  useEffect(() => {
    setDraftSurahId(settings.surahId);
    setDraftFromAyah(settings.fromAyah);
    setDraftToAyah(settings.toAyah);
    setDraftReciterId(settings.reciterId);
  }, [settings.surahId, settings.fromAyah, settings.toAyah, settings.reciterId]);

  const selectedDraftSurah = useMemo(
    () => surahs.find((s) => s.id === draftSurahId) || surahs[0],
    [surahs, draftSurahId]
  );

  const hasUnappliedAudioChanges =
    draftSurahId !== settings.surahId ||
    draftFromAyah !== settings.fromAyah ||
    draftToAyah !== settings.toAyah ||
    draftReciterId !== settings.reciterId;

  const applyAudioSelection = () => {
    onUpdateSettings({
      surahId: draftSurahId,
      fromAyah: draftFromAyah,
      toAyah: draftToAyah,
      reciterId: draftReciterId,
    });
  };

  // Playback state & Web Audio Engine
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasInteractedPlay, setHasInteractedPlay] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playStartWallTimeRef = useRef<number>(0);
  const playStartOffsetRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const currentTimeRef = useRef<number>(0);
  const hasInteractedPlayRef = useRef<boolean>(false);

  // Refs for smooth zero-thrash 60fps Canvas preview loop
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadedBgImg, setLoadedBgImg] = useState<HTMLImageElement | null>(null);
  const customVideoRef = useRef<HTMLVideoElement | null>(null);
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});

  const settingsRef = useRef<StudioSettings>(settings);
  settingsRef.current = settings;

  const reelDataRef = useRef<PreparedReelData | null>(reelData);
  reelDataRef.current = reelData;

  const loadedBgImgRef = useRef<HTMLImageElement | null>(loadedBgImg);
  loadedBgImgRef.current = loadedBgImg;

  const [exportProgress, setExportProgress] = useState<ExportProgressState>({
    status: 'idle',
    percent: 0,
    message: '',
  });
  const exportAbortRef = useRef<AbortController | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load selected photo or custom uploaded image into HTMLImageElement
  useEffect(() => {
    let targetSrc: string | undefined;
    if (settings.customBgType === 'image' && settings.customBgUrl) {
      targetSrc = settings.customBgUrl;
    } else {
      const preset = BACKGROUNDS.find((b) => b.id === settings.backgroundId);
      if (preset?.category === 'photo' && preset.imageUrl) {
        targetSrc = preset.imageUrl;
      }
    }

    if (!targetSrc) {
      setLoadedBgImg(null);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setLoadedBgImg(img);
    };
    img.onerror = () => {
      if (!cancelled) setLoadedBgImg(null);
    };
    img.src = targetSrc;

    return () => {
      cancelled = true;
    };
  }, [settings.backgroundId, settings.customBgType, settings.customBgUrl]);

  // Manage custom uploaded background video element
  useEffect(() => {
    if (settings.customBgType !== 'video' || !settings.customBgUrl) {
      if (customVideoRef.current) {
        customVideoRef.current.pause();
        customVideoRef.current = null;
      }
      return;
    }

    const vid = document.createElement('video');
    vid.src = settings.customBgUrl;
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.play().catch(() => {});
    customVideoRef.current = vid;

    return () => {
      vid.pause();
      customVideoRef.current = null;
    };
  }, [settings.customBgType, settings.customBgUrl]);

  const stopAudioPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // Ignore already stopped
      }
      sourceNodeRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
  };

  const startAudioPlayback = async (offsetSec: number) => {
    if (!reelData) return;
    stopAudioPlayback();

    hasInteractedPlayRef.current = true;
    setHasInteractedPlay(true);

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const gain = ctx.createGain();
    gain.gain.value = isMuted ? 0 : 1;
    gain.connect(ctx.destination);
    gainNodeRef.current = gain;

    const src = ctx.createBufferSource();
    src.buffer = reelData.audioBuffer;
    src.connect(gain);

    const safeOffset = Math.max(0, Math.min(offsetSec, reelData.totalDurationSec - 0.05));
    playStartOffsetRef.current = safeOffset;
    playStartWallTimeRef.current = ctx.currentTime;
    currentTimeRef.current = safeOffset;
    setCurrentTime(safeOffset);

    src.onended = () => {
      if (isPlayingRef.current) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        currentTimeRef.current = 0;
        setCurrentTime(0);
        playStartOffsetRef.current = 0;
        hasInteractedPlayRef.current = false;
        setHasInteractedPlay(false);
      }
    };

    src.start(0, safeOffset);
    sourceNodeRef.current = src;
    isPlayingRef.current = true;
    setIsPlaying(true);

    if (customVideoRef.current) {
      customVideoRef.current.currentTime =
        safeOffset % (customVideoRef.current.duration || 10);
      customVideoRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : 1;
    }
  }, [isMuted]);

  useEffect(() => {
    stopAudioPlayback();
    currentTimeRef.current = 0;
    setCurrentTime(0);
    playStartOffsetRef.current = 0;
    hasInteractedPlayRef.current = false;
    setHasInteractedPlay(false);
  }, [reelData]);

  useEffect(() => {
    return () => {
      stopAudioPlayback();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const togglePlayPause = () => {
    if (!reelData) return;
    if (isPlayingRef.current) {
      const elapsed = audioCtxRef.current
        ? audioCtxRef.current.currentTime - playStartWallTimeRef.current
        : 0;
      const pausedAt = Math.min(
        reelData.totalDurationSec,
        playStartOffsetRef.current + elapsed
      );
      stopAudioPlayback();
      currentTimeRef.current = pausedAt;
      setCurrentTime(pausedAt);
      playStartOffsetRef.current = pausedAt;
      customVideoRef.current?.pause();
    } else {
      const startAt =
        currentTimeRef.current >= reelData.totalDurationSec - 0.15
          ? 0
          : currentTimeRef.current;
      startAudioPlayback(startAt);
    }
  };

  const handleSeek = (newTimeSec: number) => {
    if (!reelData) return;
    const clamped = Math.max(0, Math.min(newTimeSec, reelData.totalDurationSec));
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
    playStartOffsetRef.current = clamped;
    hasInteractedPlayRef.current = clamped > 0.02 || isPlayingRef.current;
    setHasInteractedPlay(hasInteractedPlayRef.current);
    if (isPlayingRef.current) {
      startAudioPlayback(clamped);
    }
  };

  // Dedicated 60fps Canvas Preview Loop (zero React state teardown)
  useEffect(() => {
    let rafId = 0;
    let lastReactUiUpdateMs = 0;

    const renderLoop = (nowMs: number) => {
      const canvas = previewCanvasRef.current;
      const activeReelData = reelDataRef.current;
      const activeSettings = settingsRef.current;

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          let activeTime = currentTimeRef.current;

          if (isPlayingRef.current && audioCtxRef.current && activeReelData) {
            const elapsed =
              audioCtxRef.current.currentTime - playStartWallTimeRef.current;
            activeTime = Math.min(
              activeReelData.totalDurationSec,
              playStartOffsetRef.current + elapsed
            );
            currentTimeRef.current = activeTime;

            // Update React UI slider at ~15fps without interrupting 60fps Canvas drawing
            if (nowMs - lastReactUiUpdateMs > 65) {
              lastReactUiUpdateMs = nowMs;
              setCurrentTime(activeTime);
            }
          }

          const isIdlePoster =
            !isPlayingRef.current &&
            !hasInteractedPlayRef.current &&
            activeTime < 0.02;

          renderReelFrame({
            ctx,
            width: canvas.width,
            height: canvas.height,
            timeSec: activeTime,
            settings: activeSettings,
            reelData: activeReelData,
            visuals: {
              bgImage: loadedBgImgRef.current,
              customVideo: customVideoRef.current,
            },
            isIdlePreview: isIdlePoster,
          });
        }
      }
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const filteredSurahs = useMemo(() => {
    const q = surahQuery.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        s.nameArabic.includes(q) ||
        s.nameSimple.toLowerCase().includes(q) ||
        String(s.id) === q
    );
  }, [surahs, surahQuery]);

  const filteredReciters = useMemo(() => {
    const q = reciterQuery.trim();
    if (!q) return RECITERS;
    return RECITERS.filter(
      (r) => r.nameArabic.includes(q) || r.styleArabic.includes(q)
    );
  }, [reciterQuery]);

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      onUpdateSettings({
        customBgType: 'video',
        customBgUrl: objectUrl,
      });
    } else if (file.type.startsWith('image/')) {
      onUpdateSettings({
        customBgType: 'image',
        customBgUrl: objectUrl,
      });
    }
    e.target.value = '';
  };

  const handleExportVideo = async () => {
    if (!reelData) return;
    if (isPlayingRef.current) {
      togglePlayPause();
    }

    const controller = new AbortController();
    exportAbortRef.current = controller;

    const visuals: LoadedVisualAssets = {
      bgImage: loadedBgImg,
      customVideo: customVideoRef.current,
    };

    try {
      await exportQuranReelVideo({
        reelData,
        settings,
        visuals,
        onProgress: setExportProgress,
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setExportProgress({ status: 'idle', percent: 0, message: '' });
      } else {
        setExportProgress({
          status: 'error',
          percent: 0,
          message: 'تعذر إكمال التصدير',
          errorDetail: err instanceof Error ? err.message : 'خطأ غير متوقع',
        });
      }
    } finally {
      exportAbortRef.current = null;
    }
  };

  const handleCancelExport = () => {
    exportAbortRef.current?.abort();
  };

  const handleShareClick = async () => {
    const ok = await onCopyShareLink();
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const previewDims = useMemo(
    () => getTargetDimensions(settings.aspectRatio, ExportResolution.HD720),
    [settings.aspectRatio]
  );

  const isExporting =
    exportProgress.status === 'preparing' ||
    exportProgress.status === 'rendering' ||
    exportProgress.status === 'muxing';

  return (
    <section id="studio" className="py-10 sm:py-14 bg-[#0B0F14]">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-1.5">
              استوديو صناعة المقاطع القرآنية
            </h2>
            <p className="text-sm text-slate-400">
              ظهور متزامن للكلمات كتابةً مع نطق القارئ وتصدير سريع بصيغة MP4 بجودة 720p HD
            </p>
          </div>
          {reelData && (
            <div className="text-xs text-slate-400 tabular-nums">
              <span>سورة {reelData.surah.nameArabic}</span>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <span>
                الآيات {reelData.fromAyah}–{reelData.toAyah}
              </span>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <span>المدة {formatSeconds(reelData.totalDurationSec)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Panel */}
          <div className="lg:col-span-7 rounded-xl border border-slate-800/90 bg-[#121820] overflow-hidden">
            <div
              role="tablist"
              aria-label="أقسام تخصيص المقطع"
              className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-2 bg-[#0E131A] border-b border-slate-800/80"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'quran'}
                onClick={() => setActiveTab('quran')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'quran'
                    ? 'bg-slate-800 text-emerald-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Volume2 className="w-4 h-4 shrink-0" />
                <span>الآيات والقارئ</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'visuals'}
                onClick={() => setActiveTab('visuals')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'visuals'
                    ? 'bg-slate-800 text-emerald-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-4 h-4 shrink-0" />
                <span>الخلفية والأبعاد</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'typography'}
                onClick={() => setActiveTab('typography')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'typography'
                    ? 'bg-slate-800 text-emerald-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Type className="w-4 h-4 shrink-0" />
                <span>الخط والترجمة</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'sadaqah'}
                onClick={() => setActiveTab('sadaqah')}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'sadaqah'
                    ? 'bg-slate-800 text-emerald-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>الإهداء والتصدير</span>
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              {/* TAB 1: QURAN & RECITER */}
              {activeTab === 'quran' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-slate-200">
                        ١. اختر السورة الكريمة (١١٤ سورة)
                      </label>
                      <span className="text-xs text-slate-400 tabular-nums">
                        عدد آيات سورة {selectedDraftSurah?.nameArabic}:{' '}
                        {selectedDraftSurah?.versesCount}
                      </span>
                    </div>

                    <div className="relative mb-2.5">
                      <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={surahQuery}
                        onChange={(e) => setSurahQuery(e.target.value)}
                        placeholder="ابحث باسم السورة أو رقمها (مثال: الكهف، يس، 36)..."
                        className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] pr-10 pl-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                      {filteredSurahs.map((s) => {
                        const active = s.id === draftSurahId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setDraftSurahId(s.id);
                              setDraftFromAyah(1);
                              setDraftToAyah(Math.min(5, s.versesCount));
                            }}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-right transition-colors cursor-pointer ${
                              active
                                ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200'
                                : 'border-slate-800/80 bg-[#0E131A] text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span className="text-xs sm:text-sm font-medium truncate">
                              <span className="text-slate-500 ml-1.5 tabular-nums">
                                {s.id}.
                              </span>
                              {s.nameArabic}
                            </span>
                            <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                              {s.versesCount} آية
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ayah Range */}
                  <div className="pt-4 border-t border-slate-800/70">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-200">
                        ٢. حدد نطاق الآيات (حتى ٣٠ آية في المقطع الواحد)
                      </label>
                      <span className="text-xs text-emerald-400 tabular-nums">
                        مختار: {Math.max(1, draftToAyah - draftFromAyah + 1)} آيات
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="from-ayah-select"
                          className="block text-xs text-slate-400 mb-1.5"
                        >
                          من الآية
                        </label>
                        <select
                          id="from-ayah-select"
                          value={draftFromAyah}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setDraftFromAyah(val);
                            if (draftToAyah < val) {
                              setDraftToAyah(val);
                            } else if (draftToAyah > val + 29) {
                              setDraftToAyah(
                                Math.min(selectedDraftSurah.versesCount, val + 29)
                              );
                            }
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100 tabular-nums focus:border-emerald-500 focus:outline-none"
                        >
                          {Array.from(
                            { length: selectedDraftSurah?.versesCount || 7 },
                            (_, idx) => idx + 1
                          ).map((num) => (
                            <option key={num} value={num}>
                              الآية {num}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="to-ayah-select"
                          className="block text-xs text-slate-400 mb-1.5"
                        >
                          إلى الآية
                        </label>
                        <select
                          id="to-ayah-select"
                          value={draftToAyah}
                          onChange={(e) => setDraftToAyah(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100 tabular-nums focus:border-emerald-500 focus:outline-none"
                        >
                          {Array.from(
                            {
                              length: Math.min(
                                30,
                                (selectedDraftSurah?.versesCount || 7) -
                                  draftFromAyah +
                                  1
                              ),
                            },
                            (_, idx) => draftFromAyah + idx
                          ).map((num) => (
                            <option key={num} value={num}>
                              الآية {num}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Reciter Selector */}
                  <div className="pt-4 border-t border-slate-800/70">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-slate-200">
                        ٣. اختر القارئ ({RECITERS.length} قارئاً وتلاوة)
                      </label>
                    </div>

                    <div className="relative mb-2.5">
                      <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={reciterQuery}
                        onChange={(e) => setReciterQuery(e.target.value)}
                        placeholder="ابحث عن القارئ (مثال: العفاسي، المنشاوي، ماهر المعيقلي، الدوسري)..."
                        className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] pr-10 pl-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1">
                      {filteredReciters.map((rec) => {
                        const isSelected = rec.id === draftReciterId;
                        return (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => setDraftReciterId(rec.id)}
                            className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-right transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200'
                                : 'border-slate-800/80 bg-[#0E131A] text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span className="text-xs sm:text-sm font-medium truncate">
                              {rec.nameArabic}
                            </span>
                            <span className="text-[11px] text-slate-400 shrink-0 mr-2">
                              {rec.styleArabic}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className="pt-2 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={applyAudioSelection}
                      disabled={isLoadingReel}
                      className={`w-full flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                        hasUnappliedAudioChanges
                          ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      } disabled:opacity-50`}
                    >
                      {isLoadingReel ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{loadingMessage || 'جاري تحميل التلاوة...'}</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span>
                            {hasUnappliedAudioChanges
                              ? 'تطبيق السورة والقارئ المختار الآن'
                              : 'تحديث التلاوة المحملة'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: VISUALS & ASPECT RATIO */}
              {activeTab === 'visuals' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2.5">
                      أبعاد الفيديو (بدقة 720p HD سريعة)
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        {
                          ratio: VideoAspectRatio.Vertical9x16,
                          title: '9:16 رأسي',
                          desc: 'ريلز · تيك توك · شورتس',
                        },
                        {
                          ratio: VideoAspectRatio.Square1x1,
                          title: '1:1 مربع',
                          desc: 'منشورات انستغرام وفيسبوك',
                        },
                        {
                          ratio: VideoAspectRatio.Landscape16x9,
                          title: '16:9 عرضي',
                          desc: 'يوتيوب وشاشات العرض',
                        },
                      ].map((item) => {
                        const active = settings.aspectRatio === item.ratio;
                        return (
                          <button
                            key={item.ratio}
                            type="button"
                            onClick={() =>
                              onUpdateSettings({ aspectRatio: item.ratio })
                            }
                            className={`rounded-lg border p-3 text-right transition-colors cursor-pointer ${
                              active
                                ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200'
                                : 'border-slate-800 bg-[#0E131A] text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-xs sm:text-sm font-semibold tabular-nums">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {item.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Built-in Backgrounds + Custom Upload */}
                  <div className="pt-4 border-t border-slate-800/70">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <label className="text-sm font-semibold text-slate-200">
                        مكتبة الخلفيات الهادئة أو رفع خلفية خاصة
                      </label>

                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0">
                        <ImagePlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>رفع صورة أو فيديو من جهازك</span>
                        <input
                          type="file"
                          accept="image/*,video/mp4,video/webm"
                          onChange={handleCustomFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {settings.customBgType !== 'none' && (
                      <div className="mb-3 flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-200">
                        <span>
                          تم تفعيل خلفية مخصصة من جهازك (
                          {settings.customBgType === 'video' ? 'فيديو' : 'صورة'})
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              customBgType: 'none',
                              customBgUrl: null,
                            })
                          }
                          className="text-slate-300 hover:text-white underline cursor-pointer"
                        >
                          العودة لمكتبة الخلفيات
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {BACKGROUNDS.map((bg) => {
                        const isSelected =
                          settings.customBgType === 'none' &&
                          settings.backgroundId === bg.id;
                        const imgFailed = brokenThumbs[bg.id];

                        return (
                          <button
                            key={bg.id}
                            type="button"
                            onClick={() =>
                              onUpdateSettings({
                                backgroundId: bg.id,
                                customBgType: 'none',
                              })
                            }
                            className={`group relative aspect-[9/13] rounded-lg overflow-hidden border text-right transition-transform cursor-pointer ${
                              isSelected
                                ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                                : 'border-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div
                              className="absolute inset-0"
                              style={{
                                background: `linear-gradient(180deg, ${bg.fallbackGradient[0]} 0%, ${bg.fallbackGradient[1]} 55%, ${bg.fallbackGradient[2]} 100%)`,
                              }}
                            />

                            {bg.imageUrl && !imgFailed && (
                              <img
                                src={bg.imageUrl}
                                alt={bg.titleArabic}
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setBrokenThumbs((prev) => ({
                                    ...prev,
                                    [bg.id]: true,
                                  }))
                                }
                                className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                            <div className="absolute bottom-2 right-2.5 left-2.5">
                              <div className="text-xs font-semibold text-slate-100 leading-snug">
                                {bg.titleArabic}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {bg.category === 'animated'
                                  ? 'خلفية متحركة'
                                  : 'تصوير طبيعي 9:16'}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dimming & Motion Controls */}
                  <div className="pt-4 border-t border-slate-800/70 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                        <label htmlFor="dimming-range" className="font-medium text-slate-200">
                          تعتيم الخلفية لإبراز الآيات
                        </label>
                        <span className="text-slate-400 font-mono tabular-nums">
                          {Math.round(settings.dimming * 100)}%
                        </span>
                      </div>
                      <input
                        id="dimming-range"
                        type="range"
                        min={0.2}
                        max={0.86}
                        step={0.02}
                        value={settings.dimming}
                        onChange={(e) =>
                          onUpdateSettings({ dimming: Number(e.target.value) })
                        }
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">
                          المؤثرات البصرية الهادئة
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: ParticleEffect.Dust, label: 'ذرات نور' },
                            { id: ParticleEffect.Rain, label: 'مطر خفيف' },
                            { id: ParticleEffect.None, label: 'بدون' },
                          ].map((eff) => (
                            <button
                              key={eff.id}
                              type="button"
                              onClick={() =>
                                onUpdateSettings({ particleEffect: eff.id })
                              }
                              className={`rounded-lg border px-2.5 py-2 text-xs font-medium cursor-pointer whitespace-nowrap ${
                                settings.particleEffect === eff.id
                                  ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200'
                                  : 'border-slate-800 bg-[#0E131A] text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {eff.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center justify-between w-full rounded-lg border border-slate-800 bg-[#0E131A] px-3.5 py-2.5 cursor-pointer">
                          <span className="text-xs sm:text-sm text-slate-200">
                            حركة تقريب سينمائية هادئة للخلفية
                          </span>
                          <input
                            type="checkbox"
                            checked={settings.kenBurnsMotion}
                            onChange={(e) =>
                              onUpdateSettings({
                                kenBurnsMotion: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-emerald-400 rounded"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TYPOGRAPHY, PROGRESSIVE WORD WRITING & TRANSLATION */}
              {activeTab === 'typography' && (
                <div className="space-y-6">
                  {/* Word Reveal Mode */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2.5">
                      طريقة ظهور الكلمات في الفيديو مع نطق القارئ
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        {
                          mode: WordRevealMode.Progressive,
                          title: 'كتابة تدريجية مع النطق',
                          desc: 'تظهر كل كلمة كتابةً لحظة نطق القارئ بها',
                        },
                        {
                          mode: WordRevealMode.HighlightFull,
                          title: 'عرض الآية مع التظليل',
                          desc: 'عرض الشطر كاملاً وإضاءة الكلمة المنطوقة',
                        },
                        {
                          mode: WordRevealMode.StaticFull,
                          title: 'عرض الآية ثابتة',
                          desc: 'عرض نص الآية كاملاً بدون تدرج',
                        },
                      ].map((opt) => {
                        const active = settings.wordRevealMode === opt.mode;
                        return (
                          <button
                            key={opt.mode}
                            type="button"
                            onClick={() =>
                              onUpdateSettings({ wordRevealMode: opt.mode })
                            }
                            className={`rounded-lg border p-3 text-right transition-colors cursor-pointer ${
                              active
                                ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200'
                                : 'border-slate-800 bg-[#0E131A] text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-xs sm:text-sm font-semibold">
                              {opt.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                              {opt.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quranic Font */}
                  <div className="pt-4 border-t border-slate-800/70">
                    <label className="block text-sm font-semibold text-slate-200 mb-2.5">
                      نوع الخط القرآني
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {QURAN_FONTS.map((f) => {
                        const active = settings.fontId === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => onUpdateSettings({ fontId: f.id })}
                            className={`rounded-lg border px-4 py-3 text-right transition-colors cursor-pointer ${
                              active
                                ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200'
                                : 'border-slate-800 bg-[#0E131A] text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-xs text-slate-400 mb-1">
                              {f.labelArabic}
                            </div>
                            <div
                              className="text-lg text-slate-100"
                              style={{ fontFamily: f.fontFamily }}
                            >
                              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Highlight Color & Auto Split */}
                  <div className="pt-4 border-t border-slate-800/70 space-y-4">
                    <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0E131A] px-3.5 py-2.5 cursor-pointer">
                      <span className="text-xs sm:text-sm font-medium text-slate-200">
                        تقسيم الآيات الطويلة تلقائياً إلى شاشات متوازنة
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.autoSplitLongAyahs}
                        onChange={(e) =>
                          onUpdateSettings({
                            autoSplitLongAyahs: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-emerald-400"
                      />
                    </label>

                    {settings.wordRevealMode !== WordRevealMode.StaticFull && (
                      <div>
                        <span className="block text-xs text-slate-400 mb-2">
                          لون تمييز الكلمة أثناء النطق بها
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {HIGHLIGHT_COLORS.map((col) => {
                            const selected = settings.highlightColor === col.hex;
                            return (
                              <button
                                key={col.id}
                                type="button"
                                onClick={() =>
                                  onUpdateSettings({ highlightColor: col.hex })
                                }
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer ${
                                  selected
                                    ? 'border-slate-300 bg-slate-800 text-white'
                                    : 'border-slate-800 bg-[#0E131A] text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-sm shrink-0 border border-white/20"
                                  style={{ backgroundColor: col.hex }}
                                />
                                <span className="truncate">{col.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Translation Language & Sizes */}
                  <div className="pt-4 border-t border-slate-800/70 space-y-4">
                    <div>
                      <label
                        htmlFor="translation-select"
                        className="block text-sm font-semibold text-slate-200 mb-2"
                      >
                        ترجمة معاني القرآن الكريم (١٠ لغات عالمية)
                      </label>
                      <select
                        id="translation-select"
                        value={settings.translationId}
                        onChange={(e) =>
                          onUpdateSettings({ translationId: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                      >
                        {TRANSLATIONS.map((tr) => (
                          <option key={tr.id} value={tr.id}>
                            {tr.labelArabic}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs text-slate-300 mb-1">
                          <label htmlFor="arabic-size">حجم الخط القرآني</label>
                          <span className="font-mono tabular-nums">
                            {Math.round(settings.arabicFontSize * 100)}%
                          </span>
                        </div>
                        <input
                          id="arabic-size"
                          type="range"
                          min={0.75}
                          max={1.35}
                          step={0.05}
                          value={settings.arabicFontSize}
                          onChange={(e) =>
                            onUpdateSettings({
                              arabicFontSize: Number(e.target.value),
                            })
                          }
                          className="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-slate-300 mb-1">
                          <label htmlFor="trans-size">حجم خط الترجمة</label>
                          <span className="font-mono tabular-nums">
                            {Math.round(settings.translationFontSize * 100)}%
                          </span>
                        </div>
                        <input
                          id="trans-size"
                          type="range"
                          min={0.75}
                          max={1.3}
                          step={0.05}
                          value={settings.translationFontSize}
                          onChange={(e) =>
                            onUpdateSettings({
                              translationFontSize: Number(e.target.value),
                            })
                          }
                          className="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0E131A] px-3 py-2 text-xs text-slate-300 cursor-pointer">
                        <span>اسم السورة أعلى المقطع</span>
                        <input
                          type="checkbox"
                          checked={settings.showSurahHeader}
                          onChange={(e) =>
                            onUpdateSettings({
                              showSurahHeader: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 accent-emerald-400"
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0E131A] px-3 py-2 text-xs text-slate-300 cursor-pointer">
                        <span>اسم القارئ أسفل المقطع</span>
                        <input
                          type="checkbox"
                          checked={settings.showReciterFooter}
                          onChange={(e) =>
                            onUpdateSettings({
                              showReciterFooter: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 accent-emerald-400"
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0E131A] px-3 py-2 text-xs text-slate-300 cursor-pointer">
                        <span>شريط التقدم السفلي</span>
                        <input
                          type="checkbox"
                          checked={settings.showProgressBar}
                          onChange={(e) =>
                            onUpdateSettings({
                              showProgressBar: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 accent-emerald-400"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SADAQAH JARIYAH DEDICATION & FAST 720p HD EXPORT */}
              {activeTab === 'sadaqah' && (
                <div className="space-y-6">
                  <div>
                    <label
                      htmlFor="sadaqah-input"
                      className="block text-sm font-semibold text-slate-200 mb-1.5"
                    >
                      سطر الإهداء أو الصدقة الجارية داخل الفيديو (اختياري)
                    </label>
                    <p className="text-xs text-slate-400 mb-3">
                      يظهر بخط هادئ أسفل الفيديو بدون أي شعارات للموقع. يمكنك كتابة دعاء أو اسم من تحب أو تركه فارغاً تماماً.
                    </p>
                    <input
                      id="sadaqah-input"
                      type="text"
                      maxLength={75}
                      value={settings.sadaqahText}
                      onChange={(e) =>
                        onUpdateSettings({ sadaqahText: e.target.value })
                      }
                      placeholder="مثال: صدقة جارية عن عائلة فاروق جبل..."
                      className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none mb-2.5"
                    />

                    <div className="flex flex-wrap gap-2">
                      {[
                        'صدقة جارية عن عائلة فاروق جبل',
                        'صدقة جارية عن موتانا وموتى المسلمين',
                        'اللهم اجعل القرآن العظيم ربيع قلوبنا',
                        '',
                      ].map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            onUpdateSettings({ sadaqahText: suggestion })
                          }
                          className="rounded-md border border-slate-800 bg-[#0E131A] px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:text-white cursor-pointer"
                        >
                          {suggestion || 'إخفاء النص الإضافي تماماً'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Locked Fast 720p HD Quality */}
                  <div className="pt-4 border-t border-slate-800/70">
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3.5 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-emerald-200 tabular-nums">
                          جودة التصدير المعتمدة: 720p HD سريع
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">
                          حجم ملف مثالي وتصدير فائق السرعة مناسب لواتساب، تيك توك، إنستغرام ريلز، ويوتيوب شورتس
                        </div>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-emerald-300 shrink-0">
                        720p HD
                      </span>
                    </div>
                  </div>

                  {/* Share & Audio-only Actions */}
                  <div className="pt-4 border-t border-slate-800/70 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleShareClick}
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs sm:text-sm font-medium text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-300">
                            تم نسخ رابط الصدقة الجارية!
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-emerald-400" />
                          <span>نسخ رابط مباشر للمقطع كصدقة جارية</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={!reelData || isLoadingReel}
                      onClick={() => reelData && exportAudioWav(reelData)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs sm:text-sm font-medium text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <FileAudio className="w-4 h-4 text-amber-300" />
                      <span>تحميل التلاوة الصوتية فقط (WAV)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Synchronized Chunks Timeline Inspector */}
            {reelData && reelData.chunks.length > 0 && (
              <div className="border-t border-slate-800/80 bg-[#0E131A] px-5 py-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-slate-300">
                    الشاشات المتزامنة للمقطع (اضغط للانتقال الفوري):
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {reelData.chunks.length} شاشة عرض
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1.5">
                  {reelData.chunks.map((chunk) => {
                    const isCurrentChunk =
                      currentTime >= chunk.startSec && currentTime < chunk.endSec;
                    return (
                      <button
                        key={chunk.id}
                        type="button"
                        onClick={() => handleSeek(chunk.startSec + 0.02)}
                        className={`shrink-0 max-w-[210px] rounded-lg border px-3 py-2 text-right transition-colors cursor-pointer ${
                          isCurrentChunk
                            ? 'border-emerald-500/70 bg-emerald-500/10 text-slate-100'
                            : 'border-slate-800 bg-[#121820] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-[11px] text-emerald-400 font-mono tabular-nums mb-0.5">
                          {formatSeconds(chunk.startSec)} – {formatSeconds(chunk.endSec)}
                        </div>
                        <div className="text-xs truncate">{chunk.arabicText}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Live Video Preview & Export Column */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
            <div className="rounded-xl border border-slate-800/90 bg-[#121820] p-4 sm:p-5">
              <div className="relative mx-auto flex items-center justify-center rounded-lg bg-[#070A0E] border border-slate-800/80 overflow-hidden p-2">
                <div
                  className={`relative w-full overflow-hidden rounded-md shadow-lg ${
                    settings.aspectRatio === VideoAspectRatio.Vertical9x16
                      ? 'max-w-[290px] aspect-[9/16]'
                      : settings.aspectRatio === VideoAspectRatio.Square1x1
                      ? 'max-w-[380px] aspect-square'
                      : 'w-full aspect-video'
                  }`}
                >
                  <canvas
                    ref={previewCanvasRef}
                    width={previewDims.width}
                    height={previewDims.height}
                    onClick={togglePlayPause}
                    className="h-full w-full object-contain cursor-pointer block"
                  />

                  {/* Subtle HTML Play button overlay when paused at 00:00 */}
                  {!isPlaying && !isLoadingReel && !reelError && reelData && !hasInteractedPlay && (
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      aria-label="تشغيل المعاينة الحية لظهور الكلمات"
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 hover:bg-black/35 transition-colors cursor-pointer group"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/95 text-slate-950 shadow-lg group-hover:scale-105 transition-transform">
                        <Play className="w-5 h-5 fill-current" />
                      </span>
                      <span className="mt-2 rounded bg-black/65 px-2.5 py-1 text-[11px] font-medium text-slate-100">
                        اضغط لمعاينة كتابة الكلمات مع الصوت
                      </span>
                    </button>
                  )}

                  {/* Loading Overlay */}
                  {isLoadingReel && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs p-5 text-center">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                      <p className="text-xs sm:text-sm font-medium text-slate-100">
                        {loadingMessage || 'جاري تجهيز التلاوة والآيات...'}
                      </p>
                    </div>
                  )}

                  {/* Error Overlay */}
                  {reelError && !isLoadingReel && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-5 text-center">
                      <p className="text-sm font-semibold text-red-300 mb-3">
                        {reelError}
                      </p>
                      <button
                        type="button"
                        onClick={onReloadReel}
                        className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Audio & Scrubber Transport Controls */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!reelData || isLoadingReel}
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل المعاينة'}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!reelData || isLoadingReel}
                    onClick={() => handleSeek(0)}
                    aria-label="إعادة من البداية"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#0E131A] text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <div className="flex-1">
                    <input
                      type="range"
                      aria-label="شريط تقديم وتأخير المقطع"
                      min={0}
                      max={reelData?.totalDurationSec || 1}
                      step={0.05}
                      value={Math.min(currentTime, reelData?.totalDurationSec || 1)}
                      disabled={!reelData || isLoadingReel}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer block"
                    />
                    <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-1">
                      <span>{formatSeconds(currentTime)}</span>
                      <span>{formatSeconds(reelData?.totalDurationSec || 0)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMuted((m) => !m)}
                    aria-label={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#0E131A] text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Primary Fast 720p HD Export MP4 Action */}
                {isExporting ? (
                  <div className="rounded-lg border border-emerald-500/40 bg-[#0E131A] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-emerald-300 flex items-center gap-2">
                        <Film className="w-4 h-4 animate-pulse" />
                        {exportProgress.message}
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelExport}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-red-300 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>إلغاء</span>
                      </button>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-transform duration-150 origin-right"
                        style={{
                          transform: `scaleX(${Math.max(
                            0.03,
                            exportProgress.percent / 100
                          )})`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={!reelData || isLoadingReel}
                      onClick={handleExportVideo}
                      className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-emerald-400 px-5 py-3.5 text-sm sm:text-base font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>
                        تصدير وتحميل الفيديو MP4 (سريع 720p HD · بدون علامة مائية)
                      </span>
                    </button>

                    {exportProgress.status === 'done' && (
                      <p className="text-center text-xs text-emerald-400 font-medium">
                        {exportProgress.message}
                      </p>
                    )}

                    {exportProgress.status === 'error' && (
                      <p className="text-center text-xs text-red-400">
                        {exportProgress.message}: {exportProgress.errorDetail}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
