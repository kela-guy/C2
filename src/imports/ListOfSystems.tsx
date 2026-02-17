import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Satellite,
  Radio,
  Zap,
  TriangleAlert,
  MapPin,
  Maximize2,
  Eye,
  EyeOff,
  Activity,
  X,
  Target,
  Scan,
  Ruler,
  VideoOff,
  Signal,
  Check,
  Loader2,
  Circle,
  Play,
  ArrowRight,
  Crosshair,
  Ban,
  Plane,
  Rocket,
  Ship,
  Filter,
  ShieldAlert,
  AlertTriangle,
  History,
  CheckCircle2,
  ListTodo,
  Clock
} from "lucide-react";
import imgBackImage from "figma:asset/66ccf516497c539c4117e5bbcf6e3cad11d2e3ed.png";

// --- Types ---

export type TargetType = 'uav' | 'missile' | 'aircraft' | 'naval' | 'unknown';

export interface TargetSystem {
  id: string;
  name: string;
  type: TargetType;
  status: 'active' | 'tracking' | 'engaged' | 'neutralized' | 'suspect' | 'expired' | 'success';
  missionStatus?: 'idle' | 'planning' | 'executing' | 'waiting_confirmation' | 'complete' | 'aborted';
  /** Drives whether timeline advances by timer (intercept/surveillance) or by map events (attack), or jamming (user ends mission). */
  missionType?: 'intercept' | 'surveillance' | 'attack' | 'jamming';
  timestamp: string;
  coordinates: string;
  distance: string;
  isNew?: boolean;
  missionSteps?: string[];
  missionProgress?: number;
  // Sensors / assets that detected this target (filled by simulation logic)
  detectedBySensors?: {
    id: string;
    typeLabel: string;
    latitude: number;
    longitude: number;
  }[];
  dismissReason?: string;
}

/** Mock options shown when user dismisses a target (must pick a reason). */
export const DISMISS_REASONS = [
  "לא רלוונטי",
  "תרגיל",
  "זיהוי שגוי",
  "אחר",
] as const;

export const MOCK_TARGETS: TargetSystem[] = [
  {
    id: "TGT-001",
    name: "מטרה #12",
    type: "uav",
    status: "active",
    timestamp: "10:24:59",
    coordinates: "31.47293, 34.89127",
    distance: "234 מטר",
    isNew: true
  },
  {
    id: "TGT-002",
    name: "איום בליסטי A-4",
    type: "missile",
    status: "tracking",
    timestamp: "10:24:52",
    coordinates: "32.11220, 34.55112",
    distance: "12 ק״מ",
    isNew: true
  },
  {
    id: "TGT-003",
    name: "זיהוי לא ידוע",
    type: "unknown",
    status: "tracking",
    timestamp: "10:07:31",
    coordinates: "33.55112, 35.11220",
    distance: "45 ק״מ"
  },
  {
    id: "TGT-004",
    name: "כלי שיט עוין",
    type: "naval",
    status: "engaged",
    timestamp: "09:45:10",
    coordinates: "31.99211, 34.11220",
    distance: "8 מייל ימי"
  },
  {
    id: "TGT-005",
    name: "מטוס קרב (ידידותי)",
    type: "aircraft",
    status: "tracking",
    timestamp: "09:30:00",
    coordinates: "32.55112, 35.55112",
    distance: "120 ק״מ"
  }
];

// --- Reusable Components ---

function StatusChip({ label, color = "green", className = "" }: { label: string; color?: "green" | "gray" | "red" | "orange"; className?: string }) {
  let bg = "bg-[rgba(255,255,255,0.15)]";
  let text = "text-white";

  if (color === "green") {
    bg = "bg-[rgba(18,184,134,0.15)]";
    text = "text-[#12b886]";
  } else if (color === "red") {
    bg = "bg-[rgba(250,82,82,0.15)]";
    text = "text-[#fa5252]";
  } else if (color === "orange") {
    bg = "bg-[rgba(253,126,20,0.15)]";
    text = "text-[#fd7e14]";
  }

  return (
    <div className={`${bg} flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium ${text} ${className}`}>
      {label}
    </div>
  );
}

const DroneIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M23.334 15.7502L9.33696 0.583495L5.86139 4.0835L10.5007 11.0835L9.32456 15.7502L10.5007 20.4168L5.86139 27.4168L9.32456 30.6801L23.334 15.7502Z" fill="white"/>
    <path d="M23.5479 15.5522C23.6516 15.6646 23.6514 15.8382 23.5469 15.9497L9.53711 30.8794C9.48421 30.9358 9.41124 30.9687 9.33398 30.9712C9.2566 30.9736 9.18137 30.9452 9.125 30.8921L5.66113 27.6294C5.55779 27.532 5.53972 27.3737 5.61816 27.2554L10.1865 20.3628L9.04199 15.8218C9.03022 15.7751 9.03026 15.7259 9.04199 15.6792L10.1865 11.1362L5.61817 4.24463C5.54184 4.12942 5.55708 3.97659 5.6543 3.87842L9.12988 0.378417C9.18594 0.321963 9.26323 0.290048 9.34277 0.291503C9.42215 0.293084 9.49791 0.326905 9.55176 0.385253L23.5479 15.5522Z" stroke="black" strokeOpacity="0.8" strokeWidth="0.583333" strokeLinejoin="round"/>
  </svg>
);

function ActionButton({ 
  label, 
  icon: Icon, 
  onClick, 
  variant = "primary",
  className = "" 
}: { 
  label: string; 
  icon?: React.ElementType; 
  onClick?: (e: React.MouseEvent) => void;
  variant?: "primary" | "secondary" | "ghost" | "glass" | "danger";
  className?: string;
}) {
  if (variant === "ghost") {
    return (
      <button 
        onClick={onClick}
        className={`w-full h-8 flex items-center justify-center text-sm text-[#909296] hover:text-white transition-colors active:scale-95 font-['Inter'] ${className}`}
      >
        {label}
      </button>
    );
  }

  if (variant === "glass") {
    return (
      <button 
        onClick={onClick}
        className={`flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded h-8 flex items-center justify-center gap-2 transition-all active:scale-95 ${className}`}
      >
        <span className="text-xs font-medium font-['Inter']">{label}</span>
        {Icon && <Icon size={14} />}
      </button>
    );
  }

  if (variant === "danger") {
    return (
      <button 
        onClick={onClick}
      className={`w-[160px] bg-[rgba(250,82,82,0.15)] hover:bg-[rgba(250,82,82,0.25)] border border-[#fa5252] text-[#ff8787] rounded h-9 flex items-center justify-center gap-2 transition-all active:scale-95 ${className}`}
      >
        <span className="text-sm font-semibold font-['Inter']">{label}</span>
        {Icon && <Icon size={16} />}
      </button>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={`w-[160px] bg-[rgba(34,139,230,0.15)] hover:bg-[rgba(34,139,230,0.25)] border border-[#74c0fc] text-[#74c0fc] rounded h-9 flex items-center justify-center gap-2 transition-all active:scale-95 ${className}`}
    >
      <span className="text-xs font-medium font-['Inter']">{label}</span>
      {Icon && <Icon size={14} />}
    </button>
  );
}

function AccordionSection({
  title,
  children,
  defaultOpen = false,
  className = "",
  headerAction = null,
  icon: HeaderIcon = null
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerAction?: React.ReactNode;
  icon?: React.ElementType | null;
}) {
  const [isOpen, setOpen] = useState(defaultOpen);

  return (
    <div className={`border-b border-[#333] last:border-0 ${className}`}>
      <div 
        className="flex w-full items-center justify-between p-[8px] cursor-pointer hover:bg-white/5 transition-colors rounded-sm"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('button')) {
             setOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center gap-2">
           <button
             onClick={() => setOpen(!isOpen)}
             className="text-[#909296] hover:text-[#c9c9c9] transition-colors"
           >
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={16} />
              </motion.div>
           </button>
           {headerAction}
        </div>

        <button 
           onClick={() => setOpen(!isOpen)}
           className="flex items-center gap-2 text-sm font-semibold text-[#c9c9c9] font-['Inter'] hover:text-white transition-colors"
        >
          {title}
          {HeaderIcon && <HeaderIcon size={14} className="text-[#909296]" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-[rgba(255,255,255,0.05)] px-[8px] py-[0px]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TelemetryRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-white font-mono">{value}</span>
      <div className="flex items-center gap-2">
          <span className="text-sm text-[#909296] font-['Inter']">{label}</span>
          {Icon && <Icon size={14} className="text-[#555]" />}
      </div>
    </div>
  );
}

// --- Collapsible Group Component ---

function CollapsibleGroup({ 
  title, 
  count, 
  children, 
  icon: Icon,
  defaultOpen = false,
  className = ""
}: { 
  title: string; 
  count: number; 
  children: React.ReactNode; 
  icon: React.ElementType;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`mb-3 ${className}`} dir="rtl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-1 py-2 rounded-md hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={14} className="text-zinc-500 shrink-0" />
          <span className="text-xs text-zinc-300 font-semibold truncate text-balance">
            {title}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
            {count}
          </span>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-zinc-500 shrink-0"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-2 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Card Container Component ---

function SystemCard({ 
  target,
  children,
  isOpen,
  onToggle,
}: { 
  target: TargetSystem;
  children?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  
  const getIcon = () => {
    switch(target.type) {
      case 'uav': return Plane;
      case 'missile': return Rocket;
      case 'naval': return Ship;
      case 'aircraft': return Plane;
      default: return Target;
    }
  };

  const Icon = getIcon();

  return (
    <div 
        className={`w-full bg-[#1A1A1A] text-white rounded-lg shadow-xl border font-['Inter'] p-[0px] overflow-hidden mb-2 transition-colors
        ${target.status === 'active' || target.status === 'engaged' ? 'border-red-500/30' : 'border-[#333]'}
        ${target.status === 'suspect' ? 'border-amber-500/30' : ''}
        ${target.status === 'success' || target.status === 'neutralized' ? 'border-green-500/30 opacity-75' : ''}
        ${isOpen ? 'ring-1 ring-white/10' : ''}
        `}
        dir="ltr"
    >
      {/* Main Card Header */}
      <div 
        className={`flex justify-between items-center mb-0 p-[8px] transition-colors rounded-t-lg relative z-20 cursor-pointer hover:bg-white/5
        ${isOpen ? 'bg-white/5' : ''}`}
        onClick={onToggle}
      >
        <div className="flex gap-2 items-center">
             <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-[#909296]"
             >
                <ChevronDown size={20} />
             </motion.div>

           {target.status === 'active' && <StatusChip label="פעיל" color="red" />}
           {target.status === 'tracking' && <StatusChip label="מעקב" color="orange" />}
           {target.status === 'engaged' && <StatusChip label="בטיפול" color="green" />}
           {target.status === 'suspect' && <StatusChip label="חשוד" color="orange" />}
           {(target.status === 'neutralized' || target.status === 'success') && <StatusChip label="נוטרל" color="green" />}
           {target.status === 'expired' && <StatusChip label="פג תוקף" color="gray" />}
           
        </div>
        <div className="flex items-center gap-2 text-right">
            <div className="flex flex-col items-end">
                <h2 className="text-sm font-semibold text-[#dee2e6] font-['Inter']">
                {target.name}
                </h2>
                <span className="text-[10px] text-[#666] font-mono">{target.id}</span>
            </div>
            <div className={`w-8 h-8 rounded flex items-center justify-center text-gray-400
                ${target.status === 'active' || target.status === 'engaged' ? 'bg-red-500/20 text-red-400' : 'bg-[#333]'}
            `}>
                <Icon size={16} />
            </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col border-t border-[#333] bg-[#141414]">
               {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Content Components ---

function MissionTimeline({ 
    steps, 
    progress, 
    onCancel,
    onComplete
}: { 
    steps: string[], 
    progress: number, 
    onCancel: () => void,
    onComplete: () => void
}) {
    // Check if we are waiting for confirmation (progress >= steps.length)
    const isWaitingConfirmation = progress >= steps.length;
    const isCompleted = false; // We use parent state really, but here for display

    return (
        <div className="flex flex-col gap-2 p-3 bg-black/40 border-t border-white/5 relative" dir="rtl">
            <h3 className="text-xs font-bold text-blue-400 font-mono mb-1 flex items-center gap-2">
                <Loader2 size={12} className={`animate-spin ${isWaitingConfirmation ? 'opacity-0' : ''}`} />
                מתכנן משימה
            </h3>
            
            <div className="flex flex-col gap-2 pr-1 border-r border-white/10 mr-1">
                {steps.map((step, idx) => {
                    const isActive = idx === progress;
                    const isStepCompleted = idx < progress;
                    
                    return (
                        <div key={idx} className={`flex items-center gap-2 text-xs font-mono transition-all duration-300
                            ${isActive ? 'text-white' : isStepCompleted ? 'text-green-400/70' : 'text-white/20'}
                        `}>
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                                ${isActive ? 'bg-blue-500 animate-pulse' : isStepCompleted ? 'bg-green-500' : 'bg-[#333]'}
                            `} />
                            <span>{step}</span>
                            {isActive && <span className="inline-block w-1 h-3 bg-blue-500 animate-blink mr-1" />}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex justify-between items-center pt-2 border-t border-white/5">
                <button 
                    onClick={(e) => { e.stopPropagation(); onCancel(); }}
                    className="flex items-center gap-1.5 px-2 py-1 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 text-[10px] rounded transition-colors"
                >
                    <X size={12} />
                    ביטול משימה
                </button>

                {isWaitingConfirmation && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onComplete(); }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-green-900/20 hover:bg-green-900/40 border border-green-500/30 text-green-400 text-[10px] font-bold rounded transition-colors animate-pulse"
                    >
                        <Check size={12} />
                        סיום משימה
                    </button>
                )}
            </div>
        </div>
    );
}

function ExpandedTargetDetails({ 
    target, 
    onVerify, 
    onEngage,
    onDismiss,
    onCancelMission,
    onCompleteMission,
    getClosestAssets,
    onSensorHover,
}: { 
    target: TargetSystem, 
    onVerify?: (action: 'intercept' | 'surveillance') => void,
    onEngage?: (type: 'jamming' | 'attack') => void,
    onDismiss?: (reason?: string) => void,
    onCancelMission?: () => void,
    onCompleteMission?: () => void,
    getClosestAssets?: (target: TargetSystem) => Array<{ id: string; typeLabel: string; actionLabel: string; distanceM: number }>,
    onSensorHover?: (sensorId: string | null) => void,
    onAvailableAssetHover?: (assetId: string | null) => void,
}) {
  const [dismissDropdownOpen, setDismissDropdownOpen] = useState(false);
  const dismissTriggerRef = useRef<HTMLDivElement>(null);
  const [dismissDropdownRect, setDismissDropdownRect] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!dismissDropdownOpen) {
      setDismissDropdownRect(null);
      return;
    }
    const el = dismissTriggerRef.current;
    if (!el) return;
    const updateRect = () => {
      const rect = el.getBoundingClientRect();
      setDismissDropdownRect({ top: rect.bottom + 4, left: rect.right - 140 });
    };
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [dismissDropdownOpen]);

  const isCritical = target.status === 'active' || target.status === 'engaged';
  const isSuspect = target.status === 'suspect';
  const isMissionActive = target.missionStatus === 'planning' || target.missionStatus === 'executing' || target.missionStatus === 'waiting_confirmation';
  const isExpired = target.status === 'expired';
  const isSuccess = target.status === 'success' || target.status === 'neutralized';

  const imageUrl = isSuspect 
    ? "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?auto=format&fit=crop&q=80&w=200&h=200"
    : "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=200&h=200";

  return (
    <>
      <AccordionSection title="זיהוי ויזואלי" defaultOpen={true} icon={Eye}>
          <div className="relative w-full h-[140px] rounded-lg overflow-hidden border border-[#333] group bg-black/40">
            <img
              src={imageUrl}
              alt="Target"
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity mix-blend-screen grayscale contrast-125"
            />
            
            {/* Overlay Grid */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIwLjEiLz4KPC9zdmc+')] pointer-events-none" />
            
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex justify-between items-end">
               <div className="flex gap-1">
                 {isCritical && <ShieldAlert size={14} className="text-red-500 animate-pulse" />}
                 {isSuspect && <AlertTriangle size={14} className="text-amber-500 animate-pulse" />}
               </div>
            </div>
          </div>
      </AccordionSection>

      <AccordionSection title="נתונים טלמטריים" defaultOpen={true} icon={Activity}>
          <div className="flex flex-col gap-1 p-[0px]">
              <TelemetryRow label="מיקום" value={target.coordinates} icon={MapPin} />
              <TelemetryRow label="מרחק" value={target.distance} icon={Ruler} />
              <TelemetryRow label="זמן זיהוי" value={target.timestamp} icon={Scan} />
          </div>
      </AccordionSection>

      {/* Detected By Sensors */}
      {target.detectedBySensors && target.detectedBySensors.length > 0 && (
        <AccordionSection title="חיישנים שזיהו" defaultOpen={true} icon={Signal}>
          <div className="flex flex-col gap-1 p-[4px]" dir="rtl">
            {target.detectedBySensors.map(sensor => (
              <div
                key={sensor.id}
                className="flex items-center justify-between text-[11px] text-gray-300 bg-black/30 border border-white/10 rounded px-2 py-1 cursor-pointer hover:bg-white/10 hover:border-cyan-500/30 transition-colors"
                onMouseEnter={() => onSensorHover?.(sensor.id)}
                onMouseLeave={() => onSensorHover?.(null)}
              >
                <span className="font-mono text-[10px] text-gray-500">{sensor.id}</span>
                <span className="font-['Inter'] text-xs">{sensor.typeLabel}</span>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Closest assets to handle detection (mock actions) */}
      {getClosestAssets && target.coordinates && (() => {
        const parts = target.coordinates.split(',').map(s => parseFloat(s.trim()));
        if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
        const assets = getClosestAssets(target);
        if (assets.length === 0) return null;
        return (
          <AccordionSection title="אמצעים זמינים" defaultOpen={true} icon={Target}>
            <div className="flex flex-col gap-1 p-[4px]" dir="rtl">
              {assets.map(a => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 text-[11px] text-gray-300 bg-black/30 border border-white/10 rounded px-2 py-1.5 hover:bg-white/5 hover:border-cyan-500/30 transition-colors cursor-pointer"
                  onMouseEnter={() => onAvailableAssetHover?.(a.id)}
                  onMouseLeave={() => onAvailableAssetHover?.(null)}
                >
                  <span className="font-['Inter'] text-xs">{a.actionLabel}</span>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-gray-500">
                    {a.id === 'DRONE-MOCK' ? <DroneIcon className="w-4 h-4 flex-shrink-0" /> : null}
                    {a.typeLabel}{a.distanceM > 0 ? ` · ${(a.distanceM / 1000).toFixed(1)} ק״מ` : ''}
                  </span>
                </div>
              ))}
            </div>
          </AccordionSection>
        );
      })()}

      {/* Mission Timeline - Only show if active */}
      {isMissionActive && target.missionSteps && (
          <MissionTimeline 
            steps={target.missionSteps} 
            progress={target.missionProgress || 0}
            onCancel={() => onCancelMission?.()}
            onComplete={() => onCompleteMission?.()}
          />
      )}

      {/* Action Buttons - Hide if mission is running or cleared */}
      {!isMissionActive && !isSuccess && !isExpired && (
          <div className="p-3 bg-black/20 space-y-2">
             <div className="flex gap-2 pt-2">
                {(isCritical || isSuspect) ? (
                    <>
                        <ActionButton 
                            label="ירי" 
                            variant="danger" 
                            icon={Crosshair} 
                            className="w-40"
                            onClick={(e) => { e?.stopPropagation(); onEngage?.('attack'); }}
                        />
                        <ActionButton 
                            label="שיבוש" 
                            icon={Radio} 
                            className="w-40"
                            onClick={(e) => { e?.stopPropagation(); onEngage?.('jamming'); }}
                        />
                        <div className="relative" ref={dismissTriggerRef}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDismissDropdownOpen(open => !open); }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded bg-white/5 hover:bg-red-500/20 text-[#666] hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all text-[11px] font-medium"
                            title="הסר ממעקב (בחירת סיבה)"
                          >
                            <span>הסר</span>
                            <ChevronDown size={12} className={`transition-transform ${dismissDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {dismissDropdownOpen && dismissDropdownRect && createPortal(
                            <div
                              className="fixed py-1 min-w-[140px] rounded border border-white/20 bg-[#1a1a1a] shadow-xl z-[9999]"
                              style={{ top: dismissDropdownRect.top, left: dismissDropdownRect.left }}
                              dir="rtl"
                            >
                              {DISMISS_REASONS.map(reason => (
                                <button
                                  key={reason}
                                  onClick={(e) => { e.stopPropagation(); onDismiss?.(reason); setDismissDropdownOpen(false); }}
                                  className="w-full text-right px-3 py-1.5 text-[11px] text-gray-300 hover:bg-white/10 transition-colors"
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>,
                            document.body
                          )}
                        </div>
                    </>
                ) : (
                    <>
                        <ActionButton 
                            label="יירוט" 
                            icon={Rocket} 
                            className="border-amber-500/50 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                            onClick={(e) => { e?.stopPropagation(); onVerify?.('intercept'); }}
                        />
                        <ActionButton 
                            label="מעקב" 
                            icon={Eye} 
                            className="border-blue-500/50 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20"
                            onClick={(e) => { e?.stopPropagation(); onVerify?.('surveillance'); }}
                        />
                        <div className="relative" ref={dismissTriggerRef}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDismissDropdownOpen(open => !open); }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded bg-white/5 hover:bg-red-500/20 text-[#666] hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all text-[11px] font-medium"
                            title="הסר ממעקב (בחירת סיבה)"
                          >
                            <span>הסר</span>
                            <ChevronDown size={12} className={`transition-transform ${dismissDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {dismissDropdownOpen && dismissDropdownRect && createPortal(
                            <div
                              className="fixed py-1 min-w-[140px] rounded border border-white/20 bg-[#1a1a1a] shadow-xl z-[9999]"
                              style={{ top: dismissDropdownRect.top, left: dismissDropdownRect.left }}
                              dir="rtl"
                            >
                              {DISMISS_REASONS.map(reason => (
                                <button
                                  key={reason}
                                  onClick={(e) => { e.stopPropagation(); onDismiss?.(reason); setDismissDropdownOpen(false); }}
                                  className="w-full text-right px-3 py-1.5 text-[11px] text-gray-300 hover:bg-white/10 transition-colors"
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>,
                            document.body
                          )}
                        </div>
                    </>
                )}
             </div>
          </div>
      )}
    </>
  );
}

// --- Filter Component ---
// (Keeping it for now if user wants to filter within groups, or we can remove it. Let's keep it but make it optional)

interface ListOfSystemsProps {
    className?: string;
    targets?: TargetSystem[];
    activeTargetId?: string | null;
    onTargetClick?: (target: TargetSystem) => void;
    onVerify?: (targetId: string, action: 'intercept' | 'surveillance') => void;
    onEngage?: (targetId: string, type: 'jamming' | 'attack') => void;
    onDismiss?: (targetId: string, reason?: string) => void;
    getClosestAssets?: (target: TargetSystem) => Array<{ id: string; typeLabel: string; actionLabel: string; distanceM: number }>;
    onSensorHover?: (sensorId: string | null) => void;
    onAvailableAssetHover?: (assetId: string | null) => void;
    onCancelMission?: (targetId: string) => void;
    onCompleteMission?: (targetId: string) => void;
}

export default function ListOfSystems({ 
    className = "", 
    targets = MOCK_TARGETS, 
    activeTargetId,
    onTargetClick,
    onVerify,
    onEngage,
    onDismiss,
    onCancelMission,
    onCompleteMission,
    getClosestAssets,
    onSensorHover,
    onAvailableAssetHover,
}: ListOfSystemsProps) {
  
  // Dedup targets
  const uniqueTargets = React.useMemo(() => {
      const seen = new Set();
      return targets.filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
      });
  }, [targets]);

  // Grouping Logic
  const groups = {
      needsReview: uniqueTargets.filter(t => t.status === 'suspect'),
      tasks: uniqueTargets.filter(t => ['active', 'tracking', 'engaged'].includes(t.status)),
      cleared: uniqueTargets.filter(t => ['neutralized', 'success'].includes(t.status)),
      expired: uniqueTargets.filter(t => t.status === 'expired'),
  };

  const renderTargetList = (list: TargetSystem[]) => {
      if (list.length === 0) {
          return <div className="p-2 text-center text-[10px] text-gray-600 font-mono">אין מטרות</div>;
      }
      return (
         <AnimatePresence mode="popLayout">
            {list.map((target) => {
                const isActive = target.id === activeTargetId;
                return (
                    <motion.div
                        key={target.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="cursor-pointer"
                        id={`target-card-${target.id}`}
                    >
                        <SystemCard 
                            target={target} 
                            isOpen={isActive}
                            onToggle={() => onTargetClick?.(target)}
                        >
                            <ExpandedTargetDetails 
                                target={target}
                                onVerify={(action) => onVerify?.(target.id, action)}
                                onEngage={(type) => onEngage?.(target.id, type)}
                                onDismiss={(reason) => onDismiss?.(target.id, reason)}
                                onCancelMission={() => onCancelMission?.(target.id)}
                                onCompleteMission={() => onCompleteMission?.(target.id)}
                                getClosestAssets={getClosestAssets}
                                onSensorHover={onSensorHover}
                                onAvailableAssetHover={onAvailableAssetHover}
                            />
                        </SystemCard>
                    </motion.div>
                );
            })}
         </AnimatePresence>
      );
  };

  return (
    <div className={`w-full flex flex-col ${className}`}>
       
       <div className="flex-1 space-y-2 pb-20 overflow-y-auto custom-scrollbar px-2">
            
            <CollapsibleGroup title="לטיפול" count={groups.needsReview.length} icon={AlertTriangle} defaultOpen={true}>
                {renderTargetList(groups.needsReview)}
            </CollapsibleGroup>

            <CollapsibleGroup title="משימות פעילות" count={groups.tasks.length} icon={ListTodo} defaultOpen={true}>
                {renderTargetList(groups.tasks)}
            </CollapsibleGroup>

            <CollapsibleGroup title="הושלמו" count={groups.cleared.length} icon={CheckCircle2} defaultOpen={false}>
                 {renderTargetList(groups.cleared)}
            </CollapsibleGroup>

            <CollapsibleGroup title="פג תוקף" count={groups.expired.length} icon={History} defaultOpen={false}>
                 {renderTargetList(groups.expired)}
            </CollapsibleGroup>

       </div>
    </div>
  );
}