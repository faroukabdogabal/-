import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Share2,
} from 'lucide-react';
import {
  ExportedPosterImage,
  ExportedVideoFile,
} from '../services/videoExporter';
import { PreparedReelData, StudioSettings } from '../types/quran';

type ShareFormatMode = 'video' | 'image' | 'text';

interface SocialShareDockProps {
  reelData: PreparedReelData | null;
  settings: StudioSettings;
  lastExportedVideo: ExportedVideoFile | null;
  isExportingVideo: boolean;
  onPrepareVideoForShare: () => Promise<ExportedVideoFile | null>;
  onCapturePosterImage: () => Promise<ExportedPosterImage | null>;
  onRecordSocialShare?: () => void;
  onRecordPosterExport?: () => void;
  onPosterSaved?: (poster: ExportedPosterImage) => void;
}

interface SocialPlatformItem {
  id: string;
  nameArabic: string;
  getTextShareHref?: (fullText: string, shareUrl: string, title: string) => string;
  renderIcon: () => React.ReactNode;
}

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

async function copyImageBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function' &&
      typeof ClipboardItem !== 'undefined'
    ) {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    // Clipboard image write may be restricted in some browsers
  }
  return false;
}

function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

function detectNativeVideoShareSupport(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return false;
  }
  // Cross-origin iframes block navigator.share unless explicitly delegated
  try {
    if (window.self !== window.top) {
      return false;
    }
  } catch {
    return false;
  }
  try {
    const dummyVideo = new File([new Uint8Array(1)], 'reel.mp4', {
      type: 'video/mp4',
    });
    return navigator.canShare({ files: [dummyVideo] });
  } catch {
    return false;
  }
}

const SOCIAL_PLATFORMS: SocialPlatformItem[] = [
  {
    id: 'facebook',
    nameArabic: 'فيسبوك',
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-xs">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M13.6 21v-8.2h2.75l.41-3.2H13.6V7.56c0-.93.26-1.56 1.59-1.56h1.7V3.14A22.7 22.7 0 0 0 14.42 3c-2.45 0-4.12 1.49-4.12 4.23v2.37H7.55v3.2h2.75V21h3.3Z" />
        </svg>
      </span>
    ),
  },
  {
    id: 'instagram',
    nameArabic: 'إنستغرام',
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-300 via-pink-600 to-purple-700 text-white shadow-xs">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-none stroke-current"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </span>
    ),
  },
  {
    id: 'whatsapp',
    nameArabic: 'واتساب',
    getTextShareHref: (fullText) =>
      `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`,
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xs">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm5.82 14.01c-.24.68-1.41 1.3-1.95 1.38-.5.08-1.13.11-1.83-.11-.42-.13-.97-.31-1.67-.61-2.94-1.27-4.86-4.23-5.01-4.43-.15-.2-1.2-1.59-1.2-3.04 0-1.45.76-2.16 1.03-2.46.27-.3.59-.37.79-.37.2 0 .4.01.57.01.18 0 .43-.07.67.51.24.59.84 2.04.91 2.19.07.15.12.32.02.52-.1.2-.15.32-.3.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.73.81 2.02.96.3.15.49.22.57.34.07.13.07.72-.17 1.4Z" />
        </svg>
      </span>
    ),
  },
  {
    id: 'youtube',
    nameArabic: 'يوتيوب',
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FF0000] text-white shadow-xs">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M9.5 7.5v9l7.5-4.5-7.5-4.5Z" />
        </svg>
      </span>
    ),
  },
  {
    id: 'tiktok',
    nameArabic: 'تيك توك',
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#080B10] border border-slate-700 text-white shadow-xs">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
        </svg>
      </span>
    ),
  },
  {
    id: 'wechat',
    nameArabic: 'وي تشات',
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#07C160] text-white shadow-xs">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M9.5 4C5.36 4 2 6.84 2 10.35c0 1.98 1.07 3.74 2.76 4.91l-.7 2.13 2.46-1.23c.93.26 1.93.4 2.98.4.32 0 .63-.02.94-.05-.2-.63-.31-1.3-.31-1.99 0-3.58 3.44-6.48 7.68-6.48.32 0 .64.02.95.05C17.9 5.69 14.08 4 9.5 4Zm-2.6 3.9a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Zm5.1 0a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Zm4.5 1.6c-3.59 0-6.5 2.42-6.5 5.4s2.91 5.4 6.5 5.4c.85 0 1.66-.14 2.41-.39l2.04 1.02-.56-1.73C21.65 18.23 23 16.74 23 14.9c0-2.98-2.91-5.4-6.5-5.4Zm-2.15 2.95a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Zm4.3 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Z" />
        </svg>
      </span>
    ),
  },
  {
    id: 'messenger',
    nameArabic: 'ماسنجر',
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-purple-600 text-white shadow-xs">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.56.6.93 1.12.7l1.99-.88a.8.8 0 0 1 .54-.04c.91.25 1.88.38 2.89.38 5.64 0 10-4.13 10-9.68S17.64 2 12 2Zm6 7.46-2.93 4.67a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.93-4.67a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
        </svg>
      </span>
    ),
  },
  {
    id: 'telegram',
    nameArabic: 'تيليجرام',
    getTextShareHref: (fullText, shareUrl) =>
      `https://t.me/share/url?url=${encodeURIComponent(
        shareUrl
      )}&text=${encodeURIComponent(fullText)}`,
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#26A5E4] text-white shadow-xs">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M19.83 4.63 3.74 10.84c-1.1.44-1.09 1.05-.2 1.32l4.13 1.29 9.56-6.03c.45-.27.86-.12.52.18l-7.74 6.99-.29 4.25c.42 0 .6-.19.84-.42l2-1.94 4.16 3.07c.77.42 1.32.2 1.51-.71l2.73-12.87c.28-1.12-.43-1.63-1.13-1.34Z" />
        </svg>
      </span>
    ),
  },
  {
    id: 'snapchat',
    nameArabic: 'سناب شات',
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFFC00] text-slate-950 shadow-xs">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-white stroke-slate-950"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="M12 3.5c-2.7 0-4.8 2.1-4.8 4.9 0 .8.1 1.6.2 2.2-.4.2-.9.3-1.4.2-.4-.1-.8.2-.8.6 0 .5.5.9 1.2 1.2.2.1.3.3.2.5-.5 1.3-1.6 2.3-2.9 2.7-.4.1-.6.5-.4.9.3.5 1.1.8 2.2.9.2 0 .4.2.5.5.2.6.6.8 1.2.8.6 0 1.2-.2 2-.2.9 0 1.7.8 2.8.8s1.9-.8 2.8-.8c.8 0 1.4.2 2 .2.6 0 1-.2 1.2-.8.1-.3.3-.5.5-.5 1.1-.1 1.9-.4 2.2-.9.2-.4 0-.8-.4-.9-1.3-.4-2.4-1.4-2.9-2.7-.1-.2 0-.4.2-.5.7-.3 1.2-.7 1.2-1.2 0-.4-.4-.7-.8-.6-.5.1-1 0-1.4-.2.1-.6.2-1.4.2-2.2 0-2.8-2.1-4.9-4.8-4.9Z" />
        </svg>
      </span>
    ),
  },
  {
    id: 'reddit',
    nameArabic: 'ريديت',
    getTextShareHref: (fullText, _shareUrl, title) =>
      `https://www.reddit.com/submit?selftext=true&title=${encodeURIComponent(
        title
      )}&text=${encodeURIComponent(fullText)}`,
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF4500] text-white shadow-xs">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M22 12c0-1.1-.9-2-2-2-.53 0-1.01.21-1.37.55-1.35-.94-3.18-1.55-5.22-1.64l.89-4.18 2.89.62a1.45 1.45 0 1 0 .3-1.39l-3.25-.69a.55.55 0 0 0-.65.42l-1.02 4.78c-2.09.07-3.96.68-5.34 1.63A1.99 1.99 0 0 0 4 10c-1.1 0-2 .9-2 2 0 .81.49 1.51 1.19 1.82-.04.27-.07.55-.07.83 0 3.23 3.98 5.85 8.88 5.85s8.88-2.62 8.88-5.85c0-.28-.03-.56-.07-.83.7-.31 1.19-1.01 1.19-1.82ZM8.5 13.5a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0Zm7.14 3.45c-.86.86-2.5 1.05-3.64 1.05s-2.78-.19-3.64-1.05a.45.45 0 0 1 .64-.64c.62.62 1.98.79 3 .79s2.38-.17 3-.79a.45.45 0 1 1 .64.64Zm-.39-2.2a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
        </svg>
      </span>
    ),
  },
  {
    id: 'x',
    nameArabic: 'إكس (X)',
    getTextShareHref: (fullText) =>
      `https://x.com/intent/post?text=${encodeURIComponent(
        fullText.length > 275 ? `${fullText.slice(0, 272)}...` : fullText
      )}`,
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#090D14] border border-slate-700 text-white shadow-xs">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </span>
    ),
  },
  {
    id: 'threads',
    nameArabic: 'ثريدز',
    getTextShareHref: (fullText) =>
      `https://www.threads.net/intent/post?text=${encodeURIComponent(
        fullText.length > 490 ? `${fullText.slice(0, 487)}...` : fullText
      )}`,
    renderIcon: () => (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#090D14] border border-slate-700 text-white shadow-xs">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-none stroke-current"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12a7 7 0 1 0-2.1 5c1.5 1.4 3.8 1.1 4.6-.9.7-1.7.2-4.6-2.3-5.6-1.6-.6-3.7-.4-4.9.7-1.1 1-1.3 2.7-.2 3.7 1.1 1 2.9.8 3.6-.5.5-.9.5-2.3-.1-3.6-.7-1.4-2.2-2.2-4-2" />
        </svg>
      </span>
    ),
  },
];

export function SocialShareDock({
  reelData,
  settings,
  lastExportedVideo,
  isExportingVideo,
  onPrepareVideoForShare,
  onCapturePosterImage,
  onRecordSocialShare,
  onRecordPosterExport,
  onPosterSaved,
}: SocialShareDockProps) {
  const canNativeShareVideo = useMemo(() => detectNativeVideoShareSupport(), []);

  const [shareMode, setShareMode] = useState<ShareFormatMode>(() =>
    detectNativeVideoShareSupport() ? 'video' : 'image'
  );
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [isBusySharing, setIsBusySharing] = useState(false);
  const [generatedPoster, setGeneratedPoster] = useState<{
    blob: Blob;
    filename: string;
    previewUrl: string;
  } | null>(null);

  // Clean up object URL when poster changes or unmounts
  useEffect(() => {
    return () => {
      if (generatedPoster?.previewUrl) {
        URL.revokeObjectURL(generatedPoster.previewUrl);
      }
    };
  }, [generatedPoster]);

  // Reset cached poster when verse or visual settings change
  useEffect(() => {
    setGeneratedPoster(null);
    setFeedbackBanner(null);
  }, [
    reelData,
    settings.backgroundId,
    settings.customBgUrl,
    settings.aspectRatio,
    settings.fontId,
    settings.sadaqahText,
  ]);

  const sharePayload = useMemo(() => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname
        : 'https://quranreels.tech/';
    const url = new URL(origin);
    url.searchParams.set('surah', String(settings.surahId));
    url.searchParams.set('from', String(settings.fromAyah));
    url.searchParams.set('to', String(settings.toAyah));
    url.searchParams.set('reciter', settings.reciterId);
    url.searchParams.set('bg', settings.backgroundId);
    url.searchParams.set('trans', settings.translationId);
    if (settings.sadaqahText.trim()) {
      url.searchParams.set('sadaqah', settings.sadaqahText.trim());
    }

    const versesCombined = reelData
      ? reelData.chunks.map((c) => c.arabicText.trim()).join(' ۝ ')
      : '';
    const surahLabel = reelData
      ? `سورة ${reelData.surah.nameArabic} (الآيات ${reelData.fromAyah}–${reelData.toAyah})`
      : 'مقطع قرآني';
    const reciterLabel = reelData ? `تلاوة القارئ: ${reelData.reciter.nameArabic}` : '';
    const dedication = settings.sadaqahText.trim()
      ? settings.sadaqahText.trim()
      : 'صدقة جارية عن عائلة فاروق جبل';

    const title = `${surahLabel} — ${dedication}`;
    const fullQuranicText = versesCombined
      ? `﴿ ${versesCombined} ﴾\n\n${surahLabel}\n${reciterLabel}\n${dedication}\n${url.toString()}`
      : `${title}\n${url.toString()}`;

    return {
      url: url.toString(),
      title,
      fullQuranicText,
    };
  }, [reelData, settings]);

  const shareAsPosterImage = async (platformName: string) => {
    if (!reelData) return;
    setIsBusySharing(true);
    try {
      const poster = await onCapturePosterImage();
      if (!poster) {
        await copyTextSafe(sharePayload.fullQuranicText);
        onRecordSocialShare?.();
        setFeedbackBanner(
          `تم نسخ نص الآيات الكريمة لـ ${platformName} في الحافظة بنجاح.`
        );
        return;
      }

      const previewUrl = URL.createObjectURL(poster.blob);
      setGeneratedPoster({
        blob: poster.blob,
        filename: poster.filename,
        previewUrl,
      });

      // 1. Try native OS image file share first (Mobile / supported OS)
      if (canNativeShareVideo && typeof navigator.share === 'function') {
        try {
          const imgFile = new File([poster.blob], poster.filename, {
            type: 'image/png',
          });
          if (navigator.canShare?.({ files: [imgFile] })) {
            await navigator.share({
              files: [imgFile],
              title: sharePayload.title,
              text: sharePayload.fullQuranicText,
            });
            onRecordSocialShare?.();
            setFeedbackBanner(
              `تم فتح مشاركة صورة البطاقة القرآنية مباشرة لـ ${platformName}.`
            );
            return;
          }
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return;
        }
      }

      // 2. Desktop / iframe fallback: copy PNG image directly to Clipboard — NO empty video window!
      const copiedImg = await copyImageBlobToClipboard(poster.blob);
      onRecordSocialShare?.();
      if (copiedImg) {
        setFeedbackBanner(
          `تم نسخ بطاقة الآية كصورة عالية الجودة (PNG) لـ ${platformName} — الصقها مباشرة (Ctrl+V) بدون الحاجة لفتح نافذة رفع فيديو.`
        );
      } else {
        await copyTextSafe(sharePayload.fullQuranicText);
        triggerFileDownload(poster.blob, poster.filename);
        onRecordPosterExport?.();
        setFeedbackBanner(
          `تم حفظ صورة البطاقة القرآنية (PNG) ونسخ نص الآيات لـ ${platformName} جاهزة للنشر الفوري.`
        );
      }
    } finally {
      setIsBusySharing(false);
    }
  };

  const handleVideoModePlatformClick = async (platform: SocialPlatformItem) => {
    if (!reelData) return;

    // Case 1: Video is already exported AND device supports native MP4 file sharing
    if (lastExportedVideo && typeof navigator.share === 'function') {
      try {
        const videoFile = new File(
          [lastExportedVideo.blob],
          lastExportedVideo.filename,
          { type: lastExportedVideo.mimeType }
        );
        if (navigator.canShare?.({ files: [videoFile] })) {
          await navigator.share({
            files: [videoFile],
            title: sharePayload.title,
            text: sharePayload.fullQuranicText,
          });
          onRecordSocialShare?.();
          setFeedbackBanner(
            `تم إرسال ملف الفيديو (MP4) مباشرة إلى ${platform.nameArabic}.`
          );
          return;
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Case 2: Device supports native MP4 file sharing, but video hasn't been rendered yet
    if (canNativeShareVideo && !lastExportedVideo) {
      setFeedbackBanner(
        `جاري تجهيز ملف الفيديو (720p MP4) لمشاركته مباشرة على ${platform.nameArabic}...`
      );
      const prepared = await onPrepareVideoForShare();
      if (prepared) {
        setFeedbackBanner(
          `أصبح ملف الفيديو MP4 جاهزاً! اضغط على أيقونة ${platform.nameArabic} مرة واحدة لإرسال الفيديو نفسه مباشرة.`
        );
      }
      return;
    }

    // Case 3: Browser/Desktop does NOT support injecting MP4 files directly into social apps ->
    // Automatically share cleanly as Image Card / Text WITHOUT opening any empty video upload window!
    await shareAsPosterImage(platform.nameArabic);
  };

  const handleTextModePlatformClick = async (platform: SocialPlatformItem) => {
    await copyTextSafe(sharePayload.fullQuranicText);
    onRecordSocialShare?.();
    if (platform.getTextShareHref) {
      setFeedbackBanner(
        `تم تجهيز نص الآيات الكريمة كاملة للمشاركة النصية المباشرة على ${platform.nameArabic}.`
      );
    } else {
      setFeedbackBanner(
        `تم نسخ نص الآيات الكريمة مع الإهداء في الحافظة — الصقه مباشرة (Ctrl+V) على ${platform.nameArabic} بدون فتح نافذة فيديو فارغة.`
      );
    }
  };

  return (
    <div className="pt-3 border-t border-slate-800/80 space-y-3">
      {/* Header & Share Mode Switcher */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>مشاركة المقطع عبر منصات التواصل الاجتماعي:</span>
          </div>
          {lastExportedVideo && canNativeShareVideo && (
            <span className="text-[11px] text-emerald-400 font-medium whitespace-nowrap">
              ملف MP4 جاهز للإرسال المباشر
            </span>
          )}
        </div>

        {/* 3 Share Format Modes: Video File / Image Card / Verse Text */}
        <div
          role="tablist"
          aria-label="نوع المشاركة"
          className="grid grid-cols-3 gap-1 rounded-lg bg-[#0B0F14] p-1 border border-slate-800/90"
        >
          <button
            type="button"
            role="tab"
            aria-selected={shareMode === 'video'}
            onClick={() => setShareMode('video')}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              shareMode === 'video'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5 shrink-0" />
            <span>الفيديو MP4</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={shareMode === 'image'}
            onClick={() => setShareMode('image')}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              shareMode === 'image'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span>كصورة بطاقة</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={shareMode === 'text'}
            onClick={() => setShareMode('text')}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              shareMode === 'text'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>كنص الآيات</span>
          </button>
        </div>

        {/* Subtle status helper explaining active mode */}
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {shareMode === 'video'
            ? canNativeShareVideo
              ? lastExportedVideo
                ? 'اضغط على أي منصة لإرسال ملف الفيديو (MP4) نفسه مباشرة لتطبيقات جهازك.'
                : 'اضغط لتجهيز وإرسال ملف الفيديو (MP4) نفسه مباشرة لتطبيقات جهازك.'
              : 'متصفح الكمبيوتر لا يسمح برفع ملف الفيديو تلقائياً للمواقع — سيتم نسخ ومشاركة المقطع كصورة بطاقة قرآنية بدون فتح نافذة فيديو فارغة.'
            : shareMode === 'image'
            ? 'ينسخ ويشارك بطاقة الآيات كصورة عالية الجودة (720p PNG) بدون فتح أي نافذة فيديو فارغة.'
            : 'يشارك نص الآيات الكريمة كاملة مع الإهداء مباشرة كرسالة أو منشور نصي.'}
        </p>
      </div>

      {/* Optional Prepare Video Button when on mobile native share and not exported yet */}
      {shareMode === 'video' && canNativeShareVideo && !lastExportedVideo && (
        <button
          type="button"
          disabled={!reelData || isExportingVideo || isBusySharing}
          onClick={() => {
            void onPrepareVideoForShare();
          }}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-500/45 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isExportingVideo ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />
          ) : (
            <Film className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span>تجهيز ملف الفيديو (MP4) للإرسال المباشر للتطبيقات</span>
        </button>
      )}

      {/* 12 Social Media Platforms Grid (10 original + X + Threads) */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {SOCIAL_PLATFORMS.map((platform) => {
          // Only use a text intent anchor in 'text' mode for platforms that genuinely pre-fill text (never empty video upload pages!)
          const textIntentHref =
            shareMode === 'text' && platform.getTextShareHref
              ? platform.getTextShareHref(
                  sharePayload.fullQuranicText,
                  sharePayload.url,
                  sharePayload.title
                )
              : null;

          if (textIntentHref) {
            return (
              <a
                key={platform.id}
                href={textIntentHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void handleTextModePlatformClick(platform);
                }}
                className="group flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800/90 bg-[#0E131A] px-2 py-2.5 text-center hover:border-emerald-500/50 hover:bg-slate-800/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                <div className="group-hover:scale-105 transition-transform duration-150">
                  {platform.renderIcon()}
                </div>
                <span className="text-[11px] font-semibold text-slate-200 group-hover:text-white whitespace-nowrap truncate max-w-full">
                  {platform.nameArabic}
                </span>
              </a>
            );
          }

          return (
            <button
              key={platform.id}
              type="button"
              disabled={!reelData || isBusySharing || isExportingVideo}
              onClick={() => {
                if (shareMode === 'video') {
                  void handleVideoModePlatformClick(platform);
                } else if (shareMode === 'image') {
                  void shareAsPosterImage(platform.nameArabic);
                } else {
                  void handleTextModePlatformClick(platform);
                }
              }}
              className="group flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800/90 bg-[#0E131A] px-2 py-2.5 text-center hover:border-emerald-500/50 hover:bg-slate-800/70 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              <div className="group-hover:scale-105 transition-transform duration-150">
                {platform.renderIcon()}
              </div>
              <span className="text-[11px] font-semibold text-slate-200 group-hover:text-white whitespace-nowrap truncate max-w-full">
                {platform.nameArabic}
              </span>
            </button>
          );
        })}
      </div>

      {/* Inline Generated Poster Image Preview & Quick Copy/Download Bar (when sharing as Image) */}
      {generatedPoster && (shareMode === 'image' || !canNativeShareVideo) && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0B0F14] p-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={generatedPoster.previewUrl}
              alt="معاينة بطاقة الآية المصورة"
              className="h-12 w-12 rounded-md object-cover border border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">
                بطاقة الآية المصورة جاهزة (720p PNG)
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                جاهزة للصق (Ctrl+V) أو التحميل المباشر
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                void copyImageBlobToClipboard(generatedPoster.blob).then((ok) => {
                  setFeedbackBanner(
                    ok
                      ? 'تم نسخ الصورة في الحافظة — اضغط Ctrl+V للصقها في أي منصة.'
                      : 'تم تنزيل بطاقة الصورة PNG على جهازك.'
                  );
                  if (!ok) {
                    triggerFileDownload(
                      generatedPoster.blob,
                      generatedPoster.filename
                    );
                  }
                });
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:text-white cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>نسخ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerFileDownload(generatedPoster.blob, generatedPoster.filename);
                onRecordPosterExport?.();
                onPosterSaved?.({
                  blob: generatedPoster.blob,
                  filename: generatedPoster.filename,
                  mimeType: 'image/png',
                });
              }}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>حفظ PNG</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Copy Full Verse Text Bar when in Text Mode */}
      {shareMode === 'text' && reelData && (
        <div className="rounded-lg border border-slate-800 bg-[#0B0F14] p-2.5 space-y-2">
          <p className="text-xs text-slate-300 line-clamp-2 font-serif leading-relaxed">
            {sharePayload.fullQuranicText}
          </p>
          <button
            type="button"
            onClick={() => {
              void copyTextSafe(sharePayload.fullQuranicText).then(() => {
                onRecordSocialShare?.();
                setFeedbackBanner(
                  'تم نسخ نص الآيات الكريمة كاملة مع الإهداء في الحافظة.'
                );
              });
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-slate-800 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>نسخ نص الآيات الكامل للمشاركة</span>
          </button>
        </div>
      )}

      {/* Confirmation Banner */}
      {feedbackBanner && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] leading-relaxed text-emerald-200">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>{feedbackBanner}</span>
        </div>
      )}
    </div>
  );
}
