import React, { useRef, useEffect } from 'react';
import { Layers, ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import { JamWaveIcon } from './MapIcons';
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

  const count = burst.targets.length;

  const hasActiveChild = burst.targets.some(
    (t) => t.id === activeTargetId,
  );

  useEffect(() => {
    if (hasActiveChild && !expanded) {
      onToggleExpanded();
    }
  }, [hasActiveChild, expanded, onToggleExpanded]);

  const timeRange =
    burst.firstTimestamp === burst.lastTimestamp
      ? formatTime(burst.firstTimestamp)
      : `${formatTime(burst.firstTimestamp)} – ${formatTime(burst.lastTimestamp)}`;

  const breakdownEntries = Object.entries(burst.typeBreakdown);

  return (
    <div ref={cardRef} className="relative" dir="rtl">
      {!expanded && (
        <>
          <div
            className="absolute inset-x-0 top-0 rounded-lg pointer-events-none"
            style={{
              backgroundColor: d.container.bgColor,
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
              borderRadius: `${d.container.borderRadius}px`,
              height: '100%',
              transform: 'translateY(2.5px) scale(0.98)',
              opacity: 0.3,
            }}
          />
        </>
      )}

      <Collapsible
        open={expanded}
        onOpenChange={(next) => {
          if (next !== expanded) onToggleExpanded();
        }}
        className="group"
      >
        <div
          className="relative w-full text-white overflow-hidden transition-colors"
          style={{
            backgroundColor: d.container.bgColor,
            borderRadius: `${d.container.borderRadius}px`,
            marginBottom: `${d.container.marginBottom}px`,
            boxShadow: d.elevation.shadow,
          }}
        >
          <CollapsibleTrigger asChild>
            <div
              className="flex w-full items-center gap-2 cursor-pointer hover:bg-white/[0.03] transition-colors focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
              style={{
                padding: `${d.header.paddingY + 2}px ${d.header.paddingX}px`,
                backgroundColor: expanded ? `rgba(255,255,255,${d.header.selectedBgOpacity})` : undefined,
              }}
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
                    className="font-semibold truncate tabular-nums"
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
                      className="text-[9px] text-zinc-400 font-mono tabular-nums"
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
                className="text-zinc-400 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <div
              style={{
                boxShadow: `inset 0 1px 0 0 ${d.content.borderColor}`,
              }}
            >
              {onBulkMitigate && (() => {
                const mitigatingCount = burst.targets.filter(t => t.mitigationStatus === 'mitigating').length;
                const isBulkMitigating = mitigatingCount > 0;
                return (
                  <div className="px-2 py-2 flex items-center gap-1.5" style={{ boxShadow: `inset 0 -1px 0 0 ${d.surface.level2}`, backgroundColor: `rgba(255,255,255,${d.elevation.overlay.level2})` }}>
                    <ActionButton
                      label={isBulkMitigating ? `משבש אות... (${mitigatingCount}/${count})` : `שיבוש הכל (${count})`}
                      icon={JamWaveIcon}
                      variant="danger"
                      size="sm"
                      loading={isBulkMitigating}
                      className="[&_span]:tabular-nums"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBulkMitigate(burst.targets);
                      }}
                    />
                  </div>
                );
              })()}

              <div className="max-h-[480px] overflow-y-auto">
                <div className="flex flex-col gap-2 px-2 py-2">
                  {burst.targets.map((target) => {
                    const isActive = target.id === activeTargetId;
                    return (
                      <div
                        key={target.id}
                        id={`detection-card-${target.id}`}
                        className="cursor-pointer [&>*]:!mb-0"
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
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
