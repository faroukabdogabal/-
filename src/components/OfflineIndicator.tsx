import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-[#141A16]/95 px-3.5 py-2 text-xs font-semibold text-amber-200 shadow-lg backdrop-blur-xs"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>وضع عدم الاتصال — يتم استخدام البيانات المحفوظة على جهازك</span>
    </div>
  );
}
