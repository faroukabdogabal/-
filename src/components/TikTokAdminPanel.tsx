import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Unlink,
} from 'lucide-react';
import { SurahMeta } from '../types/quran';
import {
  DAILY_BROADCAST_SLOTS,
  OFFICIAL_TIKTOK_CHANNEL_URL,
  OFFICIAL_TIKTOK_DISPLAY,
  OFFICIAL_TIKTOK_HANDLE,
  OFFICIAL_TIKTOK_HASHTAGS,
  type SequentialKhatmahBatch,
} from '../utils/tiktokKhatmahPlanner';

const DEV_CALLBACK_URL =
  'https://ais-dev-bgrtkhykcmq7jqmzwd3k5q-467665018345.europe-west3.run.app/auth/tiktok/callback';
const SHARED_CALLBACK_URL =
  'https://ais-pre-bgrtkhykcmq7jqmzwd3k5q-467665018345.europe-west3.run.app/auth/tiktok/callback';

interface AdminTikTokStatusResponse {
  config: {
    isEnabled: boolean;
    timezone: string;
    ayahsPerReel: number;
    currentSurahId: number;
    currentFromAyah: number;
    khatmahCycle: number;
    isAigcEnabled: boolean;
    privacyLevel: string;
    postMode: string;
    hashtags: string;
    totalPublishedCount: number;
    lastPublishedAt: string | null;
    lastError: string | null;
  };
  credentials: {
    hasClientKey: boolean;
    hasClientSecret: boolean;
    isConfigured: boolean;
  };
  account: {
    openId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    scope: string;
    expiresAt: string;
  } | null;
  currentBatch: SequentialKhatmahBatch;
  isJobRunning: boolean;
  logs: Array<{
    id: number;
    slotKey: string;
    scheduledTimeLabel: string;
    khatmahCycle: number;
    surahId: number;
    surahNameArabic: string;
    fromAyah: number;
    toAyah: number;
    reciterNameArabic: string;
    status: string;
    videoDurationSec: number | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

interface TikTokAdminPanelProps {
  currentUser: User;
  surahs: SurahMeta[];
}

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback
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

export function TikTokAdminPanel({
  currentUser,
  surahs,
}: TikTokAdminPanelProps) {
  const [statusData, setStatusData] = useState<AdminTikTokStatusResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState<boolean>(false);
  const [isPublishingNow, setIsPublishingNow] = useState<boolean>(false);
  const [isDownloadingMp4, setIsDownloadingMp4] = useState<boolean>(false);
  const [blockedPopupAuthUrl, setBlockedPopupAuthUrl] = useState<string | null>(
    null
  );
  const [copiedUrlKey, setCopiedUrlKey] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable config fields
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [timezone, setTimezone] = useState<string>('Africa/Cairo');
  const [currentSurahId, setCurrentSurahId] = useState<number>(1);
  const [currentFromAyah, setCurrentFromAyah] = useState<number>(1);
  const [khatmahCycle, setKhatmahCycle] = useState<number>(1);
  const [isAigcEnabled, setIsAigcEnabled] = useState<boolean>(true);
  const [postMode, setPostMode] = useState<string>('DIRECT_POST');
  const [privacyLevel, setPrivacyLevel] = useState<string>('PUBLIC_TO_EVERYONE');
  const [hashtags, setHashtags] = useState<string>(OFFICIAL_TIKTOK_HASHTAGS);

  const fetchAdminStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/tiktok/admin/status', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'تعذر تحميل بيانات أتمتة تيك توك.');
      }
      const typed = json as AdminTikTokStatusResponse;
      setStatusData(typed);
      setIsEnabled(typed.config.isEnabled);
      setTimezone(typed.config.timezone || 'Africa/Cairo');
      setCurrentSurahId(typed.config.currentSurahId || 1);
      setCurrentFromAyah(typed.config.currentFromAyah || 1);
      setKhatmahCycle(typed.config.khatmahCycle || 1);
      setIsAigcEnabled(typed.config.isAigcEnabled);
      setPostMode(typed.config.postMode || 'DIRECT_POST');
      setPrivacyLevel(typed.config.privacyLevel || 'PUBLIC_TO_EVERYONE');
      setHashtags(typed.config.hashtags || OFFICIAL_TIKTOK_HASHTAGS);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر الاتصال بخادم أتمتة تيك توك.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAdminStatus();
  }, [fetchAdminStatus]);

  // Listen for OAuth popup postMessage callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        origin !== window.location.origin
      ) {
        return;
      }
      if (
        event.data?.type === 'OAUTH_AUTH_SUCCESS' &&
        event.data?.provider === 'tiktok'
      ) {
        setBlockedPopupAuthUrl(null);
        setErrorMsg(null);
        setFeedbackMsg(
          `تم ربط قناة تيك توك (${OFFICIAL_TIKTOK_HANDLE}) بنجاح وتفعيل النشر اليومي المجدول.`
        );
        fetchAdminStatus();
      } else if (
        event.data?.type === 'OAUTH_AUTH_ERROR' &&
        event.data?.provider === 'tiktok'
      ) {
        setErrorMsg(
          event.data?.message || 'تعذر إتمام ربط حساب تيك توك، يرجى التحقق من الإعدادات.'
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchAdminStatus]);

  const handleCopyUrl = async (key: string, value: string) => {
    const ok = await copyTextSafe(value);
    if (ok) {
      setCopiedUrlKey(key);
      setTimeout(() => setCopiedUrlKey(null), 2400);
    }
  };

  const handleConnectTikTok = async () => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setBlockedPopupAuthUrl(null);
    setIsConnectingOAuth(true);

    try {
      const idToken = await currentUser.getIdToken();
      const redirectUri = `${window.location.origin}/auth/tiktok/callback`;
      const res = await fetch(
        `/api/tiktok/auth/url?redirect_uri=${encodeURIComponent(redirectUri)}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(
          json.error || 'تعذر الحصول على رابط تفويض تيك توك الرسمي.'
        );
      }

      // Open TikTok's provider URL directly in popup (never a container route)
      const authWindow = window.open(
        json.url,
        'tiktok_oauth_popup',
        'width=620,height=740'
      );

      if (!authWindow) {
        // Inline fallback link instead of window.alert (iframe-safe)
        setBlockedPopupAuthUrl(json.url);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر بدء ربط حساب تيك توك.'
      );
    } finally {
      setIsConnectingOAuth(false);
    }
  };

  const handleDisconnectTikTok = async () => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/tiktok/admin/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        throw new Error('تعذر فصل الحساب حالياً.');
      }
      setFeedbackMsg('تم فصل جلسة تيك توك بنجاح.');
      fetchAdminStatus();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر فصل الحساب.');
    }
  };

  const handleSaveAutomationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setIsSavingConfig(true);

    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/tiktok/admin/config', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isEnabled,
          timezone,
          currentSurahId,
          currentFromAyah,
          khatmahCycle,
          ayahsPerReel: 10,
          isAigcEnabled,
          postMode,
          privacyLevel,
          hashtags,
          clearError: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'تعذر حفظ الإعدادات.');
      }
      setFeedbackMsg('تم حفظ إعدادات أتمتة تيك توك وجدول الختمة بنجاح.');
      fetchAdminStatus();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر حفظ الإعدادات.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleResetToFatihah = async () => {
    setCurrentSurahId(1);
    setCurrentFromAyah(1);
    setErrorMsg(null);
    setFeedbackMsg(
      'تمت تهيئة المؤشر إلى بداية سورة الفاتحة (الآية 1) — اضغط «حفظ إعدادات الأتمتة» لتأكيدها.'
    );
  };

  const handlePublishNextNow = async () => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setIsPublishingNow(true);

    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/tiktok/admin/publish-next', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'تعذر نشر المقطع الفوري على تيك توك.');
      }

      const modeNote =
        json.finalMode === 'INBOX_DRAFT'
          ? 'تم إرساله إلى صندوق مسودات تيك توك (تطبيق المطور في وضع الاختبار)'
          : 'تم نشره مباشرة على قناة تيك توك';

      setFeedbackMsg(
        `نجح توليد ورفع مقطع سورة ${json.batch?.surahNameArabic} (${json.batch?.fromAyah}–${json.batch?.toAyah}) — ${modeNote} وانتقل المؤشر تلقائياً للدفعة التالية!`
      );
      fetchAdminStatus();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'حدث خطأ أثناء النشر الفوري.'
      );
      fetchAdminStatus();
    } finally {
      setIsPublishingNow(false);
    }
  };

  const handleDownloadNextMp4 = async (advanceCursor: boolean) => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setIsDownloadingMp4(true);

    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/tiktok/admin/download-next-mp4', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: window.location.origin,
          advanceCursor,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error || 'تعذر توليد ملف الفيديو MP4 للدفعة الحالية.'
        );
      }

      const blob = await res.blob();
      const disp = res.headers.get('Content-Disposition') || '';
      const fileMatch = disp.match(/filename="([^"]+)"/);
      const fileName = fileMatch?.[1] || 'quran-khatmah-reel.mp4';

      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000);

      setFeedbackMsg(
        advanceCursor
          ? 'تم توليد وتنزيل فيديو MP4 للدفعة الحالية وتقديم المؤشر للدفعة التالية بنجاح.'
          : 'تم توليد وتنزيل فيديو MP4 (١٠ آيات عمودي 9:16) بنجاح.'
      );
      fetchAdminStatus();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر تنزيل ملف الفيديو MP4.'
      );
    } finally {
      setIsDownloadingMp4(false);
    }
  };

  const selectedSurahMeta =
    surahs.find((s) => s.id === currentSurahId) || surahs[0];

  if (isLoading && !statusData) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        <span className="text-xs sm:text-sm">
          جاري تحميل إعدادات وسجل أتمتة تيك توك...
        </span>
      </div>
    );
  }

  const batch = statusData?.currentBatch;

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300 leading-relaxed">
          {errorMsg}
        </div>
      )}

      {feedbackMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300 leading-relaxed">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {statusData?.config.lastError && !errorMsg && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 leading-relaxed">
          آخر تنبيه مسجّل من المجدول: {statusData.config.lastError}
        </div>
      )}

      {/* 1. TikTok Account OAuth Connection Card */}
      <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-slate-100">
              ١. ربط قناة تيك توك الرسمية ({OFFICIAL_TIKTOK_HANDLE})
            </h4>
            <p className="text-xs text-slate-400">
              القناة المستهدفة:{' '}
              <a
                href={OFFICIAL_TIKTOK_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="font-mono text-emerald-400 hover:underline"
              >
                {OFFICIAL_TIKTOK_DISPLAY}
              </a>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {statusData?.account ? (
              <>
                <span className="text-xs text-emerald-300 font-semibold">
                  متصل بحساب:{' '}
                  <span dir="ltr" className="font-mono">
                    @{statusData.account.username || 'superboda0'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleDisconnectTikTok}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:text-red-300 cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>فصل الحساب</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isConnectingOAuth}
                onClick={handleConnectTikTok}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isConnectingOAuth ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                <span>ربط قناة تيك توك (@superboda0) عبر OAuth</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchAdminStatus}
              aria-label="تحديث"
              className="rounded-lg border border-slate-800 bg-[#0B0F14] p-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {blockedPopupAuthUrl && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
            <span>
              حظر المتصفح النافذة المنبثقة التلقائية. اضغط هنا لفتح صفحة تفويض تيك توك مباشرة:
            </span>
            <a
              href={blockedPopupAuthUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded bg-amber-400 px-3 py-1.5 font-bold text-slate-950"
            >
              <span>متابعة الربط مع تيك توك</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* OAuth Redirect URIs Box (Exact Dev + Shared URLs) */}
        <div className="rounded-lg border border-slate-800/90 bg-[#0B0F14] p-3.5 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-200">
              روابط الاستجابة (Redirect / Callback URLs) لإضافتها في لوحة مطوري تيك توك (TikTok Login Kit &amp; Content Posting API):
            </span>
            <span
              className={
                statusData?.credentials.isConfigured
                  ? 'text-emerald-400 font-medium'
                  : 'text-amber-300 font-medium'
              }
            >
              {statusData?.credentials.isConfigured
                ? 'مفاتيح TIKTOK_CLIENT_KEY مضافة'
                : 'بانتظار إضافة TIKTOK_CLIENT_KEY و TIKTOK_CLIENT_SECRET في Secrets'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded border border-slate-800 bg-[#121820] px-3 py-2">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">
                  رابط بيئة التطوير (Development Callback URL):
                </div>
                <div
                  dir="ltr"
                  className="font-mono text-[11px] text-slate-200 truncate"
                >
                  {DEV_CALLBACK_URL}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyUrl('dev', DEV_CALLBACK_URL)}
                className="inline-flex items-center gap-1 rounded border border-slate-700 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-800 shrink-0 cursor-pointer"
              >
                {copiedUrlKey === 'dev' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded border border-slate-800 bg-[#121820] px-3 py-2">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">
                  رابط المنصة المنشورة (Shared / Production Callback URL):
                </div>
                <div
                  dir="ltr"
                  className="font-mono text-[11px] text-slate-200 truncate"
                >
                  {SHARED_CALLBACK_URL}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyUrl('prod', SHARED_CALLBACK_URL)}
                className="inline-flex items-center gap-1 rounded border border-slate-700 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-800 shrink-0 cursor-pointer"
              >
                {copiedUrlKey === 'prod' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Immediate Actions: Publish Next 10 Ayahs Now OR Download MP4 */}
      {batch && (
        <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-100">
                ٢. التحكم الفوري بالدفعة الحالية في الطابور
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                الدور الحالي: <strong className="text-slate-200">سورة {batch.surahNameArabic}</strong> · الآيات{' '}
                <strong className="font-mono text-emerald-300">
                  {batch.fromAyah}–{batch.toAyah}
                </strong>{' '}
                ({batch.ayahCount} آيات) · القارئ:{' '}
                <strong className="text-amber-300">{batch.reciter.nameArabic}</strong> · الختمة ({batch.khatmahCycle})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              disabled={isPublishingNow || isDownloadingMp4}
              onClick={handlePublishNextNow}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPublishingNow ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Send className="w-4 h-4 shrink-0" />
              )}
              <span>نشر الدفعة الحالية الآن على تيك توك</span>
            </button>

            <button
              type="button"
              disabled={isDownloadingMp4 || isPublishingNow}
              onClick={() => handleDownloadNextMp4(false)}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDownloadingMp4 ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>تنزيل فيديو MP4 للدفعة (معاينة)</span>
            </button>

            <button
              type="button"
              disabled={isDownloadingMp4 || isPublishingNow}
              onClick={() => handleDownloadNextMp4(true)}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#121820] px-4 py-3 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 text-amber-300 shrink-0" />
              <span>تنزيل MP4 + الانتقال للـ ١٠ آيات التالية</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Continuous Daily Schedule & Khatmah Cursor Settings */}
      <form
        onSubmit={handleSaveAutomationSettings}
        className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm sm:text-base font-bold text-slate-100">
            ٣. إعدادات المجدول اليومي العشري والترتيب القرآني
          </h4>
          <button
            type="button"
            onClick={handleResetToFatihah}
            className="inline-flex items-center gap-1.5 rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة المؤشر لبداية سورة الفاتحة</span>
          </button>
        </div>

        {/* Fixed 10 Daily Times Readout */}
        <div className="rounded-lg border border-slate-800/80 bg-[#0B0F14] p-3 text-xs text-slate-300">
          <span className="font-semibold text-emerald-400">
            المواعيد العشرة اليومية المفعّلة (١٠ مقاطع كل يوم بلا توقف):{' '}
          </span>
          {DAILY_BROADCAST_SLOTS.map((s) => s.labelArabic).join(' · ')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-3 cursor-pointer">
            <div>
              <div className="text-xs sm:text-sm font-semibold text-slate-100">
                تفعيل النشر اليومي المستمر
              </div>
              <div className="text-[11px] text-slate-400">
                ينشر ١٠ فيديوهات يومياً في المواعيد الثابتة ويعيد الختمة تلقائياً بعد سورة الناس
              </div>
            </div>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-3 cursor-pointer">
            <div>
              <div className="text-xs sm:text-sm font-semibold text-slate-100">
                وسم «محتوى من إنتاج الذكاء الاصطناعي» (AIGC)
              </div>
              <div className="text-[11px] text-slate-400">
                يفعّل حقل is_aigc الرسمي في واجهة تيك توك على كل فيديو
              </div>
            </div>
            <input
              type="checkbox"
              checked={isAigcEnabled}
              onChange={(e) => setIsAigcEnabled(e.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              السورة الحالية في الدور
            </label>
            <select
              value={currentSurahId}
              onChange={(e) => {
                setCurrentSurahId(Number(e.target.value));
                setCurrentFromAyah(1);
              }}
              className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs text-slate-100"
            >
              {surahs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}. {s.nameArabic}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              بدءاً من الآية
            </label>
            <select
              value={currentFromAyah}
              onChange={(e) => setCurrentFromAyah(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs text-slate-100 font-mono tabular-nums"
            >
              {Array.from(
                { length: selectedSurahMeta.versesCount },
                (_, idx) => idx + 1
              ).map((n) => (
                <option key={n} value={n}>
                  الآية {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              رقم الختمة الحالية
            </label>
            <input
              type="number"
              min={1}
              max={9999}
              value={khatmahCycle}
              onChange={(e) =>
                setKhatmahCycle(Math.max(1, Number(e.target.value) || 1))
              }
              className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs text-slate-100 font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              التوقيت الزمني للمواعيد
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs text-slate-100"
            >
              <option value="Africa/Cairo">توقيت القاهرة (Africa/Cairo)</option>
              <option value="Asia/Riyadh">توقيت مكة المكرمة (Asia/Riyadh)</option>
              <option value="Asia/Dubai">توقيت الإمارات (Asia/Dubai)</option>
              <option value="UTC">التوقيت العالمي (UTC)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              وضع النشر على تيك توك
            </label>
            <select
              value={postMode}
              onChange={(e) => setPostMode(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs text-slate-100"
            >
              <option value="DIRECT_POST">
                نشر مباشر كفيديو ريلز عام (Direct Video Post)
              </option>
              <option value="INBOX_UPLOAD">
                إرسال إلى صندوق مسودات تيك توك (Inbox Upload)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              مستوى الخصوصية الافتراضي
            </label>
            <select
              value={privacyLevel}
              onChange={(e) => setPrivacyLevel(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs text-slate-100"
            >
              <option value="PUBLIC_TO_EVERYONE">عام للجميع (PUBLIC_TO_EVERYONE)</option>
              <option value="MUTUAL_FOLLOW_FRIENDS">الأصدقاء المتبادلون</option>
              <option value="SELF_ONLY">خاص بي فقط (مناسب لوضع Sandbox)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            علامات الهاشتاج الثابتة المرفقة مع كل فيديو
          </label>
          <textarea
            rows={2}
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSavingConfig}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isSavingConfig ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>حفظ إعدادات الأتمتة والجدول اليومي</span>
        </button>
      </form>

      {/* 4. Recent Publish Logs */}
      <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 sm:p-5 space-y-3">
        <h4 className="text-sm font-bold text-slate-100">
          ٤. سجل عمليات التوليد والنشر على تيك توك ({statusData?.logs.length || 0})
        </h4>

        {!statusData?.logs.length ? (
          <p className="text-xs text-slate-500 py-4 text-center border border-slate-800/70 rounded-lg">
            لم تُنفّذ عمليات نشر بعد. اربط حساب {OFFICIAL_TIKTOK_HANDLE} أو اضغط «نشر الدفعة الحالية الآن» لبدء أول مقطع.
          </p>
        ) : (
          <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-[#0B0F14] max-h-64 overflow-y-auto">
            {statusData.logs.map((log) => (
              <div
                key={log.id}
                className="px-3.5 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200">
                    سورة {log.surahNameArabic} ({log.fromAyah}–{log.toAyah}) ·{' '}
                    <span className="text-slate-400 font-normal">
                      {log.reciterNameArabic}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {log.scheduledTimeLabel}
                    {log.errorMessage ? ` — ${log.errorMessage}` : ''}
                  </div>
                </div>
                <div className="font-mono text-[11px] shrink-0">
                  <span
                    className={
                      log.status === 'PUBLISHED' || log.status === 'INBOX_DRAFT'
                        ? 'text-emerald-400'
                        : log.status === 'FAILED'
                        ? 'text-red-400'
                        : 'text-amber-300'
                    }
                  >
                    {log.status === 'PUBLISHED'
                      ? 'تم النشر'
                      : log.status === 'INBOX_DRAFT'
                      ? 'مسودة بصندوق تيك توك'
                      : log.status === 'FAILED'
                      ? 'فشل'
                      : 'جاري التنفيذ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
