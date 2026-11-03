import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Check, Loader2, LogIn, LogOut, Play, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RECITERS } from '../data/quranCatalog';
import { StudioSettings, SurahMeta } from '../types/quran';

interface SavedReelRecord {
  id: number;
  titleArabic: string;
  surahId: number;
  fromAyah: number;
  toAyah: number;
  reciterId: string;
  backgroundId: string;
  translationId: string;
  aspectRatio: string;
  sadaqahText: string;
  settingsJson: string;
  createdAt: string;
}

interface SavedReelsLibraryProps {
  surahs: SurahMeta[];
  settings: StudioSettings;
  onLoadSavedSettings: (patch: Partial<StudioSettings>) => void;
}

export function SavedReelsLibrary({
  surahs,
  settings,
  onLoadSavedSettings,
}: SavedReelsLibraryProps) {
  const { user, isAuthReady, signInWithGoogle, logout, getAccessToken } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedReelRecord[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const fetchSavedReels = useCallback(async () => {
    if (!user) {
      setSavedItems([]);
      return;
    }

    setIsLoadingList(true);
    setErrorBanner(null);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch('/api/saved-reels', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json().catch(() => ({}))) as {
        items?: SavedReelRecord[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'تعذر جلب مقاطعك المحفوظة حالياً.');
      }

      setSavedItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'تعذر الاتصال لتحميل مقاطعك المحفوظة.'
      );
    } finally {
      setIsLoadingList(false);
    }
  }, [user, getAccessToken]);

  useEffect(() => {
    if (isAuthReady && user) {
      fetchSavedReels();
    } else if (isAuthReady && !user) {
      setSavedItems([]);
    }
  }, [isAuthReady, user, fetchSavedReels]);

  const handleSignIn = async () => {
    setErrorBanner(null);
    try {
      await signInWithGoogle();
    } catch {
      setErrorBanner('تم إلغاء نافذة تسجيل الدخول أو تعذر إتمامها.');
    }
  };

  const handleSaveCurrent = async () => {
    if (!user) return;
    setIsSaving(true);
    setErrorBanner(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('يرجى إعادة تسجيل الدخول.');

      const surahName =
        surahs.find((s) => s.id === settings.surahId)?.nameArabic ||
        `سورة ${settings.surahId}`;
      const defaultLabel =
        settings.fromAyah === settings.toAyah
          ? `سورة ${surahName} · الآية ${settings.fromAyah}`
          : `سورة ${surahName} · الآيات ${settings.fromAyah}–${settings.toAyah}`;

      const safeSettingsToPersist: Partial<StudioSettings> = {
        surahId: settings.surahId,
        fromAyah: settings.fromAyah,
        toAyah: settings.toAyah,
        reciterId: settings.reciterId,
        translationId: settings.translationId,
        backgroundId: settings.backgroundId,
        aspectRatio: settings.aspectRatio,
        dimming: settings.dimming,
        kenBurnsMotion: settings.kenBurnsMotion,
        particleEffect: settings.particleEffect,
        atmosphereEffect: settings.atmosphereEffect,
        atmosphereIntensity: settings.atmosphereIntensity,
        fontId: settings.fontId,
        arabicFontSize: settings.arabicFontSize,
        translationFontSize: settings.translationFontSize,
        wordRevealMode: settings.wordRevealMode,
        highlightColor: settings.highlightColor,
        highlightSoftGlow: settings.highlightSoftGlow,
        highlightGlowIntensity: settings.highlightGlowIntensity,
        showSurahHeader: settings.showSurahHeader,
        showReciterFooter: settings.showReciterFooter,
        showProgressBar: settings.showProgressBar,
        showPageQrCode: settings.showPageQrCode,
        qrCodePosition: settings.qrCodePosition,
        qrCodeLinkMode: settings.qrCodeLinkMode,
        sadaqahText: settings.sadaqahText,
      };

      const res = await fetch('/api/saved-reels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titleArabic: customTitle.trim() || defaultLabel,
          surahId: settings.surahId,
          fromAyah: settings.fromAyah,
          toAyah: settings.toAyah,
          reciterId: settings.reciterId,
          backgroundId: settings.backgroundId,
          translationId: settings.translationId,
          aspectRatio: settings.aspectRatio,
          sadaqahText: settings.sadaqahText,
          settingsJson: JSON.stringify(safeSettingsToPersist),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        item?: SavedReelRecord;
        error?: string;
      };

      if (!res.ok || !data.item) {
        throw new Error(data.error || 'تعذر حفظ المقطع.');
      }

      setSavedItems((prev) => [data.item!, ...prev]);
      setCustomTitle('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2600);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'تعذر حفظ المقطع في مكتبتك.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadItem = (item: SavedReelRecord) => {
    try {
      const parsed = JSON.parse(item.settingsJson) as Partial<StudioSettings>;
      onLoadSavedSettings({
        ...parsed,
        surahId: item.surahId,
        fromAyah: item.fromAyah,
        toAyah: item.toAyah,
        reciterId: item.reciterId,
        backgroundId: item.backgroundId,
        translationId: item.translationId,
        sadaqahText: item.sadaqahText,
        customBgType: 'none',
        customBgUrl: null,
      });
    } catch {
      onLoadSavedSettings({
        surahId: item.surahId,
        fromAyah: item.fromAyah,
        toAyah: item.toAyah,
        reciterId: item.reciterId,
        backgroundId: item.backgroundId,
        translationId: item.translationId,
        sadaqahText: item.sadaqahText,
        customBgType: 'none',
        customBgUrl: null,
      });
    }
  };

  const handleDeleteItem = async (id: number) => {
    setDeletingId(id);
    setErrorBanner(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('يرجى إعادة تسجيل الدخول.');

      const res = await fetch(`/api/saved-reels/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'تعذر حذف المقطع.');
      }

      setSavedItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'تعذر حذف المقطع.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800/90 bg-[#121820] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-emerald-400 shrink-0" />
          <h3 className="text-xs sm:text-sm font-semibold text-slate-100">
            مكتبتي للمقاطع المحفوظة
          </h3>
        </div>

        {user && (
          <button
            type="button"
            onClick={logout}
            title="تسجيل الخروج"
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        )}
      </div>

      {errorBanner && (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {errorBanner}
        </div>
      )}

      {!user ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0B0F14] p-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            سجّل الدخول بحساب Google لحفظ إعدادات مقاطعك القرآنية المفضلة والرجوع إليها من أي جهاز.
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 transition-colors cursor-pointer shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول بحساب Google</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="عنوان اختياري للمقطع قبل الحفظ..."
              className="flex-1 min-w-0 rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveCurrent}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : justSaved ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              <span>{justSaved ? 'تم الحفظ' : 'حفظ المقطع'}</span>
            </button>
          </div>

          {isLoadingList ? (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>جاري تحميل مقاطعك المحفوظة...</span>
            </div>
          ) : savedItems.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-2">
              لا توجد مقاطع محفوظة بعد. اضبط السورة والتأثيرات ثم اضغط «حفظ المقطع».
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pl-0.5">
              {savedItems.map((item) => {
                const reciterLabel =
                  RECITERS.find((r) => r.id === item.reciterId)?.nameArabic ||
                  item.reciterId;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/90 bg-[#0B0F14] px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoadItem(item)}
                      className="min-w-0 flex-1 text-right group cursor-pointer"
                    >
                      <div className="text-xs font-medium text-slate-200 group-hover:text-emerald-300 truncate transition-colors">
                        {item.titleArabic}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {reciterLabel} · {item.aspectRatio}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadItem(item)}
                        title="تحميل في الاستوديو"
                        aria-label="تحميل المقطع المحفوظ في الاستوديو"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-[#121820] text-emerald-400 hover:bg-emerald-500/15 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => handleDeleteItem(item.id)}
                        title="حذف من مكتبتي"
                        aria-label="حذف المقطع من مكتبتي"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-[#121820] text-slate-400 hover:text-red-400 cursor-pointer disabled:opacity-40"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
