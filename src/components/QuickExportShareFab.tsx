import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileAudio,
  Film,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Share2,
  Sliders,
  X,
} from 'lucide-react';
import {
  ExportedPosterImage,
  ExportedVideoFile,
  triggerBlobDownload,
} from '../services/videoExporter';
import {
  ExportProgressState,
  PreparedReelData,
  StudioSettings,
} from '../types/quran';
import { SocialShareDock } from './SocialShareDock';

interface QuickExportShareFabProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reelData: PreparedReelData | null;
  settings: StudioSettings;
  isLoadingReel: boolean;
  isReadingMode: boolean;
  hasUnappliedAudioChanges: boolean;
  onApplyAudioSelection: () => void;
  exportProgress: ExportProgressState;
  isExporting: boolean;
  lastExportedVideo: ExportedVideoFile | null;
  onExportVideo: () => Promise<void>;
  onCancelExport: () => void;
  onPrepareVideoForShare: () => Promise<ExportedVideoFile | null>;
  onCapturePosterImage: () => Promise<ExportedPosterImage | null>;
  onPosterExported: (poster: ExportedPosterImage) => void;
  onExportAudioWav: () => void;
  onCopyShareLink: () => Promise<boolean>;
  onJumpToSadaqahSettings: () => void;
  onRecordReelExported: () => void;
  onRecordSadaqahShared: () => void;
}

export function QuickExportShareFab({
  isOpen,
  onOpenChange,
  reelData,
  settings,
  isLoadingReel,
  isReadingMode,
  hasUnappliedAudioChanges,
  onApplyAudioSelection,
  exportProgress,
  isExporting,
  lastExportedVideo,
  onExportVideo,
  onCancelExport,
  onPrepareVideoForShare,
  onCapturePosterImage,
  onPosterExported,
  onExportAudioWav,
  onCopyShareLink,
  onJumpToSadaqahSettings,
  onRecordReelExported,
  onRecordSadaqahShared,
}: QuickExportShareFabProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSavingPoster, setIsSavingPoster] = useState(false);
  const [savedPosterDone, setSavedPosterDone] = useState(false);
  const [savedAudioDone, setSavedAudioDone] = useState(false);

  // Close sheet automatically if user enters distraction-free Reading Mode
  useEffect(() => {
    if (isReadingMode && isOpen) {
      onOpenChange(false);
    }
  }, [isReadingMode, isOpen, onOpenChange]);

  // Allow dismissing the quick sheet with Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenChange]);

  // Keep Reading Mode completely distraction-free
  if (isReadingMode) {
    return null;
  }

  const handleQuickCopyLink = async () => {
    const ok = await onCopyShareLink();
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleQuickDownloadPoster = async () => {
    if (!reelData || isSavingPoster) return;
    setIsSavingPoster(true);
    try {
      const poster = await onCapturePosterImage();
      if (poster) {
        triggerBlobDownload(poster.blob, poster.filename);
        onRecordReelExported();
        setSavedPosterDone(true);
        setTimeout(() => setSavedPosterDone(false), 3000);
        onOpenChange(false);
        onPosterExported(poster);
      }
    } finally {
      setIsSavingPoster(false);
    }
  };

  const handleQuickDownloadWav = () => {
    if (!reelData || isLoadingReel) return;
    onExportAudioWav();
    setSavedAudioDone(true);
    setTimeout(() => setSavedAudioDone(false), 3000);
    onOpenChange(false);
  };

  return (
    <>
      {/* Floating Action Button (FAB) — Bottom-right ergonomic thumb zone */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30">
        <button
          type="button"
          onClick={() => onOpenChange(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="التصدير والمشاركة السريعة للمقطع القرآني"
          className="flex min-h-[48px] items-center gap-2.5 rounded-2xl bg-emerald-400 px-4 sm:px-5 py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-black/50 hover:bg-emerald-300 active:scale-[0.98] transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span className="tabular-nums">
                جاري التصدير {Math.round(exportProgress.percent)}%
              </span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 shrink-0" />
              <span>تصدير ومشاركة</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Export & Share Bottom Sheet (Mobile) / Anchored Popover (Desktop) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="نافذة التصدير والمشاركة السريعة"
        >
          {/* Backdrop */}
          <div
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Panel Container */}
          <div className="relative z-10 w-full sm:w-[440px] sm:bottom-20 sm:right-6 sm:fixed max-h-[86vh] sm:max-h-[82vh] flex flex-col rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-800 bg-[#121820] text-slate-100 shadow-2xl overflow-hidden">
            {/* Mobile Drag Handle Affordance */}
            <div
              className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"
              aria-hidden="true"
            />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/90 bg-[#0E131A] px-5 py-3.5 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-50 truncate">
                  التصدير والمشاركة السريعة
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400 tabular-nums">
                  {isLoadingReel ? (
                    <span>جاري تجهيز الآيات والتلاوة...</span>
                  ) : reelData ? (
                    <>
                      <span className="text-slate-300 font-medium">
                        سورة {reelData.surah.nameArabic}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        الآيات {reelData.fromAyah}–{reelData.toAyah}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[160px]">
                        {reelData.reciter.nameArabic}
                      </span>
                    </>
                  ) : (
                    <span>اختر السورة والقارئ للبدء</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="إغلاق نافذة التصدير والمشاركة السريعة"
                className="flex min-h-[44px] min-w-[44px] -my-1 -ml-2 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Quick Actions Content */}
            <div className="overflow-y-auto p-4 sm:p-5 space-y-5">
              {/* Unapplied Draft Surah/Reciter Notice */}
              {hasUnappliedAudioChanges && (
                <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-amber-200 leading-relaxed">
                    لديك تغيير غير مطبّق في اختيار السورة أو القارئ.
                  </span>
                  <button
                    type="button"
                    disabled={isLoadingReel}
                    onClick={onApplyAudioSelection}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                    <span>تطبيق الآن</span>
                  </button>
                </div>
              )}

              {/* 1. Direct Export Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    التصدير والتحميل المباشر
                  </span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {settings.aspectRatio} · 720p HD
                  </span>
                </div>

                {isExporting ? (
                  <div className="rounded-xl border border-emerald-500/40 bg-[#0E131A] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-emerald-300 flex items-center gap-2 min-w-0 truncate">
                        <Film className="w-4 h-4 shrink-0" />
                        <span className="truncate">{exportProgress.message}</span>
                      </span>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono tabular-nums text-emerald-300 font-semibold">
                          {Math.round(exportProgress.percent)}%
                        </span>
                        <button
                          type="button"
                          onClick={onCancelExport}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-red-300 cursor-pointer whitespace-nowrap"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>إلغاء</span>
                        </button>
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 100 4"
                      preserveAspectRatio="none"
                      className="h-2 w-full rounded-full bg-slate-800 overflow-hidden block"
                      aria-hidden="true"
                    >
                      <rect
                        x={100 - Math.max(3, exportProgress.percent)}
                        y="0"
                        width={Math.max(3, exportProgress.percent)}
                        height="4"
                        fill="#34d399"
                      />
                    </svg>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!reelData || isLoadingReel}
                    onClick={() => {
                      void onExportVideo();
                    }}
                    className="w-full min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl bg-emerald-400 px-4 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-300 active:scale-[0.99] transition-all duration-150 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>تصدير وتحميل الفيديو MP4 (720p HD)</span>
                  </button>
                )}

                {exportProgress.status === 'done' && !isExporting && (
                  <p className="text-center text-xs text-emerald-400 font-medium">
                    {exportProgress.message}
                  </p>
                )}

                {exportProgress.status === 'error' && !isExporting && (
                  <p className="text-center text-xs text-red-400">
                    {exportProgress.message}: {exportProgress.errorDetail}
                  </p>
                )}

                {/* Secondary Quick Exports: Poster PNG + Audio WAV */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <button
                    type="button"
                    disabled={!reelData || isLoadingReel || isSavingPoster}
                    onClick={() => {
                      void handleQuickDownloadPoster();
                    }}
                    className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0E131A] px-3 py-2.5 text-xs font-semibold text-slate-200 hover:border-slate-700 hover:bg-slate-800/70 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSavingPoster ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />
                    ) : savedPosterDone ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span>
                      {savedPosterDone ? 'تم حفظ البطاقة!' : 'حفظ كبطاقة PNG'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!reelData || isLoadingReel}
                    onClick={handleQuickDownloadWav}
                    className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0E131A] px-3 py-2.5 text-xs font-semibold text-slate-200 hover:border-slate-700 hover:bg-slate-800/70 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {savedAudioDone ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <FileAudio className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    )}
                    <span>
                      {savedAudioDone ? 'تم تحميل الصوت!' : 'تحميل الصوت WAV'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Quick Link Copy & Dedication Shortcut */}
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    void handleQuickCopyLink();
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-slate-700/90 bg-slate-800/75 px-3.5 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-700/80 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">تم نسخ رابط المقطع!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>نسخ رابط المقطع المباشر</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onJumpToSadaqahSettings();
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0E131A] px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>تخصيص الإهداء بالاستوديو</span>
                </button>
              </div>

              {/* 3. Full Social Media Platforms Dock (Video MP4 / Image Card / Text) */}
              <SocialShareDock
                reelData={reelData}
                settings={settings}
                lastExportedVideo={lastExportedVideo}
                isExportingVideo={isExporting}
                onPrepareVideoForShare={onPrepareVideoForShare}
                onCapturePosterImage={onCapturePosterImage}
                onRecordSocialShare={onRecordSadaqahShared}
                onRecordPosterExport={onRecordReelExported}
                onPosterSaved={(poster) => {
                  onOpenChange(false);
                  onPosterExported(poster);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
