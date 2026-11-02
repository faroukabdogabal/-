import { ArrowDown, Sparkles } from 'lucide-react';
import { PublicStatsData, SiteConfigData } from '../firebase';
import { QuickPreset } from '../types/quran';

interface HeroSectionProps {
  siteConfig: SiteConfigData;
  publicStats: PublicStatsData;
  isStatsLoaded: boolean;
  presets: QuickPreset[];
  activePresetId: string | null;
  sharedDedicationBanner: string | null;
  onSelectPreset: (preset: QuickPreset) => void;
  onScrollToStudio: () => void;
}

const numberFormatter = new Intl.NumberFormat('en-US');

export function HeroSection({
  siteConfig,
  publicStats,
  isStatsLoaded,
  presets,
  activePresetId,
  sharedDedicationBanner,
  onSelectPreset,
  onScrollToStudio,
}: HeroSectionProps) {
  const totalGeneratedAndExported =
    publicStats.createdReelsCount + publicStats.exportedVideosCount;

  return (
    <section className="relative border-b border-slate-800/70 bg-[#0B0F14] pt-10 pb-12 sm:pt-14 sm:pb-16">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        {siteConfig.announcementBanner.trim().length > 0 && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-3.5 text-center">
            <p className="text-sm sm:text-base font-medium text-emerald-200">
              {siteConfig.announcementBanner}
            </p>
          </div>
        )}

        {sharedDedicationBanner && (
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4 text-center">
            <p className="text-xs text-amber-300/80 mb-1">مقطع قرآني مُهدى كصدقة جارية</p>
            <p className="text-base sm:text-lg font-semibold text-amber-200">
              {sharedDedicationBanner}
            </p>
          </div>
        )}

        <div className="mx-auto max-w-3xl text-center">
          {/* Unboxed clean metadata line — zero pills */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-slate-400">
            <span>مجاني بالكامل</span>
            <span aria-hidden="true">·</span>
            <span>بدون علامة مائية</span>
            <span aria-hidden="true">·</span>
            <span>بدون تسجيل حساب</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-medium">{siteConfig.sadaqahLabel}</span>
          </div>

          <h1 className="text-[clamp(2.1rem,4vw,3.5rem)] font-bold leading-[1.2] tracking-tight text-slate-50 mb-5">
            {siteConfig.heroHeadline}
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-slate-400 mb-8">
            {siteConfig.heroSubtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
            <button
              type="button"
              onClick={onScrollToStudio}
              className="inline-flex items-center gap-2.5 rounded-lg bg-emerald-400 px-6 py-3 text-sm sm:text-base font-semibold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>ابدأ صناعة المقطع</span>
              <ArrowDown className="w-4 h-4" />
            </button>
            <a
              href="#sadaqah"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700/90 bg-slate-900/60 px-5 py-3 text-sm sm:text-base font-medium text-slate-200 hover:bg-slate-800/80 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              إهداء مقطع كصدقة جارية
            </a>
          </div>
        </div>

        {/* Live Global Sadaqah Jariyah Impact Counter — clean hairline architecture, zero pills, zero pulsing dots */}
        <div
          aria-label="عداد إحصائيات المقاطع القرآنية العام"
          className="mx-auto max-w-4xl mb-10 border-y border-slate-800/80 py-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-200">
              إحصائيات الأثر العام للمنصة — مساهمات الزوار في نشر القرآن الكريم
            </span>
            <span className="text-slate-400">
              تحديث فوري مباشر مع كل مقطع يُنشأ أو يُصدَّر
            </span>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-800/80">
            <div className="py-3 sm:py-1 sm:pl-6 text-center sm:text-right">
              <dd className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
                {isStatsLoaded ? numberFormatter.format(totalGeneratedAndExported) : '—'}
              </dd>
              <dt className="mt-1 text-xs sm:text-sm font-semibold text-slate-100">
                إجمالي المقاطع المُنشأة والمُصدَّرة
              </dt>
              <p className="mt-0.5 text-[11px] text-slate-400">
                مقاطع وتلاوات قرآنية أُعدّت عبر الاستوديو
              </p>
            </div>

            <div className="py-3 sm:py-1 sm:px-6 text-center sm:text-right">
              <dd className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">
                {isStatsLoaded
                  ? numberFormatter.format(publicStats.exportedVideosCount)
                  : '—'}
              </dd>
              <dt className="mt-1 text-xs sm:text-sm font-semibold text-slate-100">
                عمليات تصدير وتحميل المقاطع
              </dt>
              <p className="mt-0.5 text-[11px] text-slate-400">
                فيديوهات MP4 وبطاقات وتلاوات محمّلة
              </p>
            </div>

            <div className="py-3 sm:py-1 sm:pr-6 text-center sm:text-right">
              <dd className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-amber-300 tracking-tight">
                {isStatsLoaded
                  ? numberFormatter.format(publicStats.sharedSadaqahCount)
                  : '—'}
              </dd>
              <dt className="mt-1 text-xs sm:text-sm font-semibold text-slate-100">
                مشاركات وإهداءات الصدقة الجارية
              </dt>
              <p className="mt-0.5 text-[11px] text-slate-400">
                روابط ومشاركات مباشرة عبر منصات التواصل
              </p>
            </div>
          </dl>

          <p className="mt-4 text-center text-xs text-slate-400">
            كل مقطع قرآني تصنعه أو تحمّله يُضاف تلقائياً إلى هذا الأثر المشترك — ساهم الآن بمقطع جديد ليكون صدقة جارية ممتدة الأجر.
          </p>
        </div>

        {/* Quick-load curated Quranic passages */}
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              مقتطفات قرآنية جاهزة للتحميل الفوري في الاستوديو:
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {presets.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className={`text-right rounded-lg border px-3.5 py-2.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500/70 bg-emerald-500/10 text-slate-50'
                      : 'border-slate-800/90 bg-[#121820] text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-semibold truncate mb-0.5">
                    {preset.titleArabic}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate tabular-nums">
                    {preset.subtitleArabic}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
