import { SURAHS_FALLBACK } from '../data/surahsList.ts';

export const OFFICIAL_TIKTOK_CHANNEL_URL = 'https://www.tiktok.com/@superboda0';
export const OFFICIAL_TIKTOK_DISPLAY = 'www.tiktok.com/@superboda0';
export const OFFICIAL_TIKTOK_HANDLE = '@superboda0';

export const OFFICIAL_TIKTOK_HASHTAGS =
  '#قرأن #قرأن_كريم_راحة_نفسية #قرأن_كريم #قرأني_جناتي #قرأن_كريم_بصوت_جميل #اسلاميات #دينى_حياتى #راحة_نفسية #راحة_نفسية_للقلب🤲📿💕';

export interface DailyScheduleSlotInfo {
  slot24h: string;
  labelArabic: string;
  periodArabic: 'صباحاً' | 'مساءً';
}

/**
 * The 10 fixed daily publishing slots requested by the user:
 * 7 AM, 9 AM, 11 AM, 2 PM, 4 PM, 6 PM, 8 PM, 10 PM, 11 PM, and 1 AM.
 * Ordered in the user's daily broadcast sequence starting from 7:00 AM through 1:00 AM,
 * plus a sorted 24-hour set for time-comparison logic.
 */
export const DAILY_BROADCAST_SLOTS: DailyScheduleSlotInfo[] = [
  { slot24h: '07:00', labelArabic: '7:00 صباحاً', periodArabic: 'صباحاً' },
  { slot24h: '09:00', labelArabic: '9:00 صباحاً', periodArabic: 'صباحاً' },
  { slot24h: '11:00', labelArabic: '11:00 صباحاً', periodArabic: 'صباحاً' },
  { slot24h: '14:00', labelArabic: '2:00 مساءً', periodArabic: 'مساءً' },
  { slot24h: '16:00', labelArabic: '4:00 مساءً', periodArabic: 'مساءً' },
  { slot24h: '18:00', labelArabic: '6:00 مساءً', periodArabic: 'مساءً' },
  { slot24h: '20:00', labelArabic: '8:00 مساءً', periodArabic: 'مساءً' },
  { slot24h: '22:00', labelArabic: '10:00 مساءً', periodArabic: 'مساءً' },
  { slot24h: '23:00', labelArabic: '11:00 مساءً', periodArabic: 'مساءً' },
  { slot24h: '01:00', labelArabic: '1:00 صباحاً', periodArabic: 'صباحاً' },
];

export const FIXED_DAILY_SLOTS_24H: string[] = [
  '01:00',
  '07:00',
  '09:00',
  '11:00',
  '14:00',
  '16:00',
  '18:00',
  '20:00',
  '22:00',
  '23:00',
];

export interface KhatmahReciterEntry {
  id: string;
  nameArabic: string;
  styleArabic: string;
  everyAyahFolder: string;
}

export const KHATMAH_RECITERS: KhatmahReciterEntry[] = [
  { id: 'alafasy', nameArabic: 'مشاري راشد العفاسي', styleArabic: 'مرتل', everyAyahFolder: 'Alafasy_128kbps' },
  { id: 'abdulbasit_murattal', nameArabic: 'عبد الباسط عبد الصمد', styleArabic: 'مرتل', everyAyahFolder: 'Abdul_Basit_Murattal_192kbps' },
  { id: 'minshawi_murattal', nameArabic: 'محمد صديق المنشاوي', styleArabic: 'مرتل', everyAyahFolder: 'Minshawy_Murattal_128kbps' },
  { id: 'husary_murattal', nameArabic: 'محمود خليل الحصري', styleArabic: 'مرتل', everyAyahFolder: 'Husary_128kbps' },
  { id: 'maher_muaiqly', nameArabic: 'ماهر المعيقلي', styleArabic: 'مرتل', everyAyahFolder: 'MaherAlMuaiqly128kbps' },
  { id: 'yasser_dosari', nameArabic: 'ياسر الدوسري', styleArabic: 'مرتل', everyAyahFolder: 'Yasser_Ad-Dussary_128kbps' },
  { id: 'nasser_qatami', nameArabic: 'ناصر القطامي', styleArabic: 'مرتل', everyAyahFolder: 'Nasser_Alqatami_128kbps' },
  { id: 'sudais', nameArabic: 'عبد الرحمن السديس', styleArabic: 'مرتل', everyAyahFolder: 'Abdurrahmaan_As-Sudais_192kbps' },
  { id: 'shuraim', nameArabic: 'سعود الشريم', styleArabic: 'مرتل', everyAyahFolder: 'Saood_ash-Shuraym_128kbps' },
  { id: 'saad_ghamdi', nameArabic: 'سعد الغامدي', styleArabic: 'مرتل', everyAyahFolder: 'Ghamadi_40kbps' },
  { id: 'ajamy', nameArabic: 'أحمد بن علي العجمي', styleArabic: 'مرتل', everyAyahFolder: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net' },
  { id: 'shatri', nameArabic: 'أبو بكر الشاطري', styleArabic: 'مرتل', everyAyahFolder: 'Abu_Bakr_Ash-Shaatree_128kbps' },
  { id: 'fares_abbad', nameArabic: 'فارس عباد', styleArabic: 'مرتل', everyAyahFolder: 'Fares_Abbad_64kbps' },
  { id: 'hani_rifai', nameArabic: 'هاني الرفاعي', styleArabic: 'مرتل', everyAyahFolder: 'Hani_Rifai_192kbps' },
  { id: 'ayyoub', nameArabic: 'محمد أيوب', styleArabic: 'مرتل', everyAyahFolder: 'Muhammad_Ayyoub_128kbps' },
  { id: 'jibreel', nameArabic: 'محمد جبريل', styleArabic: 'مرتل', everyAyahFolder: 'Muhammad_Jibreel_128kbps' },
  { id: 'hudhaify', nameArabic: 'علي بن عبد الرحمن الحذيفي', styleArabic: 'مرتل', everyAyahFolder: 'Hudhaify_128kbps' },
  { id: 'ali_jaber', nameArabic: 'علي جابر', styleArabic: 'مرتل', everyAyahFolder: 'Ali_Jaber_64kbps' },
  { id: 'juhaynee', nameArabic: 'عبد الله عواد الجهني', styleArabic: 'مرتل', everyAyahFolder: 'Abdullaah_3awwaad_Al-Juhaynee_128kbps' },
  { id: 'bukhatir', nameArabic: 'صلاح بو خاطر', styleArabic: 'مرتل', everyAyahFolder: 'Salaah_AbdulRahman_Bukhatir_128kbps' },
  { id: 'budair', nameArabic: 'صلاح البدير', styleArabic: 'مرتل', everyAyahFolder: 'Salah_Al_Budair_128kbps' },
  { id: 'basfar', nameArabic: 'عبد الله بصفر', styleArabic: 'مرتل', everyAyahFolder: 'Abdullah_Basfar_192kbps' },
  { id: 'qasim', nameArabic: 'عبد المحسن القاسم', styleArabic: 'مرتل', everyAyahFolder: 'Muhsin_Al_Qasim_192kbps' },
  { id: 'tunaiji', nameArabic: 'خليفة الطنيجي', styleArabic: 'مرتل', everyAyahFolder: 'Khalefa_Al_Tunaiji_64kbps' },
  { id: 'tablawi', nameArabic: 'محمد محمود الطبلاوي', styleArabic: 'مرتل', everyAyahFolder: 'Mohammad_al_Tablaway_128kbps' },
  { id: 'mustafa_ismail', nameArabic: 'مصطفى إسماعيل', styleArabic: 'مرتل', everyAyahFolder: 'Mustafa_Ismail_48kbps' },
  { id: 'banna', nameArabic: 'محمود علي البنا', styleArabic: 'مرتل', everyAyahFolder: 'Mahmoud_Ali_Al_Banna_32kbps' },
  { id: 'qahtani', nameArabic: 'خالد الجليل / القحطاني', styleArabic: 'مرتل', everyAyahFolder: 'Khaalid_Abdullaah_al-Qahtaanee_192kbps' },
  { id: 'sahl_yassin', nameArabic: 'سهل ياسين', styleArabic: 'مرتل', everyAyahFolder: 'Sahl_Yassin_128kbps' },
  { id: 'alaqimy', nameArabic: 'أكرم العلاقمي', styleArabic: 'مرتل', everyAyahFolder: 'Akram_AlAlaqimy_128kbps' },
  { id: 'ayman_suwaid', nameArabic: 'أيمن رشدي سويد', styleArabic: 'تعليمي متقن', everyAyahFolder: 'Ayman_Sowaid_64kbps' },
  { id: 'aziz_alili', nameArabic: 'عزيز عليلي', styleArabic: 'مرتل', everyAyahFolder: 'Aziz_Alili_128kbps' },
  { id: 'abdulbasit_mujawwad', nameArabic: 'عبد الباسط عبد الصمد', styleArabic: 'مجود', everyAyahFolder: 'Abdul_Basit_Mujawwad_128kbps' },
  { id: 'minshawi_mujawwad', nameArabic: 'محمد صديق المنشاوي', styleArabic: 'مجود', everyAyahFolder: 'Minshawy_Mujawwad_192kbps' },
  { id: 'husary_mujawwad', nameArabic: 'محمود خليل الحصري', styleArabic: 'مجود', everyAyahFolder: 'Husary_Mujawwad_128kbps' },
  { id: 'husary_muallim', nameArabic: 'محمود خليل الحصري', styleArabic: 'المصحف المعلم', everyAyahFolder: 'Husary_Muallim_128kbps' },
];

export interface SequentialKhatmahBatch {
  khatmahCycle: number;
  surahId: number;
  surahNameArabic: string;
  surahVersesCount: number;
  fromAyah: number;
  toAyah: number;
  ayahCount: number;
  reciter: KhatmahReciterEntry;
  partIndexInSurah: number;
  totalPartsInSurah: number;
  globalBatchIndex: number; // 1-based index within the 674-batch Khatmah
  totalBatchesInKhatmah: number;
  nextCursor: {
    surahId: number;
    fromAyah: number;
    khatmahCycle: number;
  };
}

export function formatSlotArabic(slot24h: string): string {
  const found = DAILY_BROADCAST_SLOTS.find((s) => s.slot24h === slot24h);
  if (found) return found.labelArabic;

  const [hhRaw, mmRaw] = slot24h.split(':');
  const hh = Number(hhRaw);
  const mm = mmRaw || '00';
  if (Number.isNaN(hh)) return slot24h;
  const period = hh < 12 ? 'صباحاً' : 'مساءً';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${mm} ${period}`;
}

/**
 * Assigns a distinct reciter to every Surah so adjacent Surahs always have
 * different voices ("وكل سورة بصوت قارئ مختلف"), and rotates across Khatmah cycles.
 */
export function getReciterForSurah(
  surahId: number,
  khatmahCycle = 1
): KhatmahReciterEntry {
  const safeSurah = Math.max(1, Math.min(114, Math.floor(surahId) || 1));
  const safeCycle = Math.max(1, Math.floor(khatmahCycle) || 1);
  const idx =
    (safeSurah - 1 + (safeCycle - 1) * 7) % KHATMAH_RECITERS.length;
  return KHATMAH_RECITERS[idx] || KHATMAH_RECITERS[0];
}

export function getTotalBatchesInKhatmah(ayahsPerReel = 10): number {
  const step = Math.max(1, Math.min(10, Math.floor(ayahsPerReel) || 10));
  let total = 0;
  for (const s of SURAHS_FALLBACK) {
    total += Math.ceil(s.versesCount / step);
  }
  return total;
}

export function computeSequentialBatch(
  rawSurahId: number,
  rawFromAyah: number,
  rawKhatmahCycle = 1,
  rawAyahsPerReel = 10
): SequentialKhatmahBatch {
  const ayahsPerReel = Math.max(
    1,
    Math.min(10, Math.floor(rawAyahsPerReel) || 10)
  );
  let khatmahCycle = Math.max(1, Math.floor(rawKhatmahCycle) || 1);
  let surahId = Math.max(1, Math.min(114, Math.floor(rawSurahId) || 1));

  let surah =
    SURAHS_FALLBACK.find((s) => s.id === surahId) || SURAHS_FALLBACK[0];
  let fromAyah = Math.max(1, Math.floor(rawFromAyah) || 1);

  if (fromAyah > surah.versesCount) {
    if (surahId >= 114) {
      surahId = 1;
      khatmahCycle += 1;
    } else {
      surahId += 1;
    }
    surah = SURAHS_FALLBACK.find((s) => s.id === surahId) || SURAHS_FALLBACK[0];
    fromAyah = 1;
  }

  const toAyah = Math.min(surah.versesCount, fromAyah + ayahsPerReel - 1);
  const ayahCount = toAyah - fromAyah + 1;
  const reciter = getReciterForSurah(surah.id, khatmahCycle);

  const totalPartsInSurah = Math.ceil(surah.versesCount / ayahsPerReel);
  const partIndexInSurah = Math.floor((fromAyah - 1) / ayahsPerReel) + 1;

  let batchesBefore = 0;
  for (const s of SURAHS_FALLBACK) {
    if (s.id < surah.id) {
      batchesBefore += Math.ceil(s.versesCount / ayahsPerReel);
    } else {
      break;
    }
  }
  const globalBatchIndex = batchesBefore + partIndexInSurah;
  const totalBatchesInKhatmah = getTotalBatchesInKhatmah(ayahsPerReel);

  let nextSurahId = surah.id;
  let nextFromAyah = toAyah + 1;
  let nextKhatmahCycle = khatmahCycle;

  if (nextFromAyah > surah.versesCount) {
    if (surah.id >= 114) {
      nextSurahId = 1;
      nextFromAyah = 1;
      nextKhatmahCycle = khatmahCycle + 1;
    } else {
      nextSurahId = surah.id + 1;
      nextFromAyah = 1;
    }
  }

  return {
    khatmahCycle,
    surahId: surah.id,
    surahNameArabic: surah.nameArabic,
    surahVersesCount: surah.versesCount,
    fromAyah,
    toAyah,
    ayahCount,
    reciter,
    partIndexInSurah,
    totalPartsInSurah,
    globalBatchIndex,
    totalBatchesInKhatmah,
    nextCursor: {
      surahId: nextSurahId,
      fromAyah: nextFromAyah,
      khatmahCycle: nextKhatmahCycle,
    },
  };
}

export interface UpcomingScheduledReelItem {
  orderIndex: number;
  slot24h: string;
  slotLabelArabic: string;
  dayRelativeLabel: string;
  batch: SequentialKhatmahBatch;
  caption: string;
}

export function getZonedDateParts(
  date: Date,
  timeZone: string
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dateKey: string;
  hhmm: string;
} {
  let safeTz = timeZone || 'Africa/Cairo';
  try {
    Intl.DateTimeFormat('en-US', { timeZone: safeTz });
  } catch {
    safeTz = 'Africa/Cairo';
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getVal = (type: string) =>
    parts.find((p) => p.type === type)?.value || '00';

  const yearStr = getVal('year');
  const monthStr = getVal('month');
  const dayStr = getVal('day');
  let hourNum = Number(getVal('hour'));
  if (hourNum === 24) hourNum = 0;
  const hourStr = String(hourNum).padStart(2, '0');
  const minuteStr = getVal('minute');

  return {
    year: Number(yearStr),
    month: Number(monthStr),
    day: Number(dayStr),
    hour: hourNum,
    minute: Number(minuteStr),
    dateKey: `${yearStr}-${monthStr}-${dayStr}`,
    hhmm: `${hourStr}:${minuteStr}`,
  };
}

export function buildTikTokReelCaption(
  batch: SequentialKhatmahBatch,
  customHashtags?: string
): string {
  const rangeStr =
    batch.fromAyah === batch.toAyah
      ? `الآية ${batch.fromAyah}`
      : `الآيات ${batch.fromAyah}–${batch.toAyah}`;

  const partNote =
    batch.totalPartsInSurah > 1
      ? ` (الجزء ${batch.partIndexInSurah} من ${batch.totalPartsInSurah})`
      : '';

  const hashtags =
    customHashtags && customHashtags.trim().length > 0
      ? customHashtags.trim()
      : OFFICIAL_TIKTOK_HASHTAGS;

  return [
    `سورة ${batch.surahNameArabic} — ${rangeStr}${partNote} | بصوت القارئ ${batch.reciter.nameArabic}`,
    `الختمة القرآنية المتسلسلة رقم (${batch.khatmahCycle}) عبر منصة ${OFFICIAL_TIKTOK_DISPLAY}`,
    hashtags,
  ].join('\n');
}

export function previewUpcomingSchedule(options: {
  currentSurahId: number;
  currentFromAyah: number;
  khatmahCycle: number;
  ayahsPerReel?: number;
  timezone?: string;
  hashtags?: string;
  count?: number;
  now?: Date;
}): UpcomingScheduledReelItem[] {
  const count = Math.max(1, Math.min(20, options.count || 10));
  const ayahsPerReel = options.ayahsPerReel || 10;
  const tz = options.timezone || 'Africa/Cairo';
  const now = options.now || new Date();
  const zoned = getZonedDateParts(now, tz);

  // Build sorted 24h slots
  const sortedSlots = [...FIXED_DAILY_SLOTS_24H].sort();
  const currentMinutes = zoned.hour * 60 + zoned.minute;

  // Find first upcoming slot strictly after or at current minute
  let startSlotIdx = sortedSlots.findIndex((slot) => {
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m > currentMinutes;
  });

  let dayOffset = 0;
  if (startSlotIdx === -1) {
    startSlotIdx = 0;
    dayOffset = 1;
  }

  const results: UpcomingScheduledReelItem[] = [];
  let cursorSurah = options.currentSurahId;
  let cursorAyah = options.currentFromAyah;
  let cursorCycle = options.khatmahCycle;

  for (let i = 0; i < count; i++) {
    const slotIdx = (startSlotIdx + i) % sortedSlots.length;
    const extraDays = dayOffset + Math.floor((startSlotIdx + i) / sortedSlots.length);
    const slot24h = sortedSlots[slotIdx];
    const dayRelativeLabel =
      extraDays === 0 ? 'اليوم' : extraDays === 1 ? 'غداً' : `بعد ${extraDays} أيام`;

    const batch = computeSequentialBatch(
      cursorSurah,
      cursorAyah,
      cursorCycle,
      ayahsPerReel
    );

    results.push({
      orderIndex: i + 1,
      slot24h,
      slotLabelArabic: formatSlotArabic(slot24h),
      dayRelativeLabel,
      batch,
      caption: buildTikTokReelCaption(batch, options.hashtags),
    });

    cursorSurah = batch.nextCursor.surahId;
    cursorAyah = batch.nextCursor.fromAyah;
    cursorCycle = batch.nextCursor.khatmahCycle;
  }

  return results;
}
