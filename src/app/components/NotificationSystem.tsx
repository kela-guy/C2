import React, { useState, useEffect, createContext, useContext } from "react";
import { Toaster, toast } from "sonner";
import { 
  AlertTriangle, 
  ShieldAlert, 
  Radio, 
  Target, 
  BatteryWarning, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  Database, 
  Info,
  X,
  Eye
} from "lucide-react";

// --- Types ---
type ThreatLevel = "critical" | "high" | "medium" | "info" | "success" | "suspect";

interface NotificationData {
  id: string;
  title: string;
  message: string;
  level: ThreatLevel;
  code?: string;
  timestamp?: string;
}

interface ToastConfig {
  borderRadius: number;
  borderWidth: number;
  bgOpacity: number;
  backdropBlur: number;
  showScanline: boolean;
  showGlow: boolean;
  showConnector: boolean;
  padding: number;
  gap: number;
  width: number;
  titleSize: number;
  messageSize: number;
  // Custom Colors
  useCustomColors: boolean;
  customBorderColor: string;
  customBgColor: string;
}

// --- Default Configuration ---
const DEFAULT_TOAST_CONFIG: ToastConfig = {
  borderRadius: 8,
  borderWidth: 1,
  bgOpacity: 0.1,
  backdropBlur: 12,
  showScanline: true,
  showGlow: true,
  showConnector: true,
  padding: 12,
  gap: 12,
  width: 356,
  titleSize: 14,
  messageSize: 12,
  useCustomColors: false,
  customBorderColor: "#333333",
  customBgColor: "#000000",
};

// --- Context ---
const ToastContext = createContext<ToastConfig>(DEFAULT_TOAST_CONFIG);

// --- Icons Map ---
const LEVEL_ICONS = {
  critical: ShieldAlert,
  suspect: Eye,
  high: AlertTriangle,
  medium: Radio,
  info: Info,
  success: CheckCircle2,
};

const LEVEL_STYLES = {
  critical: {
    border: "border-[#fa5252]",
    bgRaw: "250, 82, 82",
    text: "text-[#ff8787]",
    iconColor: "text-[#fa5252]",
    shadowColor: "rgba(250,82,82,0.15)"
  },
  suspect: {
    border: "border-[#f59e0b]",
    bgRaw: "245, 158, 11",
    text: "text-[#fbbf24]",
    iconColor: "text-[#f59e0b]",
    shadowColor: "rgba(245,158,11,0.15)"
  },
  high: {
    border: "border-[#fd7e14]",
    bgRaw: "253, 126, 20",
    text: "text-[#ffc078]",
    iconColor: "text-[#fd7e14]",
    shadowColor: "rgba(253,126,20,0.15)"
  },
  medium: {
    border: "border-[#fab005]",
    bgRaw: "250, 176, 5",
    text: "text-[#ffe066]",
    iconColor: "text-[#fab005]",
    shadowColor: "rgba(250,176,5,0.15)"
  },
  info: {
    border: "border-[#228be6]",
    bgRaw: "34, 139, 230",
    text: "text-[#74c0fc]",
    iconColor: "text-[#228be6]",
    shadowColor: "rgba(34,139,230,0.15)"
  },
  success: {
    border: "border-[#12b886]",
    bgRaw: "18, 184, 134",
    text: "text-[#63e6be]",
    iconColor: "text-[#12b886]",
    shadowColor: "rgba(18,184,134,0.15)"
  }
};

// --- Custom Toast Component ---
const TacticalToast = ({ data, t }: { data: NotificationData; t: string | number }) => {
  const styles = LEVEL_STYLES[data.level] || LEVEL_STYLES.info;
  const Icon = LEVEL_ICONS[data.level] || LEVEL_ICONS.info;
  const config = useContext(ToastContext);

  // Determine effective colors
  const borderColor = config.useCustomColors 
    ? config.customBorderColor 
    : styles.border.replace("border-[", "").replace("]", "");
    
  // For background, we need to handle the opacity. 
  // If custom, we use the hex + opacity style on the element.
  // If default, we use the rgba construction.
  const bgStyle = config.useCustomColors
    ? { backgroundColor: config.customBgColor, opacity: config.bgOpacity }
    : { backgroundColor: `rgba(${styles.bgRaw}, ${config.bgOpacity})` };

  return (
    <div 
      className={`
        relative overflow-hidden
        bg-[#141414]
        font-['Inter'] shadow-2xl
        transition-all duration-200
        cursor-pointer hover:ring-1 hover:ring-white/20
      `}
      onClick={() => {
          // Dispatch custom event for dashboard
          window.dispatchEvent(new CustomEvent('toast-clicked', { detail: data }));
      }}
      style={{
        width: `${config.width}px`,
        borderRadius: `${config.borderRadius}px`,
        borderWidth: `${config.borderWidth}px`,
        borderColor: borderColor,
        backdropFilter: `blur(${config.backdropBlur}px)`,
        boxShadow: config.showGlow ? `0 0 15px ${styles.shadowColor}` : 'none'
      }}
      dir="rtl"
    >
      {/* Background Gradient Mesh */}
      <div 
        className="absolute inset-0 transition-opacity duration-200" 
        style={bgStyle} 
      />
      
      {/* Scanline Effect */}
      {config.showScanline && (
        <div className="absolute inset-0 pointer-events-none z-0 opacity-5" 
             style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px)", backgroundSize: "100% 3px" }} 
        />
      )}

      <div 
        className="relative z-10 flex h-full"
        style={{ padding: `${config.padding}px`, gap: `${config.gap}px` }}
      >
        {/* Icon Column */}
        <div className={`flex flex-col items-center pt-1 ${styles.iconColor}`}>
           <div className={`p-2 rounded-md bg-white/5 border border-white/5`}>
             <Icon size={20} strokeWidth={2} />
           </div>
           {/* Vertical Connector Line */}
           {config.showConnector && (
             <div className={`w-[1px] h-full flex-1 my-2 bg-gradient-to-b from-current to-transparent opacity-30`} />
           )}
        </div>

        {/* Content Column */}
        <div className="flex-1 flex flex-col gap-1">
           {/* Header Row */}
           <div className="flex items-center justify-between">
              <h3 
                className={`font-bold tracking-wide ${styles.text}`}
                style={{ fontSize: `${config.titleSize}px` }}
              >
                 {data.title}
              </h3>
              <button 
                onClick={() => toast.dismiss(t)}
                className="text-[#555] hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
           </div>

           {/* Message Body */}
           <p 
             className="text-[#c1c2c5] leading-relaxed"
             style={{ fontSize: `${config.messageSize}px` }}
           >
             {data.message}
           </p>

           {/* Metadata Footer */}
           <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 {data.code && (
                   <span className="text-[10px] font-mono text-[#909296] bg-white/5 px-1.5 py-0.5 rounded">
                     {data.code}
                   </span>
                 )}
              </div>
              <span className="text-[10px] font-mono text-[#555]">
                 {data.timestamp || "NOW"}
              </span>
           </div>
        </div>
      </div>
      
      {/* Animated Left Border */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-[2px]" 
        style={{ backgroundColor: config.useCustomColors ? config.customBorderColor : `rgb(${styles.bgRaw})` }}
      />
    </div>
  );
};

// --- Batch state (module-level) ---
const BATCH_WINDOW_MS = 10_000;

const LEVEL_PRIORITY: Record<ThreatLevel, number> = {
  critical: 6, high: 5, suspect: 4, medium: 3, info: 2, success: 1,
};

let pendingBatch: (Omit<NotificationData, "id"> & { timestamp: string })[] = [];
let batchTimerId: ReturnType<typeof setTimeout> | null = null;
let batchToastId: string | number | null = null;
let batchTriggeredJamModal = false;

function highestLevel(items: { level: ThreatLevel }[]): ThreatLevel {
  let best: ThreatLevel = 'info';
  for (const item of items) {
    if (LEVEL_PRIORITY[item.level] > LEVEL_PRIORITY[best]) best = item.level;
  }
  return best;
}

function renderBatchedToast(items: typeof pendingBatch, toastId: string | number) {
  toast.custom(() => (
    <BatchedToast items={items} t={toastId} />
  ), {
    id: toastId,
    duration: Infinity,
    position: "bottom-right",
  });
}

// --- Batched Toast Component ---
const BatchedToast = ({ items, t }: { items: typeof pendingBatch; t: string | number }) => {
  const [expanded, setExpanded] = React.useState(false);
  const level = highestLevel(items);
  const styles = LEVEL_STYLES[level] || LEVEL_STYLES.info;
  const Icon = LEVEL_ICONS[level] || LEVEL_ICONS.info;

  return (
    <div
      className="relative overflow-hidden bg-[#141414] font-['Inter'] shadow-2xl transition-all duration-200"
      style={{
        width: '356px',
        borderRadius: '8px',
        borderWidth: '1px',
        borderColor: styles.border.replace("border-[", "").replace("]", ""),
        backdropFilter: 'blur(12px)',
        boxShadow: `0 0 15px ${styles.shadowColor}`,
      }}
      dir="rtl"
    >
      <div className="absolute inset-0 transition-opacity duration-200" style={{ backgroundColor: `rgba(${styles.bgRaw}, 0.1)` }} />
      <div className="absolute inset-0 pointer-events-none z-0 opacity-5" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px)", backgroundSize: "100% 3px" }} />

      <div className="relative z-10 p-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md bg-white/5 border border-white/5 ${styles.iconColor}`}>
              <Icon size={16} strokeWidth={2} />
            </div>
            <div>
              <span className={`text-[13px] font-bold ${styles.text}`}>
                {items.length} התראות חדשות
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="text-[10px] text-zinc-500 hover:text-white transition-colors px-1.5 py-0.5 rounded bg-white/5"
            >
              {expanded ? 'סגור' : 'הרחב'}
            </button>
            <button onClick={() => toast.dismiss(t)} className="text-[#555] hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Summary row when collapsed */}
        {!expanded && (
          <p className="text-[11px] text-[#c1c2c5] mt-1.5 truncate">
            {items[items.length - 1]?.title} {items.length > 1 ? `ועוד ${items.length - 1}` : ''}
          </p>
        )}

        {/* Expanded list */}
        {expanded && (
          <div className="mt-2 flex flex-col gap-1 max-h-[260px] overflow-y-auto">
            {items.map((item, i) => {
              const s = LEVEL_STYLES[item.level] || LEVEL_STYLES.info;
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.05] transition-colors"
                  onClick={() => {
                    if (item.code) {
                      window.dispatchEvent(new CustomEvent('toast-clicked', { detail: item }));
                    }
                  }}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0`} style={{ backgroundColor: `rgb(${s.bgRaw})` }} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] font-semibold ${s.text} truncate`}>{item.title}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{item.message}</div>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600 shrink-0">{item.timestamp}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: `rgb(${styles.bgRaw})` }} />
    </div>
  );
};

function flushBatch() {
  if (batchTimerId) { clearTimeout(batchTimerId); batchTimerId = null; }
  pendingBatch = [];
  batchToastId = null;
  batchTriggeredJamModal = false;
}

// --- Helper to trigger ---
export const showTacticalNotification = (data: Omit<NotificationData, "id">) => {
  if (data.level === 'critical') {
    window.dispatchEvent(new Event('trigger-critical-alert'));
  } else if (data.level === 'suspect') {
    window.dispatchEvent(new Event('trigger-suspect-alert'));
  }

  const ts = new Date().toLocaleTimeString('he-IL', { hour12: false });
  const item = { ...data, timestamp: ts };

  if (pendingBatch.length === 0) {
    // First notification — show it as a normal toast, start the batch window
    const id = toast.custom((t) => (
      <TacticalToast data={{ ...data, id: t.toString(), timestamp: ts }} t={t} />
    ), { duration: 5000, position: "bottom-right" });

    batchToastId = id;
    pendingBatch.push(item);

    batchTimerId = setTimeout(() => {
      flushBatch();
    }, BATCH_WINDOW_MS);
  } else {
    pendingBatch.push(item);

    // Dismiss single toast and replace with batched view
    if (batchToastId !== null) {
      toast.dismiss(batchToastId);
    }
    const groupId = `batch-${Date.now()}`;
    batchToastId = groupId;
    renderBatchedToast([...pendingBatch], groupId);

    // Emit event for jam-all modal if threshold reached
    if (pendingBatch.length >= 10 && !batchTriggeredJamModal) {
      batchTriggeredJamModal = true;
      window.dispatchEvent(new CustomEvent('detection-burst', { detail: { count: pendingBatch.length } }));
    }

    // Reset the timer to extend the window from last notification
    if (batchTimerId) clearTimeout(batchTimerId);
    batchTimerId = setTimeout(() => {
      flushBatch();
    }, BATCH_WINDOW_MS);
  }
};

// --- Mock Data ---
export const MOCK_NOTIFICATIONS: Omit<NotificationData, "id">[] = [
  {
    title: "זיהוי שיגור טילים",
    message: "מערכת מכ״ם זיהתה שיגור רב-קני מכיוון צפון-מזרח. נדרשת תגובה מיידית.",
    level: "critical",
    code: "ALERT-99"
  },
  {
    title: "חשד לזיהוי",
    message: "אות חלש במכ״ם. נדרש אימות ויזואלי מיידי.",
    level: "suspect",
    code: "SUSPECT-01"
  },
  {
    title: "פריצת אבטחה",
    message: "זוהתה כניסה לא מורשית למערכת השו״ב המרכזית. הפרוטוקול ננעל.",
    level: "critical",
    code: "SEC-01"
  },
  {
    title: "רחפן לא מזוהה",
    message: "רחפן חשוד נכנס למרחב האווירי המוגבל בגזרת החוף.",
    level: "high",
    code: "UAV-X"
  },
  {
    title: "חסימת תדרים",
    message: "זוהתה חסימת GPS חזקה באזור הפעולה. ייתכנו שיבושי מיקום.",
    level: "high",
    code: "JAM-04"
  },
  {
    title: "אובדן קשר עין",
    message: "המצלמה הראשית איבדה קשר עם המטרה עקב תנאי ראות קשים.",
    level: "medium",
    code: "VIS-LOST"
  },
  {
    title: "סוללה חלשה",
    message: "רחפן תצפית 4 מדווח על 15% סוללה. מומלץ להחזירו לבסיס.",
    level: "medium",
    code: "BAT-LOW"
  },
  {
    title: "מטרה חדשה",
    message: "מערכת Pixelsight איתרה אובייקט חדש במעקב. סיווג בתהליך.",
    level: "info",
    code: "TRG-NEW"
  },
  {
    title: "עדכון משימה",
    message: "פרמטרים חדשים למשימה התקבלו מהמפקדה. אנא אשר קבלה.",
    level: "info",
    code: "MSN-UPD"
  },
  {
    title: "מטרה נוטרלה",
    message: "אישור פגיעה במטרה. האיום הוסר בהצלחה. כל הכוחות שבו לבסיס.",
    level: "success",
    code: "TRG-CLR"
  },
  {
    title: "סנכרון הושלם",
    message: "כל הנתונים הטלמטריים גובו לשרת המרכזי בהצלחה.",
    level: "success",
    code: "SYNC-OK"
  }
];

// --- Demo Component ---
export function NotificationSystem() {
  const [criticalActive, setCriticalActive] = useState(false);
  
  // Vignette Configuration State
  const [vignetteConfig, setVignetteConfig] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('vignette_config') : null;
    return saved ? JSON.parse(saved) : {
      color: "#dc2626",
      opacity: 0.4,
      blur: 40,
      spread: 20,
      speed: 2,
      alwaysVisible: false
    };
  });

  // Toast Configuration State
  const [toastConfig, setToastConfig] = useState<ToastConfig>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('toast_config') : null;
    return saved ? JSON.parse(saved) : DEFAULT_TOAST_CONFIG;
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('vignette_config', JSON.stringify(vignetteConfig));
  }, [vignetteConfig]);

  useEffect(() => {
    localStorage.setItem('toast_config', JSON.stringify(toastConfig));
  }, [toastConfig]);

  // Critical Alert Listener
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleCritical = () => {
      setVignetteConfig(prev => ({ ...prev, color: '#dc2626' }));
      setCriticalActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setCriticalActive(false);
      }, 5000);
    };

    const handleSuspect = () => {
      setVignetteConfig(prev => ({ ...prev, color: '#f59e0b' }));
      setCriticalActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setCriticalActive(false);
      }, 5000);
    };

    window.addEventListener('trigger-critical-alert', handleCritical);
    window.addEventListener('trigger-suspect-alert', handleSuspect);
    
    return () => {
      window.removeEventListener('trigger-critical-alert', handleCritical);
      window.removeEventListener('trigger-suspect-alert', handleSuspect);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={toastConfig}>
      {/* Critical Alert Overlay */}
      <div 
        className={`fixed inset-0 pointer-events-none z-40 transition-opacity duration-300 ease-in-out ${
           criticalActive ? 'visible' : 'invisible'
        }`}
        style={{
          opacity: criticalActive ? vignetteConfig.opacity : 0,
          boxShadow: `inset 0 0 ${vignetteConfig.blur}px ${vignetteConfig.spread}px ${vignetteConfig.color}`,
          animation: criticalActive ? `pulse ${vignetteConfig.speed}s cubic-bezier(0.4, 0, 0.6, 1) infinite` : 'none'
        }}
      />
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: ${vignetteConfig.opacity}; }
          50% { opacity: ${(vignetteConfig.opacity * 0.5).toFixed(2)}; }
        }
      `}</style>

      <Toaster 
         expand={false} 
         visibleToasts={6}
         style={{ zIndex: 60, pointerEvents: 'none' }}
         toastOptions={{
            style: { pointerEvents: 'auto' }
         }}
      />
      
    </ToastContext.Provider>
  );
}
