import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Play,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import {
  buildTikTokReelCaption,
  computeSequentialBatch,
  DAILY_BROADCAST_SLOTS,
  OFFICIAL_TIKTOK_CHANNEL_URL,
  OFFICIAL_TIKTOK_DISPLAY,
  OFFICIAL_TIKTOK_HANDLE,
  OFFICIAL_TIKTOK_HASHTAGS,
  previewUpcomingSchedule,
  type SequentialKhatmahBatch,
  type UpcomingScheduledReelItem,
} from '../utils/tiktokKhatmahPlanner';

interface PublicTikTokSchedulePayload {
  channel: {
    url: string;
    display: string;
    handle: string;
    connectedUsername: string | null;
    connectedDisplayName: string | null;
    isAccountConnected: boolean;
    hasApiCredentials: boolean;
  };
  automation: {
    isEnabled: boolean;
    timezone: string;
    ayahsPerReel: number;
    currentSurahId: number;
    currentFromAyah: number;
    khatmahCycle: number;
    isAigcEnabled: boolean;
    postMode: string;
    hashtags: string;
    totalPublishedCount: number;
    lastPublishedAt: string | null;
    isJobRunning: boolean;
  };
  currentBatch: SequentialKhatmahBatch;
  upcoming: UpcomingScheduledReelItem[];
  recentLogs: Array<{
    id: number;
    scheduledTimeLabel: string;
    khatmahCycle: number;
    surahId: number;
    surahNameArabic: string;
    fromAyah: number;
    toAyah: number;
    reciterNameArabic: string;
    status: string;
    createdAt: string;
  }>;
}

interface TikTokKhatmahSectionProps {
  isMasterAdmin: boolean;
  onLoadBatchIntoStudio: (
    surahId: number,
    fromAyah: number,
    toAyah: number,
    reciterId: string
  ) => void;
  onOpenAdminTikTokTab: () => void;
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

export function TikTokKhatmahSection({
  isMasterAdmin,
  onLoadBatchIntoStudio,
  onOpenAdminTikTokTab,
}: TikTokKhatmahSectionProps) {
  const [data, setData] = useState<PublicTikTokSchedulePayload | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedHashtags, setCopiedHashtags] = useState<boolean>(false);
  const [copiedCaptionIdx, setCopiedCaptionIdx] = useState<number | null>(null);

  const loadSchedule = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/tiktok/public-schedule');
      if (res.ok) {
        const json = (await res.json()) as PublicTikTokSchedulePayload;
        setData(json);
      }
    } catch {
      // Fallback computed client-side below if offline
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
    const timer = setInterval(() => {
      loadSchedule();
    }, 60_000);
    return () => clearInterval(timer);
  }, [loadSchedule]);

  const fallbackBatch = computeSequentialBatch(1, 1, 1, 10);
  const currentBatch = data?.currentBatch || fallbackBatch;
  const upcomingItems =
    data?.upcoming ||
    previewUpcomingSchedule({
      currentSurahId: 1,
      currentFromAyah: 1,
      khatmahCycle: 1,
      ayahsPerReel: 10,
      timezone: 'Africa/Cairo',
      hashtags: OFFICIAL_TIKTOK_HASHTAGS,
      count: 10,
    });

  const hashtagsText = data?.automation.hashtags || OFFICIAL_TIKTOK_HASHTAGS;
  const khatmahCycle = data?.automation.khatmahCycle || currentBatch.khatmahCycle;
  const totalPublished = data?.automation.totalPublishedCount || 0;
  const progressPercent = Math.min(
    100,
    Math.max(
      1,
      Math.round(
        ((currentBatch.globalBatchIndex - 1) /
          Math.max(1, currentBatch.totalBatchesInKhatmah)) *
          100
      )
    )
  );

  const handleCopyHashtags = async () => {
    const ok = await copyTextSafe(`${OFFICIAL_TIKTOK_DISPLAY}\n${hashtagsText}`);
    if (ok) {
      setCopiedHashtags(true);
      setTimeout(() => setCopiedHashtags(false), 2600);
    }
  };

  const handleCopyBatchCaption = async (
    item: UpcomingScheduledReelItem,
    idx: number
  ) => {
    const caption =
      item.caption || buildTikTokReelCaption(item.batch, hashtagsText);
    const ok = await copyTextSafe(caption);
    if (ok) {
      setCopiedCaptionIdx(idx);
      setTimeout(() => setCopiedCaptionIdx(null), 2400);
    }
  };

  return (
    <section
      id="tiktok-khatmah"
      className="border-t border-slate-800/80 bg-[#0B0F14] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 space-y-8">
        {/* Top Editorial Header & Official Channel Link */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-emerald-400 font-medium">
              <span>الختمة القرآنية المتسلسلة على تيك توك</span>
              <span aria-hidden="true">·</span>
              <span dir="ltr" className="font-mono text-slate-300">
                {OFFICIAL_TIKTOK_DISPLAY}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-400">
                ١٠ مقاطع يومياً بدون توقف
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 leading-snug text-balance">
              بث الختمة اليومية المتسلسلة على قناة {OFFICIAL_TIKTOK_HANDLE}
            </h2>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              تُنشر المقاطع تلقائياً بنظام الفيديو العمودي بترتيب المصحف الشريف من بداية{' '}
              <span className="text-slate-200 font-medium">سورة الفاتحة</span> حتى{' '}
              <span className="text-slate-200 font-medium">سورة الناس</span> ثم تعاد الختمة من جديد تلقائياً، بحيث يضم كل مقطع{' '}
              <span className="text-slate-200 font-medium">١٠ آيات كريمة</span> وتُتلى كل سورة بصوت قارئ مختلف مع تفعيل وسم محتوى الذكاء الاصطناعي والهاشتاجات الرسمية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={OFFICIAL_TIKTOK_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-300 transition-colors"
            >
              <span>زيارة قناة {OFFICIAL_TIKTOK_HANDLE}</span>
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>

            <button
              type="button"
              onClick={onOpenAdminTikTokTab}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#121820] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isMasterAdmin
                  ? 'إدارة الربط والنشر التلقائي'
                  : 'إعدادات ربط تيك توك (للمسؤول)'}
              </span>
            </button>
          </div>
        </div>

        {/* Live Khatmah Progress + Fixed 10 Daily Appointments */}
        <div className="rounded-2xl border border-slate-800 bg-[#121820] p-5 sm:p-8 space-y-7">
          {/* Row 1: Current Khatmah Cursor & Progress Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="space-y-1.5">
              <div className="text-xs text-slate-400">
                الدفعة الحالية في دور النشر التلقائي:
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-50">
                سورة {currentBatch.surahNameArabic} · الآيات{' '}
                <span className="font-mono tabular-nums text-emerald-300">
                  {currentBatch.fromAyah}–{currentBatch.toAyah}
                </span>{' '}
                <span className="text-slate-400 font-normal text-sm">
                  — بصوت القارئ {currentBatch.reciter.nameArabic}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span>
                  الختمة رقم{' '}
                  <strong className="font-mono tabular-nums text-slate-200">
                    {khatmahCycle}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  المقطع{' '}
                  <strong className="font-mono tabular-nums text-slate-200">
                    {currentBatch.globalBatchIndex}
                  </strong>{' '}
                  من{' '}
                  <strong className="font-mono tabular-nums text-slate-200">
                    {currentBatch.totalBatchesInKhatmah}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  إجمالي ما نُشر:{' '}
                  <strong className="font-mono tabular-nums text-emerald-400">
                    {totalPublished}
                  </strong>{' '}
                  فيديو
                </span>
                <span aria-hidden="true">·</span>
                <span>محتوى بتوليد الذكاء الاصطناعي مفعّل</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() =>
                  onLoadBatchIntoStudio(
                    currentBatch.surahId,
                    currentBatch.fromAyah,
                    currentBatch.toAyah,
                    currentBatch.reciter.id
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 shrink-0" />
                <span>معاينة الدفعة الحالية بالاستوديو</span>
              </button>

              <button
                type="button"
                onClick={loadSchedule}
                aria-label="تحديث الجدول"
                className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-[#0B0F14] p-2.5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Progress Track */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>بداية المصحف: سورة الفاتحة (١)</span>
              <span className="font-mono tabular-nums text-slate-300">
                {progressPercent}% من الختمة الحالية
              </span>
              <span>ختام المصحف: سورة الناس (١١٤) ↺ إعادة تلقائية</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#0B0F14] border border-slate-800/80">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Row 2: The 10 Fixed Daily Publishing Times */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                <span>المواعيد اليومية العشرة الثابتة للنشر المستمر</span>
              </h3>
              <span className="text-xs text-slate-400">
                التوقيت المعتمد: {data?.automation.timezone || 'Africa/Cairo'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
              {DAILY_BROADCAST_SLOTS.map((slot, idx) => (
                <div
                  key={slot.slot24h}
                  className="rounded-lg border border-slate-800/90 bg-[#0B0F14] px-3 py-2.5 text-center"
                >
                  <div className="text-[11px] text-slate-500 font-mono tabular-nums mb-0.5">
                    مقطع #{idx + 1}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-100 whitespace-nowrap">
                    {slot.labelArabic}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Next 10 Queued Sequential Reels Preview */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                جدول الفيديوهات العشرة القادمة بالترتيب القرآني (١٠ آيات لكل فيديو · قارئ مستقل لكل سورة)
              </h3>
            </div>

            <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#0B0F14]">
              {upcomingItems.slice(0, 10).map((item, idx) => {
                const rangeStr =
                  item.batch.fromAyah === item.batch.toAyah
                    ? `الآية ${item.batch.fromAyah}`
                    : `الآيات ${item.batch.fromAyah}–${item.batch.toAyah}`;

                return (
                  <div
                    key={`${item.slot24h}-${item.batch.surahId}-${item.batch.fromAyah}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                          #{item.orderIndex}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-200 font-medium">
                          {item.dayRelativeLabel} {item.slotLabelArabic}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>القارئ: {item.batch.reciter.nameArabic}</span>
                      </div>

                      <div className="text-sm sm:text-base font-bold text-slate-100">
                        سورة {item.batch.surahNameArabic} ({rangeStr})
                        <span className="mr-2 text-xs font-normal text-slate-400">
                          ({item.batch.ayahCount} آيات)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyBatchCaption(item, idx)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#121820] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedCaptionIdx === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">تم نسخ الوصف</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>نسخ الوصف والهاشتاج</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onLoadBatchIntoStudio(
                            item.batch.surahId,
                            item.batch.fromAyah,
                            item.batch.toAyah,
                            item.batch.reciter.id
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span>فتح في الاستوديو</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 4: Official Hashtags & Channel Attribution Box */}
          <div className="rounded-xl border border-slate-800/90 bg-[#0B0F14] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-semibold text-slate-300">
                الهاشتاجات الرسمية المثبتة تلقائياً على جميع مقاطع{' '}
                <span dir="ltr" className="font-mono text-emerald-400">
                  {OFFICIAL_TIKTOK_DISPLAY}
                </span>
                :
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed break-words">
                {hashtagsText}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyHashtags}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#121820] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              {copiedHashtags ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-300" />
                  <span>نسخ الهاشتاجات والرابط</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
