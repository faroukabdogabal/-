import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  LocateFixed,
  Pause,
  Play,
  PlayCircle,
  RotateCcw,
  Search,
  Volume2,
  X,
} from 'lucide-react';
import {
  ADHKAR_LIST,
  ARAB_AND_WORLD_CITIES,
  ASMA_UL_HUSNA_99,
  E_NUMBERS_LIST,
  HADITH_COLLECTION,
  HADITH_VERIFICATION_CHECKS,
  HISN_MUSLIM_DUAS,
  ISLAMIC_BABY_NAMES,
  ISLAMIC_TOOLS_LIST,
  IslamicToolId,
  LEARN_PRAYER_STEPS,
  MAKHARIJ_ZONES,
  QURAN_RADIO_STATIONS,
  QURAN_TOPICS,
  TAJWEED_RULES_LIST,
} from '../data/islamicToolsData';
import { SurahMeta } from '../types/quran';

interface IslamicToolModalProps {
  toolId: IslamicToolId | null;
  onClose: () => void;
  surahs: SurahMeta[];
  sadaqahLabel: string;
  onLoadVerseIntoStudio: (surahId: number, fromAyah: number, toAyah: number) => void;
}

function computeQiblaBearing(lat: number, lng: number): {
  bearingDeg: number;
  distanceKm: number;
} {
  const kaabaLat = (21.422487 * Math.PI) / 180;
  const kaabaLng = (39.826206 * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;

  const dLambda = kaabaLng - lambda;
  const y = Math.sin(dLambda);
  const x = Math.cos(phi) * Math.tan(kaabaLat) - Math.sin(phi) * Math.cos(dLambda);
  const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

  const dLat = kaabaLat - phi;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(phi) * Math.cos(kaabaLat) * Math.sin(dLambda / 2) ** 2;
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return {
    bearingDeg: Math.round(bearing * 10) / 10,
    distanceKm: Math.round(distanceKm),
  };
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

export function IslamicToolModal({
  toolId,
  onClose,
  surahs,
  sadaqahLabel,
  onLoadVerseIntoStudio,
}: IslamicToolModalProps) {
  const toolMeta = useMemo(
    () => ISLAMIC_TOOLS_LIST.find((t) => t.id === toolId) || null,
    [toolId]
  );

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Topic state
  const [selectedTopicId, setSelectedTopicId] = useState(QURAN_TOPICS[0].id);

  // 2 & 3. Prayer Times & Qibla state
  const [cityIndex, setCityIndex] = useState(0);
  const [customCoords, setCustomCoords] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [prayerTimings, setPrayerTimings] = useState<Record<string, string> | null>(
    null
  );
  const [prayerHijriLabel, setPrayerHijriLabel] = useState<string>('');
  const [loadingPrayers, setLoadingPrayers] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  // 4. Hijri Converter state
  const [gregInput, setGregInput] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [convertedHijri, setConvertedHijri] = useState<string>('');

  // 5. Adhkar state
  const [adhkarTab, setAdhkarTab] = useState<'morning' | 'evening' | 'prayer' | 'sleep'>(
    'morning'
  );
  const [adhkarProgress, setAdhkarProgress] = useState<Record<string, number>>({});

  // 6. Tasbih state
  const [tasbihPhrase, setTasbihPhrase] = useState('سُبْحَانَ اللَّهِ وَبِحَمْدِهِ');
  const [tasbihTarget, setTasbihTarget] = useState(33);
  const [tasbihCount, setTasbihCount] = useState(0);
  const [tasbihLifetime, setTasbihLifetime] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('qr_tasbih_total') || '0');
    } catch {
      return 0;
    }
  });

  // 7. 99 Names search
  const [namesSearch, setNamesSearch] = useState('');

  // 8 & 27. Ayah of Day & Tafsir Muyassar
  const [tafsirSurah, setTafsirSurah] = useState(93);
  const [tafsirAyah, setTafsirAyah] = useState(5);
  const [fetchedAyahText, setFetchedAyahText] = useState('');
  const [fetchedTafsirText, setFetchedTafsirText] = useState('');
  const [loadingTafsir, setLoadingTafsir] = useState(false);

  // 9. Quran Radio
  const [activeStationId, setActiveStationId] = useState(QURAN_RADIO_STATIONS[0].id);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [radioError, setRadioError] = useState<string | null>(null);
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);

  // 10. Zakat Calculator
  const [zakatCash, setZakatCash] = useState(50000);
  const [zakatGold24, setZakatGold24] = useState(0);
  const [zakatGold21, setZakatGold21] = useState(0);
  const [zakatTrade, setZakatTrade] = useState(0);
  const [zakatDebts, setZakatDebts] = useState(0);
  const [goldGramPrice, setGoldGramPrice] = useState(3800);

  // 11. Khatmah Plan
  const [khatmahDays, setKhatmahDays] = useState(30);
  const [completedKhatmahDays, setCompletedKhatmahDays] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('qr_khatmah_days') || '[]');
    } catch {
      return [];
    }
  });

  // 13. Inheritance Calculator
  const [estateAmount, setEstateAmount] = useState(120000);
  const [spouseType, setSpouseType] = useState<'none' | 'husband' | 'wife'>('wife');
  const [sonsCount, setSonsCount] = useState(2);
  const [daughtersCount, setDaughtersCount] = useState(1);
  const [fatherAlive, setFatherAlive] = useState(true);
  const [motherAlive, setMotherAlive] = useState(true);

  // 14 & 20. Hadith Search & Verify
  const [hadithQuery, setHadithQuery] = useState('');

  // 15. Baby names
  const [babyGender, setBabyGender] = useState<'all' | 'male' | 'female'>('all');
  const [babySearch, setBabySearch] = useState('');

  // 17. Quran Memorizer
  const [memSurahId, setMemSurahId] = useState(112);
  const [memAyah, setMemAyah] = useState(1);
  const [memRepeatTarget, setMemRepeatTarget] = useState(3);
  const [memCurrentRepeat, setMemCurrentRepeat] = useState(0);
  const [memHideWords, setMemHideWords] = useState(false);
  const [memVerseText, setMemVerseText] = useState('');
  const [isMemPlaying, setIsMemPlaying] = useState(false);
  const memAudioRef = useRef<HTMLAudioElement | null>(null);

  // 18. Qada Prayer Calculator
  const [qadaDaysInput, setQadaDaysInput] = useState(30);
  const [qadaDoneCount, setQadaDoneCount] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('qr_qada_done') || '0');
    } catch {
      return 0;
    }
  });

  // 19 & 30. Kaffarah & Zakat Al-Fitr
  const [mealCost, setMealCost] = useState(100);
  const [kaffarahPeople, setKaffarahPeople] = useState(10);
  const [fitrMembers, setFitrMembers] = useState(4);
  const [fitrSaPrice, setFitrSaPrice] = useState(65);

  // 21. Fasting Tracker
  const [fastedLog, setFastedLog] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('qr_fasting_log') || '[]');
    } catch {
      return [];
    }
  });

  // 23. Group Khatmah (30 Juz)
  const [groupJuzOwners, setGroupJuzOwners] = useState<Record<number, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('qr_group_khatmah') || '{}');
    } catch {
      return {};
    }
  });
  const [participantName, setParticipantName] = useState('');

  // 24. E-Numbers Search
  const [eNumberQuery, setENumberQuery] = useState('');

  // 25. Nearby Mosques
  const [mosques, setMosques] = useState<
    { id: number; name: string; distMeters: number; lat: number; lon: number }[]
  >([]);
  const [loadingMosques, setLoadingMosques] = useState(false);
  const [mosqueMsg, setMosqueMsg] = useState<string | null>(null);

  // 26. Quran Word Search
  const [wordQuery, setWordQuery] = useState('الرحمن');
  const [wordResults, setWordResults] = useState<
    { verseKey: string; text: string; surahId: number; ayahNum: number }[]
  >([]);
  const [searchingWords, setSearchingWords] = useState(false);

  // 28. Kids Memorizer & Certificate
  const [childName, setChildName] = useState('');
  const [kidsSurahDone, setKidsSurahDone] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('qr_kids_surahs') || '[1, 112, 113, 114]');
    } catch {
      return [1, 112, 113, 114];
    }
  });

  // Cleanup audio players when modal closes or switches tool
  useEffect(() => {
    return () => {
      radioAudioRef.current?.pause();
      memAudioRef.current?.pause();
      setIsRadioPlaying(false);
      setIsMemPlaying(false);
    };
  }, [toolId]);

  const activeCoords = useMemo(() => {
    if (customCoords) return customCoords;
    const c = ARAB_AND_WORLD_CITIES[cityIndex] || ARAB_AND_WORLD_CITIES[0];
    return { lat: c.lat, lng: c.lng, label: c.nameArabic };
  }, [customCoords, cityIndex]);

  // Fetch live Prayer Times when prayer_times opens or coords change
  useEffect(() => {
    if (toolId !== 'prayer_times') return;
    let cancelled = false;
    setLoadingPrayers(true);
    fetch(
      `https://api.aladhan.com/v1/timings?latitude=${activeCoords.lat}&longitude=${activeCoords.lng}&method=5`
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const timings = json?.data?.timings;
        const hijri = json?.data?.date?.hijri;
        if (timings) setPrayerTimings(timings);
        if (hijri) {
          setPrayerHijriLabel(
            `${hijri.weekday?.ar || ''} ${hijri.day} ${hijri.month?.ar || ''} ${
              hijri.year
            } هـ`
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingPrayers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [toolId, activeCoords.lat, activeCoords.lng]);

  // Convert Gregorian date to Hijri via Intl UmAlQura
  useEffect(() => {
    if (toolId !== 'hijri_date') return;
    try {
      const parsed = new Date(`${gregInput}T12:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        const formatted = new Intl.DateTimeFormat(
          'ar-SA-u-ca-islamic-umalqura-nu-latn',
          {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }
        ).format(parsed);
        setConvertedHijri(formatted);
      }
    } catch {
      setConvertedHijri('');
    }
  }, [toolId, gregInput]);

  // Fetch Ayah & Tafsir Al-Muyassar
  useEffect(() => {
    if (toolId !== 'ayah_of_day' && toolId !== 'tafsir_muyassar') return;
    let cancelled = false;
    setLoadingTafsir(true);
    Promise.all([
      fetch(
        `https://api.alquran.cloud/v1/ayah/${tafsirSurah}:${tafsirAyah}/quran-uthmani`
      ).then((r) => r.json()),
      fetch(
        `https://api.alquran.cloud/v1/ayah/${tafsirSurah}:${tafsirAyah}/ar.muyassar`
      ).then((r) => r.json()),
    ])
      .then(([qJson, tJson]) => {
        if (cancelled) return;
        setFetchedAyahText(qJson?.data?.text || '');
        setFetchedTafsirText(tJson?.data?.text || '');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingTafsir(false);
      });

    return () => {
      cancelled = true;
    };
  }, [toolId, tafsirSurah, tafsirAyah]);

  // Fetch Memorizer Verse text
  useEffect(() => {
    if (toolId !== 'quran_memorizer') return;
    let cancelled = false;
    fetch(
      `https://api.alquran.cloud/v1/ayah/${memSurahId}:${memAyah}/quran-uthmani`
    )
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setMemVerseText(json?.data?.text || '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [toolId, memSurahId, memAyah]);

  const requestBrowserGps = () => {
    if (!navigator.geolocation) {
      setGeoStatus('المتصفح لا يدعم تحديد الموقع التلقائي.');
      return;
    }
    setGeoStatus('جاري تحديد موقعك بدقة...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: `موقعك الحالي (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`,
        });
        setGeoStatus('تم تحديد موقعك بنجاح');
      },
      () => {
        setGeoStatus('تعذر الوصول للموقع — يمكنك اختيار مدينتك من القائمة مباشرة.');
      }
    );
  };

  const handleCopy = async (id: string, text: string) => {
    const ok = await copyTextSafe(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2200);
    }
  };

  const toggleRadioPlay = (stationUrl: string) => {
    setRadioError(null);
    if (!radioAudioRef.current) {
      radioAudioRef.current = new Audio();
    }
    const audio = radioAudioRef.current;
    if (isRadioPlaying && audio.src === stationUrl) {
      audio.pause();
      setIsRadioPlaying(false);
      return;
    }
    audio.src = stationUrl;
    audio
      .play()
      .then(() => setIsRadioPlaying(true))
      .catch(() => {
        setIsRadioPlaying(false);
        setRadioError('تعذر الاتصال بالبث حالياً، يرجى اختيار إذاعة أخرى.');
      });
  };

  const startMemorizerLoop = () => {
    memAudioRef.current?.pause();
    const pad3 = (n: number) => String(n).padStart(3, '0');
    const url = `https://everyayah.com/data/Alafasy_128kbps/${pad3(
      memSurahId
    )}${pad3(memAyah)}.mp3`;
    const audio = new Audio(url);
    memAudioRef.current = audio;
    let count = 1;
    setMemCurrentRepeat(1);
    setIsMemPlaying(true);

    audio.onended = () => {
      if (count < memRepeatTarget) {
        count += 1;
        setMemCurrentRepeat(count);
        audio.currentTime = 0;
        audio.play().catch(() => setIsMemPlaying(false));
      } else {
        setIsMemPlaying(false);
      }
    };
    audio.play().catch(() => setIsMemPlaying(false));
  };

  const findNearbyMosques = () => {
    setLoadingMosques(true);
    setMosqueMsg(null);
    const queryOverpass = (lat: number, lng: number) => {
      const ql = `[out:json][timeout:12];node["amenity"="place_of_worship"]["religion"="muslim"](around:4000,${lat},${lng});out body 12;`;
      fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`
      )
        .then((r) => r.json())
        .then((data) => {
          const elements = Array.isArray(data?.elements) ? data.elements : [];
          const mapped = elements
            .map(
              (el: {
                id: number;
                lat: number;
                lon: number;
                tags?: { 'name:ar'?: string; name?: string };
              }) => {
                const dLat = ((el.lat - lat) * Math.PI) / 180;
                const dLon = ((el.lon - lng) * Math.PI) / 180;
                const a =
                  Math.sin(dLat / 2) ** 2 +
                  Math.cos((lat * Math.PI) / 180) *
                    Math.cos((el.lat * Math.PI) / 180) *
                    Math.sin(dLon / 2) ** 2;
                const distMeters = Math.round(
                  6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                );
                return {
                  id: el.id,
                  name: el.tags?.['name:ar'] || el.tags?.name || 'مسجد قريب',
                  distMeters,
                  lat: el.lat,
                  lon: el.lon,
                };
              }
            )
            .sort(
              (a: { distMeters: number }, b: { distMeters: number }) =>
                a.distMeters - b.distMeters
            );
          setMosques(mapped);
          if (mapped.length === 0) {
            setMosqueMsg('لم يُعثر على مساجد مسجلة في نطاق 4 كم حول هذه النقطة.');
          }
        })
        .catch(() => {
          setMosqueMsg('تعذر جلب بيانات الخريطة حالياً، حاول مجدداً بعد قليل.');
        })
        .finally(() => setLoadingMosques(false));
    };

    if (navigator.geolocation && !customCoords) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCustomCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: 'موقعك الحالي',
          });
          queryOverpass(pos.coords.latitude, pos.coords.longitude);
        },
        () => queryOverpass(activeCoords.lat, activeCoords.lng)
      );
    } else {
      queryOverpass(activeCoords.lat, activeCoords.lng);
    }
  };

  const runQuranWordSearch = () => {
    const q = wordQuery.trim();
    if (!q) return;
    setSearchingWords(true);
    fetch(
      `https://api.quran.com/api/v4/search?q=${encodeURIComponent(
        q
      )}&size=15&page=1&language=ar`
    )
      .then((r) => r.json())
      .then((json) => {
        const rawResults = json?.search?.results || [];
        const parsed = rawResults.map(
          (item: { verse_key: string; text: string }) => {
            const [sStr, aStr] = String(item.verse_key || '1:1').split(':');
            return {
              verseKey: item.verse_key,
              text: String(item.text || '').replace(/<[^>]+>/g, ''),
              surahId: Number(sStr) || 1,
              ayahNum: Number(aStr) || 1,
            };
          }
        );
        setWordResults(parsed);
      })
      .catch(() => {})
      .finally(() => setSearchingWords(false));
  };

  const downloadKidCertificate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0B1410';
    ctx.fillRect(0, 0, 1200, 850);

    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 6;
    ctx.strokeRect(40, 40, 1120, 770);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.strokeRect(58, 58, 1084, 734);

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';

    ctx.fillStyle = '#FCD34D';
    ctx.font = '700 46px "Amiri", serif';
    ctx.fillText('شهادة تفوق وتكريم في حفظ القرآن الكريم', 600, 180);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 28px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('تتشرف منصة قرآن ريلز بمنح هذه الشهادة التشجيعية للبطل / البطلة:', 600, 275);

    ctx.fillStyle = '#34D399';
    ctx.font = '700 54px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(childName.trim() || 'حافظ القرآن الكريم', 600, 375);

    ctx.fillStyle = '#F1F5F9';
    ctx.font = '500 27px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(
      `لإتمام حفظ ومراجعة (${kidsSurahDone.length}) سور مباركة من جزء عمّ بتفوق وإتقان`,
      600,
      475
    );

    ctx.fillStyle = '#FDE68A';
    ctx.font = '400 32px "Amiri", serif';
    ctx.fillText('«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ» — بارك الله فيك وجعلك قرة عين لوالديك', 600, 580);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '400 20px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(sadaqahLabel, 600, 710);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quran-certificate-${childName.trim() || 'kid'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, 'image/png');
  };

  // Calculations for Zakat & Inheritance
  const zakatResult = useMemo(() => {
    const pureGoldGrams = zakatGold24 + (zakatGold21 * 21) / 24;
    const goldValue = pureGoldGrams * goldGramPrice;
    const netWealth = Math.max(0, zakatCash + goldValue + zakatTrade - zakatDebts);
    const nisabThreshold = 85 * goldGramPrice;
    const isDue = netWealth >= nisabThreshold;
    return {
      netWealth,
      nisabThreshold,
      isDue,
      zakatAmount: isDue ? netWealth * 0.025 : 0,
    };
  }, [zakatCash, zakatGold24, zakatGold21, zakatTrade, zakatDebts, goldGramPrice]);

  const inheritanceBreakdown = useMemo(() => {
    const hasChildren = sonsCount > 0 || daughtersCount > 0;
    const shares: { title: string; weight: number; note: string }[] = [];

    let fixedTotal = 0;
    if (spouseType === 'husband') {
      const w = hasChildren ? 0.25 : 0.5;
      shares.push({
        title: 'الزوج',
        weight: w,
        note: hasChildren ? 'الربع لوجود الفرع الوارث' : 'النصف لعدم وجود فرع وارث',
      });
      fixedTotal += w;
    } else if (spouseType === 'wife') {
      const w = hasChildren ? 0.125 : 0.25;
      shares.push({
        title: 'الزوجة',
        weight: w,
        note: hasChildren ? 'الثمن لوجود الفرع الوارث' : 'الربع لعدم وجود فرع وارث',
      });
      fixedTotal += w;
    }

    if (motherAlive) {
      const w = hasChildren ? 1 / 6 : 1 / 3;
      shares.push({
        title: 'الأم',
        weight: w,
        note: hasChildren ? 'السدس لوجود الفرع الوارث' : 'الثلث لعدم وجود الفرع الوارث',
      });
      fixedTotal += w;
    }

    if (fatherAlive && hasChildren) {
      const w = 1 / 6;
      shares.push({
        title: 'الأب (فرضاً)',
        weight: w,
        note: 'السدس فرضاً مع وجود الفرع الوارث (والباقي تعصيباً إن لم يوجد أبناء ذكور)',
      });
      fixedTotal += w;
    }

    // Handle daughters fixed share if no sons
    if (sonsCount === 0 && daughtersCount > 0) {
      const w = daughtersCount === 1 ? 0.5 : 2 / 3;
      shares.push({
        title: daughtersCount === 1 ? 'البنت الواحدة' : `البنات (${daughtersCount})`,
        weight: w,
        note: daughtersCount === 1 ? 'النصف فرضاً' : 'الثلثان فرضاً بالتساوي',
      });
      fixedTotal += w;
    }

    // Remainder (Asabah) or Awl normalization
    if (fixedTotal > 1) {
      return shares.map((s) => ({
        ...s,
        finalRatio: s.weight / fixedTotal,
        amount: (estateAmount * s.weight) / fixedTotal,
      }));
    }

    const remainder = Math.max(0, 1 - fixedTotal);
    if (sonsCount > 0) {
      const totalParts = sonsCount * 2 + daughtersCount;
      const sonShare = (remainder * 2) / totalParts;
      shares.push({
        title: `الأبناء الذكور (${sonsCount})`,
        weight: sonShare * sonsCount,
        note: `للذكر مثل حظ الأنثيين (${Math.round(sonShare * estateAmount).toLocaleString()} لكل ابن)`,
      });
      if (daughtersCount > 0) {
        const dShare = remainder / totalParts;
        shares.push({
          title: `البنات (${daughtersCount})`,
          weight: dShare * daughtersCount,
          note: `تعصيباً بالغير (${Math.round(dShare * estateAmount).toLocaleString()} لكل بنت)`,
        });
      }
    } else if (fatherAlive && remainder > 0.0001) {
      shares.push({
        title: 'الأب (تعصيباً)',
        weight: remainder,
        note: 'الباقي تعصيباً بعد أصحاب الفروض',
      });
    }

    const sumWeights = shares.reduce((acc, s) => acc + s.weight, 0) || 1;
    return shares.map((s) => ({
      ...s,
      finalRatio: s.weight / sumWeights,
      amount: (estateAmount * s.weight) / sumWeights,
    }));
  }, [estateAmount, spouseType, sonsCount, daughtersCount, fatherAlive, motherAlive]);

  const qiblaData = useMemo(
    () => computeQiblaBearing(activeCoords.lat, activeCoords.lng),
    [activeCoords.lat, activeCoords.lng]
  );

  if (!toolId || !toolMeta) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={toolMeta.titleArabic}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-[#121820] text-slate-100 shadow-2xl my-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0E131A] px-5 sm:px-6 py-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-50">
              {toolMeta.titleArabic}
            </h3>
            <p className="text-xs text-slate-400">{toolMeta.subtitleArabic}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق الأداة"
            className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Tool Body */}
        <div className="p-5 sm:p-6 max-h-[78vh] overflow-y-auto space-y-5">
          {/* 1. AYAT BY TOPIC */}
          {toolId === 'ayat_topic' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {QURAN_TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTopicId(t.id)}
                    className={`rounded-lg border px-3 py-2 text-xs sm:text-sm font-medium cursor-pointer whitespace-nowrap ${
                      selectedTopicId === t.id
                        ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                        : 'border-slate-800 bg-[#0E131A] text-slate-300 hover:text-white'
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {QURAN_TOPICS.find((t) => t.id === selectedTopicId)?.verses.map(
                  (v, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 space-y-3"
                    >
                      <p className="text-base sm:text-lg leading-loose text-slate-100 font-serif">
                        ﴿ {v.textArabic} ﴾
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/70">
                        <span className="text-xs text-slate-400 tabular-nums">
                          سورة {v.surahName} · الآيات {v.fromAyah}–{v.toAyah}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onLoadVerseIntoStudio(v.surahId, v.fromAyah, v.toAyah);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer whitespace-nowrap"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>اصنع فيديو ريلز لهذه الآيات</span>
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* 2. PRAYER TIMES */}
          {toolId === 'prayer_times' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={cityIndex}
                  onChange={(e) => {
                    setCustomCoords(null);
                    setCityIndex(Number(e.target.value));
                  }}
                  className="flex-1 rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100"
                >
                  {ARAB_AND_WORLD_CITIES.map((c, idx) => (
                    <option key={c.cityQuery} value={idx}>
                      {c.nameArabic}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={requestBrowserGps}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 cursor-pointer whitespace-nowrap"
                >
                  <LocateFixed className="w-4 h-4" />
                  <span>موقعي الحالي (GPS)</span>
                </button>
              </div>
              {geoStatus && <p className="text-xs text-slate-400">{geoStatus}</p>}
              {prayerHijriLabel && (
                <div className="text-xs sm:text-sm font-medium text-emerald-300">
                  التاريخ الهجري: {prayerHijriLabel} — ({activeCoords.label})
                </div>
              )}

              {loadingPrayers ? (
                <div className="py-10 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>جاري جلب مواقيت الصلاة الدقيقة...</span>
                </div>
              ) : (
                prayerTimings && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'Fajr', label: 'الفجر' },
                      { key: 'Sunrise', label: 'الشروق' },
                      { key: 'Dhuhr', label: 'الظهر' },
                      { key: 'Asr', label: 'العصر' },
                      { key: 'Maghrib', label: 'المغرب' },
                      { key: 'Isha', label: 'العشاء' },
                    ].map((p) => (
                      <div
                        key={p.key}
                        className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 text-center"
                      >
                        <div className="text-xs text-slate-400 mb-1">{p.label}</div>
                        <div className="text-xl font-bold font-mono tabular-nums text-emerald-300">
                          {prayerTimings[p.key] || '--:--'}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* 3. QIBLA COMPASS */}
          {toolId === 'qibla' && (
            <div className="space-y-5 text-center">
              <div className="flex flex-col sm:flex-row gap-3 text-right">
                <select
                  value={cityIndex}
                  onChange={(e) => {
                    setCustomCoords(null);
                    setCityIndex(Number(e.target.value));
                  }}
                  className="flex-1 rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100"
                >
                  {ARAB_AND_WORLD_CITIES.map((c, idx) => (
                    <option key={c.cityQuery} value={idx}>
                      {c.nameArabic}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={requestBrowserGps}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer whitespace-nowrap"
                >
                  <Compass className="w-4 h-4" />
                  <span>تحديد بموقعي الجغرافي</span>
                </button>
              </div>

              <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-full border-2 border-slate-700 bg-[#0B0F14] relative">
                <span className="absolute top-2 text-xs font-bold text-slate-400">
                  شمال (N)
                </span>
                <span className="absolute bottom-2 text-xs text-slate-500">جنوب</span>
                <span className="absolute right-3 text-xs text-slate-500">شرق</span>
                <span className="absolute left-3 text-xs text-slate-500">غرب</span>

                <svg
                  viewBox="0 0 200 200"
                  className="h-44 w-44"
                  aria-label="مؤشر بوصلة القبلة"
                >
                  <circle
                    cx="100"
                    cy="100"
                    r="72"
                    fill="none"
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <g transform={`rotate(${qiblaData.bearingDeg} 100 100)`}>
                    <line
                      x1="100"
                      y1="152"
                      x2="100"
                      y2="34"
                      stroke="#34d399"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <polygon points="100,20 91,38 109,38" fill="#fbbf24" />
                    <rect
                      x="90"
                      y="38"
                      width="20"
                      height="20"
                      rx="3"
                      fill="#0f172a"
                      stroke="#fbbf24"
                      strokeWidth="2"
                    />
                  </g>
                  <circle cx="100" cy="100" r="5" fill="#f8fafc" />
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-3.5">
                  <div className="text-xs text-slate-400">زاوية القبلة من الشمال</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-300">
                    {qiblaData.bearingDeg}°
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-3.5">
                  <div className="text-xs text-slate-400">المسافة إلى الكعبة المشرفة</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-amber-300">
                    {qiblaData.distanceKm.toLocaleString()} كم
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. HIJRI DATE CONVERTER */}
          {toolId === 'hijri_date' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  اختر التاريخ الميلادي للتحويل الفوري إلى تقويم أم القرى الهجري:
                </label>
                <input
                  type="date"
                  value={gregInput}
                  onChange={(e) => setGregInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-4 py-3 text-sm text-slate-100 tabular-nums"
                />
              </div>

              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center space-y-2">
                <div className="text-xs text-emerald-300">التاريخ الهجري الموافق</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-50">
                  {convertedHijri || '—'}
                </div>
              </div>
            </div>
          )}

          {/* 5. ADHKAR MORNING & EVENING */}
          {toolId === 'adhkar_morning_evening' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'morning', label: 'أذكار الصباح' },
                  { id: 'evening', label: 'أذكار المساء' },
                  { id: 'prayer', label: 'بعد الصلاة' },
                  { id: 'sleep', label: 'أذكار النوم' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setAdhkarTab(
                        tab.id as 'morning' | 'evening' | 'prayer' | 'sleep'
                      )
                    }
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer ${
                      adhkarTab === tab.id
                        ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                        : 'border-slate-800 bg-[#0E131A] text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {ADHKAR_LIST.filter((d) => d.category === adhkarTab).map((d) => {
                  const done = adhkarProgress[d.id] || 0;
                  const remaining = Math.max(0, d.count - done);
                  return (
                    <div
                      key={d.id}
                      className={`rounded-xl border p-4 space-y-3 transition-colors ${
                        remaining === 0
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : 'border-slate-800 bg-[#0E131A]'
                      }`}
                    >
                      <p className="text-sm sm:text-base leading-loose text-slate-100">
                        {d.text}
                      </p>
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/70">
                        <span className="text-xs text-slate-400">{d.virtue}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAdhkarProgress((prev) => ({
                              ...prev,
                              [d.id]: Math.min(d.count, (prev[d.id] || 0) + 1),
                            }))
                          }
                          className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold tabular-nums cursor-pointer ${
                            remaining === 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                          }`}
                        >
                          {remaining === 0
                            ? 'اكتمل الذكر ✓'
                            : `اضغط للتكرار (${remaining} من ${d.count})`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. ELECTRONIC TASBIH */}
          {toolId === 'tasbih' && (
            <div className="space-y-5 text-center">
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
                  'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
                  'لَا إِلَٰهَ إِلَّا اللَّهُ',
                  'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
                  'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
                ].map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => {
                      setTasbihPhrase(phrase);
                      setTasbihCount(0);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                      tasbihPhrase === phrase
                        ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                        : 'border-slate-800 bg-[#0E131A] text-slate-300'
                    }`}
                  >
                    {phrase}
                  </button>
                ))}
              </div>

              <div className="py-4">
                <p className="text-lg font-bold text-emerald-300 mb-4">{tasbihPhrase}</p>
                <button
                  type="button"
                  onClick={() => {
                    const next = tasbihCount + 1;
                    setTasbihCount(next);
                    const total = tasbihLifetime + 1;
                    setTasbihLifetime(total);
                    try {
                      localStorage.setItem('qr_tasbih_total', String(total));
                    } catch {
                      // ignore
                    }
                  }}
                  className="mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-full border-4 border-emerald-400/70 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-transform cursor-pointer"
                >
                  <span className="text-4xl font-bold font-mono tabular-nums text-slate-50">
                    {tasbihCount}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 tabular-nums">
                    الهدف: {tasbihTarget}
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 text-xs">
                {[33, 100, 1000].map((trg) => (
                  <button
                    key={trg}
                    type="button"
                    onClick={() => setTasbihTarget(trg)}
                    className={`rounded-md border px-3 py-1.5 font-mono tabular-nums cursor-pointer ${
                      tasbihTarget === trg
                        ? 'border-emerald-400 text-emerald-300'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    هدف {trg}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTasbihCount(0)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تصفير الدورة</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 tabular-nums">
                مجموع تسبيحاتك المحفوظة بالمتصفح: {tasbihLifetime.toLocaleString()} تسبيحة
              </p>
            </div>
          )}

          {/* 7. ASMA UL HUSNA (99 NAMES) */}
          {toolId === 'asma_ul_husna' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={namesSearch}
                  onChange={(e) => setNamesSearch(e.target.value)}
                  placeholder="ابحث في أسماء الله الحسنى الـ 99 أو معانيها..."
                  className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] pr-10 pl-4 py-2.5 text-sm text-slate-100"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto p-1">
                {ASMA_UL_HUSNA_99.filter(
                  (n) =>
                    !namesSearch.trim() ||
                    n.name.includes(namesSearch.trim()) ||
                    n.meaning.includes(namesSearch.trim())
                ).map((item) => (
                  <div
                    key={item.num}
                    className="rounded-xl border border-slate-800 bg-[#0E131A] p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-amber-300">
                        {item.name}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        #{item.num}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.meaning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8 & 27. AYAH OF THE DAY & TAFSIR MUYASSAR */}
          {(toolId === 'ayah_of_day' || toolId === 'tafsir_muyassar') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">السورة</label>
                  <select
                    value={tafsirSurah}
                    onChange={(e) => {
                      setTafsirSurah(Number(e.target.value));
                      setTafsirAyah(1);
                    }}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100"
                  >
                    {surahs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}. {s.nameArabic}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">رقم الآية</label>
                  <select
                    value={tafsirAyah}
                    onChange={(e) => setTafsirAyah(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                  >
                    {Array.from(
                      {
                        length:
                          surahs.find((s) => s.id === tafsirSurah)?.versesCount || 7,
                      },
                      (_, i) => i + 1
                    ).map((n) => (
                      <option key={n} value={n}>
                        الآية {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingTafsir ? (
                <div className="py-8 text-center text-slate-400">
                  جاري جلب الآية والتفسير الميسّر...
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-5 space-y-4">
                  <p className="text-lg sm:text-xl leading-loose text-emerald-200 font-serif text-center">
                    ﴿ {fetchedAyahText} ﴾
                  </p>
                  <div className="border-t border-slate-800 pt-3">
                    <div className="text-xs font-semibold text-amber-300 mb-1">
                      التفسير الميسّر:
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {fetchedTafsirText}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const randomSurah =
                          surahs[Math.floor(Math.random() * surahs.length)];
                        const randomAyah =
                          Math.floor(Math.random() * randomSurah.versesCount) + 1;
                        setTafsirSurah(randomSurah.id);
                        setTafsirAyah(randomAyah);
                      }}
                      className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      آية عشوائية للتدبر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLoadVerseIntoStudio(tafsirSurah, tafsirAyah, tafsirAyah);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>صناعة فيديو ريلز لهذه الآية</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 9. LIVE QURAN RADIO */}
          {toolId === 'quran_radio' && (
            <div className="space-y-3">
              {radioError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                  {radioError}
                </div>
              )}
              {QURAN_RADIO_STATIONS.map((st) => {
                const active = activeStationId === st.id && isRadioPlaying;
                return (
                  <div
                    key={st.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${
                      active
                        ? 'border-emerald-500/60 bg-emerald-500/10'
                        : 'border-slate-800 bg-[#0E131A]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-100">
                        {st.nameArabic}
                      </div>
                      <div className="text-xs text-slate-400">{st.descArabic}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStationId(st.id);
                        toggleRadioPlay(st.streamUrl);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer shrink-0"
                    >
                      {active ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>إيقاف البث</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>استماع مباشر</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 10. ZAKAT CALCULATOR */}
          {toolId === 'zakat_calc' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    النقد والأرصدة البنكية المدخرة (حول كامل)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={zakatCash}
                    onChange={(e) => setZakatCash(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    سعر جرام الذهب عيار 24 اليوم بعملتك
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={goldGramPrice}
                    onChange={(e) => setGoldGramPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    وزن الذهب عيار 24 للادخار (بالجرام)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={zakatGold24}
                    onChange={(e) => setZakatGold24(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    وزن الذهب عيار 21 للادخار (بالجرام)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={zakatGold21}
                    onChange={(e) => setZakatGold21(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    عروض التجارة والأسهم المعدة للبيع
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={zakatTrade}
                    onChange={(e) => setZakatTrade(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    الديون الحالة الواجبة السداد فوراً
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={zakatDebts}
                    onChange={(e) => setZakatDebts(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-2">
                <div className="flex justify-between text-xs text-slate-300 tabular-nums">
                  <span>قيمة نصاب الذهب (85 جرام عيار 24):</span>
                  <span>{Math.round(zakatResult.nisabThreshold).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300 tabular-nums">
                  <span>صافي الوعاء الزكوي:</span>
                  <span>{Math.round(zakatResult.netWealth).toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-emerald-500/30 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-100">
                    مقدار الزكاة الواجبة (2.5%):
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-emerald-300">
                    {zakatResult.isDue
                      ? Math.round(zakatResult.zakatAmount).toLocaleString()
                      : 'لم يبلغ النصاب'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 11. KHATMAH PLANNER */}
          {toolId === 'khatmah_plan' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[7, 10, 15, 30, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setKhatmahDays(d)}
                    className={`rounded-lg border px-4 py-2 text-xs font-bold tabular-nums cursor-pointer ${
                      khatmahDays === d
                        ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                        : 'border-slate-800 bg-[#0E131A] text-slate-300'
                    }`}
                  >
                    ختمة في {d} يوماً
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 text-center">
                  <div className="text-xs text-slate-400">الورد اليومي المطلوب</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-300">
                    {Math.ceil(604 / khatmahDays)} صفحة يومياً
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 text-center">
                  <div className="text-xs text-slate-400">بعد كل صلاة مفروضة</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-amber-300">
                    {Math.max(1, Math.ceil(604 / khatmahDays / 5))} صفحات
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2">
                  سجل متابعة أيام الختمة (اضغط لتعليم اليوم المنجز):
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {Array.from({ length: khatmahDays }, (_, i) => i + 1).map((day) => {
                    const done = completedKhatmahDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const next = done
                            ? completedKhatmahDays.filter((x) => x !== day)
                            : [...completedKhatmahDays, day];
                          setCompletedKhatmahDays(next);
                          try {
                            localStorage.setItem('qr_khatmah_days', JSON.stringify(next));
                          } catch {
                            // ignore
                          }
                        }}
                        className={`rounded-lg border py-2 text-xs font-mono tabular-nums cursor-pointer ${
                          done
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 font-bold'
                            : 'border-slate-800 bg-[#0E131A] text-slate-400'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 12. HISN AL-MUSLIM */}
          {toolId === 'hisn_muslim' && (
            <div className="space-y-3">
              {HISN_MUSLIM_DUAS.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400">
                      {item.category} · {item.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`hisn_${idx}`, item.dua)}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      {copiedId === `hisn_${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>نسخ</span>
                    </button>
                  </div>
                  <p className="text-sm sm:text-base leading-loose text-slate-100">
                    {item.dua}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 13. INHERITANCE CALCULATOR */}
          {toolId === 'inheritance_calc' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    صافي التركة بعد الديون والوصية
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={estateAmount}
                    onChange={(e) => setEstateAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">الزوج / الزوجة</label>
                  <select
                    value={spouseType}
                    onChange={(e) =>
                      setSpouseType(e.target.value as 'none' | 'husband' | 'wife')
                    }
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="none">لا يوجد</option>
                    <option value="wife">زوجة</option>
                    <option value="husband">زوج</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">عدد الأبناء</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={sonsCount}
                      onChange={(e) => setSonsCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-2.5 py-2 text-sm text-slate-100 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">عدد البنات</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={daughtersCount}
                      onChange={(e) => setDaughtersCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-2.5 py-2 text-sm text-slate-100 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fatherAlive}
                    onChange={(e) => setFatherAlive(e.target.checked)}
                    className="accent-emerald-400"
                  />
                  <span>الأب على قيد الحياة</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={motherAlive}
                    onChange={(e) => setMotherAlive(e.target.checked)}
                    className="accent-emerald-400"
                  />
                  <span>الأم على قيد الحياة</span>
                </label>
              </div>

              <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#0E131A]">
                {inheritanceBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-100">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-400">{item.note}</div>
                    </div>
                    <div className="text-left font-mono tabular-nums">
                      <div className="text-sm font-bold text-emerald-300">
                        {Math.round(item.amount).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {(item.finalRatio * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 14. HADITH SEARCH */}
          {toolId === 'hadith_search' && (
            <div className="space-y-4">
              <input
                type="text"
                value={hadithQuery}
                onChange={(e) => setHadithQuery(e.target.value)}
                placeholder="ابحث في الأحاديث الصحيحة (مثال: القرآن، النيات، صدقة جارية)..."
                className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-4 py-2.5 text-sm text-slate-100"
              />
              <div className="space-y-3">
                {HADITH_COLLECTION.filter(
                  (h) =>
                    !hadithQuery.trim() ||
                    h.text.includes(hadithQuery.trim()) ||
                    h.topic.includes(hadithQuery.trim())
                ).map((h) => (
                  <div
                    key={h.id}
                    className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 space-y-2"
                  >
                    <p className="text-sm sm:text-base leading-loose text-slate-100 font-semibold">
                      « {h.text} »
                    </p>
                    <div className="text-xs text-slate-400 flex flex-wrap gap-2">
                      <span>الراوي: {h.narrator}</span>
                      <span>·</span>
                      <span className="text-emerald-400">{h.grade}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 15. ISLAMIC BABY NAMES */}
          {toolId === 'baby_names' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={babySearch}
                  onChange={(e) => setBabySearch(e.target.value)}
                  placeholder="ابحث عن اسم أو معنى..."
                  className="flex-1 rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2 text-sm text-slate-100"
                />
                <div className="flex gap-1.5">
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'male', label: 'أولاد' },
                    { id: 'female', label: 'بنات' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setBabyGender(g.id as 'all' | 'male' | 'female')}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer ${
                        babyGender === g.id
                          ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                          : 'border-slate-800 bg-[#0E131A] text-slate-400'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto">
                {ISLAMIC_BABY_NAMES.filter(
                  (b) =>
                    (babyGender === 'all' || b.gender === babyGender) &&
                    (!babySearch.trim() ||
                      b.name.includes(babySearch.trim()) ||
                      b.meaning.includes(babySearch.trim()))
                ).map((b) => (
                  <div
                    key={b.name}
                    className="rounded-xl border border-slate-800 bg-[#0E131A] p-3.5"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-base font-bold text-slate-100">
                        {b.name}
                      </span>
                      <span className="text-[11px] text-emerald-400">{b.origin}</span>
                    </div>
                    <p className="text-xs text-slate-400">{b.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 16 & 29. MAKHARIJ AL-HURUF & TAJWEED RULES */}
          {(toolId === 'makharij' || toolId === 'tajweed_rules') && (
            <div className="space-y-3">
              {(toolId === 'makharij' ? MAKHARIJ_ZONES : TAJWEED_RULES_LIST).map(
                (item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-emerald-300">
                        {'zone' in item ? item.zone : item.title}
                      </span>
                      <span className="text-xs font-semibold text-amber-300">
                        الحروف: {item.letters}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {'description' in item ? item.description : item.rule}
                    </p>
                    <p className="text-xs text-slate-400">مثال قرآني: {item.example}</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* 17. QURAN MEMORIZER */}
          {toolId === 'quran_memorizer' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">السورة</label>
                  <select
                    value={memSurahId}
                    onChange={(e) => {
                      setMemSurahId(Number(e.target.value));
                      setMemAyah(1);
                    }}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100"
                  >
                    {surahs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}. {s.nameArabic}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">الآية</label>
                  <select
                    value={memAyah}
                    onChange={(e) => setMemAyah(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                  >
                    {Array.from(
                      {
                        length:
                          surahs.find((s) => s.id === memSurahId)?.versesCount || 4,
                      },
                      (_, i) => i + 1
                    ).map((n) => (
                      <option key={n} value={n}>
                        الآية {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    عدد مرات التكرار التلقائي
                  </label>
                  <select
                    value={memRepeatTarget}
                    onChange={(e) => setMemRepeatTarget(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                  >
                    {[3, 5, 7, 10].map((c) => (
                      <option key={c} value={c}>
                        تكرار {c} مرات
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-6 text-center space-y-4">
                <p
                  className={`text-xl leading-loose font-serif text-slate-100 transition-all ${
                    memHideWords ? 'blur-xs select-none' : ''
                  }`}
                >
                  ﴿ {memVerseText || '...'} ﴾
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={startMemorizerLoop}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>
                      {isMemPlaying
                        ? `جاري التكرار (${memCurrentRepeat}/${memRepeatTarget})`
                        : 'تشغيل التكرار الصوتي للحفظ'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemHideWords((h) => !h)}
                    className="rounded-lg border border-slate-700 px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
                  >
                    {memHideWords ? 'إظهار نص الآية' : 'إخفاء النص لاختبار الحفظ'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 18. QADA MISSED PRAYERS */}
          {toolId === 'qada_prayer' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  أدخل إجمالي عدد الأيام الفائتة لحساب الفروض الخمسة:
                </label>
                <input
                  type="number"
                  min={1}
                  value={qadaDaysInput}
                  onChange={(e) => setQadaDaysInput(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100 tabular-nums"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-4">
                  <div className="text-xs text-slate-400">إجمالي الصلوات المفروضة</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-amber-300">
                    {(qadaDaysInput * 5).toLocaleString()} صلاة
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-4">
                  <div className="text-xs text-slate-400">الصلوات التي قضيتها حتى الآن</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-300">
                    {qadaDoneCount.toLocaleString()} صلاة
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = qadaDoneCount + 1;
                    setQadaDoneCount(next);
                    try {
                      localStorage.setItem('qr_qada_done', String(next));
                    } catch {
                      // ignore
                    }
                  }}
                  className="rounded-lg bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                >
                  + تسجيل قضاء صلاة واحدة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = qadaDoneCount + 5;
                    setQadaDoneCount(next);
                    try {
                      localStorage.setItem('qr_qada_done', String(next));
                    } catch {
                      // ignore
                    }
                  }}
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  + تسجيل قضاء يوم كامل (5 صلوات)
                </button>
              </div>
            </div>
          )}

          {/* 19 & 30. KAFFARAH & ZAKAT AL-FITR */}
          {(toolId === 'kaffarah_calc' || toolId === 'zakat_fitr') && (
            <div className="space-y-4">
              {toolId === 'kaffarah_calc' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        متوسط تكلفة إطعام مسكين واحد في بلدك
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={mealCost}
                        onChange={(e) => setMealCost(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        النوع (كفارة يمين = 10 مساكين، أو عدد أيام فدية الصيام)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={kaffarahPeople}
                        onChange={(e) => setKaffarahPeople(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-2">
                    <div className="text-sm font-bold text-emerald-300 tabular-nums">
                      إجمالي قيمة الإطعام المقدرة:{' '}
                      {(mealCost * kaffarahPeople).toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      كفارة اليمين على التخيير ابتداءً: إطعام عشرة مساكين من أوسط ما تطعمون أهليكم، أو كسوتهم، أو تحرير رقبة، فمن لم يجد فصيام ثلاثة أيام.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        عدد أفراد الأسرة
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={fitrMembers}
                        onChange={(e) => setFitrMembers(Math.max(1, Number(e.target.value)))}
                        className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        قيمة الصاع النقدية للفرد الواحد بعملتك
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={fitrSaPrice}
                        onChange={(e) => setFitrSaPrice(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-sm text-slate-100 tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-1.5 tabular-nums">
                    <div className="text-sm text-slate-200">
                      مقدار الطعام العيني (الأرز/الحبوب): نحو{' '}
                      <strong className="text-amber-300">
                        {(fitrMembers * 2.75).toFixed(1)} كجم
                      </strong>{' '}
                      ({fitrMembers} صاع)
                    </div>
                    <div className="text-base font-bold text-emerald-300">
                      القيمة النقدية الإجمالية للأسرة:{' '}
                      {(fitrMembers * fitrSaPrice).toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 20. HADITH VERIFICATION */}
          {toolId === 'hadith_verify' && (
            <div className="space-y-4">
              <input
                type="text"
                value={hadithQuery}
                onChange={(e) => setHadithQuery(e.target.value)}
                placeholder="اكتب طرف الحديث أو العبارة المشهورة للتحقق من درجتها..."
                className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-4 py-2.5 text-sm text-slate-100"
              />
              <div className="space-y-2.5">
                {HADITH_VERIFICATION_CHECKS.filter(
                  (c) => !hadithQuery.trim() || c.phrase.includes(hadithQuery.trim())
                ).map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-100">
                        « {item.phrase} »
                      </span>
                      <span
                        className={`text-xs font-bold shrink-0 ${
                          item.ruling === 'صحيح ثابت'
                            ? 'text-emerald-400'
                            : item.ruling === 'ضعيف'
                            ? 'text-amber-300'
                            : 'text-red-400'
                        }`}
                      >
                        {item.ruling}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 21. FASTING TRACKER */}
          {toolId === 'fasting_tracker' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                سجّل أيام صيام النوافل والقضاء المحفوظة على جهازك:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  'صيام الإثنين هذا الأسبوع',
                  'صيام الخميس هذا الأسبوع',
                  'اليوم الأبيض 13 من الشهر الهجري',
                  'اليوم الأبيض 14 من الشهر الهجري',
                  'اليوم الأبيض 15 من الشهر الهجري',
                  'الست من شوال (1/6)',
                  'الست من شوال (2/6)',
                  'صيام يوم عرفة / عاشوراء',
                ].map((label) => {
                  const checked = fastedLog.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        const next = checked
                          ? fastedLog.filter((x) => x !== label)
                          : [...fastedLog, label];
                        setFastedLog(next);
                        try {
                          localStorage.setItem('qr_fasting_log', JSON.stringify(next));
                        } catch {
                          // ignore
                        }
                      }}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs sm:text-sm cursor-pointer ${
                        checked
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200 font-semibold'
                          : 'border-slate-800 bg-[#0E131A] text-slate-300'
                      }`}
                    >
                      <span>{label}</span>
                      <span>{checked ? 'تم الصيام ✓' : 'تسجيل'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 22. LEARN PRAYER */}
          {toolId === 'learn_prayer' && (
            <div className="space-y-3">
              {LEARN_PRAYER_STEPS.map((st) => (
                <div
                  key={st.step}
                  className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-100 tabular-nums">
                      {st.step}. {st.title}
                    </span>
                    <span className="text-xs text-emerald-400">{st.ruling}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {st.detail}
                  </p>
                  <p className="text-xs text-amber-200/90">{st.dhikr}</p>
                </div>
              ))}
            </div>
          )}

          {/* 23. GROUP KHATMAH */}
          {toolId === 'group_khatmah' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="اكتب اسم القارئ ثم اضغط على رقم الجزء لحجزه..."
                  className="flex-1 rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    const summary = Array.from({ length: 30 }, (_, i) => i + 1)
                      .map(
                        (j) =>
                          `الجزء ${j}: ${groupJuzOwners[j] || 'متاح للمشاركة'}`
                      )
                      .join('\n');
                    void handleCopy(
                      'khatmah_share',
                      `ختمة قرآن جماعية (${sadaqahLabel}):\n${summary}`
                    );
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>
                    {copiedId === 'khatmah_share'
                      ? 'تم نسخ جدول الختمة!'
                      : 'نسخ جدول الختمة لواتساب'}
                  </span>
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
                  const owner = groupJuzOwners[juz];
                  return (
                    <button
                      key={juz}
                      type="button"
                      onClick={() => {
                        const next = { ...groupJuzOwners };
                        if (owner) {
                          delete next[juz];
                        } else {
                          next[juz] = participantName.trim() || 'محجوز';
                        }
                        setGroupJuzOwners(next);
                        try {
                          localStorage.setItem('qr_group_khatmah', JSON.stringify(next));
                        } catch {
                          // ignore
                        }
                      }}
                      className={`rounded-lg border p-2.5 text-center cursor-pointer ${
                        owner
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                          : 'border-slate-800 bg-[#0E131A] text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold tabular-nums">الجزء {juz}</div>
                      <div className="text-[10px] truncate text-slate-400 mt-0.5">
                        {owner || 'متاح'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 24. FOOD E-NUMBERS CHECKER */}
          {toolId === 'e_numbers' && (
            <div className="space-y-4">
              <input
                type="text"
                value={eNumberQuery}
                onChange={(e) => setENumberQuery(e.target.value)}
                placeholder="ابحث برمز المادة المضافة (مثال: E120، E471، E441، جيلاتين)..."
                className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-4 py-2.5 text-sm text-slate-100"
              />
              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {E_NUMBERS_LIST.filter(
                  (e) =>
                    !eNumberQuery.trim() ||
                    e.code.toLowerCase().includes(eNumberQuery.trim().toLowerCase()) ||
                    e.name.includes(eNumberQuery.trim())
                ).map((item) => (
                  <div
                    key={item.code}
                    className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-100 font-mono">
                        {item.code} — {item.name}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          item.status === 'halal'
                            ? 'text-emerald-400'
                            : item.status === 'haram'
                            ? 'text-red-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {item.statusArabic}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 25. NEARBY MOSQUES */}
          {toolId === 'nearby_mosques' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={cityIndex}
                  onChange={(e) => {
                    setCustomCoords(null);
                    setCityIndex(Number(e.target.value));
                  }}
                  className="flex-1 rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100"
                >
                  {ARAB_AND_WORLD_CITIES.map((c, idx) => (
                    <option key={c.cityQuery} value={idx}>
                      {c.nameArabic}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={findNearbyMosques}
                  disabled={loadingMosques}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer whitespace-nowrap"
                >
                  {loadingMosques ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LocateFixed className="w-4 h-4" />
                  )}
                  <span>البحث عن أقرب المساجد الآن</span>
                </button>
              </div>
              {mosqueMsg && <p className="text-xs text-slate-400">{mosqueMsg}</p>}
              <div className="space-y-2.5">
                {mosques.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0E131A] px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-100">{m.name}</div>
                      <div className="text-xs text-slate-400 tabular-nums">
                        المسافة التقريبية: {m.distMeters.toLocaleString()} متر
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-emerald-300 hover:bg-slate-800 whitespace-nowrap"
                    >
                      <span>الاتجاهات</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 26. QURAN WORD SEARCH */}
          {toolId === 'quran_word_search' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wordQuery}
                  onChange={(e) => setWordQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runQuranWordSearch()}
                  placeholder="اكتب أي كلمة قرآنية للبحث في المصحف..."
                  className="flex-1 rounded-lg border border-slate-800 bg-[#0B0F14] px-4 py-2.5 text-sm text-slate-100"
                />
                <button
                  type="button"
                  onClick={runQuranWordSearch}
                  disabled={searchingWords}
                  className="rounded-lg bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer whitespace-nowrap"
                >
                  {searchingWords ? 'جاري البحث...' : 'بحث'}
                </button>
              </div>
              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {wordResults.map((res) => (
                  <div
                    key={res.verseKey}
                    className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 space-y-2"
                  >
                    <p className="text-sm sm:text-base leading-loose text-slate-100 font-serif">
                      {res.text}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-400 font-mono tabular-nums">
                        آية {res.verseKey}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onLoadVerseIntoStudio(res.surahId, res.ayahNum, res.ayahNum);
                          onClose();
                        }}
                        className="text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
                      >
                        فتح في استوديو الريلز ←
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 28. KIDS MEMORIZER & CERTIFICATE */}
          {toolId === 'kids_memorizer' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  اسم الطفل / الطفلة لإصدار شهادة التفوق التشجيعية:
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="مثال: آدم فاروق، مريم..."
                    className="flex-1 rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={downloadKidCertificate}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل شهادة التفوق (PNG)</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-2">
                  علّم السور التي أتم الطفل حفظها في لوحة النجوم ({kidsSurahDone.length} سور):
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
                  {surahs
                    .filter((s) => s.id === 1 || s.id >= 78)
                    .map((s) => {
                      const done = kidsSurahDone.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            const next = done
                              ? kidsSurahDone.filter((x) => x !== s.id)
                              : [...kidsSurahDone, s.id];
                            setKidsSurahDone(next);
                            try {
                              localStorage.setItem(
                                'qr_kids_surahs',
                                JSON.stringify(next)
                              );
                            } catch {
                              // ignore
                            }
                          }}
                          className={`rounded-lg border px-2.5 py-2 text-xs font-medium cursor-pointer truncate ${
                            done
                              ? 'border-amber-400/70 bg-amber-500/15 text-amber-200'
                              : 'border-slate-800 bg-[#0E131A] text-slate-400'
                          }`}
                        >
                          {done ? '★ ' : ''}
                          {s.nameArabic}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
