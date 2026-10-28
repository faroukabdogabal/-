interface NavbarProps {
  onStartStudio: () => void;
}

export function Navbar({ onStartStudio }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0B0F14]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500"
        >
          قرآن ريلز
        </a>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400"
        >
          <a
            href="#studio"
            className="hover:text-slate-100 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
          >
            الاستوديو
          </a>
          <a
            href="#features"
            className="hover:text-slate-100 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
          >
            المميزات
          </a>
          <a
            href="#sadaqah"
            className="hover:text-slate-100 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
          >
            صدقة جارية عن عائلة فاروق جبل
          </a>
          <a
            href="#faq"
            className="hover:text-slate-100 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
          >
            الأسئلة الشائعة
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onStartStudio}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            اصنع مقطعك الآن
          </button>
        </div>
      </div>
    </header>
  );
}
