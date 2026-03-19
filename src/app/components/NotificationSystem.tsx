import React, { useState, useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";
import { X } from "lucide-react";

type ThreatLevel = "critical" | "high" | "medium" | "info" | "success" | "suspect";

interface NotificationData {
  id: string;
  title: string;
  message: string;
  level: ThreatLevel;
  code?: string;
  timestamp?: string;
}

const LEVEL_ACCENT: Record<ThreatLevel, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  suspect:  "#eab308",
  medium:   "#eab308",
  info:     "#a1a1aa",
  success:  "#22c55e",
};


const BATCH_WINDOW_MS = 15_000;
const STABLE_TOAST_ID = 'tactical-batch';

const LEVEL_PRIORITY: Record<ThreatLevel, number> = {
  critical: 6, high: 5, suspect: 4, medium: 3, info: 2, success: 1,
};

type BatchItem = Omit<NotificationData, "id"> & { timestamp: string };

let pendingBatch: BatchItem[] = [];
let batchTimerId: ReturnType<typeof setTimeout> | null = null;
let batchListeners: Set<() => void> = new Set();

function subscribeBatch(cb: () => void) {
  batchListeners.add(cb);
  return () => { batchListeners.delete(cb); };
}

function notifyBatchListeners() {
  batchListeners.forEach(cb => cb());
}

function highestLevel(items: { level: ThreatLevel }[]): ThreatLevel {
  let best: ThreatLevel = 'info';
  for (const item of items) {
    if (LEVEL_PRIORITY[item.level] > LEVEL_PRIORITY[best]) best = item.level;
  }
  return best;
}

function useBatchItems(): BatchItem[] {
  const [, setTick] = React.useState(0);
  React.useEffect(() => subscribeBatch(() => setTick(t => t + 1)), []);
  return pendingBatch;
}

const LiveBatchedToast = ({ toastId }: { toastId: string }) => {
  const items = useBatchItems();
  const [expanded, setExpanded] = React.useState(false);

  if (items.length === 0) return null;

  if (items.length === 1) {
    const data = items[0];
    return (
      <div
        className="relative w-[356px] rounded-lg border border-white/[0.12] bg-[#1c1c20] shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden cursor-pointer group"
        onClick={() => window.dispatchEvent(new CustomEvent('toast-clicked', { detail: data }))}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.dispatchEvent(new CustomEvent('toast-clicked', { detail: data })); } }}
        role="button"
        tabIndex={0}
        dir="rtl"
      >
        <div className="py-3 px-3 flex gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-zinc-100 truncate">{data.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); toast.dismiss(toastId); flushBatch(); }}
                className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                aria-label="סגור"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[12px] text-zinc-400 leading-relaxed mt-0.5 line-clamp-2">{data.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-[356px] rounded-lg border border-white/[0.12] bg-[#1c1c20] shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden"
      dir="rtl"
    >
      <div className="py-3 px-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-zinc-100">
            {items.length} התראות חדשות
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(prev => !prev); }}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-1.5 py-0.5 rounded hover:bg-white/[0.04]"
              aria-expanded={expanded}
            >
              {expanded ? 'סגור' : 'הרחב'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toast.dismiss(toastId); flushBatch(); }}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              aria-label="סגור"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {!expanded && (
          <p className="text-[12px] text-zinc-400 mt-1 truncate">
            {items[items.length - 1]?.title}
            {items.length > 1 && ` ועוד ${items.length - 1}`}
          </p>
        )}

        {expanded && (
          <div className="mt-2 flex flex-col gap-px max-h-[260px] overflow-y-auto">
            {items.map((item, i) => {
              const itemAccent = LEVEL_ACCENT[item.level] ?? LEVEL_ACCENT.info;
              return (
                <div
                  key={i}
                  className="flex items-start gap-2.5 px-2 py-2 rounded-md hover:bg-white/[0.03] transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-white/25 focus-visible:outline-none"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.code) {
                      window.dispatchEvent(new CustomEvent('toast-clicked', { detail: item }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && item.code) {
                      e.preventDefault();
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('toast-clicked', { detail: item }));
                    }
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: itemAccent }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-zinc-200 truncate block">{item.title}</span>
                    <span className="text-[10px] text-zinc-500 truncate block">{item.message}</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600 shrink-0 mt-0.5">{item.timestamp}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function flushBatch() {
  if (batchTimerId) { clearTimeout(batchTimerId); batchTimerId = null; }
  pendingBatch = [];
  notifyBatchListeners();
}

function ensureToastExists() {
  toast.custom(() => <LiveBatchedToast toastId={STABLE_TOAST_ID} />, {
    id: STABLE_TOAST_ID,
    duration: Infinity,
    position: "bottom-right",
  });
}

export const showTacticalNotification = (data: Omit<NotificationData, "id">) => {
  if (data.level === 'critical') {
    window.dispatchEvent(new Event('trigger-critical-alert'));
  } else if (data.level === 'suspect') {
    window.dispatchEvent(new Event('trigger-suspect-alert'));
  }

  const ts = new Date().toLocaleTimeString('he-IL', { hour12: false });
  pendingBatch.push({ ...data, timestamp: ts });

  ensureToastExists();
  notifyBatchListeners();

  if (batchTimerId) clearTimeout(batchTimerId);
  batchTimerId = setTimeout(() => {
    toast.dismiss(STABLE_TOAST_ID);
    flushBatch();
  }, BATCH_WINDOW_MS);
};

export const MOCK_NOTIFICATIONS: Omit<NotificationData, "id">[] = [
  { title: "זיהוי שיגור טילים", message: "מערכת מכ״ם זיהתה שיגור רב-קני מכיוון צפון-מזרח. נדרשת תגובה מיידית.", level: "critical", code: "ALERT-99" },
  { title: "חשד לזיהוי", message: "אות חלש במכ״ם. נדרש אימות ויזואלי מיידי.", level: "suspect", code: "SUSPECT-01" },
  { title: "פריצת אבטחה", message: "זוהתה כניסה לא מורשית למערכת השו״ב המרכזית. הפרוטוקול ננעל.", level: "critical", code: "SEC-01" },
  { title: "רחפן לא מזוהה", message: "רחפן חשוד נכנס למרחב האווירי המוגבל בגזרת החוף.", level: "high", code: "UAV-X" },
  { title: "חסימת תדרים", message: "זוהתה חסימת GPS חזקה באזור הפעולה. ייתכנו שיבושי מיקום.", level: "high", code: "JAM-04" },
  { title: "אובדן קשר עין", message: "המצלמה הראשית איבדה קשר עם המטרה עקב תנאי ראות קשים.", level: "medium", code: "VIS-LOST" },
  { title: "סוללה חלשה", message: "רחפן תצפית 4 מדווח על 15% סוללה. מומלץ להחזירו לבסיס.", level: "medium", code: "BAT-LOW" },
  { title: "מטרה חדשה", message: "מערכת Pixelsight איתרה אובייקט חדש במעקב. סיווג בתהליך.", level: "info", code: "TRG-NEW" },
  { title: "עדכון משימה", message: "פרמטרים חדשים למשימה התקבלו מהמפקדה. אנא אשר קבלה.", level: "info", code: "MSN-UPD" },
  { title: "מטרה נוטרלה", message: "אישור פגיעה במטרה. האיום הוסר בהצלחה. כל הכוחות שבו לבסיס.", level: "success", code: "TRG-CLR" },
  { title: "סנכרון הושלם", message: "כל הנתונים הטלמטריים גובו לשרת המרכזי בהצלחה.", level: "success", code: "SYNC-OK" },
];

const VIGNETTE_DURATION_MS = 4000;

export function NotificationSystem() {
  const [criticalActive, setCriticalActive] = useState(false);
  const [vignetteColor, setVignetteColor] = useState("#dc2626");
  const vignetteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const startVignette = (color: string) => {
      setVignetteColor(color);
      setCriticalActive(true);
      if (vignetteTimerRef.current) clearTimeout(vignetteTimerRef.current);
      vignetteTimerRef.current = setTimeout(() => setCriticalActive(false), VIGNETTE_DURATION_MS);
    };

    const handleCritical = () => startVignette('#dc2626');
    const handleSuspect = () => startVignette('#f59e0b');

    window.addEventListener('trigger-critical-alert', handleCritical);
    window.addEventListener('trigger-suspect-alert', handleSuspect);

    return () => {
      window.removeEventListener('trigger-critical-alert', handleCritical);
      window.removeEventListener('trigger-suspect-alert', handleSuspect);
      if (vignetteTimerRef.current) clearTimeout(vignetteTimerRef.current);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        className={`fixed inset-0 pointer-events-none z-40 transition-opacity duration-300 ease-in-out ${
          criticalActive ? 'visible' : 'invisible'
        }`}
        style={{
          opacity: criticalActive ? 0.4 : 0,
          boxShadow: `inset 0 0 40px 20px ${vignetteColor}`,
          animation: criticalActive ? 'notif-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
        }}
      />

      <style>{`
        @keyframes notif-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.2; }
        }
      `}</style>

      <Toaster
        theme="dark"
        expand
        visibleToasts={4}
        position="top-center"
        style={{ zIndex: 60 }}
      />
    </>
  );
}
