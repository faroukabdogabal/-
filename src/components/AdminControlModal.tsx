import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { BACKGROUNDS, RECITERS } from '../data/quranCatalog';
import {
  createManagedPresetAsAdmin,
  deleteManagedPresetAsAdmin,
  isVerifiedMasterAdmin,
  ManagedPresetRecord,
  MASTER_ADMIN_EMAIL,
  saveSiteConfigAsAdmin,
  signInMasterAdmin,
  signOutUser,
  SiteConfigData,
  toggleManagedPresetStatusAsAdmin,
} from '../firebase';
import { SurahMeta } from '../types/quran';

interface AdminControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  siteConfig: SiteConfigData;
  managedPresets: ManagedPresetRecord[];
  surahs: SurahMeta[];
}

type AdminSection = 'general' | 'presets' | 'permissions';

export function AdminControlModal({
  isOpen,
  onClose,
  currentUser,
  siteConfig,
  managedPresets,
  surahs,
}: AdminControlModalProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('general');
  const [formState, setFormState] = useState<SiteConfigData>(siteConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // New preset state
  const [newTitle, setNewTitle] = useState('');
  const [newSurahId, setNewSurahId] = useState(36);
  const [newFromAyah, setNewFromAyah] = useState(1);
  const [newToAyah, setNewToAyah] = useState(5);
  const [newReciterId, setNewReciterId] = useState('alafasy');
  const [newBgId, setNewBgId] = useState('starry_night');
  const [isAddingPreset, setIsAddingPreset] = useState(false);

  useEffect(() => {
    setFormState(siteConfig);
  }, [siteConfig, isOpen]);

  if (!isOpen) return null;

  const isMaster = isVerifiedMasterAdmin(currentUser);
  const selectedNewSurah = surahs.find((s) => s.id === newSurahId) || surahs[0];
  const selectedDefaultSurah =
    surahs.find((s) => s.id === formState.defaultSurahId) || surahs[0];

  const handleLogin = async () => {
    setErrorMsg(null);
    setIsSigningIn(true);
    try {
      await signInMasterAdmin();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر تسجيل الدخول، يرجى المحاولة مرة أخرى'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSaveSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isMaster) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSaveFeedback(null);

    try {
      await saveSiteConfigAsAdmin(currentUser, formState);
      setSaveFeedback('تم حفظ ونشر التعديلات على الموقع بنجاح');
      setTimeout(() => setSaveFeedback(null), 3500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isMaster) return;
    if (newTitle.trim().length < 2) {
      setErrorMsg('يرجى إدخال عنوان للمقتطف القرآني (حرفان على الأقل)');
      return;
    }

    setIsAddingPreset(true);
    setErrorMsg(null);
    try {
      const rangeLabel =
        newFromAyah === newToAyah
          ? `${selectedNewSurah.nameArabic} · ${newFromAyah}`
          : `${selectedNewSurah.nameArabic} · ${newFromAyah}–${newToAyah}`;

      await createManagedPresetAsAdmin(currentUser, {
        titleArabic: newTitle.trim(),
        subtitleArabic: rangeLabel,
        surahId: newSurahId,
        fromAyah: newFromAyah,
        toAyah: newToAyah,
        reciterId: newReciterId,
        backgroundId: newBgId,
        status: 'published',
      });
      setNewTitle('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر إضافة المقتطف');
    } finally {
      setIsAddingPreset(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="لوحة تحكم المسؤول والمدير العام"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-[#121820] text-slate-100 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0E131A] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-50">
                لوحة الإدارة والنشر والتحكم الحصري — قرآن ريلز
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                المسؤول والوكيل والمدير الوحيد: {MASTER_ADMIN_EMAIL}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق اللوحة"
            className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* Case 1: Not signed in */}
          {!currentUser && (
            <div className="py-8 text-center max-w-lg mx-auto space-y-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Lock className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-50">
                  بوابة التحكم الحصرية للمسؤول والمدير العام
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  جميع صلاحيات النشر، التغيير، التعديل، الوكالة، الإدارة، والتحرير داخل منصة قرآن ريلز مقصورة حصرياً ومؤمّنة برمجياً لحساب:
                </p>
                <p className="text-sm font-mono font-semibold text-emerald-300">
                  {MASTER_ADMIN_EMAIL}
                </p>
              </div>

              {errorMsg && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                disabled={isSigningIn}
                onClick={handleLogin}
                className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSigningIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>تسجيل الدخول بحساب جوجل المعتمد</span>
              </button>
            </div>
          )}

          {/* Case 2: Signed in with a NON-ADMIN Google account */}
          {currentUser && !isMaster && (
            <div className="py-8 text-center max-w-lg mx-auto space-y-5">
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 space-y-2">
                <h3 className="text-base font-bold text-red-300">
                  غير مصرح لهذا الحساب بالتحكم أو التعديل
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  أنت مسجل حالياً بحساب{' '}
                  <span className="font-mono text-amber-200">{currentUser.email}</span>.
                  جميع أذونات الإدارة والنشر والتعديل والوكالة والتحرير مملوكة حصرياً لحساب{' '}
                  <span className="font-mono text-emerald-300 font-semibold">
                    {MASTER_ADMIN_EMAIL}
                  </span>{' '}
                  فقط.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleLogin}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>التبديل إلى حساب {MASTER_ADMIN_EMAIL}</span>
                </button>
                <button
                  type="button"
                  onClick={() => signOutUser()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs sm:text-sm text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}

          {/* Case 3: Verified Master Admin (farouk.gabal@gmail.com) */}
          {currentUser && isMaster && (
            <div className="space-y-6">
              {/* Top Admin Identity Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
                <div className="text-xs sm:text-sm">
                  <span className="text-slate-400">مرحباً بالمسؤول والمدير العام: </span>
                  <span className="font-mono font-semibold text-emerald-300">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => signOutUser()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-[#0E131A] p-1.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveSection('general')}
                  className={`rounded-md px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    activeSection === 'general'
                      ? 'bg-slate-800 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  النشر وتعديل الصفحة
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('presets')}
                  className={`rounded-md px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    activeSection === 'presets'
                      ? 'bg-slate-800 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  إدارة المقتطفات المنشورة
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('permissions')}
                  className={`rounded-md px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    activeSection === 'permissions'
                      ? 'bg-slate-800 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  وثيقة الأذونات والوكالة
                </button>
              </div>

              {errorMsg && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              {saveFeedback && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{saveFeedback}</span>
                </div>
              )}

              {/* SECTION 1: GENERAL PUBLISHING & PAGE EDITING */}
              {activeSection === 'general' && (
                <form onSubmit={handleSaveSiteConfig} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0E131A] px-4 py-3 cursor-pointer">
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-100">
                          حالة النشر العام للصفحة
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formState.isPublishedLive
                            ? 'الصفحة منشورة ومتاحة لجميع الزوار'
                            : 'موقوفة مؤقتاً (وضع الصيانة — تظهر لك فقط)'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formState.isPublishedLive}
                        onChange={(e) =>
                          setFormState((s) => ({
                            ...s,
                            isPublishedLive: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-emerald-400"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0E131A] px-4 py-3 cursor-pointer">
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-100">
                          تخصيص الزوار لسطر الإهداء
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formState.allowPublicCustomSadaqah
                            ? 'مسموح للزوار كتابة دعاء إضافي بمقاطعهم'
                            : 'تثبيت عبارة الصدقة الرسمية على جميع المقاطع'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formState.allowPublicCustomSadaqah}
                        onChange={(e) =>
                          setFormState((s) => ({
                            ...s,
                            allowPublicCustomSadaqah: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-emerald-400"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        اسم المنصة في الشريط العلوي
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={80}
                        value={formState.siteTitle}
                        onChange={(e) =>
                          setFormState((s) => ({ ...s, siteTitle: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        عبارة الصدقة الجارية الرسمية
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={120}
                        value={formState.sadaqahLabel}
                        onChange={(e) =>
                          setFormState((s) => ({ ...s, sadaqahLabel: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      العنوان الرئيسي للصفحة (Hero Headline)
                    </label>
                    <input
                      type="text"
                      required
                      minLength={5}
                      maxLength={180}
                      value={formState.heroHeadline}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, heroHeadline: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      الوصف الترحيبي أسفل العنوان
                    </label>
                    <textarea
                      rows={2}
                      required
                      minLength={10}
                      maxLength={350}
                      value={formState.heroSubtitle}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, heroSubtitle: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      شريط تنبيه أو دعاء مثبّت أعلى الصفحة (اتركه فارغاً لإخفائه)
                    </label>
                    <input
                      type="text"
                      maxLength={240}
                      value={formState.announcementBanner}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          announcementBanner: e.target.value,
                        }))
                      }
                      placeholder="مثال: اللهم تقبل هذا العمل صدقة جارية خالصة عن عائلة فاروق جبل..."
                      className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Default Studio Configuration */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <h4 className="text-xs font-semibold text-emerald-400 mb-3">
                      إعدادات التلاوة الافتراضية عند فتح الزوار للاستوديو:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          السورة الافتراضية
                        </label>
                        <select
                          value={formState.defaultSurahId}
                          onChange={(e) => {
                            const sId = Number(e.target.value);
                            const meta = surahs.find((s) => s.id === sId) || surahs[0];
                            setFormState((s) => ({
                              ...s,
                              defaultSurahId: sId,
                              defaultFromAyah: 1,
                              defaultToAyah: Math.min(5, meta.versesCount),
                            }));
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs sm:text-sm text-slate-100"
                        >
                          {surahs.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id}. {s.nameArabic}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          من الآية
                        </label>
                        <select
                          value={formState.defaultFromAyah}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setFormState((s) => ({
                              ...s,
                              defaultFromAyah: v,
                              defaultToAyah: Math.max(
                                v,
                                Math.min(selectedDefaultSurah.versesCount, v + 29, s.defaultToAyah)
                              ),
                            }));
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs sm:text-sm text-slate-100 tabular-nums"
                        >
                          {Array.from(
                            { length: selectedDefaultSurah.versesCount },
                            (_, idx) => idx + 1
                          ).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          إلى الآية
                        </label>
                        <select
                          value={formState.defaultToAyah}
                          onChange={(e) =>
                            setFormState((s) => ({
                              ...s,
                              defaultToAyah: Number(e.target.value),
                            }))
                          }
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs sm:text-sm text-slate-100 tabular-nums"
                        >
                          {Array.from(
                            {
                              length: Math.min(
                                30,
                                selectedDefaultSurah.versesCount -
                                  formState.defaultFromAyah +
                                  1
                              ),
                            },
                            (_, idx) => formState.defaultFromAyah + idx
                          ).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          القارئ الافتراضي
                        </label>
                        <select
                          value={formState.defaultReciterId}
                          onChange={(e) =>
                            setFormState((s) => ({
                              ...s,
                              defaultReciterId: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs sm:text-sm text-slate-100"
                        >
                          {RECITERS.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nameArabic} ({r.styleArabic})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          الخلفية الافتراضية
                        </label>
                        <select
                          value={formState.defaultBackgroundId}
                          onChange={(e) =>
                            setFormState((s) => ({
                              ...s,
                              defaultBackgroundId: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs sm:text-sm text-slate-100"
                        >
                          {BACKGROUNDS.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.titleArabic}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>حفظ ونشر كافة التعديلات على الموقع</span>
                    </button>
                  </div>
                </form>
              )}

              {/* SECTION 2: MANAGE PUBLISHED PRESETS */}
              {activeSection === 'presets' && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleCreatePreset}
                    className="rounded-xl border border-slate-800 bg-[#0E131A] p-4 space-y-3"
                  >
                    <h4 className="text-sm font-semibold text-slate-100">
                      نشر مقتطف قرآني جديد في الواجهة الرئيسية
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          عنوان المقتطف (مثال: آيات الشفاء والسكينة)
                        </label>
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={80}
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="اكتب عنوان المقتطف..."
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs sm:text-sm text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          السورة الكريمة
                        </label>
                        <select
                          value={newSurahId}
                          onChange={(e) => {
                            const sId = Number(e.target.value);
                            const meta = surahs.find((s) => s.id === sId) || surahs[0];
                            setNewSurahId(sId);
                            setNewFromAyah(1);
                            setNewToAyah(Math.min(5, meta.versesCount));
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-3 py-2 text-xs sm:text-sm text-slate-100"
                        >
                          {surahs.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id}. {s.nameArabic}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          من آية
                        </label>
                        <select
                          value={newFromAyah}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setNewFromAyah(v);
                            if (newToAyah < v) setNewToAyah(v);
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-2.5 py-2 text-xs text-slate-100 tabular-nums"
                        >
                          {Array.from(
                            { length: selectedNewSurah.versesCount },
                            (_, idx) => idx + 1
                          ).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          إلى آية
                        </label>
                        <select
                          value={newToAyah}
                          onChange={(e) => setNewToAyah(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-2.5 py-2 text-xs text-slate-100 tabular-nums"
                        >
                          {Array.from(
                            {
                              length: Math.min(
                                30,
                                selectedNewSurah.versesCount - newFromAyah + 1
                              ),
                            },
                            (_, idx) => newFromAyah + idx
                          ).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          القارئ
                        </label>
                        <select
                          value={newReciterId}
                          onChange={(e) => setNewReciterId(e.target.value)}
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-2.5 py-2 text-xs text-slate-100"
                        >
                          {RECITERS.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nameArabic}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          الخلفية
                        </label>
                        <select
                          value={newBgId}
                          onChange={(e) => setNewBgId(e.target.value)}
                          className="w-full rounded-lg border border-slate-800 bg-[#0B0F14] px-2.5 py-2 text-xs text-slate-100"
                        >
                          {BACKGROUNDS.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.titleArabic}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAddingPreset}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>نشر المقتطف في الصفحة الرئيسية</span>
                    </button>
                  </form>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400">
                      المقتطفات المخصصة التي أضفتها ({managedPresets.length}):
                    </h4>

                    {managedPresets.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center border border-slate-800/70 rounded-lg">
                        لم تضف مقتطفات إضافية بعد. المقتطفات الافتراضية الستة معروضة حالياً ويمكنك إضافة ما تشاء فوقها.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-[#0E131A]">
                        {managedPresets.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <div>
                              <div className="text-xs sm:text-sm font-semibold text-slate-100">
                                {item.titleArabic}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {item.subtitleArabic} ·{' '}
                                {item.status === 'published'
                                  ? 'منشور للعامة'
                                  : 'مسودة مخفية'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleManagedPresetStatusAsAdmin(currentUser, item)
                                }
                                className="inline-flex items-center gap-1 rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                              >
                                {item.status === 'published' ? (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5" />
                                    <span>إخفاء</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>نشر</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  deleteManagedPresetAsAdmin(currentUser, item.id)
                                }
                                aria-label="حذف المقتطف"
                                className="rounded border border-slate-800 p-1.5 text-slate-400 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 3: EXCLUSIVE PERMISSIONS REGISTRY */}
              {activeSection === 'permissions' && (
                <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-5 space-y-4">
                  <h4 className="text-sm sm:text-base font-bold text-slate-100">
                    سجل الملكية والوكالة والأذونات الحصرية المعتمدة
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    تم قفل وتأمين قواعد بيانات المنصة (Firestore Security Rules) بحيث يقتصر قبول أي عملية نشر أو تغيير أو تعديل أو حذف على البريد الموثّق التالي وحده دون غيره:
                  </p>

                  <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-[#121820] text-xs sm:text-sm">
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-slate-400">الحساب المالك والمتحكم الوحيد</span>
                      <span className="font-mono font-semibold text-emerald-300">
                        {MASTER_ADMIN_EMAIL}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-slate-400">صفة الوكالة والإدارة</span>
                      <span className="text-slate-100 font-medium">
                        المالك · الوكيل الحصري · المدير العام · المسؤول
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-slate-400">صلاحيات النشر والتحرير</span>
                      <span className="text-slate-100 font-medium">
                        الناشر والمحرر الوحيد لكافة نصوص وإعدادات الصفحة
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-slate-400">صلاحية الحسابات الأخرى</span>
                      <span className="text-amber-300 font-medium">
                        مرفوضة تماماً من التعديل أو النشر (قراءة واستخدام مجاني فقط)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
