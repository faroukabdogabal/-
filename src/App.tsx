import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { ShieldCheck } from 'lucide-react';
import { AdminControlModal } from './components/AdminControlModal';
import { FeaturesAndSadaqah } from './components/FeaturesAndSadaqah';
import { HeroSection } from './components/HeroSection';
import { Navbar } from './components/Navbar';
import { StudioWorkspace } from './components/StudioWorkspace';
import {
  BACKGROUNDS,
  DEFAULT_STUDIO_SETTINGS,
  QUICK_PRESETS,
  RECITERS,
  TRANSLATIONS,
} from './data/quranCatalog';
import { SURAHS_FALLBACK } from './data/surahsList';
import {
  auth,
  db,
  DEFAULT_SITE_CONFIG,
  handleFirestoreError,
  isVerifiedMasterAdmin,
  ManagedPresetRecord,
  MASTER_ADMIN_EMAIL,
  OperationType,
  SiteConfigData,
  syncMasterAdminProfile,
} from './firebase';
import { fetchSurahsList, loadAndPrepareReelData } from './services/quranApi';
import {
  PreparedReelData,
  QuickPreset,
  StudioSettings,
  SurahMeta,
} from './types/quran';

function parseInitialSettingsFromUrl(): {
  initialSettings: StudioSettings;
  sharedBanner: string | null;
  hasUrlOverrides: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      initialSettings: DEFAULT_STUDIO_SETTINGS,
      sharedBanner: null,
      hasUrlOverrides: false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const surahParam = Number(params.get('surah'));
  const fromParam = Number(params.get('from'));
  const toParam = Number(params.get('to'));
  const reciterParam = params.get('reciter');
  const bgParam = params.get('bg');
  const transParam = params.get('trans');
  const sadaqahParam = params.get('sadaqah');

  let hasUrlOverrides = false;
  const merged: StudioSettings = { ...DEFAULT_STUDIO_SETTINGS };

  if (surahParam >= 1 && surahParam <= 114) {
    hasUrlOverrides = true;
    merged.surahId = surahParam;
    const surahMeta = SURAHS_FALLBACK.find((s) => s.id === surahParam);
    const maxVerses = surahMeta?.versesCount || 286;
    if (fromParam >= 1 && fromParam <= maxVerses) {
      merged.fromAyah = fromParam;
      merged.toAyah =
        toParam >= fromParam && toParam <= Math.min(maxVerses, fromParam + 29)
          ? toParam
          : fromParam;
    } else {
      merged.fromAyah = 1;
      merged.toAyah = Math.min(5, maxVerses);
    }
  }

  if (reciterParam && RECITERS.some((r) => r.id === reciterParam)) {
    hasUrlOverrides = true;
    merged.reciterId = reciterParam;
  }
  if (bgParam && BACKGROUNDS.some((b) => b.id === bgParam)) {
    hasUrlOverrides = true;
    merged.backgroundId = bgParam;
  }
  if (transParam && TRANSLATIONS.some((t) => t.id === transParam)) {
    hasUrlOverrides = true;
    merged.translationId = transParam;
  }
  if (sadaqahParam !== null && sadaqahParam.trim().length > 0) {
    hasUrlOverrides = true;
    merged.sadaqahText = sadaqahParam.trim().slice(0, 80);
  }

  return {
    initialSettings: merged,
    sharedBanner:
      sadaqahParam && sadaqahParam.trim().length > 0
        ? sadaqahParam.trim().slice(0, 80)
        : null,
    hasUrlOverrides,
  };
}

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback for iframe clipboard permissions
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

export default function App() {
  const [{ initialSettings, sharedBanner, hasUrlOverrides }] = useState(
    parseInitialSettingsFromUrl
  );
  const [surahs, setSurahs] = useState<SurahMeta[]>(SURAHS_FALLBACK);
  const [settings, setSettings] = useState<StudioSettings>(initialSettings);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Exclusive Admin & Live Site Configuration State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [siteConfig, setSiteConfig] = useState<SiteConfigData>(DEFAULT_SITE_CONFIG);
  const [managedPresets, setManagedPresets] = useState<ManagedPresetRecord[]>([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  const userModifiedStudioRef = useRef<boolean>(hasUrlOverrides);
  const appliedRemoteDefaultsOnceRef = useRef<boolean>(false);

  const [reelData, setReelData] = useState<PreparedReelData | null>(null);
  const [isLoadingReel, setIsLoadingReel] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>(
    'جاري تحضير التلاوة القرآنية...'
  );
  const [reelError, setReelError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const loadAbortRef = useRef<AbortController | null>(null);

  const isMasterAdmin = isVerifiedMasterAdmin(currentUser);

  useEffect(() => {
    fetchSurahsList().then(setSurahs);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
      if (isVerifiedMasterAdmin(user) && user) {
        syncMasterAdminProfile(user).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time subscription to /site_config/main once auth initializes
  useEffect(() => {
    if (!isAuthReady) return;
    const configRef = doc(db, 'site_config', 'main');

    const unsubscribe = onSnapshot(
      configRef,
      (snap) => {
        if (!snap.exists()) {
          setSiteConfig(DEFAULT_SITE_CONFIG);
          return;
        }
        const raw = snap.data() as Partial<SiteConfigData>;
        const nextConfig: SiteConfigData = {
          siteTitle:
            typeof raw.siteTitle === 'string' && raw.siteTitle.trim()
              ? raw.siteTitle
              : DEFAULT_SITE_CONFIG.siteTitle,
          sadaqahLabel:
            typeof raw.sadaqahLabel === 'string' && raw.sadaqahLabel.trim()
              ? raw.sadaqahLabel
              : DEFAULT_SITE_CONFIG.sadaqahLabel,
          heroHeadline:
            typeof raw.heroHeadline === 'string' && raw.heroHeadline.trim()
              ? raw.heroHeadline
              : DEFAULT_SITE_CONFIG.heroHeadline,
          heroSubtitle:
            typeof raw.heroSubtitle === 'string' && raw.heroSubtitle.trim()
              ? raw.heroSubtitle
              : DEFAULT_SITE_CONFIG.heroSubtitle,
          announcementBanner:
            typeof raw.announcementBanner === 'string' ? raw.announcementBanner : '',
          defaultSurahId:
            typeof raw.defaultSurahId === 'number'
              ? raw.defaultSurahId
              : DEFAULT_SITE_CONFIG.defaultSurahId,
          defaultFromAyah:
            typeof raw.defaultFromAyah === 'number'
              ? raw.defaultFromAyah
              : DEFAULT_SITE_CONFIG.defaultFromAyah,
          defaultToAyah:
            typeof raw.defaultToAyah === 'number'
              ? raw.defaultToAyah
              : DEFAULT_SITE_CONFIG.defaultToAyah,
          defaultReciterId:
            typeof raw.defaultReciterId === 'string' &&
            RECITERS.some((r) => r.id === raw.defaultReciterId)
              ? raw.defaultReciterId
              : DEFAULT_SITE_CONFIG.defaultReciterId,
          defaultBackgroundId:
            typeof raw.defaultBackgroundId === 'string' &&
            BACKGROUNDS.some((b) => b.id === raw.defaultBackgroundId)
              ? raw.defaultBackgroundId
              : DEFAULT_SITE_CONFIG.defaultBackgroundId,
          allowPublicCustomSadaqah:
            typeof raw.allowPublicCustomSadaqah === 'boolean'
              ? raw.allowPublicCustomSadaqah
              : true,
          isPublishedLive:
            typeof raw.isPublishedLive === 'boolean' ? raw.isPublishedLive : true,
        };

        setSiteConfig(nextConfig);

        // Apply remote defaults cleanly for visitors who didn't open a deep-linked URL
        setSettings((prev) => {
          const patch: Partial<StudioSettings> = {};
          if (!userModifiedStudioRef.current && !appliedRemoteDefaultsOnceRef.current) {
            appliedRemoteDefaultsOnceRef.current = true;
            patch.surahId = nextConfig.defaultSurahId;
            patch.fromAyah = nextConfig.defaultFromAyah;
            patch.toAyah = nextConfig.defaultToAyah;
            patch.reciterId = nextConfig.defaultReciterId;
            patch.backgroundId = nextConfig.defaultBackgroundId;
            patch.sadaqahText = nextConfig.sadaqahLabel;
          } else if (
            !nextConfig.allowPublicCustomSadaqah &&
            !isVerifiedMasterAdmin(auth.currentUser)
          ) {
            patch.sadaqahText = nextConfig.sadaqahLabel;
          }
          return Object.keys(patch).length > 0 ? { ...prev, ...patch } : prev;
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'site_config/main');
      }
    );

    return () => unsubscribe();
  }, [isAuthReady]);

  // Real-time subscription to /published_presets
  useEffect(() => {
    if (!isAuthReady) return;
    const baseCol = collection(db, 'published_presets');
    const targetQuery = isMasterAdmin
      ? baseCol
      : query(baseCol, where('status', '==', 'published'));

    const unsubscribe = onSnapshot(
      targetQuery,
      (snap) => {
        const items: ManagedPresetRecord[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (
            typeof d.titleArabic === 'string' &&
            typeof d.subtitleArabic === 'string' &&
            typeof d.surahId === 'number' &&
            typeof d.fromAyah === 'number' &&
            typeof d.toAyah === 'number' &&
            typeof d.reciterId === 'string' &&
            typeof d.backgroundId === 'string'
          ) {
            items.push({
              id: docSnap.id,
              titleArabic: d.titleArabic,
              subtitleArabic: d.subtitleArabic,
              surahId: d.surahId,
              fromAyah: d.fromAyah,
              toAyah: d.toAyah,
              reciterId: RECITERS.some((r) => r.id === d.reciterId)
                ? d.reciterId
                : 'alafasy',
              backgroundId: BACKGROUNDS.some((b) => b.id === d.backgroundId)
                ? d.backgroundId
                : 'starry_night',
              status: d.status === 'draft' ? 'draft' : 'published',
            });
          }
        });
        setManagedPresets(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'published_presets');
      }
    );

    return () => unsubscribe();
  }, [isAuthReady, isMasterAdmin]);

  // Combined presets shown on the public homepage & Sadaqah selector
  const combinedPublicPresets = useMemo<QuickPreset[]>(() => {
    const publishedCustom: QuickPreset[] = managedPresets
      .filter((p) => p.status === 'published')
      .map((p) => ({
        id: p.id,
        titleArabic: p.titleArabic,
        subtitleArabic: p.subtitleArabic,
        surahId: p.surahId,
        fromAyah: p.fromAyah,
        toAyah: p.toAyah,
        reciterId: p.reciterId,
        backgroundId: p.backgroundId,
      }));
    return [...publishedCustom, ...QUICK_PRESETS];
  }, [managedPresets]);

  // Load Quran audio & Uthmani words whenever data-affecting settings change
  useEffect(() => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    setIsLoadingReel(true);
    setReelError(null);
    setLoadingMessage('جاري جلب الآيات والتلاوة الصوتية...');

    loadAndPrepareReelData({
      surahId: settings.surahId,
      fromAyah: settings.fromAyah,
      toAyah: settings.toAyah,
      reciterId: settings.reciterId,
      translationId: settings.translationId,
      autoSplitLongAyahs: settings.autoSplitLongAyahs,
      onStatus: (msg) => {
        if (!controller.signal.aborted) {
          setLoadingMessage(msg);
        }
      },
      signal: controller.signal,
    })
      .then((prepared) => {
        if (!controller.signal.aborted) {
          setReelData(prepared);
          setIsLoadingReel(false);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || (err as Error)?.name === 'AbortError') {
          return;
        }
        setIsLoadingReel(false);
        setReelError(
          err instanceof Error
            ? err.message
            : 'حدث خطأ أثناء تحميل التلاوة، يرجى المحاولة مجدداً'
        );
      });

    return () => {
      controller.abort();
    };
  }, [
    settings.surahId,
    settings.fromAyah,
    settings.toAyah,
    settings.reciterId,
    settings.translationId,
    settings.autoSplitLongAyahs,
    reloadNonce,
  ]);

  const handleUpdateSettings = useCallback(
    (patch: Partial<StudioSettings>) => {
      userModifiedStudioRef.current = true;
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        if (!siteConfig.allowPublicCustomSadaqah && !isMasterAdmin) {
          next.sadaqahText = siteConfig.sadaqahLabel;
        }
        return next;
      });
    },
    [siteConfig.allowPublicCustomSadaqah, siteConfig.sadaqahLabel, isMasterAdmin]
  );

  const scrollToStudio = useCallback(() => {
    const el = document.getElementById('studio');
    el?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSelectPreset = useCallback(
    (preset: QuickPreset) => {
      userModifiedStudioRef.current = true;
      setActivePresetId(preset.id);
      setSettings((prev) => ({
        ...prev,
        surahId: preset.surahId,
        fromAyah: preset.fromAyah,
        toAyah: preset.toAyah,
        reciterId: preset.reciterId,
        backgroundId: preset.backgroundId,
        customBgType: 'none',
      }));
      scrollToStudio();
    },
    [scrollToStudio]
  );

  const buildShareUrl = useCallback(
    (customOverrides?: Partial<StudioSettings>) => {
      const target = { ...settings, ...customOverrides };
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('surah', String(target.surahId));
      url.searchParams.set('from', String(target.fromAyah));
      url.searchParams.set('to', String(target.toAyah));
      url.searchParams.set('reciter', target.reciterId);
      url.searchParams.set('bg', target.backgroundId);
      url.searchParams.set('trans', target.translationId);
      if (target.sadaqahText.trim()) {
        url.searchParams.set('sadaqah', target.sadaqahText.trim());
      }
      return url.toString();
    },
    [settings]
  );

  const handleCopyCurrentShareLink = useCallback(async () => {
    const shareUrl = buildShareUrl();
    return copyTextSafe(shareUrl);
  }, [buildShareUrl]);

  const handleCreateDedicatedReel = useCallback(
    (dedicationText: string, preset: QuickPreset) => {
      userModifiedStudioRef.current = true;
      setActivePresetId(preset.id);
      setSettings((prev) => ({
        ...prev,
        surahId: preset.surahId,
        fromAyah: preset.fromAyah,
        toAyah: preset.toAyah,
        reciterId: preset.reciterId,
        backgroundId: preset.backgroundId,
        customBgType: 'none',
        sadaqahText:
          siteConfig.allowPublicCustomSadaqah || isMasterAdmin
            ? dedicationText
            : siteConfig.sadaqahLabel,
      }));
      scrollToStudio();
    },
    [
      scrollToStudio,
      siteConfig.allowPublicCustomSadaqah,
      siteConfig.sadaqahLabel,
      isMasterAdmin,
    ]
  );

  const handleBuildShareUrlForDedication = useCallback(
    async (dedicationText: string, preset: QuickPreset) => {
      const shareUrl = buildShareUrl({
        surahId: preset.surahId,
        fromAyah: preset.fromAyah,
        toAyah: preset.toAyah,
        reciterId: preset.reciterId,
        backgroundId: preset.backgroundId,
        sadaqahText:
          siteConfig.allowPublicCustomSadaqah || isMasterAdmin
            ? dedicationText
            : siteConfig.sadaqahLabel,
      });
      return copyTextSafe(shareUrl);
    },
    [
      buildShareUrl,
      siteConfig.allowPublicCustomSadaqah,
      siteConfig.sadaqahLabel,
      isMasterAdmin,
    ]
  );

  // If the sole administrator paused public publishing, show a clean maintenance gate to visitors
  if (!siteConfig.isPublishedLive && !isMasterAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F14] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-lg w-full rounded-2xl border border-slate-800 bg-[#121820] p-8 space-y-5">
          <div className="text-sm font-medium text-emerald-400">
            {siteConfig.sadaqahLabel}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">
            {siteConfig.siteTitle}
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            المنصة متوقفة مؤقتاً للتحديث من قِبل الإدارة وستعود للعمل قريباً بإذن الله.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>دخول المسؤول والمدير العام ({MASTER_ADMIN_EMAIL})</span>
            </button>
          </div>
        </div>

        <AdminControlModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          currentUser={currentUser}
          siteConfig={siteConfig}
          managedPresets={managedPresets}
          surahs={surahs}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-slate-100 flex flex-col">
      {!siteConfig.isPublishedLive && isMasterAdmin && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-medium text-amber-200">
          وضع المعاينة الخاص بالمسؤول ({MASTER_ADMIN_EMAIL}) — الصفحة موقوفة حالياً عن الزوار، ويمكنك إعادة نشرها من «لوحة المسؤول».
        </div>
      )}

      <Navbar
        siteTitle={siteConfig.siteTitle}
        sadaqahLabel={siteConfig.sadaqahLabel}
        isAdminAuthenticated={isMasterAdmin}
        onStartStudio={scrollToStudio}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
      />

      <main className="flex-1">
        <HeroSection
          siteConfig={siteConfig}
          presets={combinedPublicPresets}
          activePresetId={activePresetId}
          sharedDedicationBanner={sharedBanner}
          onSelectPreset={handleSelectPreset}
          onScrollToStudio={scrollToStudio}
        />

        <StudioWorkspace
          surahs={surahs}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          reelData={reelData}
          isLoadingReel={isLoadingReel}
          loadingMessage={loadingMessage}
          reelError={reelError}
          onReloadReel={() => setReloadNonce((n) => n + 1)}
          onCopyShareLink={handleCopyCurrentShareLink}
          allowCustomSadaqah={siteConfig.allowPublicCustomSadaqah}
          officialSadaqahLabel={siteConfig.sadaqahLabel}
          isMasterAdmin={isMasterAdmin}
        />

        <FeaturesAndSadaqah
          siteTitle={siteConfig.siteTitle}
          sadaqahLabel={siteConfig.sadaqahLabel}
          presets={combinedPublicPresets}
          allowCustomSadaqah={siteConfig.allowPublicCustomSadaqah}
          isMasterAdmin={isMasterAdmin}
          onOpenAdmin={() => setIsAdminModalOpen(true)}
          onCreateDedicatedReel={handleCreateDedicatedReel}
          onBuildShareUrlForDedication={handleBuildShareUrlForDedication}
        />
      </main>

      <AdminControlModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={currentUser}
        siteConfig={siteConfig}
        managedPresets={managedPresets}
        surahs={surahs}
      />
    </div>
  );
}
