import React, { useState, useEffect } from "react";
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
  timestamp: string;
  coordinates: string;
  distance: string;
  isNew?: boolean;
  missionSteps?: string[];
  missionProgress?: number;
}

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
        className={`w-full bg-[rgba(250,82,82,0.15)] hover:bg-[rgba(250,82,82,0.25)] border border-[#fa5252] text-[#ff8787] rounded h-9 flex items-center justify-center gap-2 transition-all active:scale-95 ${className}`}
      >
        <span className="text-sm font-semibold font-['Inter']">{label}</span>
        {Icon && <Icon size={16} />}
      </button>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={`flex-1 bg-[rgba(34,139,230,0.15)] hover:bg-[rgba(34,139,230,0.25)] border border-[#74c0fc] text-[#74c0fc] rounded h-8 flex items-center justify-center gap-2 transition-all active:scale-95 ${className}`}
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
    <div className={`mb-2 rounded-lg border border-[#333] bg-[#111] overflow-hidden ${className}`}>
        <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
        >
            <div className="flex items-center gap-2 text-gray-400">
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                    <ChevronDown size={16} />
                </motion.div>
                <span className="text-xs font-mono">({count})</span>
            </div>
            
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300">{title}</span>
                <Icon size={14} className="text-blue-500" />
            </div>
        </button>
        
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                >
                    <div className="p-2 space-y-2 border-t border-[#333]">
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
        className={`w-full bg-[#1A1A1A] text-white p-3 rounded-lg shadow-xl border font-['Inter'] p-[0px] overflow-hidden mb-2 transition-colors
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
    onCompleteMission
}: { 
    target: TargetSystem, 
    onVerify?: (action: 'intercept' | 'surveillance') => void,
    onEngage?: (type: 'jamming' | 'attack') => void,
    onDismiss?: () => void,
    onCancelMission?: () => void,
    onCompleteMission?: () => void
}) {
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
                {isCritical ? (
                    <>
                        <ActionButton 
                            label="ירי" 
                            variant="danger" 
                            icon={Crosshair} 
                            onClick={(e) => { e?.stopPropagation(); onEngage?.('attack'); }}
                        />
                        <ActionButton 
                            label="שיבוש" 
                            icon={Radio} 
                            onClick={(e) => { e?.stopPropagation(); onEngage?.('jamming'); }}
                        />
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
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDismiss?.(); }}
                            className="w-8 h-8 flex items-center justify-center rounded bg-white/5 hover:bg-red-500/20 text-[#666] hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all"
                            title="Dismiss"
                        >
                            <X size={14} />
                        </button>
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
    onDismiss?: (targetId: string) => void;
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
    onCompleteMission
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
                                onDismiss={() => onDismiss?.(target.id)}
                                onCancelMission={() => onCancelMission?.(target.id)}
                                onCompleteMission={() => onCompleteMission?.(target.id)}
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