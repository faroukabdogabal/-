export type IslamicToolId =
  | 'ayat_topic'
  | 'prayer_times'
  | 'qibla'
  | 'hijri_date'
  | 'adhkar_morning_evening'
  | 'tasbih'
  | 'asma_ul_husna'
  | 'ayah_of_day'
  | 'quran_radio'
  | 'zakat_calc'
  | 'khatmah_plan'
  | 'hisn_muslim'
  | 'inheritance_calc'
  | 'hadith_search'
  | 'baby_names'
  | 'makharij'
  | 'quran_memorizer'
  | 'qada_prayer'
  | 'kaffarah_calc'
  | 'hadith_verify'
  | 'fasting_tracker'
  | 'learn_prayer'
  | 'group_khatmah'
  | 'e_numbers'
  | 'nearby_mosques'
  | 'quran_word_search'
  | 'tafsir_muyassar'
  | 'kids_memorizer'
  | 'tajweed_rules'
  | 'zakat_fitr';

export interface IslamicToolDefinition {
  id: IslamicToolId;
  titleArabic: string;
  subtitleArabic: string;
  iconBgClass: string;
  iconTextClass: string;
  featuredInInitialGrid: boolean;
}

export const ISLAMIC_TOOLS_LIST: IslamicToolDefinition[] = [
  // Row 1 (Exact match to screenshot RTL)
  {
    id: 'ayat_topic',
    titleArabic: 'آيات بالموضوع',
    subtitleArabic: 'ابحث عن آيات لأي موضوع واصنع ريلز',
    iconBgClass: 'bg-emerald-500/15 border-emerald-500/30',
    iconTextClass: 'text-emerald-400',
    featuredInInitialGrid: true,
  },
  {
    id: 'prayer_times',
    titleArabic: 'مواقيت الصلاة',
    subtitleArabic: 'الأوقات الخمسة حسب موقعك',
    iconBgClass: 'bg-amber-500/15 border-amber-500/30',
    iconTextClass: 'text-amber-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'qibla',
    titleArabic: 'اتجاه القبلة',
    subtitleArabic: 'بوصلة القبلة الدقيقة',
    iconBgClass: 'bg-yellow-500/15 border-yellow-500/30',
    iconTextClass: 'text-yellow-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'hijri_date',
    titleArabic: 'التاريخ الهجري',
    subtitleArabic: 'محول هجري - ميلادي',
    iconBgClass: 'bg-sky-500/15 border-sky-500/30',
    iconTextClass: 'text-sky-400',
    featuredInInitialGrid: true,
  },

  // Row 2
  {
    id: 'adhkar_morning_evening',
    titleArabic: 'أذكار الصباح والمساء',
    subtitleArabic: 'أذكار حصن المسلم اليومية',
    iconBgClass: 'bg-orange-500/15 border-orange-500/30',
    iconTextClass: 'text-orange-400',
    featuredInInitialGrid: true,
  },
  {
    id: 'tasbih',
    titleArabic: 'المسبحة الإلكترونية',
    subtitleArabic: 'عدّاد التسبيح والذكر',
    iconBgClass: 'bg-rose-500/15 border-rose-500/30',
    iconTextClass: 'text-rose-400',
    featuredInInitialGrid: true,
  },
  {
    id: 'asma_ul_husna',
    titleArabic: 'أسماء الله الحسنى',
    subtitleArabic: 'الـ 99 اسماً مع المعاني',
    iconBgClass: 'bg-amber-500/15 border-amber-500/30',
    iconTextClass: 'text-amber-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'ayah_of_day',
    titleArabic: 'آية اليوم',
    subtitleArabic: 'آية يومية للتدبر والتأمل',
    iconBgClass: 'bg-cyan-500/15 border-cyan-500/30',
    iconTextClass: 'text-cyan-300',
    featuredInInitialGrid: true,
  },

  // Row 3
  {
    id: 'quran_radio',
    titleArabic: 'إذاعة القرآن',
    subtitleArabic: 'بث حي لتلاوات القرآن',
    iconBgClass: 'bg-teal-500/15 border-teal-500/30',
    iconTextClass: 'text-teal-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'zakat_calc',
    titleArabic: 'حاسبة الزكاة',
    subtitleArabic: 'احسب زكاة مالك بدقة',
    iconBgClass: 'bg-yellow-500/15 border-yellow-500/30',
    iconTextClass: 'text-yellow-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'khatmah_plan',
    titleArabic: 'خطة ختم القرآن',
    subtitleArabic: 'جدول الختمة حسب هدفك',
    iconBgClass: 'bg-red-500/15 border-red-500/30',
    iconTextClass: 'text-red-400',
    featuredInInitialGrid: true,
  },
  {
    id: 'hisn_muslim',
    titleArabic: 'حصن المسلم',
    subtitleArabic: 'أدعية وأذكار مأثورة',
    iconBgClass: 'bg-sky-500/15 border-sky-500/30',
    iconTextClass: 'text-sky-300',
    featuredInInitialGrid: true,
  },

  // Row 4
  {
    id: 'inheritance_calc',
    titleArabic: 'حاسبة المواريث',
    subtitleArabic: 'تقسيم التركة بالفقه الإسلامي',
    iconBgClass: 'bg-amber-500/15 border-amber-500/30',
    iconTextClass: 'text-amber-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'hadith_search',
    titleArabic: 'الأحاديث النبوية',
    subtitleArabic: 'بحث في صحيح البخاري ومسلم',
    iconBgClass: 'bg-orange-500/15 border-orange-500/30',
    iconTextClass: 'text-orange-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'baby_names',
    titleArabic: 'أسماء المواليد الإسلامية',
    subtitleArabic: 'آلاف الأسماء ومعانيها',
    iconBgClass: 'bg-yellow-500/15 border-yellow-500/30',
    iconTextClass: 'text-yellow-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'makharij',
    titleArabic: 'مخارج الحروف',
    subtitleArabic: 'تعلّم التجويد تفاعلياً',
    iconBgClass: 'bg-indigo-500/15 border-indigo-500/30',
    iconTextClass: 'text-indigo-400',
    featuredInInitialGrid: true,
  },

  // Row 5
  {
    id: 'quran_memorizer',
    titleArabic: 'محفّظ القرآن',
    subtitleArabic: 'حفظ ومراجعة الآيات بالتكرار',
    iconBgClass: 'bg-blue-500/15 border-blue-500/30',
    iconTextClass: 'text-blue-400',
    featuredInInitialGrid: true,
  },
  {
    id: 'qada_prayer',
    titleArabic: 'حاسبة قضاء الصلاة',
    subtitleArabic: 'احسب وتابع صلواتك الفائتة',
    iconBgClass: 'bg-stone-500/15 border-stone-500/30',
    iconTextClass: 'text-amber-200',
    featuredInInitialGrid: true,
  },
  {
    id: 'kaffarah_calc',
    titleArabic: 'حاسبة الكفارة',
    subtitleArabic: 'كفارة اليمين والصيام',
    iconBgClass: 'bg-amber-500/15 border-amber-500/30',
    iconTextClass: 'text-amber-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'hadith_verify',
    titleArabic: 'تخريج الحديث',
    subtitleArabic: 'تحقق من صحة الأحاديث',
    iconBgClass: 'bg-emerald-500/15 border-emerald-500/30',
    iconTextClass: 'text-emerald-400',
    featuredInInitialGrid: true,
  },

  // Row 6
  {
    id: 'fasting_tracker',
    titleArabic: 'متتبع الصيام',
    subtitleArabic: 'تابع صيامك وقضاءك',
    iconBgClass: 'bg-yellow-500/15 border-yellow-500/30',
    iconTextClass: 'text-yellow-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'learn_prayer',
    titleArabic: 'تعلّم الصلاة',
    subtitleArabic: 'كيفية الصلاة خطوة بخطوة',
    iconBgClass: 'bg-amber-500/15 border-amber-500/30',
    iconTextClass: 'text-amber-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'group_khatmah',
    titleArabic: 'ختمة جماعية',
    subtitleArabic: 'شارك في ختمة قرآن جماعية',
    iconBgClass: 'bg-indigo-500/15 border-indigo-500/30',
    iconTextClass: 'text-indigo-300',
    featuredInInitialGrid: true,
  },
  {
    id: 'e_numbers',
    titleArabic: 'فاحص E-numbers',
    subtitleArabic: 'حلال أم حرام للأكواد الغذائية',
    iconBgClass: 'bg-lime-500/15 border-lime-500/30',
    iconTextClass: 'text-lime-400',
    featuredInInitialGrid: true,
  },

  // Row 7 (25th visible in screenshot + 5 more when clicking "شاهد جميع الأدوات الإسلامية")
  {
    id: 'nearby_mosques',
    titleArabic: 'أقرب المساجد',
    subtitleArabic: 'المساجد القريبة منك والقبلة',
    iconBgClass: 'bg-pink-500/15 border-pink-500/30',
    iconTextClass: 'text-pink-400',
    featuredInInitialGrid: true,
  },
  {
    id: 'quran_word_search',
    titleArabic: 'البحث المعجمي بالقرآن',
    subtitleArabic: 'ابحث عن أي كلمة في آيات المصحف',
    iconBgClass: 'bg-emerald-500/15 border-emerald-500/30',
    iconTextClass: 'text-emerald-400',
    featuredInInitialGrid: false,
  },
  {
    id: 'tafsir_muyassar',
    titleArabic: 'التفسير الميسّر',
    subtitleArabic: 'تفسير واضح وميسر لآيات القرآن',
    iconBgClass: 'bg-cyan-500/15 border-cyan-500/30',
    iconTextClass: 'text-cyan-300',
    featuredInInitialGrid: false,
  },
  {
    id: 'kids_memorizer',
    titleArabic: 'تحفيظ الأطفال وشهادة تفوق',
    subtitleArabic: 'جدول جزء عمّ مع شهادة باسم الطفل',
    iconBgClass: 'bg-amber-500/15 border-amber-500/30',
    iconTextClass: 'text-amber-300',
    featuredInInitialGrid: false,
  },
  {
    id: 'tajweed_rules',
    titleArabic: 'أحكام التجويد المبسطة',
    subtitleArabic: 'النون الساكنة والمدود والقلقلة بالأمثلة',
    iconBgClass: 'bg-teal-500/15 border-teal-500/30',
    iconTextClass: 'text-teal-300',
    featuredInInitialGrid: false,
  },
  {
    id: 'zakat_fitr',
    titleArabic: 'حاسبة زكاة الفطر والصدقات',
    subtitleArabic: 'حساب زكاة الفطر بالصاع والقيمة النقدية',
    iconBgClass: 'bg-emerald-500/15 border-emerald-500/30',
    iconTextClass: 'text-emerald-300',
    featuredInInitialGrid: false,
  },
];

// 1. Ayat by Topic
export interface TopicVerseItem {
  surahId: number;
  surahName: string;
  fromAyah: number;
  toAyah: number;
  textArabic: string;
}

export interface QuranTopicCategory {
  id: string;
  title: string;
  verses: TopicVerseItem[];
}

export const QURAN_TOPICS: QuranTopicCategory[] = [
  {
    id: 'patience',
    title: 'الصبر والفرج وجبر الخواطر',
    verses: [
      {
        surahId: 94,
        surahName: 'الشرح',
        fromAyah: 1,
        toAyah: 8,
        textArabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
      },
      {
        surahId: 93,
        surahName: 'الضحى',
        fromAyah: 1,
        toAyah: 5,
        textArabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ',
      },
      {
        surahId: 2,
        surahName: 'البقرة',
        fromAyah: 155,
        toAyah: 157,
        textArabic: 'وَبَشِّرِ الصَّابِرِينَ ۝ الَّذِينَ إِذَا أَصَابَتْهُم مُّصِيبَةٌ قَالُوا إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ',
      },
      {
        surahId: 65,
        surahName: 'الطلاق',
        fromAyah: 2,
        toAyah: 3,
        textArabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ۝ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ',
      },
    ],
  },
  {
    id: 'rizq',
    title: 'الرزق والبركة والتوكل',
    verses: [
      {
        surahId: 51,
        surahName: 'الذاريات',
        fromAyah: 22,
        toAyah: 23,
        textArabic: 'وَفِي السَّمَاءِ رِزْقُكُمْ وَمَا تُوعَدُونَ ۝ فَوَرَبِّ السَّمَاءِ وَالْأَرْضِ إِنَّهُ لَحَقٌّ',
      },
      {
        surahId: 71,
        surahName: 'نوح',
        fromAyah: 10,
        toAyah: 12,
        textArabic: 'فَقُلْتُ اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا ۝ يُرْسِلِ السَّمَاءَ عَلَيْكُم مِّدْرَارًا',
      },
      {
        surahId: 11,
        surahName: 'هود',
        fromAyah: 6,
        toAyah: 6,
        textArabic: 'وَمَا مِن دَابَّةٍ فِي الْأَرْضِ إِلَّا عَلَى اللَّهِ رِزْقُهَا وَيَعْلَمُ مُسْتَقَرَّهَا وَمُسْتَوْدَعَهَا',
      },
    ],
  },
  {
    id: 'sakina',
    title: 'السكينة والطمأنينة وذكر الله',
    verses: [
      {
        surahId: 13,
        surahName: 'الرعد',
        fromAyah: 28,
        toAyah: 29,
        textArabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
      },
      {
        surahId: 2,
        surahName: 'البقرة',
        fromAyah: 255,
        toAyah: 255,
        textArabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
      },
      {
        surahId: 48,
        surahName: 'الفتح',
        fromAyah: 4,
        toAyah: 4,
        textArabic: 'هُوَ الَّذِي أَنزَلَ السَّكِينَةَ فِي قُلُوبِ الْمُؤْمِنِينَ لِيَزْدَادُوا إِيمَانًا مَّعَ إِيمَانِهِمْ',
      },
    ],
  },
  {
    id: 'dua',
    title: 'الدعاء والاستجابة والرجاء',
    verses: [
      {
        surahId: 2,
        surahName: 'البقرة',
        fromAyah: 186,
        toAyah: 186,
        textArabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ',
      },
      {
        surahId: 21,
        surahName: 'الأنبياء',
        fromAyah: 87,
        toAyah: 88,
        textArabic: 'لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ ۝ فَاسْتَجَبْنَا لَهُ وَنَجَّيْنَاهُ مِنَ الْغَمِّ',
      },
      {
        surahId: 40,
        surahName: 'غافر',
        fromAyah: 60,
        toAyah: 60,
        textArabic: 'وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ',
      },
    ],
  },
  {
    id: 'mercy',
    title: 'التوبة والمغفرة ورحمة الله',
    verses: [
      {
        surahId: 39,
        surahName: 'الزمر',
        fromAyah: 53,
        toAyah: 54,
        textArabic: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا',
      },
      {
        surahId: 25,
        surahName: 'الفرقان',
        fromAyah: 70,
        toAyah: 71,
        textArabic: 'إِلَّا مَن تَابَ وَآمَنَ وَعَمِلَ عَمَلًا صَالِحًا فَأُولَٰئِكَ يُبَدِّلُ اللَّهُ سَيِّئَاتِهِمْ حَسَنَاتٍ',
      },
    ],
  },
  {
    id: 'parents',
    title: 'بر الوالدين والدعاء لهما',
    verses: [
      {
        surahId: 17,
        surahName: 'الإسراء',
        fromAyah: 23,
        toAyah: 24,
        textArabic: 'وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا ... وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
      },
      {
        surahId: 14,
        surahName: 'إبراهيم',
        fromAyah: 40,
        toAyah: 41,
        textArabic: 'رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
      },
    ],
  },
];

// 2. Major Cities for Prayer Times & Qibla Fallback
export interface WorldCity {
  nameArabic: string;
  cityQuery: string;
  countryQuery: string;
  lat: number;
  lng: number;
}

export const ARAB_AND_WORLD_CITIES: WorldCity[] = [
  { nameArabic: 'القاهرة — مصر', cityQuery: 'Cairo', countryQuery: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { nameArabic: 'الإسكندرية — مصر', cityQuery: 'Alexandria', countryQuery: 'Egypt', lat: 31.2001, lng: 29.9187 },
  { nameArabic: 'مكة المكرمة — السعودية', cityQuery: 'Makkah', countryQuery: 'Saudi Arabia', lat: 21.4225, lng: 39.8262 },
  { nameArabic: 'المدينة المنورة — السعودية', cityQuery: 'Madinah', countryQuery: 'Saudi Arabia', lat: 24.4672, lng: 39.6024 },
  { nameArabic: 'الرياض — السعودية', cityQuery: 'Riyadh', countryQuery: 'Saudi Arabia', lat: 24.7136, lng: 46.6753 },
  { nameArabic: 'جدة — السعودية', cityQuery: 'Jeddah', countryQuery: 'Saudi Arabia', lat: 21.5433, lng: 39.1728 },
  { nameArabic: 'دبي — الإمارات', cityQuery: 'Dubai', countryQuery: 'UAE', lat: 25.2048, lng: 55.2708 },
  { nameArabic: 'أبوظبي — الإمارات', cityQuery: 'Abu Dhabi', countryQuery: 'UAE', lat: 24.4539, lng: 54.3773 },
  { nameArabic: 'الكويت — الكويت', cityQuery: 'Kuwait City', countryQuery: 'Kuwait', lat: 29.3759, lng: 47.9774 },
  { nameArabic: 'الدوحة — قطر', cityQuery: 'Doha', countryQuery: 'Qatar', lat: 25.2854, lng: 51.531 },
  { nameArabic: 'عمّان — الأردن', cityQuery: 'Amman', countryQuery: 'Jordan', lat: 31.9454, lng: 35.9284 },
  { nameArabic: 'القدس الشريف — فلسطين', cityQuery: 'Jerusalem', countryQuery: 'Palestine', lat: 31.7683, lng: 35.2137 },
  { nameArabic: 'بغداد — العراق', cityQuery: 'Baghdad', countryQuery: 'Iraq', lat: 33.3152, lng: 44.3661 },
  { nameArabic: 'دمشق — سوريا', cityQuery: 'Damascus', countryQuery: 'Syria', lat: 33.5138, lng: 36.2765 },
  { nameArabic: 'الدار البيضاء — المغرب', cityQuery: 'Casablanca', countryQuery: 'Morocco', lat: 33.5731, lng: -7.5898 },
  { nameArabic: 'الجزائر — الجزائر', cityQuery: 'Algiers', countryQuery: 'Algeria', lat: 36.7538, lng: 3.0588 },
  { nameArabic: 'تونس — تونس', cityQuery: 'Tunis', countryQuery: 'Tunisia', lat: 36.8065, lng: 10.1815 },
  { nameArabic: 'إسطنبول — تركيا', cityQuery: 'Istanbul', countryQuery: 'Turkey', lat: 41.0082, lng: 28.9784 },
  { nameArabic: 'لندن — بريطانيا', cityQuery: 'London', countryQuery: 'UK', lat: 51.5072, lng: -0.1276 },
];

// 3. Adhkar Morning / Evening / After Prayer / Sleep
export interface DhikrEntry {
  id: string;
  category: 'morning' | 'evening' | 'prayer' | 'sleep';
  text: string;
  count: number;
  virtue: string;
}

export const ADHKAR_LIST: DhikrEntry[] = [
  {
    id: 'm1',
    category: 'morning',
    text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۖ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ.',
    count: 1,
    virtue: 'من قالها حين يصبح أجير من الجن حتى يمسي.',
  },
  {
    id: 'm2',
    category: 'morning',
    text: 'قُلْ هُوَ اللَّهُ أَحَدٌ ... والمعوذتين (قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ) و (قُلْ أَعُوذُ بِرَبِّ النَّاسِ).',
    count: 3,
    virtue: 'من قالها ثلاث مرات حين يصبح وحين يمسي كفته من كل شيء.',
  },
  {
    id: 'm3',
    category: 'morning',
    text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ.',
    count: 1,
    virtue: 'سؤال الله خير هذا اليوم وخير ما بعده.',
  },
  {
    id: 'm4',
    category: 'morning',
    text: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.',
    count: 1,
    virtue: 'سيد الاستغفار — من قالها موقناً بها فمات من يومه دخل الجنة.',
  },
  {
    id: 'm5',
    category: 'morning',
    text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ.',
    count: 3,
    virtue: 'لم يضره من الله شيء.',
  },
  {
    id: 'm6',
    category: 'morning',
    text: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ.',
    count: 7,
    virtue: 'من قالها سبع مرات كفاه الله ما أهمه من أمر الدنيا والآخرة.',
  },
  {
    id: 'm7',
    category: 'morning',
    text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ.',
    count: 3,
    virtue: 'ذكر مضاعف الأجر والثواب.',
  },
  {
    id: 'e1',
    category: 'evening',
    text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ.',
    count: 1,
    virtue: 'حفظ وبركة في المساء والليل.',
  },
  {
    id: 'e2',
    category: 'evening',
    text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ.',
    count: 3,
    virtue: 'تحصين تام من شر الهوام والدواب في الليل.',
  },
  {
    id: 'e3',
    category: 'evening',
    text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ.',
    count: 1,
    virtue: 'من أذكار المساء الثابتة عن النبي ﷺ.',
  },
  {
    id: 'e4',
    category: 'evening',
    text: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا.',
    count: 3,
    virtue: 'كان حقاً على الله أن يرضيه يوم القيامة.',
  },
  {
    id: 'p1',
    category: 'prayer',
    text: 'أَسْتَغْفِرُ اللَّهَ (ثلاثاً) .. اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ.',
    count: 1,
    virtue: 'مباشرة بعد السلام من الصلاة المفروضة.',
  },
  {
    id: 'p2',
    category: 'prayer',
    text: 'سُبْحَانَ اللَّهِ (33) · الْحَمْدُ لِلَّهِ (33) · اللَّهُ أَكْبَرُ (33)، وتمام المائة: لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ.',
    count: 33,
    virtue: 'غُفرت خطاياه وإن كانت مثل زبد البحر.',
  },
  {
    id: 's1',
    category: 'sleep',
    text: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ.',
    count: 1,
    virtue: 'عند وضع الجنب للنوم.',
  },
  {
    id: 's2',
    category: 'sleep',
    text: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ.',
    count: 3,
    virtue: 'كان النبي ﷺ يقولها إذا أراد أن يرقد.',
  },
];

// 4. All 99 Names of Allah (Asma ul Husna)
export const ASMA_UL_HUSNA_99: { num: number; name: string; meaning: string }[] = [
  { num: 1, name: 'الله', meaning: 'الاسم الأعظم الجامع لمعاني الألوهية والعبودية' },
  { num: 2, name: 'الرحمن', meaning: 'ذو الرحمة الواسعة التي وسعت كل شيء' },
  { num: 3, name: 'الرحيم', meaning: 'الموصل رحمته الخاصة لعباده المؤمنين' },
  { num: 4, name: 'الملك', meaning: 'المتصرف في ملكه كيف يشاء بلا منازع' },
  { num: 5, name: 'القدوس', meaning: 'المنزه عن كل نقص وعيب' },
  { num: 6, name: 'السلام', meaning: 'السالم من النقائص ومانح السلام لعباده' },
  { num: 7, name: 'المؤمن', meaning: 'المصدق لرسله والمانح للأمن من عذابه' },
  { num: 8, name: 'المهيمن', meaning: 'الرقيب الحافظ لكل شيء والشاهد عليه' },
  { num: 9, name: 'العزيز', meaning: 'الغالب القوي الذي لا يُغلب' },
  { num: 10, name: 'الجبار', meaning: 'القاهر لخلقه والجابر لقلوب المنكسرين' },
  { num: 11, name: 'المتكبر', meaning: 'المتعالي عن صفات الخلق المنفرد بالعظمة' },
  { num: 12, name: 'الخالق', meaning: 'المبدع للخلق من العدم بتقدير' },
  { num: 13, name: 'البارئ', meaning: 'الموجد للخلق بريئاً من التفاوت' },
  { num: 14, name: 'المصور', meaning: 'الذي صور جميع الموجودات وميزها بهيئاتها' },
  { num: 15, name: 'الغفار', meaning: 'كثير المغفرة والستر لذنوب التائبين' },
  { num: 16, name: 'القهار', meaning: 'الذي خضعت له الرقاب وذلت له الجبابرة' },
  { num: 17, name: 'الوهاب', meaning: 'كثير العطاء والمنح بلا عوض' },
  { num: 18, name: 'الرزاق', meaning: 'المتكفل بأرزاق جميع المخلوقات' },
  { num: 19, name: 'الفتاح', meaning: 'الذي يفتح خزائن رحمته ويحكم بالحق' },
  { num: 20, name: 'العليم', meaning: 'المحيط علمه بالظواهر والبواطن' },
  { num: 21, name: 'القابض', meaning: 'الذي يقبض الأرزاق والأرواح بحكمته' },
  { num: 22, name: 'الباسط', meaning: 'الذي يوسع الرزق والرحمة لمن يشاء' },
  { num: 23, name: 'الخافض', meaning: 'الذي يخفض أهل الباطل والطغيان' },
  { num: 24, name: 'الرافع', meaning: 'الذي يرفع المؤمنين وأهل العلم والطاعة' },
  { num: 25, name: 'المعز', meaning: 'الذي يهب العزة لمن أطاعه' },
  { num: 26, name: 'المذل', meaning: 'الذي يذل من عصاه واستكبر' },
  { num: 27, name: 'السميع', meaning: 'الذي يسمع السر والنجوى وكل صوت' },
  { num: 28, name: 'البصير', meaning: 'الذي يبصر كل شيء وإن دق وصغر' },
  { num: 29, name: 'الحكم', meaning: 'الذي يفصل بين الخلق بالعدل التام' },
  { num: 30, name: 'العدل', meaning: 'المنزه عن الظلم والجور في أحكامه' },
  { num: 31, name: 'اللطيف', meaning: 'البر بعباده الذي يوصل إليهم مصالحهم برفق' },
  { num: 32, name: 'الخبير', meaning: 'العالم ببواطن الأمور ودقائقها' },
  { num: 33, name: 'الحليم', meaning: 'الذي لا يعاجل العصاة بالعقوبة ويمهلهم' },
  { num: 34, name: 'العظيم', meaning: 'البالغ أقصى مراتب العظمة والجلال' },
  { num: 35, name: 'الغفور', meaning: 'الذي يمحو الذنوب ويستر العيوب' },
  { num: 36, name: 'الشكور', meaning: 'الذي يضاعف الثواب على العمل القليل' },
  { num: 37, name: 'العلي', meaning: 'ذو العلو المطلق ذاتاً وقدراً وقهراً' },
  { num: 38, name: 'الكبير', meaning: 'الأكبر من كل شيء ذاتاً وصفةً' },
  { num: 39, name: 'الحفيظ', meaning: 'الذي يحفظ السماوات والأرض وعباده' },
  { num: 40, name: 'المقيت', meaning: 'المقتدر وخالق الأقوات وموصلها' },
  { num: 41, name: 'الحسيب', meaning: 'الكافي لعباده والمحاسب لهم' },
  { num: 42, name: 'الجليل', meaning: 'الموصوف بصفات الجلال والكمال' },
  { num: 43, name: 'الكريم', meaning: 'الجواد المعطي الذي لا ينفد عطاؤه' },
  { num: 44, name: 'الرقيب', meaning: 'المطلع على الضمائر والأعمال كل لحظة' },
  { num: 45, name: 'المجيب', meaning: 'الذي يجيب دعوة الداعين والمضطرين' },
  { num: 46, name: 'الواسع', meaning: 'الذي وسع غناه وعلمه ورحمته كل شيء' },
  { num: 47, name: 'الحكيم', meaning: 'الذي يضع كل شيء في موضعه الصحيح' },
  { num: 48, name: 'الودود', meaning: 'المحب لأوليائه المحبوب في قلوبهم' },
  { num: 49, name: 'المجيد', meaning: 'الواسع الكرم العظيم الشرف والمجد' },
  { num: 50, name: 'الباعث', meaning: 'الذي يبعث الخلق بعد الموت للحساب' },
  { num: 51, name: 'الشهيد', meaning: 'الحاضر الذي لا يغيب عن علمه شيء' },
  { num: 52, name: 'الحق', meaning: 'الثابت وجوده وملكه ووعده حقاً يقيناً' },
  { num: 53, name: 'الوكيل', meaning: 'الكفيل بأرزاق العباد ومصالح من توكل عليه' },
  { num: 54, name: 'القوي', meaning: 'التام القوة والقدرة بلا ضعف' },
  { num: 55, name: 'المتين', meaning: 'الشديد القوة الذي لا يلحقه مشقة' },
  { num: 56, name: 'الولي', meaning: 'الناصر والمعين والمحب لعباده الصالحين' },
  { num: 57, name: 'الحميد', meaning: 'المستحق للحمد والثناء في السراء والضراء' },
  { num: 58, name: 'المحصي', meaning: 'الذي أحصى كل شيء عدداً وعلماً' },
  { num: 59, name: 'المبدئ', meaning: 'الذي أنشأ الخلق ابتداءً على غير مثال' },
  { num: 60, name: 'المعيد', meaning: 'الذي يعيد الخلق للحياة يوم القيامة' },
  { num: 61, name: 'المحيي', meaning: 'واهب الحياة للأجساد والقلوب والأرض' },
  { num: 62, name: 'المميت', meaning: 'مقدر الموت على كل نفس حية' },
  { num: 63, name: 'الحي', meaning: 'الباقي حياة كاملة أزلية أبدية' },
  { num: 64, name: 'القيوم', meaning: 'القائم بنفسه المقيم لشؤون جميع خلقه' },
  { num: 65, name: 'الواجد', meaning: 'الغني الذي لا يعوزه ولا يفوته شيء' },
  { num: 66, name: 'الماجد', meaning: 'العظيم الإحسان الواسع الفضل' },
  { num: 67, name: 'الواحد', meaning: 'المتفرد في ذاته وصفاته وأفعاله' },
  { num: 68, name: 'الأحد', meaning: 'الفرد الذي لا نظير له ولا شبيه' },
  { num: 69, name: 'الصمد', meaning: 'السيد المقصود في قضاء جميع الحوائج' },
  { num: 70, name: 'القادر', meaning: 'المتمكن من إيجاد وإعدام ما يشاء' },
  { num: 71, name: 'المقتدر', meaning: 'البالغ أسمى غايات القدرة والتمكن' },
  { num: 72, name: 'المقدم', meaning: 'الذي يقدم ما يشاء بحكمته وفضله' },
  { num: 73, name: 'المؤخر', meaning: 'الذي يؤخر ما يشاء بعدله وحكمته' },
  { num: 74, name: 'الأول', meaning: 'الذي ليس لوجوده بداية فسبقه العدم' },
  { num: 75, name: 'الآخر', meaning: 'الباقي بعد فناء الخلق بلا نهاية' },
  { num: 76, name: 'الظاهر', meaning: 'العالي فوق كل شيء الواضح بآياته' },
  { num: 77, name: 'الباطن', meaning: 'المحتجب عن الأبصار العالم بالسرائر' },
  { num: 78, name: 'الوالي', meaning: 'المالك للأشياء المتصرف فيها بتدبيره' },
  { num: 79, name: 'المتعالي', meaning: 'المنزه عن أوهام الخلق وعن كل نقص' },
  { num: 80, name: 'البر', meaning: 'العطوف المحسن الكثير البر بعباده' },
  { num: 81, name: 'التواب', meaning: 'الذي يوفق للتوبة ويقبلها مرة بعد مرة' },
  { num: 82, name: 'المنتقم', meaning: 'الذي يعاقب الطغاة والظالمين بعدله' },
  { num: 83, name: 'العفو', meaning: 'الذي يمحو السيئات ويتجاوز عن المعاصي' },
  { num: 84, name: 'الرؤوف', meaning: 'شديد الرحمة والشفقة بعباده' },
  { num: 85, name: 'مالك الملك', meaning: 'صاحب التصرف المطلق في الملكوت' },
  { num: 86, name: 'ذو الجلال والإكرام', meaning: 'صاحب العظمة والكبرياء والجود على أوليائه' },
  { num: 87, name: 'المقسط', meaning: 'العادل في حكمه المنتصف للمظلوم' },
  { num: 88, name: 'الجامع', meaning: 'الذي يجمع الخلق ليوم لا ريب فيه' },
  { num: 89, name: 'الغني', meaning: 'المستغني عن كل ما سواه المفتقر إليه الكل' },
  { num: 90, name: 'المغني', meaning: 'الذي يغني من يشاء من عباده بفضله' },
  { num: 91, name: 'المانع', meaning: 'الذي يمنع البلاء أو العطاء لحكمة بالغة' },
  { num: 92, name: 'الضار', meaning: 'المقدر للضر ابتلاءً وعدلاً لمن يشاء' },
  { num: 93, name: 'النافع', meaning: 'المقدر للنفع والخير لعباده' },
  { num: 94, name: 'النور', meaning: 'منور السماوات والأرض وهادي القلوب' },
  { num: 95, name: 'الهادي', meaning: 'المرشد عباده إلى سبل الخير والرشاد' },
  { num: 96, name: 'البديع', meaning: 'خالق الكائنات بإبداع من غير مثال سابق' },
  { num: 97, name: 'الباقي', meaning: 'الدائم الوجود الذي لا يعتريه فناء' },
  { num: 98, name: 'الوارث', meaning: 'الباقي مالكاً لكل شيء بعد فناء الخلق' },
  { num: 99, name: 'الصبور', meaning: 'الذي يمهل ولا يستعجل العقوبة على العصاة' },
];

// 5. Live Quran Radio Streams (qurango / mp3quran HTTPS streams)
export interface QuranRadioStation {
  id: string;
  nameArabic: string;
  descArabic: string;
  streamUrl: string;
}

export const QURAN_RADIO_STATIONS: QuranRadioStation[] = [
  {
    id: 'tarateel',
    nameArabic: 'إذاعة التلاوات الخاشعة العامة',
    descArabic: 'تلاوات قصيرة خاشعة على مدار الساعة',
    streamUrl: 'https://backup.qurango.net/radio/salma',
  },
  {
    id: 'alafasy',
    nameArabic: 'إذاعة مشاري راشد العفاسي',
    descArabic: 'بث مباشر متواصل برواية حفص عن عاصم',
    streamUrl: 'https://backup.qurango.net/radio/mishary_alafasi',
  },
  {
    id: 'abdulbasit',
    nameArabic: 'إذاعة عبد الباسط عبد الصمد (مجود)',
    descArabic: 'روائع التجويد الأصيل على مدار 24 ساعة',
    streamUrl: 'https://backup.qurango.net/radio/abdulbasit_abdulsamad_mojawwad',
  },
  {
    id: 'minshawi',
    nameArabic: 'إذاعة محمد صديق المنشاوي',
    descArabic: 'تلاوات مرتلة خاشعة للمنشاوي رحمه الله',
    streamUrl: 'https://backup.qurango.net/radio/mohammed_siddiq_alminshawi',
  },
  {
    id: 'maher',
    nameArabic: 'إذاعة ماهر المعيقلي',
    descArabic: 'ختمات مرتلة كاملة من رحاب الحرم المكي',
    streamUrl: 'https://backup.qurango.net/radio/maher',
  },
  {
    id: 'husary',
    nameArabic: 'إذاعة محمود خليل الحصري',
    descArabic: 'المصحف المرتل المتقن لتصحيح التلاوة',
    streamUrl: 'https://backup.qurango.net/radio/mahmoud_khalil_alhussary',
  },
];

// 6. Hisn Al-Muslim Supplications
export const HISN_MUSLIM_DUAS: { category: string; title: string; dua: string }[] = [
  {
    category: 'الكرب والهم',
    title: 'دعاء تفريج الكرب العظيم',
    dua: 'لَا إِلَٰهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَٰهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَٰهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ.',
  },
  {
    category: 'الكرب والهم',
    title: 'دعاء زوال الهم والحزن',
    dua: 'اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ، أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي.',
  },
  {
    category: 'الاستخارة',
    title: 'دعاء صلاة الاستخارة',
    dua: 'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ، اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاقْدُرْهُ لِي وَيَسِّرْهُ لِي ثُمَّ بَارِكْ لِي فِيهِ...',
  },
  {
    category: 'السفر والمنزل',
    title: 'دعاء الخروج من المنزل',
    dua: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ.',
  },
  {
    category: 'السفر والمنزل',
    title: 'دعاء السفر',
    dua: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ، اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى.',
  },
  {
    category: 'الشفاء والمرضى',
    title: 'رقية ودعاء عيادة المريض',
    dua: 'اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَاسَ، اشْفِهِ وَأَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا.',
  },
];

// 7. Authentic Hadiths & Hadith Verification DB
export interface HadithRecord {
  id: string;
  text: string;
  narrator: string;
  source: string;
  grade: 'صحيح متفق عليه' | 'صحيح البخاري' | 'صحيح مسلم' | 'حديث حسن صحيح';
  topic: string;
}

export const HADITH_COLLECTION: HadithRecord[] = [
  {
    id: 'h1',
    text: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى.',
    narrator: 'عمر بن الخطاب رضي الله عنه',
    source: 'صحيح البخاري ومسلم',
    grade: 'صحيح متفق عليه',
    topic: 'الإخلاص والنية',
  },
  {
    id: 'h2',
    text: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ.',
    narrator: 'عثمان بن عفان رضي الله عنه',
    source: 'صحيح البخاري',
    grade: 'صحيح البخاري',
    topic: 'فضل القرآن',
  },
  {
    id: 'h3',
    text: 'إِذَا مَاتَ الإِنْسَانُ انْقَطَعَ عَنْهُ عَمَلُهُ إِلَّا مِنْ ثَلَاثَةٍ: إِلَّا مِنْ صَدَقَةٍ جَارِيَةٍ، أَوْ عِلْمٍ يُنْتَفَعُ بِهِ، أَوْ وَلَدٍ صَالِحٍ يَدْعُو لَهُ.',
    narrator: 'أبو هريرة رضي الله عنه',
    source: 'صحيح مسلم',
    grade: 'صحيح مسلم',
    topic: 'الصدقة الجارية',
  },
  {
    id: 'h4',
    text: 'كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ.',
    narrator: 'أبو هريرة رضي الله عنه',
    source: 'صحيح البخاري ومسلم',
    grade: 'صحيح متفق عليه',
    topic: 'الذكر والتسبيح',
  },
  {
    id: 'h5',
    text: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا، سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ.',
    narrator: 'أبو هريرة رضي الله عنه',
    source: 'صحيح مسلم',
    grade: 'صحيح مسلم',
    topic: 'فضل العلم',
  },
  {
    id: 'h6',
    text: 'اقْرَءُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ.',
    narrator: 'أبو أمامة الباهلي رضي الله عنه',
    source: 'صحيح مسلم',
    grade: 'صحيح مسلم',
    topic: 'فضل القرآن',
  },
  {
    id: 'h7',
    text: 'أَحَبُّ النَّاسِ إِلَى اللَّهِ أَنْفَعُهُمْ لِلنَّاسِ، وَأَحَبُّ الأَعْمَالِ إِلَى اللَّهِ سُرُورٌ تُدْخِلُهُ عَلَى مُسْلِمٍ.',
    narrator: 'عبد الله بن عمر رضي الله عنهما',
    source: 'المعجم الكبير وحسنه الألباني',
    grade: 'حديث حسن صحيح',
    topic: 'الأخلاق وقضاء الحوائج',
  },
];

export const HADITH_VERIFICATION_CHECKS: {
  phrase: string;
  ruling: 'صحيح ثابت' | 'ضعيف' | 'لا أصل له (منتشر خطأً)';
  explanation: string;
}[] = [
  {
    phrase: 'خيركم من تعلم القرآن وعلمه',
    ruling: 'صحيح ثابت',
    explanation: 'رواه الإمام البخاري في صحيحه من حديث عثمان بن عفان رضي الله عنه.',
  },
  {
    phrase: 'إذا مات الإنسان انقطع عمله إلا من ثلاث صدقة جارية',
    ruling: 'صحيح ثابت',
    explanation: 'رواه الإمام مسلم في صحيحه من حديث أبي هريرة رضي الله عنه.',
  },
  {
    phrase: 'الدال على الخير كفاعله',
    ruling: 'صحيح ثابت',
    explanation: 'رواه الترمذي عن أنس وأبي مسعود البدري رضي الله عنهما وصححه أهل العلم.',
  },
  {
    phrase: 'اطلبوا العلم ولو في الصين',
    ruling: 'ضعيف',
    explanation: 'حديث ضعيف جداً عند المحدثين، ويغني عنه الصحيح: «من سلك طريقاً يلتمس فيه علماً سهل الله له به طريقاً إلى الجنة».',
  },
  {
    phrase: 'النظافة من الإيمان',
    ruling: 'ضعيف',
    explanation: 'ضعيف بهذا اللفظ، واللفظ النبوي الصحيح الثابت في مسلم هو: «الطُّهُورُ شَطْرُ الإِيمَانِ».',
  },
  {
    phrase: 'السفر قطعة من العذاب',
    ruling: 'صحيح ثابت',
    explanation: 'متفق عليه في صحيحي البخاري ومسلم من حديث أبي هريرة رضي الله عنه.',
  },
  {
    phrase: 'الجنة تحت أقدام الأمهات',
    ruling: 'ضعيف',
    explanation: 'لا يصح بهذا اللفظ المشهور، واللفظ الصحيح عند النسائي: «الْزَمْهَا فَإِنَّ الْجَنَّةَ تَحْتَ رِجْلَيْهَا».',
  },
  {
    phrase: 'اعمل لدنياك كأنك تعيش أبداً واعمل لآخرتك كأنك تموت غداً',
    ruling: 'لا أصل له (منتشر خطأً)',
    explanation: 'لا يصح مرفوعاً عن النبي ﷺ، وإنما يُروى من كلام بعض الصحابة والتابعين كحكمة.',
  },
];

// 8. Islamic Baby Names
export const ISLAMIC_BABY_NAMES: {
  name: string;
  gender: 'male' | 'female';
  origin: string;
  meaning: string;
}[] = [
  { name: 'محمد', gender: 'male', origin: 'قرآني ونبوي', meaning: 'المحمود الخصال المثنى عليه كثيراً' },
  { name: 'أحمد', gender: 'male', origin: 'قرآني ونبوي', meaning: 'الأكثر حمداً لله والمستحق للثناء' },
  { name: 'عمر', gender: 'male', origin: 'صحابـي جليل', meaning: 'العمر المديد والعمارة والحياة' },
  { name: 'يوسف', gender: 'male', origin: 'نبي كريم (قرآني)', meaning: 'الله يمنح ويضاعف العطاء والجمال' },
  { name: 'إبراهيم', gender: 'male', origin: 'خليل الرحمن (قرآني)', meaning: 'الأب الرحيم المشفق' },
  { name: 'حمزة', gender: 'male', origin: 'سيد الشهداء', meaning: 'الأسد الشجاع المهيب والصلابة' },
  { name: 'ريان', gender: 'male', origin: 'حديث نبوي', meaning: 'المرتوي، وباب الصائمين في الجنة' },
  { name: 'تميم', gender: 'male', origin: 'عربي أصيل وصحابي', meaning: 'الكامل الخَلق والخُلق الشديد' },
  { name: 'سفيان', gender: 'male', origin: 'صحابي وتابعي', meaning: 'المسرع في الخير الواضح الطريق' },
  { name: 'زياد', gender: 'male', origin: 'عربي أصيل', meaning: 'النماء والكثرة والفضل والعطاء' },
  { name: 'مريم', gender: 'female', origin: 'سورة في القرآن', meaning: 'العابدة الزاهدة الخادمة لربها' },
  { name: 'فاطمة', gender: 'female', origin: 'بنت رسول الله ﷺ', meaning: 'التي فُطمت وذريتها عن النار' },
  { name: 'خديجة', gender: 'female', origin: 'أم المؤمنين', meaning: 'المولودة المبكرة المباركة السباقة للخير' },
  { name: 'عائشة', gender: 'female', origin: 'أم المؤمنين', meaning: 'ذات الحياة الطيبة الهانئة العامرة' },
  { name: 'آسية', gender: 'female', origin: 'سيدة نساء الجنة', meaning: 'المواساة والمداوية للجراح المتأملة' },
  { name: 'تسنيم', gender: 'female', origin: 'قرآني (المطففين)', meaning: 'أعلى عيون الماء شرفاً في الجنة' },
  { name: 'سلسبيل', gender: 'female', origin: 'قرآني (الإنسان)', meaning: 'العذب السهل السائغ وعين في الجنة' },
  { name: 'سدرة', gender: 'female', origin: 'قرآني (النجم)', meaning: 'شجرة النبق المباركة (سدرة المنتهى)' },
  { name: 'جنى', gender: 'female', origin: 'قرآني (الرحمن)', meaning: 'ما يُجنى من ثمار الجنة الطيبة' },
  { name: 'نور', gender: 'female', origin: 'قرآني (سورة النور)', meaning: 'الإشراق والضياء والهداية' },
];

// 9. Makharij Al-Huruf & Tajweed
export const MAKHARIJ_ZONES: {
  id: string;
  zone: string;
  letters: string;
  description: string;
  example: string;
}[] = [
  {
    id: 'jawf',
    zone: '١. الجوف (خلاء الفم والحلق)',
    letters: 'أ ، و ، ي (حروف المد الثلاثة)',
    description: 'تخرج منه الألف الساكنة المفتوح ما قبلها، والواو الساكنة المضموم ما قبلها، والياء الساكنة المكسور ما قبلها، وينتهي صوتها بانتهاء هواء الفم.',
    example: '﴿نُوحِيهَا﴾ جمعت حروف المد الجوفية الثلاثة في كلمة واحدة.',
  },
  {
    id: 'halq',
    zone: '٢. الحلق (ثلاثة مخارج لستة أحرف)',
    letters: 'ء ، هـ | ع ، ح | غ ، خ',
    description: 'أقصى الحلق (الهمزة والهاء)، وسط الحلق (العين والحاء)، أدنى الحلق مما يلي الفم (الغين والخاء)، وهي حروف الإظهار الحلقي.',
    example: '﴿مِنْ خَوْفٍ﴾ · ﴿أَنْعَمْتَ﴾ · ﴿مِنْ هَادٍ﴾.',
  },
  {
    id: 'lisan',
    zone: '٣. اللسان (عشرة مخارج لثمانية عشر حرفاً)',
    letters: 'ق، ك، ج، ش، ي، ض، ل، ن، ر، ط، د، ت، ص، ز، س، ظ، ذ، ث',
    description: 'أوسع مخارج الحروف؛ يشمل أقصى اللسان (ق، ك)، وسطه (ج، ش، ي)، حافتيه (ض، ل)، وطرفه مع أصول الثنايا وأطرافها.',
    example: '﴿وَالضُّحَىٰ﴾ · ﴿الصِّرَاطَ﴾ · ﴿قُلْ هُوَ اللَّهُ أَحَدٌ﴾.',
  },
  {
    id: 'shafatan',
    zone: '٤. الشفتان (مخرجان لأربعة أحرف)',
    letters: 'ف | ب ، م ، و (غير المدية)',
    description: 'بطن الشفة السفلى مع أطراف الثنايا العليا للفاء (ف)، وانطباق الشفتين للباء والميم، وانضمامهما للواو غير المدية.',
    example: '﴿فَافْرُقْ﴾ · ﴿بِسْمِ﴾ · ﴿وَوَجَدَكَ﴾.',
  },
  {
    id: 'khayshum',
    zone: '٥. الخيشوم (أعلى الأنف)',
    letters: 'الغُنَّة في النون والميم (نّ ، مّ)',
    description: 'يخرج منه صوت الغنة الرخيم المركب في جسم النون والميم المشددتين وفي حالات الإدغام والإخفاء والإقلاب بمقدار حركتين.',
    example: '﴿إِنَّا أَعْطَيْنَاكَ﴾ · ﴿ثُمَّ كَلَّا﴾.',
  },
];

export const TAJWEED_RULES_LIST: {
  title: string;
  letters: string;
  rule: string;
  example: string;
}[] = [
  {
    title: 'الإظهار الحلقي',
    letters: 'ء ، هـ ، ع ، ح ، غ ، خ',
    rule: 'نطق النون الساكنة أو التنوين واضحة من غير غنة زائدة إذا جاء بعدها أحد حروف الحلق الستة.',
    example: '﴿مِنْ عِلْمٍ﴾ · ﴿سَمِيعٌ عَلِيمٌ﴾',
  },
  {
    title: 'الإدغام (بغنة وبغير غنة)',
    letters: 'ي ، ر ، م ، ل ، و ، ن (يرملون)',
    rule: 'إدخال النون الساكنة أو التنوين في الحرف الذي بعدها؛ بغنة في (ينمو) وبغير غنة في (ل، ر).',
    example: '﴿فَمَن يَعْمَلْ﴾ · ﴿مِن رَّبِّهِمْ﴾',
  },
  {
    title: 'الإقلاب',
    letters: 'ب (حرف الباء فقط)',
    rule: 'قلب النون الساكنة أو التنوين ميماً مخفاة مع الغنة عند ملاقاتها لحرف الباء.',
    example: '﴿مِنۢ بَعْدِ﴾ · ﴿سَمِيعٌۢ بَصِيرٌ﴾',
  },
  {
    title: 'الإخفاء الحقيقي',
    letters: 'ص ذ ث ك ج ش ق س د ط ز ف ت ض ظ (15 حرفاً)',
    rule: 'النطق بالنون الساكنة أو التنوين بحالة متوسطة بين الإظهار والإدغام مع بقاء الغنة.',
    example: '﴿مِن شَرِّ﴾ · ﴿إِن كُنتُمْ﴾',
  },
  {
    title: 'القلقلة',
    letters: 'ق ، ط ، ب ، ج ، د (قطب جد)',
    rule: 'اضطراب المخرج عند النطق بالحرف ساكناً حتى يُسمع له نبرة واضحة خاصة عند الوقف.',
    example: '﴿قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ﴾',
  },
];

// 10. Step-by-step Learn Prayer
export const LEARN_PRAYER_STEPS: {
  step: number;
  title: string;
  ruling: string;
  detail: string;
  dhikr: string;
}[] = [
  {
    step: 1,
    title: 'إسباغ الوضوء واستقبال القبلة والنية',
    ruling: 'شرط لصحة الصلاة',
    detail: 'توضأ وضوءاً كاملاً، واستقبل الكعبة المشرفة ببدنك، وانوِ الصلاة بقلبك دون التلفظ بالنية.',
    dhikr: 'محل النية القلب، ثم التهيؤ بخشوع بين يدي الله.',
  },
  {
    step: 2,
    title: 'تكبيرة الإحرام ودعاء الاستفتاح',
    ruling: 'ركن + سنة',
    detail: 'ارفع يديك حذو منكبيك أو أذنيك قائلاً «الله أكبر»، وضع يدك اليمنى على اليسرى على الصدر.',
    dhikr: '«سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَهَ غَيْرُكَ».',
  },
  {
    step: 3,
    title: 'قراءة سورة الفاتحة وما تيسر من القرآن',
    ruling: 'الفاتحة ركن في كل ركعة',
    detail: 'استعذ بالله وبسمل، واقرأ الفاتحة آية آية بتدبر، ثم اقرأ سورة قصيرة أو آيات في الركعتين الأولى والثانية.',
    dhikr: '﴿الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ...﴾ ثم قل: «آمِين».',
  },
  {
    step: 4,
    title: 'الركوع والرفع منه والاعتدال',
    ruling: 'ركن مع الطمأنينة',
    detail: 'كبّر واركع حتى يستوي ظهرك واضعاً يديك على ركبتيك، ثم ارفع قائلاً «سمع الله لمن حمده» واعتدل مطمئناً.',
    dhikr: 'في الركوع: «سُبْحَانَ رَبِّيَ الْعَظِيمِ» (3 مرات)، وبعد الرفع: «رَبَّنَا وَلَكَ الْحَمْدُ».',
  },
  {
    step: 5,
    title: 'السجود الأول والجلسة بين السجدتين والسجود الثاني',
    ruling: 'أركان مع الطمأنينة',
    detail: 'اسجد على الأعضاء السبعة (الجبهة مع الأنف، الكفين، الركبتين، أطراف القدمين) وأكثر من الدعاء، ثم اجلس واسجد ثانية.',
    dhikr: 'في السجود: «سُبْحَانَ رَبِّيَ الأَعْلَى» (3 مرات)، وبينهما: «رَبِّ اغْفِرْ لِي».',
  },
  {
    step: 6,
    title: 'التشهد الأخير والصلاة الإبراهيمية والتسليم',
    ruling: 'أركان الختام',
    detail: 'في آخر ركعة اجلس واقرأ التحيات والصلاة الإبراهيمية واستعذ من أربع، ثم سلّم عن يمينك وعن يسارك.',
    dhikr: '«التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ...» ثم «السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ» يميناً ويساراً.',
  },
];

// 11. Food E-Numbers Halal / Haram / Mushbooh Database
export interface ENumberItem {
  code: string;
  name: string;
  status: 'halal' | 'haram' | 'doubtful';
  statusArabic: string;
  reason: string;
}

export const E_NUMBERS_LIST: ENumberItem[] = [
  {
    code: 'E100',
    name: 'الكركمين (Curcumin)',
    status: 'halal',
    statusArabic: 'حلال',
    reason: 'ملون طبيعي مستخرج من نبات الكركم (نباتي 100%).',
  },
  {
    code: 'E120',
    name: 'الكارمين / حمض الكارمينيك (Carmine)',
    status: 'haram',
    statusArabic: 'محرم / يُجتنب',
    reason: 'ملون أحمر يُستخرج من حشرة القرمز (Cochineal)، وأفتى جمهور المجامع باجتنابه.',
  },
  {
    code: 'E160a',
    name: 'الكاروتين (Beta-Carotene)',
    status: 'halal',
    statusArabic: 'حلال',
    reason: 'ملون نباتي مستخلص من الجزر والزيوت النباتية.',
  },
  {
    code: 'E202',
    name: 'سوربات البوتاسيوم (Potassium Sorbate)',
    status: 'halal',
    statusArabic: 'حلال',
    reason: 'مادة حافظة كيميائية/نباتية آمنة ومباحة شرعاً.',
  },
  {
    code: 'E300',
    name: 'فيتامين ج / حمض الأسكوربيك',
    status: 'halal',
    statusArabic: 'حلال',
    reason: 'مضاد أكسدة نباتي (Vitamin C) حلال بالكامل.',
  },
  {
    code: 'E322',
    name: 'الليسيثين (Lecithin)',
    status: 'halal',
    statusArabic: 'حلال غالباً (صويا)',
    reason: 'حلال إذا كان من فول الصويا أو عباد الشمس (وهو الغالب تجارياً)، ويُتأكد إن كان حيواني المصدر.',
  },
  {
    code: 'E330',
    name: 'حمض الستريك / ملح الليمون (Citric Acid)',
    status: 'halal',
    statusArabic: 'حلال',
    reason: 'مركب نباتي طبيعي يُحضر بالتخمير النباتي وهو حلال تماماً.',
  },
  {
    code: 'E412',
    name: 'صمغ الغوار (Guar Gum)',
    status: 'halal',
    statusArabic: 'حلال',
    reason: 'مثخن قوام نباتي مستخرج من بذور نبات الغوار.',
  },
  {
    code: 'E422',
    name: 'الجليسرول / الجلسرين (Glycerol)',
    status: 'doubtful',
    statusArabic: 'مشتبه به (يُفحص المصدر)',
    reason: 'قد يُشتق من زيوت نباتية (حلال) أو من دهون حيوانية غير مذكاة؛ يُشترط وجود شهادة حلال أو مصدر نباتي.',
  },
  {
    code: 'E441',
    name: 'الجيلاتين (Gelatin)',
    status: 'doubtful',
    statusArabic: 'مشتبه به جداً / حرام إن كان خنزيرياً',
    reason: 'حرام قطعاً إذا استُخرج من الخنزير، وحلال فقط إذا كُتب عليه صراحة «جيلاتين بقري حلال» أو «جيلاتين سمكي/نباتي».',
  },
  {
    code: 'E471',
    name: 'أحادي وثنائي الجليسريدات (Mono- and diglycerides)',
    status: 'doubtful',
    statusArabic: 'مشتبه به (نباتي أم حيواني)',
    reason: 'مستحلب شائع في المخبوزات والآيس كريم؛ حلال إذا نُص على أنه نباتي (Vegetable E471)، ومحرّم إن كان من شحم خنزير.',
  },
  {
    code: 'E472e',
    name: 'استرات DATEM للمخبوزات',
    status: 'doubtful',
    statusArabic: 'مشتبه به (يتبع مصدر الدهن)',
    reason: 'يُتحقق من كونه من أصل نباتي على غلاف المنتج.',
  },
  {
    code: 'E542',
    name: 'فوسفات العظام (Bone Phosphate)',
    status: 'haram',
    statusArabic: 'محرم (مالم يُذكَّ)',
    reason: 'يُستخرج من عظام الحيوانات، فيحرم إلا إن ثبت أنه من حيوان مأكول اللحم مذكى شرعاً.',
  },
  {
    code: 'E621',
    name: 'غلوتامات أحادي الصوديوم (MSG)',
    status: 'halal',
    statusArabic: 'حلال',
    reason: 'معزز نكهة يُنتج بتخمير قصب السكر أو الذرة والنشا النباتي.',
  },
  {
    code: 'E631',
    name: 'إينوزينات ثنائي الصوديوم (Disodium Inosinate)',
    status: 'doubtful',
    statusArabic: 'مشتبه به',
    reason: 'معزز نكهة في الشيبس والشوربات قد يُستخرج من اللحم/السمك أو الخنزير أو النشا؛ يُشترط التأكد من علامة حلال.',
  },
  {
    code: 'E904',
    name: 'الشيلاك (Shellac)',
    status: 'doubtful',
    statusArabic: 'خلاف فقهي / مشتبه به',
    reason: 'مادة تلميع إفرازية لحشرة اللاك وتُذيبها بعض المصانع بالكحول؛ الأورع التحقق من شهادة الحلال.',
  },
  {
    code: 'E920',
    name: 'إل-سيستين (L-Cysteine)',
    status: 'doubtful',
    statusArabic: 'مشتبه به جداً',
    reason: 'محسن دقيق؛ يحرم إن استُخلص من شعر بشري أو خنزير، ويحل إن كان تخليقياً أو من ريش طيور مباحة بالتخمير.',
  },
];
