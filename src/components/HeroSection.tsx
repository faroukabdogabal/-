import { ArrowDown, Sparkles } from 'lucide-react';
import { QUICK_PRESETS } from '../data/quranCatalog';
import { QuickPreset } from '../types/quran';

interface HeroSectionProps {
  activePresetId: string | null;
  sharedDedicationBanner: string | null;
  onSelectPreset: (preset: QuickPreset) => void;
  onScrollToStudio: () => void;
}

export function HeroSection({
  activePresetId,
  sharedDedicationBanner,
  onSelectPreset,
  onScrollToStudio,
}: HeroSectionProps) {
  return (
    <section className="relative border-b border-slate-800/70 bg-[#0B0F14] pt-10 pb-12 sm:pt-14 sm:pb-16">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
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
            <span className="text-emerald-400 font-medium">صدقة جارية عن عائلة فاروق جبل</span>
          </div>

          <h1 className="text-[clamp(2.1rem,4vw,3.5rem)] font-bold leading-[1.2] tracking-tight text-slate-50 mb-5">
            صانع المقاطع القرآنية القصيرة بجودة عالية وتظليل متزامن للكلمات
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-slate-400 mb-8">
            أنشئ مقاطع ريلز وشورتس وتيك توك قرآنية بتصميم رأسي احترافي خلال ثوانٍ. اختر من بين ٣٦ قارئاً، حدد الآيات والترجمة، وحمّل الفيديو بصيغة MP4 مجاناً وبلا حقوق أو علامات مائية.
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

        {/* Quick-load curated Quranic passages */}
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              مقتطفات قرآنية جاهزة للتحميل الفوري في الاستوديو:
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {QUICK_PRESETS.map((preset) => {
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
