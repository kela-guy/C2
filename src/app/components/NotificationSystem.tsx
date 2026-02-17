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
  Settings,
  Minimize2,
  Maximize2,
  Edit3,
  Palette,
  Layout,
  Type,
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
  const styles = LEVEL_STYLES[data.level];
  const Icon = LEVEL_ICONS[data.level];
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

// --- Helper to trigger ---
export const showTacticalNotification = (data: Omit<NotificationData, "id">) => {
  // Dispatch critical alert event if needed
  if (data.level === 'critical') {
    window.dispatchEvent(new Event('trigger-critical-alert'));
  } else if (data.level === 'suspect') {
    window.dispatchEvent(new Event('trigger-suspect-alert'));
  }

  toast.custom((t) => (
    <TacticalToast 
       data={{ 
         ...data, 
         id: t.toString(),
         timestamp: new Date().toLocaleTimeString('he-IL', { hour12: false }) 
       }} 
       t={t} 
    />
  ), {
    duration: 5000,
    position: "bottom-right",
  });
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

// --- Config Control Components ---
const RangeControl = ({ label, value, min, max, step, onChange, unit = "" }: any) => (
  <div className="flex flex-col gap-1 mb-2">
    <div className="flex justify-between">
      <label className="text-[10px] text-[#909296]">{label}</label>
      <span className="text-[10px] font-mono text-white">{value}{unit}</span>
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-white"
    />
  </div>
);

const ToggleControl = ({ label, checked, onChange }: any) => (
  <div className="flex items-center justify-between mb-2">
      <label className="text-[10px] text-[#909296]">{label}</label>
      <input 
        type="checkbox" 
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-blue-500"
      />
  </div>
);

// --- Demo Component ---
export function NotificationSystem() {
  const [criticalActive, setCriticalActive] = useState(false);
  const [showDebug, setShowDebug] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'vignette' | 'toasts'>('toasts');
  
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
           (criticalActive || (vignetteConfig.alwaysVisible && showDebug && activeTab === 'vignette')) ? 'visible' : 'invisible'
        }`}
        style={{
          opacity: (criticalActive || (vignetteConfig.alwaysVisible && showDebug && activeTab === 'vignette')) ? vignetteConfig.opacity : 0,
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
      
      {/* Floating Toggle Button */}
      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed top-4 left-4 z-50 p-2 bg-[#111] border border-[#333] text-white rounded-lg shadow-lg hover:bg-[#222] transition-colors"
          title="Open Debug Console"
        >
          <Settings size={20} />
        </button>
      )}

      {/* Controls Container */}
      {!isMinimized && (
        <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 max-h-[90vh] overflow-y-auto pb-4 transition-all animate-in fade-in slide-in-from-left-4 duration-300 scrollbar-hide">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between p-2 bg-[#111] border border-[#333] rounded-lg shadow-lg w-[240px]">
             <div className="flex items-center gap-2">
               <Settings size={14} className="text-[#909296]" />
               <span className="text-xs font-bold text-white uppercase tracking-wide">System Config</span>
             </div>
             <button 
               onClick={() => setIsMinimized(true)}
               className="text-[#909296] hover:text-white transition-colors"
             >
               <Minimize2 size={14} />
             </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-[#111] border border-[#333] rounded-lg w-[240px]">
             <button 
                onClick={() => setActiveTab('toasts')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'toasts' ? 'bg-[#333] text-white shadow' : 'text-[#909296] hover:text-white'}`}
             >
                <Layout size={12} />
                Toasts
             </button>
             <button 
                onClick={() => setActiveTab('vignette')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'vignette' ? 'bg-[#333] text-white shadow' : 'text-[#909296] hover:text-white'}`}
             >
                <Target size={12} />
                Vignette
             </button>
          </div>

          {/* Configuration Panel */}
          <div className="p-3 bg-[#111]/95 backdrop-blur border border-[#333] rounded-lg shadow-2xl w-[240px] flex flex-col gap-2">
             
             {/* Toasts Config */}
             {activeTab === 'toasts' && (
                <>
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-2">
                     <Palette size={12} className="text-blue-400" />
                     <span className="text-xs font-bold text-white">עיצוב התראות</span>
                     <button 
                        onClick={() => setToastConfig(DEFAULT_TOAST_CONFIG)} 
                        className="mr-auto text-[9px] text-blue-400 hover:underline"
                     >
                        איפוס
                     </button>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <span className="text-[10px] text-[#555] font-bold uppercase mb-2 block">צבעים מותאמים אישית</span>
                        <ToggleControl label="הפעל צבעים מותאמים" checked={toastConfig.useCustomColors} onChange={(v: boolean) => setToastConfig(prev => ({ ...prev, useCustomColors: v }))} />
                        
                        {toastConfig.useCustomColors && (
                           <>
                              <div className="flex flex-col gap-1 mb-2">
                                 <label className="text-[10px] text-[#909296]">צבע גבול (Border)</label>
                                 <input 
                                    type="color" 
                                    value={toastConfig.customBorderColor}
                                    onChange={(e) => setToastConfig(prev => ({ ...prev, customBorderColor: e.target.value }))}
                                    className="w-full h-6 bg-transparent border border-[#333] rounded cursor-pointer"
                                 />
                              </div>
                              <div className="flex flex-col gap-1 mb-2">
                                 <label className="text-[10px] text-[#909296]">צבע רקע (Background)</label>
                                 <input 
                                    type="color" 
                                    value={toastConfig.customBgColor}
                                    onChange={(e) => setToastConfig(prev => ({ ...prev, customBgColor: e.target.value }))}
                                    className="w-full h-6 bg-transparent border border-[#333] rounded cursor-pointer"
                                 />
                              </div>
                           </>
                        )}
                     </div>

                     <div>
                        <span className="text-[10px] text-[#555] font-bold uppercase mb-2 block">סגנון</span>
                        <RangeControl label="עגלול פינות" value={toastConfig.borderRadius} min={0} max={24} step={1} onChange={(v: number) => setToastConfig(prev => ({ ...prev, borderRadius: v }))} unit="px" />
                        <RangeControl label="עובי מסגרת" value={toastConfig.borderWidth} min={0} max={4} step={1} onChange={(v: number) => setToastConfig(prev => ({ ...prev, borderWidth: v }))} unit="px" />
                        <RangeControl label="שקיפות רקע" value={toastConfig.bgOpacity} min={0} max={1} step={0.05} onChange={(v: number) => setToastConfig(prev => ({ ...prev, bgOpacity: v }))} />
                        <RangeControl label="טשטוש רקע" value={toastConfig.backdropBlur} min={0} max={40} step={1} onChange={(v: number) => setToastConfig(prev => ({ ...prev, backdropBlur: v }))} unit="px" />
                     </div>
                  </div>
                </>
             )}

             {/* Vignette Config */}
             {activeTab === 'vignette' && (
                <>
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-2">
                     <Target size={12} className="text-red-400" />
                     <span className="text-xs font-bold text-white">הגדרות ויגנט</span>
                  </div>
                  
                  <div className="space-y-4">
                      {/* Always Visible Toggle */}
                      <ToggleControl label="תצוגה מקדימה" checked={vignetteConfig.alwaysVisible} onChange={(v: boolean) => setVignetteConfig(prev => ({ ...prev, alwaysVisible: v }))} />

                      <div>
                          <label className="text-[10px] text-[#909296] mb-1 block">צבע</label>
                          <input 
                              type="color" 
                              value={vignetteConfig.color}
                              onChange={(e) => setVignetteConfig(prev => ({ ...prev, color: e.target.value }))}
                              className="w-full h-6 bg-transparent border border-[#333] rounded cursor-pointer"
                          />
                      </div>

                      <RangeControl label="שקיפות" value={vignetteConfig.opacity} min={0} max={1} step={0.1} onChange={(v: number) => setVignetteConfig(prev => ({ ...prev, opacity: v }))} />
                      <RangeControl label="טשטוש" value={vignetteConfig.blur} min={0} max={500} step={10} onChange={(v: number) => setVignetteConfig(prev => ({ ...prev, blur: v }))} unit="px" />
                      <RangeControl label="פיזור" value={vignetteConfig.spread} min={0} max={500} step={10} onChange={(v: number) => setVignetteConfig(prev => ({ ...prev, spread: v }))} unit="px" />
                      <RangeControl label="מהירות הבהוב" value={vignetteConfig.speed} min={0.2} max={5} step={0.1} onChange={(v: number) => setVignetteConfig(prev => ({ ...prev, speed: v }))} unit="s" />
                  </div>
                </>
             )}

          </div>

          {/* Trigger Panel (Always Visible) */}
          <div className="p-3 bg-[#111] border border-[#333] rounded-lg shadow-2xl w-[240px] flex flex-col gap-2">
            <h4 className="text-white text-xs font-bold mb-1 uppercase tracking-wider text-center">בדיקת התראות</h4>
            <div className="grid grid-cols-2 gap-2">
                {MOCK_NOTIFICATIONS.map((notif, idx) => (
                  <button
                    key={idx}
                    onClick={() => showTacticalNotification(notif)}
                    className={`
                      text-[9px] py-1.5 px-1 rounded text-center transition-all font-mono truncate
                      ${notif.level === 'critical' ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/30' : ''}
                      ${notif.level === 'suspect' ? 'bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 border border-amber-900/30' : ''}
                      ${notif.level === 'high' ? 'bg-orange-900/20 text-orange-400 hover:bg-orange-900/40 border border-orange-900/30' : ''}
                      ${notif.level === 'medium' ? 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/40 border border-yellow-900/30' : ''}
                      ${notif.level === 'info' ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 border border-blue-900/30' : ''}
                      ${notif.level === 'success' ? 'bg-green-900/20 text-green-400 hover:bg-green-900/40 border border-green-900/30' : ''}
                    `}
                    title={notif.title}
                  >
                    {notif.code || notif.title}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
