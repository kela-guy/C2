import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Layers, Zap, ChevronDown } from 'lucide-react';
import { CARD_TOKENS } from './tokens';
import { ActionButton } from './ActionButton';
import type { Detection } from '../imports/ListOfSystems';
import type { TargetBurst } from '../imports/useTargetBursts';
import type { CardCallbacks, CardContext } from '../imports/useCardSlots';

interface StackedCardProps {
  burst: TargetBurst;
  expanded: boolean;
  onToggleExpanded: () => void;
  activeTargetId: string | null;
  onTargetClick: (target: Detection) => void;
  buildCallbacks: (target: Detection) => CardCallbacks;
  buildCtx: (target: Detection) => CardContext;
  renderCard: (
    target: Detection,
    isActive: boolean,
    callbacks: CardCallbacks,
    ctx: CardContext,
  ) => React.ReactNode;
  onBulkMitigate?: (targets: Detection[]) => void;
  onTargetHover?: (targetId: string | null) => void;
}

const d = CARD_TOKENS;

function formatTime(ts: string): string {
  const date = new Date(ts);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
  return ts;
}

export function StackedCard({
  burst,
  expanded,
  onToggleExpanded,
  activeTargetId,
  onTargetClick,
  buildCallbacks,
  buildCtx,
  renderCard,
  onBulkMitigate,
  onTargetHover,
}: StackedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(burst.targets.length);
  const prefersReducedMotion = useReducedMotion();

  const count = burst.targets.length;

  const hasActiveChild = burst.targets.some(
    (t) => t.id === activeTargetId,
  );

  useEffect(() => {
    if (hasActiveChild && !expanded) {
      onToggleExpanded();
    }
  }, [hasActiveChild, expanded, onToggleExpanded]);

  const isGrowing = count > prevCountRef.current && expanded;
  useEffect(() => {
    prevCountRef.current = count;
  }, [count]);

  const timeRange =
    burst.firstTimestamp === burst.lastTimestamp
      ? formatTime(burst.firstTimestamp)
      : `${formatTime(burst.firstTimestamp)} – ${formatTime(burst.lastTimestamp)}`;

  const breakdownEntries = Object.entries(burst.typeBreakdown);

  return (
    <div ref={cardRef} className="relative" dir="rtl">
      {/* Ghost layers for stacking effect */}
      {!expanded && (
        <>
          <div
            className="absolute inset-x-0 top-0 rounded-lg pointer-events-none"
            style={{
              backgroundColor: d.container.bgColor,
              borderColor: d.container.borderColor,
              borderWidth: `${d.container.borderWidth}px`,
              borderStyle: 'solid',
              borderRadius: `${d.container.borderRadius}px`,
              height: '100%',
              transform: 'translateY(5px) scale(0.96)',
              opacity: 0.15,
            }}
          />
          <div
            className="absolute inset-x-0 top-0 rounded-lg pointer-events-none"
            style={{
              backgroundColor: d.container.bgColor,
              borderColor: d.container.borderColor,
              borderWidth: `${d.container.borderWidth}px`,
              borderStyle: 'solid',
              borderRadius: `${d.container.borderRadius}px`,
              height: '100%',
              transform: 'translateY(2.5px) scale(0.98)',
              opacity: 0.3,
            }}
          />
        </>
      )}

      {/* Main card */}
      <div
        className="relative w-full text-white overflow-hidden transition-colors"
        style={{
          backgroundColor: d.container.bgColor,
          borderColor: d.container.borderColor,
          borderRadius: `${d.container.borderRadius}px`,
          borderWidth: `${d.container.borderWidth}px`,
          borderStyle: 'solid',
          marginBottom: expanded ? `${d.container.marginBottom}px` : `${d.container.marginBottom + 5}px`,
          boxShadow: d.elevation.shadow,
        }}
      >
        {/* Header — always visible */}
        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-white/[0.03] transition-colors focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
          style={{
            padding: `${d.header.paddingY + 2}px ${d.header.paddingX}px`,
            backgroundColor: expanded ? `rgba(255,255,255,${d.header.selectedBgOpacity})` : undefined,
          }}
          onClick={onToggleExpanded}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpanded(); } }}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={`${count} איתורים — ${expanded ? 'סגור' : 'הרחב'}`}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: d.iconBox.size,
              height: d.iconBox.size,
              borderRadius: d.iconBox.borderRadius,
              backgroundColor: d.iconBox.defaultBg,
            }}
          >
            <Layers size={d.iconBox.iconSize} className="text-zinc-400" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="font-semibold truncate"
                style={{ fontSize: d.title.fontSize, color: d.title.color }}
              >
                {count} איתורים
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tabular-nums bg-white/[0.06] text-zinc-400">
                {count}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {breakdownEntries.map(([label, c]) => (
                <span
                  key={label}
                  className="text-[9px] text-zinc-400 font-mono"
                >
                  {label}
                  <span className="text-zinc-400 mr-0.5">×{c}</span>
                </span>
              ))}
              <span className="text-[9px] text-zinc-400 font-mono">
                {timeRange}
              </span>
            </div>
          </div>

          <ChevronDown
            size={d.animation.chevronSize}
            className={`text-zinc-400 shrink-0 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </div>

        {/* Expanded content */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={prefersReducedMotion || isGrowing ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{
                duration: prefersReducedMotion || isGrowing ? 0 : d.animation.expandDuration,
                ease: 'easeOut',
              }}
              className="overflow-hidden"
            >
              <div
                style={{
                  borderTopColor: d.content.borderColor,
                  borderTopWidth: '1px',
                  borderTopStyle: 'solid',
                }}
              >
                {/* Bulk Actions */}
                {onBulkMitigate && (
                  <div className="px-2 py-2 flex items-center gap-1.5" style={{ borderBottom: `1px solid ${d.surface.level2}`, backgroundColor: `rgba(255,255,255,${d.elevation.overlay.level2})` }}>
                    <ActionButton
                      label={`שיבוש הכל (${count})`}
                      icon={Zap}
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBulkMitigate(burst.targets);
                      }}
                    />
                  </div>
                )}

                {/* Individual cards — no enter/exit animation to avoid jumping */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col gap-1 p-1.5">
                    {burst.targets.map((target) => {
                      const isActive = target.id === activeTargetId;
                      return (
                        <div
                          key={target.id}
                          id={`detection-card-${target.id}`}
                          className="cursor-pointer"
                          onMouseEnter={() => onTargetHover?.(target.id)}
                          onMouseLeave={() => onTargetHover?.(null)}
                        >
                          {renderCard(
                            target,
                            isActive,
                            buildCallbacks(target),
                            buildCtx(target),
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
