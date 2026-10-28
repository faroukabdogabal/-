import { useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  HeartHandshake,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';
import { MASTER_ADMIN_EMAIL } from '../firebase';
import { QuickPreset } from '../types/quran';

interface FeaturesAndSadaqahProps {
  siteTitle: string;
  sadaqahLabel: string;
  presets: QuickPreset[];
  allowCustomSadaqah: boolean;
  isMasterAdmin: boolean;
  onOpenAdmin: () => void;
  onCreateDedicatedReel: (dedicationText: string, preset: QuickPreset) => void;
  onBuildShareUrlForDedication: (
    dedicationText: string,
    preset: QuickPreset
  ) => Promise<boolean>;
}

const FAQ_ITEMS = [
  {
    q: 'هل الموقع مجاني بالكامل وبدون أي علامة مائية؟',
    a: 'نعم، الموقع وقف وصدقة جارية مفتوح للجميع مجاناً بالكامل، ولا يضع أي شعارات أو علامات مائية مفروضة على الفيديوهات المستخرجة، ولا يتطلب إنشاء حساب أو تسجيل دخول.',
  },
  {
    q: 'هل يمكنني نشر المقاطع على تيك توك وإنستغرام ريلز ويوتيوب شورتس؟',
    a: 'بكل تأكيد. يتم تصدير الفيديو بسرعة فائقة بأبعاد 9:16 القياسية وبدقة 720p HD (720×1280) بصيغة MP4 المتوافقة مباشرة مع إنستغرام ريلز، تيك توك، يوتيوب شورتس، وحالات واتساب.',
  },
  {
    q: 'كيف تعمل ميزة كتابة الكلمات المتزامنة مع النطق وتقسيم الآيات الطويلة؟',
    a: 'يقوم المحرك الصوتي بمزامنة التوقيت الفعلي لتلاوة القارئ فتظهر كل كلمة قرآنية كتابةً على الفيديو لحظة النطق بها بالرسم العثماني، كما يقسم الآيات الطويلة كآية الكرسي تلقائياً عند علامات الوقف إلى شاشات متتابعة واضحة.',
  },
  {
    q: 'هل يمكنني استخدام صورة أو فيديو خاص من جهازي كخلفية؟',
    a: 'نعم، يمكنك اختيار أي خلفية من مكتبة المناظر الطبيعية الهادئة المدمجة، أو رفع صورة أو مقطع فيديو خاص من هاتفك أو حاسوبك مباشرة دون رفع ملفاتك لأي خادم خارجي.',
  },
  {
    q: 'من هو المسؤول والمدير والمخوّل بالنشر والتعديل في المنصة؟',
    a: `جميع حقوق الإدارة والوكالة والنشر والتغيير والتعديل والتحرير داخل منصة قرآن ريلز محصورة حصرياً ومؤمّنة برمجياً لحساب المسؤول والمدير العام (${MASTER_ADMIN_EMAIL})، بينما يظل استخدام الاستوديو وصناعة وتحميل المقاطع مجانياً ومتاحاً لجميع الزوار كصدقة جارية.`,
  },
];

export function FeaturesAndSadaqah({
  siteTitle,
  sadaqahLabel,
  presets,
  allowCustomSadaqah,
  isMasterAdmin,
  onOpenAdmin,
  onCreateDedicatedReel,
  onBuildShareUrlForDedication,
}: FeaturesAndSadaqahProps) {
  const [lovedOneName, setLovedOneName] = useState('');
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [copiedDedicatedUrl, setCopiedDedicatedUrl] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const canCustomizeDedication = allowCustomSadaqah || isMasterAdmin;

  const buildDedicationPhrase = () => {
    if (!canCustomizeDedication) return sadaqahLabel;
    const clean = lovedOneName.trim();
    return clean
      ? `صدقة جارية عن ${clean} — اللهم اجعل القرآن نوراً ورفعة`
      : sadaqahLabel;
  };

  const handleCopyDedicatedLink = async () => {
    const preset = presets[selectedPresetIdx] || presets[0];
    if (!preset) return;
    const ok = await onBuildShareUrlForDedication(buildDedicationPhrase(), preset);
    if (ok) {
      setCopiedDedicatedUrl(true);
      setTimeout(() => setCopiedDedicatedUrl(false), 3000);
    }
  };

  return (
    <>
      {/* Editorial Asymmetric Capabilities Section */}
      <section
        id="features"
        className="border-t border-slate-800/70 bg-[#0E131A] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-3">
              إمكانيات متكاملة لنشر كتاب الله بأبهى صورة
            </h2>
            <p className="text-base text-slate-400 leading-relaxed">
              صُممت المنصة لتُغنيك عن برامج المونتاج المعقدة، حيث يُنجز التزامن الصوتي والرسم العثماني والترجمة والتصدير آلياً من متصفحك.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 rounded-xl border border-slate-800/90 bg-[#121820] p-6 sm:p-8">
              <div className="text-xs font-mono tabular-nums text-emerald-400 mb-2">
                01. التزامن القرآني الدقيق
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">
                تظليل متزامن للكلمات بالرسم العثماني مع تقسيم ذكي للآيات الطويلة
              </h3>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                تُعرض الآيات الكريمة بخطوط مصحفية أصيلة مع إضاءة الكلمة المنطوقة لحظة بلحظة مع صوت القارئ. وعند اختيار آيات طويلة مثل آية الكرسي أو آية النور، تتوزع الآية تلقائياً على لقطات متوازنة تناسب شاشات الهواتف دون تصغير مخلّ بالخط.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-[#121820] p-6 sm:p-8">
              <div className="text-xs font-mono tabular-nums text-emerald-400 mb-2">
                02. التنوع الصوتي
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">
                ٣٦ قارئاً من أشهر قراء العالم الإسلامي
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                اختر بين التلاوات المرتلة والمجودة والمصحف المعلم لنخبة القراء، مع إمكانية دمج حتى ٣٠ آية متتالية في مقطع واحد مترابط.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-[#121820] p-6 sm:p-8">
              <div className="text-xs font-mono tabular-nums text-emerald-400 mb-2">
                03. بلا قيود ولا شعارات
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">
                تصدير MP4 سريع بجودة 720p HD بدون علامة مائية
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                تُعالَج المقاطع مباشرة على جهازك بسرعة فائقة وتُستخرج بصيغة MP4 نقية خالية تماماً من أي إعلانات أو علامات مائية.
              </p>
            </div>

            <div className="md:col-span-2 rounded-xl border border-slate-800/90 bg-[#121820] p-6 sm:p-8">
              <div className="text-xs font-mono tabular-nums text-emerald-400 mb-2">
                04. رسالة عالمية
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">
                ترجمة معاني القرآن الكريم إلى ١٠ لغات عالمية بضغطة واحدة
              </h3>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                أضف ترجمة المعاني بالإنجليزية، الفرنسية، الإسبانية، التركية، الأردية، الإندونيسية، الألمانية، الروسية، البنغالية أو الفارسية أسفل النص القرآني لتصل رسالة القرآن للمسلمين وغيرهم حول العالم.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Sadaqah Jariyah Section */}
      <section
        id="sadaqah"
        className="border-t border-slate-800/70 bg-[#0B0F14] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <div className="rounded-2xl border border-slate-800 bg-[#121820] p-6 sm:p-10 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-amber-300">
                  <HeartHandshake className="w-4 h-4" />
                  <span>{sadaqahLabel}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 leading-snug">
                  اصنع أو شارك مقطعاً قرآنياً كصدقة جارية عنك وعن من تحب
                </h2>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                  قال رسول الله ﷺ: «إذا مات الإنسان انقطع عنه عمله إلا من ثلاثة: إلا من صدقة جارية، أو علم ينتفع به، أو ولد صالح يدعو له». اختر الآيات، ثم افتحها في الاستوديو لتحميلها كفيديو أو انسخ رابطها المباشر لمشاركتها فوراً.
                </p>
              </div>

              <div className="lg:col-span-6 space-y-4">
                {canCustomizeDedication ? (
                  <div>
                    <label
                      htmlFor="loved-one-input"
                      className="block text-xs sm:text-sm font-medium text-slate-200 mb-1.5"
                    >
                      اسم المُهدى إليه أو نية الصدقة الجارية (اختياري)
                    </label>
                    <input
                      id="loved-one-input"
                      type="text"
                      maxLength={55}
                      value={lovedOneName}
                      onChange={(e) => setLovedOneName(e.target.value)}
                      placeholder="مثال: روح والدي، والدتي، أو جميع موتى المسلمين..."
                      className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-200 mb-1.5">
                      عبارة الصدقة الجارية المعتمدة
                    </label>
                    <div className="w-full rounded-lg border border-slate-800 bg-[#0B0F14]/80 px-4 py-3 text-sm text-emerald-300">
                      {sadaqahLabel}
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="sadaqah-preset-select"
                    className="block text-xs sm:text-sm font-medium text-slate-200 mb-1.5"
                  >
                    اختر المقطع القرآني المُهدى
                  </label>
                  <select
                    id="sadaqah-preset-select"
                    value={selectedPresetIdx}
                    onChange={(e) => setSelectedPresetIdx(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-4 py-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    {presets.map((p, idx) => (
                      <option key={p.id} value={idx}>
                        {p.titleArabic} ({p.subtitleArabic})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const chosen = presets[selectedPresetIdx] || presets[0];
                      if (chosen) {
                        onCreateDedicatedReel(buildDedicationPhrase(), chosen);
                      }
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <PlayCircle className="w-4 h-4 shrink-0" />
                    <span>تجهيز وتحميل الفيديو</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyDedicatedLink}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs sm:text-sm font-medium text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copiedDedicatedUrl ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300">تم نسخ الرابط المباشر!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>نسخ رابط استماع ومشاركة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="border-t border-slate-800/70 bg-[#0E131A] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-2">
              الأسئلة الشائعة
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              كل ما تحتاج معرفته حول صناعة وتصدير المقاطع القرآنية
            </p>
          </div>

          <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/90 bg-[#121820]">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right text-sm sm:text-base font-semibold text-slate-100 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-emerald-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quiet Minimal Footer with Exclusive Ownership Attribution */}
      <footer className="border-t border-slate-800/80 bg-[#0B0F14] py-8">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-center sm:text-right">
              <span className="font-bold text-slate-300">{siteTitle}</span>
              <span aria-hidden="true">·</span>
              <span>
                منصة مجانية و{sadaqahLabel} لنشر القرآن الكريم بدون إعلانات أو علامات مائية
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5">
              <a href="#studio" className="hover:text-slate-300 transition-colors">
                الاستوديو
              </a>
              <a href="#features" className="hover:text-slate-300 transition-colors">
                المميزات
              </a>
              <a href="#sadaqah" className="hover:text-slate-300 transition-colors">
                صدقة جارية
              </a>
              <a href="#faq" className="hover:text-slate-300 transition-colors">
                الأسئلة الشائعة
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/60 pt-4 text-[11px] sm:text-xs text-slate-400">
            <div className="text-center sm:text-right">
              <span>
                الإدارة والوكالة وحقوق النشر والتغيير والتعديل والتحرير محفوظة حصرياً للمسؤول والمدير العام:{' '}
              </span>
              <span className="font-mono text-slate-300">{MASTER_ADMIN_EMAIL}</span>
            </div>

            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {isMasterAdmin ? 'لوحة المسؤول العام (متصل)' : 'دخول المسؤول والمدير'}
              </span>
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
