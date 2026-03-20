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
            {isRunning && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />}
            {isDroneVerifying && <Loader2 size={12} className="animate-spin text-[#909296]" aria-hidden="true" />}
        </div>
    );

    return (
        <AccordionSection title={title} defaultOpen={true} icon={MissionIcon} headerAction={headerAction}>
            <div className="flex flex-col gap-1.5 py-2" dir="rtl">
                <ol className="flex flex-col gap-2 list-none m-0 p-0">
                    {steps.map((step, idx) => {
                        const isActive = idx === progress;
                        const isStepCompleted = idx < progress;
                        
                        return (
                            <li key={idx} className={`flex items-center gap-2.5 text-xs font-mono transition-all duration-300
                                ${isActive ? 'text-white' : 'text-white/50'}
                            `}>
                                {isStepCompleted ? (
                                    <div className="size-4 rounded-full flex-shrink-0 shadow-[0_0_0_1px_#333] flex items-center justify-center" aria-hidden="true">
                                        <Check size={10} className="text-[#12b886]" strokeWidth={2.5} />
                                    </div>
                                ) : isActive ? (
                                    <div className="size-4 rounded-full flex-shrink-0 shadow-[0_0_0_1px_#444] flex items-center justify-center" aria-hidden="true">
                                        <div className="size-2 rounded-full bg-red-500" />
                                    </div>
                                ) : (
                                    <div className="size-4 rounded-full flex-shrink-0 shadow-[0_0_0_1px_#444]" aria-hidden="true" />
                                )}
                                <span>{step}</span>
                                {isActive && <span className="inline-block w-1 h-3 bg-white/60 animate-blink mr-1" aria-hidden="true" />}
                            </li>
                        );
                    })}

                    {showDroneOption && onSendDroneVerification && (
                        <li>
                            <button
                                onClick={(e) => { e.stopPropagation(); onSendDroneVerification(); }}
                                className="flex items-center gap-2.5 text-xs font-mono text-white hover:text-white transition-all cursor-pointer group mt-1 bg-white/5 hover:bg-white/10 rounded px-2 py-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)] w-full"
                            >
                                <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_0_1px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_0_1px_rgba(255,255,255,0.5)] transition-shadow" />
                                <span>שלח רחפן לאימות</span>
                                <span className="opacity-40 group-hover:opacity-70 transition-opacity mr-auto" aria-hidden="true"><MapDroneIcon size={14} fill="currentColor" /></span>
                            </button>
                        </li>
                    )}

                    {isDroneVerifying && (
                        <li className="flex items-center gap-2.5 text-xs font-mono text-white animate-pulse">
                            <div className="size-4 rounded-full flex-shrink-0 shadow-[0_0_0_1px_#444] flex items-center justify-center" aria-hidden="true">
                                <div className="size-2 rounded-full bg-red-500" />
                            </div>
                            <span>רחפן בדרך לאימות פגיעה...</span>
                        </li>
                    )}
                </ol>

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
                            className="!flex-none px-4 border-[#6ee7b7]/40 bg-[rgba(110,231,183,0.15)] hover:bg-[rgba(110,231,183,0.25)] text-[#6ee7b7]"
                        />
                    )}
                </div>
            </div>
        </AccordionSection>
    );
}
