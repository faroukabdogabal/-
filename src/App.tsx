import { useCallback, useEffect, useRef, useState } from 'react';
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
} {
  if (typeof window === 'undefined') {
    return { initialSettings: DEFAULT_STUDIO_SETTINGS, sharedBanner: null };
  }

  const params = new URLSearchParams(window.location.search);
  const surahParam = Number(params.get('surah'));
  const fromParam = Number(params.get('from'));
  const toParam = Number(params.get('to'));
  const reciterParam = params.get('reciter');
  const bgParam = params.get('bg');
  const transParam = params.get('trans');
  const sadaqahParam = params.get('sadaqah');

  const merged: StudioSettings = { ...DEFAULT_STUDIO_SETTINGS };

  if (surahParam >= 1 && surahParam <= 114) {
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
    merged.reciterId = reciterParam;
  }
  if (bgParam && BACKGROUNDS.some((b) => b.id === bgParam)) {
    merged.backgroundId = bgParam;
  }
  if (transParam && TRANSLATIONS.some((t) => t.id === transParam)) {
    merged.translationId = transParam;
  }
  if (sadaqahParam !== null && sadaqahParam.trim().length > 0) {
    merged.sadaqahText = sadaqahParam.trim().slice(0, 80);
  }

  return {
    initialSettings: merged,
    sharedBanner:
      sadaqahParam && sadaqahParam.trim().length > 0
        ? sadaqahParam.trim().slice(0, 80)
        : null,
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
  const [{ initialSettings, sharedBanner }] = useState(parseInitialSettingsFromUrl);
  const [surahs, setSurahs] = useState<SurahMeta[]>(SURAHS_FALLBACK);
  const [settings, setSettings] = useState<StudioSettings>(initialSettings);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const [reelData, setReelData] = useState<PreparedReelData | null>(null);
  const [isLoadingReel, setIsLoadingReel] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>(
    'جاري تحضير التلاوة القرآنية...'
  );
  const [reelError, setReelError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const loadAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchSurahsList().then(setSurahs);
  }, []);

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

  const handleUpdateSettings = useCallback((patch: Partial<StudioSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const scrollToStudio = useCallback(() => {
    const el = document.getElementById('studio');
    el?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSelectPreset = useCallback(
    (preset: QuickPreset) => {
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
      setActivePresetId(preset.id);
      setSettings((prev) => ({
        ...prev,
        surahId: preset.surahId,
        fromAyah: preset.fromAyah,
        toAyah: preset.toAyah,
        reciterId: preset.reciterId,
        backgroundId: preset.backgroundId,
        customBgType: 'none',
        sadaqahText: dedicationText,
      }));
      scrollToStudio();
    },
    [scrollToStudio]
  );

  const handleBuildShareUrlForDedication = useCallback(
    async (dedicationText: string, preset: QuickPreset) => {
      const shareUrl = buildShareUrl({
        surahId: preset.surahId,
        fromAyah: preset.fromAyah,
        toAyah: preset.toAyah,
        reciterId: preset.reciterId,
        backgroundId: preset.backgroundId,
        sadaqahText: dedicationText,
      });
      return copyTextSafe(shareUrl);
    },
    [buildShareUrl]
  );

  return (
    <div className="min-h-screen bg-[#0B0F14] text-slate-100 flex flex-col">
      <Navbar onStartStudio={scrollToStudio} />

      <main className="flex-1">
        <HeroSection
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
        />

        <FeaturesAndSadaqah
          onCreateDedicatedReel={handleCreateDedicatedReel}
          onBuildShareUrlForDedication={handleBuildShareUrlForDedication}
        />
      </main>
    </div>
  );
}
