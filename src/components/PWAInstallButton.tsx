import { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Automatically suppress button when running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void handleInstallClick();
        }}
        aria-label="تثبيت تطبيق قرآن ريلز على الهاتف"
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/60 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>تثبيت التطبيق</span>
      </button>

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="تثبيت تطبيق قرآن ريلز على الهاتف"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#121820] text-slate-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0E131A] px-5 py-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                <h3 className="text-base font-bold text-slate-50">
                  تثبيت «قرآن ريلز» كتطبيق على هاتفك
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="إغلاق"
                className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm leading-relaxed">
              {isIOS ? (
                <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4 space-y-2.5">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Share className="w-4 h-4 shrink-0" />
                    <span>خطوات التثبيت على آيفون وآيباد (Safari):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-200">
                    <li>
                      اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح
                      سفاري السفلي.
                    </li>
                    <li>
                      مرّر لأسفل واختر{' '}
                      <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                    </li>
                    <li>
                      اضغط <strong>إضافة (Add)</strong> ليظهر التطبيق بأيقونته
                      الكاملة على شاشتك الرئيسية.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4 space-y-2">
                    <div className="font-bold text-emerald-300">
                      على هواتف أندرويد ومتصفح Chrome / Edge:
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-200">
                      <li>
                        افتح الرابط المباشر للموقع في متصفح <strong>Chrome</strong>.
                      </li>
                      <li>
                        اضغط على قائمة المتصفح <strong>(⋮)</strong> أعلى الشاشة ثم
                        اختر <strong>تثبيت التطبيق (Install App)</strong> أو{' '}
                        <strong>الإضافة إلى الشاشة الرئيسية</strong>.
                      </li>
                    </ol>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#0E131A] p-3.5 space-y-1.5 text-slate-300">
                    <div className="font-semibold text-amber-300">
                      على آيفون وآيباد (Safari):
                    </div>
                    <p className="text-xs text-slate-400">
                      اضغط على زر <strong>المشاركة (Share)</strong> في سفاري ثم اختر{' '}
                      <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full rounded-lg bg-emerald-400 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
