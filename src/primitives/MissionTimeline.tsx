import React from "react";
import {
  X,
  Check,
  Loader2,
  Crosshair,
  Radio,
  Rocket,
  Eye,
  Target,
} from "lucide-react";
import { DroneHiveIcon as MapDroneIcon } from "@/app/components/TacticalMap";
import { AccordionSection } from "./AccordionSection";
import { ActionButton } from "./ActionButton";

export function MissionTimeline({ 
    steps, 
    progress, 
    missionType,
    isDroneVerifying,
    onCancel,
    onComplete,
    onSendDroneVerification,
}: { 
    steps: string[], 
    progress: number, 
    missionType?: string,
    isDroneVerifying?: boolean,
    onCancel: () => void,
    onComplete: () => void,
    onSendDroneVerification?: () => void,
}) {
    const isWaitingConfirmation = progress >= steps.length;
    const showDroneOption = isWaitingConfirmation && missionType === 'attack' && !isDroneVerifying;
    const isRunning = !isWaitingConfirmation;
    const completedCount = Math.min(progress, steps.length);

    const missionTypeLabels: Record<string, string> = {
        attack: 'ירי', jamming: 'שיבוש', intercept: 'יירוט', surveillance: 'מעקב'
    };
    const typeLabel = missionTypeLabels[missionType || ''] || 'משימה';

    const missionIcons: Record<string, React.ElementType> = {
        attack: Crosshair, jamming: Radio, intercept: Rocket, surveillance: Eye
    };
    const MissionIcon = missionIcons[missionType || ''] || Target;

    const title = isDroneVerifying
        ? 'אימות פגיעה'
        : isWaitingConfirmation
            ? `${typeLabel} · הושלם`
            : `${typeLabel} · ${completedCount}/${steps.length}`;

    const headerAction = (
        <div className="flex items-center gap-1.5">
            {isRunning && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            {isDroneVerifying && <Loader2 size={12} className="animate-spin text-[#909296]" />}
        </div>
    );

    return (
        <AccordionSection title={title} defaultOpen={true} icon={MissionIcon} headerAction={headerAction}>
            <div className="flex flex-col gap-1.5 py-2" dir="rtl">
                <div className="flex flex-col gap-2">
                    {steps.map((step, idx) => {
                        const isActive = idx === progress;
                        const isStepCompleted = idx < progress;
                        
                        return (
                            <div key={idx} className={`flex items-center gap-2.5 text-xs font-mono transition-all duration-300
                                ${isActive ? 'text-white' : isStepCompleted ? 'text-white/50' : 'text-white/20'}
                            `}>
                                {isStepCompleted ? (
                                    <div className="size-4 rounded-full flex-shrink-0 border border-[#333] flex items-center justify-center">
                                        <Check size={10} className="text-[#12b886]" strokeWidth={2.5} />
                                    </div>
                                ) : isActive ? (
                                    <div className="size-4 rounded-full flex-shrink-0 border border-[#444] flex items-center justify-center">
                                        <div className="size-2 rounded-full bg-red-500" />
                                    </div>
                                ) : (
                                    <div className="size-4 rounded-full flex-shrink-0 border border-[#444]" />
                                )}
                                <span>{step}</span>
                                {isActive && <span className="inline-block w-1 h-3 bg-white/60 animate-blink mr-1" />}
                            </div>
                        );
                    })}

                    {showDroneOption && onSendDroneVerification && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSendDroneVerification(); }}
                            className="flex items-center gap-2.5 text-xs font-mono text-white hover:text-white transition-all cursor-pointer group mt-1 bg-white/5 hover:bg-white/10 rounded px-2 py-1.5 border border-white/10 hover:border-white/20 w-full"
                        >
                            <div className="w-3 h-3 rounded-full flex-shrink-0 border border-white/30 group-hover:border-white/50 transition-colors" />
                            <span>שלח רחפן לאימות</span>
                            <span className="opacity-40 group-hover:opacity-70 transition-opacity mr-auto"><MapDroneIcon size={14} fill="currentColor" /></span>
                        </button>
                    )}

                    {isDroneVerifying && (
                        <div className="flex items-center gap-2.5 text-xs font-mono text-white animate-pulse">
                            <div className="size-4 rounded-full flex-shrink-0 border border-[#444] flex items-center justify-center">
                                <div className="size-2 rounded-full bg-red-500" />
                            </div>
                            <span>רחפן בדרך לאימות פגיעה...</span>
                        </div>
                    )}
                </div>

                <div className="mt-1 flex gap-2 items-center pt-2 border-t border-white/5">
                    {isRunning && (
                        <ActionButton 
                            label="ביטול משימה"
                            title="ביטול המשימה הפעילה"
                            variant="ghost"
                            icon={X}
                            onClick={(e) => { e?.stopPropagation(); onCancel(); }}
                            className="!w-auto px-3"
                        />
                    )}

                    {isWaitingConfirmation && (
                        <ActionButton 
                            label="סיום משימה"
                            title="אישור סיום וסגירת המשימה"
                            variant="glass"
                            icon={Check}
                            onClick={(e) => { e?.stopPropagation(); onComplete(); }}
                            className="!flex-none px-4 border-[#12b886]/40 bg-[rgba(18,184,134,0.15)] hover:bg-[rgba(18,184,134,0.25)] text-[#12b886]"
                        />
                    )}
                </div>
            </div>
        </AccordionSection>
    );
}
