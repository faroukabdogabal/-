import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Share2,
  X,
} from 'lucide-react';
import {
  ExportedPosterImage,
  ExportedVideoFile,
  triggerBlobDownload,
} from '../services/videoExporter';
import { PreparedReelData, StudioSettings } from '../types/quran';
import { SocialShareDock } from './SocialShareDock';

export interface CompletedExportToastData {
  id: number;
  kind: 'video' | 'image' | 'audio';
  titleArabic: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  surahNameArabic: string;
  fromAyah: number;
  toAyah: number;
}

interface ExportSuccessToastProps {
  toastItem: CompletedExportToastData | null;
  onDismiss: () => void;
  reelData: PreparedReelData | null;
  settings: StudioSettings;
  lastExportedVideo: ExportedVideoFile | null;
  isExportingVideo: boolean;
  onPrepareVideoForShare: () => Promise<ExportedVideoFile | null>;
  onCapturePosterImage: () => Promise<ExportedPosterImage | null>;
  onCopyShareLink: () => Promise<boolean>;
  onRecordSocialShare: () => void;
  onRecordPosterExport: () => void;
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFormatShortLabel(mimeType: string, filename: string): string {
  if (mimeType.includes('mp4') || filename.endsWith('.mp4')) return 'MP4';
  if (mimeType.includes('webm') || filename.endsWith('.webm')) return 'WebM';
  if (mimeType.includes('png') || filename.endsWith('.png')) return 'PNG';
  if (mimeType.includes('wav') || filename.endsWith('.wav')) return 'WAV';
  return 'HD';
}

function canDeviceNativeShareBlob(blob: Blob, filename: string, mimeType: string): boolean {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return false;
  }
  try {
    if (window.self !== window.top) {
      return false;
    }
  } catch {
    return false;
  }
  try {
    const testFile = new File([blob.slice(0, 1)], filename, { type: mimeType });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

export function ExportSuccessToast({
  toastItem,
  onDismiss,
  reelData,
  settings,
  lastExportedVideo,
  isExportingVideo,
  onPrepareVideoForShare,
  onCapturePosterImage,
  onCopyShareLink,
  onRecordSocialShare,
  onRecordPosterExport,
}: ExportSuccessToastProps) {
  const [isShareExpanded, setIsShareExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [downloadedAgain, setDownloadedAgain] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reset internal UI state whenever a new export finishes
  useEffect(() => {
    setIsShareExpanded(false);
    setDownloadedAgain(false);
    setCopiedLink(false);
  }, [toastItem?.id]);

  // Auto-dismiss after 12s ONLY if user hasn't hovered or expanded social share options
  useEffect(() => {
    if (!toastItem || isShareExpanded || isHovered) return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [toastItem, isShareExpanded, isHovered, onDismiss]);

  // Dismiss via Escape key
  useEffect(() => {
    if (!toastItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toastItem, onDismiss]);

  const canNativeShareCurrentFile = useMemo(() => {
    if (!toastItem) return false;
    return canDeviceNativeShareBlob(
      toastItem.blob,
      toastItem.filename,
      toastItem.mimeType
    );
  }, [toastItem]);

  if (!toastItem) {
    return null;
  }

  const formatLabel = getFormatShortLabel(toastItem.mimeType, toastItem.filename);
  const sizeLabel = formatFileSize(toastItem.blob.size);

  const handleDirectDownload = () => {
    triggerBlobDownload(toastItem.blob, toastItem.filename);
    setDownloadedAgain(true);
    window.setTimeout(() => setDownloadedAgain(false), 2500);
  };

  const handleNativeFileShare = async () => {
    if (!canNativeShareCurrentFile) return;
    try {
      const file = new File([toastItem.blob], toastItem.filename, {
        type: toastItem.mimeType,
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `سورة ${toastItem.surahNameArabic} (الآيات ${toastItem.fromAyah}–${toastItem.toAyah})`,
          text: settings.sadaqahText.trim() || 'صدقة جارية',
        });
        onRecordSocialShare();
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }
  };

  const handleQuickCopyLink = async () => {
    const ok = await onCopyShareLink();
    if (ok) {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[440px] z-50"
    >
      <div className="max-h-[84vh] flex flex-col rounded-2xl border border-emerald-500/40 bg-[#121820] text-slate-100 shadow-2xl shadow-black/70 overflow-hidden transition-all duration-150">
        {/* Toast Header */}
        <div className="flex items-start justify-between gap-3 bg-[#0E131A] px-4 py-3.5 border-b border-slate-800/90 shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-50 truncate">
                {toastItem.titleArabic}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400 tabular-nums">
                <span className="text-slate-300 font-medium">
                  سورة {toastItem.surahNameArabic}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  الآيات {toastItem.fromAyah}–{toastItem.toAyah}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-emerald-300">{formatLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{sizeLabel}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="إغلاق إشعار نجاح التصدير"
            className="flex min-h-[40px] min-w-[40px] -my-1 -ml-1.5 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Toast Actions: Direct Download + Share via Social Platforms */}
        <div className="p-4 overflow-y-auto space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleDirectDownload}
              className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-300 active:scale-[0.99] transition-all duration-150 cursor-pointer whitespace-nowrap"
            >
              {downloadedAgain ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>تم التحميل!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 shrink-0" />
                  <span>تحميل مباشر ({formatLabel})</span>
                </>
              )}
            </button>

            <button
              type="button"
              aria-expanded={isShareExpanded}
              onClick={() => setIsShareExpanded((prev) => !prev)}
              className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                isShareExpanded
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                  : 'border-slate-700 bg-slate-800/85 text-slate-100 hover:bg-slate-700/80'
              }`}
            >
              <Share2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>مشاركة عبر المنصات</span>
              {isShareExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
            </button>
          </div>

          {/* Expandable Social Sharing Drawer inside the Toast */}
          {isShareExpanded && (
            <div className="pt-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleQuickCopyLink();
                  }}
                  className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/90 bg-[#0E131A] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">تم نسخ رابط المقطع!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>نسخ رابط المقطع كصدقة جارية</span>
                    </>
                  )}
                </button>

                {canNativeShareCurrentFile && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleNativeFileShare();
                    }}
                    className="min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/45 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>إرسال الملف للتطبيقات</span>
                  </button>
                )}
              </div>

              <SocialShareDock
                reelData={reelData}
                settings={settings}
                lastExportedVideo={
                  toastItem.kind === 'video'
                    ? {
                        blob: toastItem.blob,
                        filename: toastItem.filename,
                        mimeType: toastItem.mimeType,
                      }
                    : lastExportedVideo
                }
                isExportingVideo={isExportingVideo}
                onPrepareVideoForShare={onPrepareVideoForShare}
                onCapturePosterImage={onCapturePosterImage}
                onRecordSocialShare={onRecordSocialShare}
                onRecordPosterExport={onRecordPosterExport}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
