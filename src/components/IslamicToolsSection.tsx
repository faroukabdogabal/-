import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Baby,
  BookMarked,
  BookOpen,
  Calendar,
  CheckSquare,
  Coins,
  Compass,
  HandHeart,
  Landmark,
  MapPin,
  Mic2,
  Moon,
  Radio,
  Repeat,
  Scale,
  ScrollText,
  Search,
  Shield,
  Sparkles,
  Sprout,
  Sunrise,
  Target,
  Users,
  Utensils,
} from 'lucide-react';
import {
  ISLAMIC_TOOLS_LIST,
  IslamicToolDefinition,
  IslamicToolId,
} from '../data/islamicToolsData';
import { SurahMeta } from '../types/quran';
import { IslamicToolModal } from './IslamicToolModal';

interface IslamicToolsSectionProps {
  surahs: SurahMeta[];
  sadaqahLabel: string;
  onLoadVerseIntoStudio: (surahId: number, fromAyah: number, toAyah: number) => void;
}

function renderToolIcon(id: IslamicToolId) {
  const cls = 'w-5 h-5 shrink-0';
  switch (id) {
    case 'ayat_topic':
      return <Sprout className={cls} />;
    case 'prayer_times':
      return <Landmark className={cls} />;
    case 'qibla':
      return <Compass className={cls} />;
    case 'hijri_date':
      return <Calendar className={cls} />;
    case 'adhkar_morning_evening':
      return <Sunrise className={cls} />;
    case 'tasbih':
      return <Repeat className={cls} />;
    case 'asma_ul_husna':
      return <Sparkles className={cls} />;
    case 'ayah_of_day':
      return <BookOpen className={cls} />;
    case 'quran_radio':
      return <Radio className={cls} />;
    case 'zakat_calc':
      return <Coins className={cls} />;
    case 'khatmah_plan':
      return <Target className={cls} />;
    case 'hisn_muslim':
      return <Shield className={cls} />;
    case 'inheritance_calc':
      return <Scale className={cls} />;
    case 'hadith_search':
      return <ScrollText className={cls} />;
    case 'baby_names':
      return <Baby className={cls} />;
    case 'makharij':
      return <Mic2 className={cls} />;
    case 'quran_memorizer':
      return <Repeat className={cls} />;
    case 'qada_prayer':
      return <Landmark className={cls} />;
    case 'kaffarah_calc':
      return <HandHeart className={cls} />;
    case 'hadith_verify':
      return <CheckSquare className={cls} />;
    case 'fasting_tracker':
      return <Moon className={cls} />;
    case 'learn_prayer':
      return <BookMarked className={cls} />;
    case 'group_khatmah':
      return <Users className={cls} />;
    case 'e_numbers':
      return <Utensils className={cls} />;
    case 'nearby_mosques':
      return <MapPin className={cls} />;
    case 'quran_word_search':
      return <Search className={cls} />;
    case 'tafsir_muyassar':
      return <BookOpen className={cls} />;
    case 'kids_memorizer':
      return <Award className={cls} />;
    case 'tajweed_rules':
      return <Mic2 className={cls} />;
    case 'zakat_fitr':
      return <Coins className={cls} />;
  }
}

export function IslamicToolsSection({
  surahs,
  sadaqahLabel,
  onLoadVerseIntoStudio,
}: IslamicToolsSectionProps) {
  const [showAllTools, setShowAllTools] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeToolId, setActiveToolId] = useState<IslamicToolId | null>(null);

  const visibleTools = useMemo<IslamicToolDefinition[]>(() => {
    const q = searchTerm.trim();
    if (q) {
      return ISLAMIC_TOOLS_LIST.filter(
        (t) => t.titleArabic.includes(q) || t.subtitleArabic.includes(q)
      );
    }
    return showAllTools
      ? ISLAMIC_TOOLS_LIST
      : ISLAMIC_TOOLS_LIST.filter((t) => t.featuredInInitialGrid);
  }, [showAllTools, searchTerm]);

  return (
    <section
      id="islamic-tools"
      className="border-t border-slate-800/80 bg-[#080F0C] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        {/* Header matching reference screenshot */}
        <div className="mx-auto max-w-2xl text-center mb-10">
          <div className="mb-3 flex items-center justify-center gap-3 text-xs font-medium text-amber-300/90">
            <span className="h-px w-8 bg-amber-400/30" aria-hidden="true" />
            <span>مجاني للجميع</span>
            <span className="h-px w-8 bg-amber-400/30" aria-hidden="true" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-50 mb-3">
            أدوات إسلامية متكاملة
          </h2>

          <p className="text-sm sm:text-base text-slate-400 tabular-nums mb-6">
            30 أداة مجانية تعمل من المتصفح مباشرة — كل ما تحتاجه في مكان واحد
          </p>

          <div className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث سريعاً في الـ 30 أداة إسلامية..."
              className="w-full rounded-xl border border-emerald-900/60 bg-[#0D1713] pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/70 focus:outline-none"
            />
          </div>
        </div>

        {/* 4-Column Responsive Islamic Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {visibleTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveToolId(tool.id)}
              className="group flex items-center gap-3.5 rounded-xl border border-emerald-950/90 bg-[#0D1612] hover:border-emerald-500/50 hover:bg-[#111E18] px-4 py-4 text-right transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tool.iconBgClass} ${tool.iconTextClass} group-hover:scale-105 transition-transform duration-150`}
              >
                {renderToolIcon(tool.id)}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-emerald-300 truncate mb-0.5 transition-colors">
                  {tool.titleArabic}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {tool.subtitleArabic}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Show All 30 Islamic Tools Button */}
        {!searchTerm.trim() && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setShowAllTools((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/35 bg-[#121A14] hover:border-amber-400/60 hover:bg-[#17221A] px-6 py-3 text-xs sm:text-sm font-semibold text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>
                {showAllTools
                  ? 'عرض الأدوات المختصرة (25 أداة)'
                  : 'شاهد جميع الأدوات الإسلامية (30 أداة)'}
              </span>
              <ArrowLeft
                className={`w-4 h-4 transition-transform duration-150 ${
                  showAllTools ? 'rotate-90' : ''
                }`}
              />
            </button>
          </div>
        )}
      </div>

      <IslamicToolModal
        toolId={activeToolId}
        onClose={() => setActiveToolId(null)}
        surahs={surahs}
        sadaqahLabel={sadaqahLabel}
        onLoadVerseIntoStudio={onLoadVerseIntoStudio}
      />
    </section>
  );
}
