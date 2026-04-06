import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ActionButton } from './ActionButton';
import { SplitActionButton, type SplitDropdownGroup } from './SplitActionButton';
import { CARD_TOKENS } from './tokens';

export interface CardAction {
  id: string;
  label: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ElementType;
  variant?: 'fill' | 'ghost' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  onClick: (e: React.MouseEvent) => void;
  onHover?: (hovering: boolean) => void;
  confirm?: {
    title: string;
    description?: string;
    confirmLabel?: string;
    doubleConfirm?: boolean;
  };
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  title?: string;
  dataTour?: string;
  dropdownActions?: CardAction[];
  dropdownGroups?: SplitDropdownGroup[];
  group?: 'effector' | 'investigation';
  /** Passed to SplitActionButton when disabled (e.g. false = full-opacity “completed” jam row). */
  dimSplitWhenDisabled?: boolean;
  /** Read-only effector slot (not a button) — e.g. jam complete. Use with `group: 'effector'`. */
  effectorStatusStrip?: {
    label: string;
    icon?: React.ElementType;
    tone: 'success';
  };
}

type EffectorStatusStripProps = {
  strip: NonNullable<CardAction['effectorStatusStrip']>;
  dataTour?: string;
};

function EffectorStatusStrip({ strip, dataTour }: EffectorStatusStripProps) {
  const Icon = strip.icon;
  if (strip.tone !== 'success') return null;
  return (
    <div
      role="status"
      className="w-full min-h-[30px] flex items-center justify-center gap-2 px-3 text-[10px] font-medium text-zinc-300 cursor-default select-none pointer-events-none"
      {...(dataTour ? { 'data-tour': dataTour } : {})}
    >
      {Icon && <Icon size={11} className="shrink-0 text-emerald-400" aria-hidden="true" />}
      <span>{strip.label}</span>
    </div>
  );
}

export interface CardActionsProps {
  actions: CardAction[];
  layout?: 'row' | 'grid' | 'stack';
  className?: string;
}

export function CardActions({ actions, layout = 'row', className = '' }: CardActionsProps) {
  const prefersReducedMotion = useReducedMotion();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(1);

  if (actions.length === 0) return null;

  const allActions = actions.flatMap(a => [a, ...(a.dropdownActions ?? [])]);
  const confirmingAction = confirmingId ? allActions.find((a) => a.id === confirmingId) : null;

  const handleClick = (action: CardAction, e: React.MouseEvent) => {
    e.stopPropagation();
    if (action.confirm) {
      setConfirmingId(action.id);
      setConfirmStep(1);
    } else {
      action.onClick(e);
    }
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmingAction) return;

    if (confirmingAction.confirm?.doubleConfirm && confirmStep === 1) {
      setConfirmStep(2);
      return;
    }

    confirmingAction.onClick(e);
    setConfirmingId(null);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingId(null);
  };

  const hasGroups = actions.some(
    (a) => a.group != null || a.dropdownActions != null || a.effectorStatusStrip != null,
  );

  if (hasGroups) {
    const effectorActions = actions.filter(
      (a) => a.group === 'effector' || a.dropdownActions != null || a.effectorStatusStrip != null,
    );
    const investigationActions = actions.filter(a => a.group === 'investigation');
    const ungrouped = actions.filter(a => !a.group && !a.dropdownActions);

    return (
      <div className={`px-2 py-2 ${className}`}>
        <div className="flex flex-col gap-1.5">
          {/* Effector row */}
          {effectorActions.length > 0 && (
            <div className="flex flex-col gap-1.5 relative">
              <AnimatePresence mode="popLayout" initial={false}>
                {effectorActions.map((action) => {
                  const motionKey = action.effectorStatusStrip ? `${action.id}-strip` : action.id;
                  const springTransition = prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring' as const, duration: 0.3, bounce: 0 };

                  return (
                    <motion.div
                      key={motionKey}
                      className="w-full"
                      transition={springTransition}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
                    >
                      {action.effectorStatusStrip ? (
                        <EffectorStatusStrip strip={action.effectorStatusStrip} dataTour={action.dataTour} />
                      ) : action.dropdownActions || action.dropdownGroups ? (
                        <SplitActionButton
                          label={action.label}
                          subtitle={action.subtitle}
                          badge={action.badge}
                          icon={action.icon}
                          variant={action.variant as 'fill' | 'ghost' | 'danger' | 'warning'}
                          size={action.size ?? 'sm'}
                          disabled={action.disabled}
                          loading={action.loading}
                          dimDisabledShell={action.dimSplitWhenDisabled !== false}
                          onClick={(e) => handleClick(action, e)}
                          onHover={action.onHover}
                          className={action.className ?? ''}
                          dataTour={action.dataTour}
                          dropdownItems={(action.dropdownActions ?? []).map(da => ({
                            id: da.id,
                            label: da.label,
                            icon: da.icon,
                            disabled: da.disabled,
                            onClick: (e: React.MouseEvent) => handleClick(da, e),
                          }))}
                          dropdownGroups={action.dropdownGroups}
                        />
                      ) : (
                        <ActionButton
                          label={action.label}
                          icon={action.icon}
                          variant={action.variant ?? 'fill'}
                          size={action.size ?? 'md'}
                          onClick={(e) => handleClick(action, e!)}
                          disabled={action.disabled}
                          loading={action.loading}
                          title={action.title}
                          className={`w-full ${action.className ?? ''}`}
                          dataTour={action.dataTour}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Investigation row */}
          {investigationActions.length > 0 && (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(investigationActions.length, 4)}, 1fr)` }}>
              {investigationActions.map((action) => (
                <ActionButton
                  key={action.id}
                  label={action.label}
                  icon={action.icon}
                  variant={action.variant ?? 'ghost'}
                  size={action.size ?? 'sm'}
                  onClick={(e) => handleClick(action, e!)}
                  disabled={action.disabled}
                  loading={action.loading}
                  title={action.title}
                  className={`w-full ${action.className ?? ''}`}
                  dataTour={action.dataTour}
                />
              ))}
            </div>
          )}

          {/* Any ungrouped actions (backward compat) */}
          {ungrouped.length > 0 && (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(ungrouped.length, 4)}, 1fr)` }}>
              {ungrouped.map((action) => (
                <ActionButton
                  key={action.id}
                  label={action.label}
                  icon={action.icon}
                  variant={action.variant ?? 'ghost'}
                  size={action.size ?? 'sm'}
                  onClick={(e) => handleClick(action, e!)}
                  disabled={action.disabled}
                  loading={action.loading}
                  title={action.title}
                  className={`w-full ${action.className ?? ''}`}
                  dataTour={action.dataTour}
                />
              ))}
            </div>
          )}
        </div>

        {confirmingAction?.confirm && renderConfirmDialog(confirmingAction, confirmStep, handleConfirm, handleCancel)}
      </div>
    );
  }

  // Legacy layout (no groups)
  const primary = actions.filter((a) => a.size === 'lg');
  const rest = actions.filter((a) => a.size !== 'lg');
  const cols = Math.min(rest.length || primary.length, 4);

  return (
    <div className={`px-2 py-2 ${className}`}>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols || 1}, 1fr)` }}
      >
        {primary.map((action) => (
          <div key={action.id} style={primary.length === 1 ? { gridColumn: `1 / -1` } : undefined}>
            <ActionButton
              label={action.label}
              icon={action.icon}
              variant={action.variant ?? 'fill'}
              size="lg"
              onClick={(e) => handleClick(action, e!)}
              disabled={action.disabled}
              loading={action.loading}
              title={action.title}
              className={`w-full ${action.className ?? ''}`}
              dataTour={action.dataTour}
            />
          </div>
        ))}

        {rest.map((action) => (
          <ActionButton
            key={action.id}
            label={action.label}
            icon={action.icon}
            variant={action.variant ?? 'ghost'}
            size={action.size ?? 'sm'}
            onClick={(e) => handleClick(action, e!)}
            disabled={action.disabled}
            loading={action.loading}
            title={action.title}
            className={`w-full ${action.className ?? ''}`}
            dataTour={action.dataTour}
          />
        ))}
      </div>

      {confirmingAction?.confirm && renderConfirmDialog(confirmingAction, confirmStep, handleConfirm, handleCancel)}
    </div>
  );
}

function renderConfirmDialog(
  confirmingAction: CardAction,
  confirmStep: number,
  handleConfirm: (e: React.MouseEvent) => void,
  handleCancel: (e: React.MouseEvent) => void,
) {
  return (
    <div
      className="mt-1 p-3 rounded"
      style={{ boxShadow: `0 0 0 1px ${CARD_TOKENS.surface.level2}`, backgroundColor: `rgba(255,255,255,${CARD_TOKENS.elevation.overlay.level2})` }}
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby={confirmingAction.confirm!.description ? 'confirm-desc' : undefined}
      aria-modal="true"
    >
      {confirmStep === 1 ? (
        <>
          <div id="confirm-title" className="text-[11px] font-semibold text-zinc-200 mb-2">
            {confirmingAction.confirm!.title}
          </div>
          {confirmingAction.confirm!.description && (
            <div id="confirm-desc" className="text-[10px] text-zinc-400 mb-3 text-pretty">
              {confirmingAction.confirm!.description}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 h-8 rounded bg-[oklch(0.348_0.111_17)] hover:bg-[oklch(0.445_0.151_17)] active:bg-[oklch(0.295_0.082_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)] text-[11px] font-semibold transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              aria-label={confirmingAction.confirm!.confirmLabel ?? 'אישור'}
            >
              {confirmingAction.confirm!.confirmLabel ?? 'אישור'}
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 h-8 rounded bg-[oklch(0.302_0_0)] hover:bg-[oklch(0.388_0_0)] active:bg-[oklch(0.238_0_0)] text-white text-[11px] font-medium transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              aria-label="ביטול"
            >
              ביטול
            </button>
          </div>
        </>
      ) : (
        <>
          <div id="confirm-title" className="text-[11px] font-bold text-[oklch(0.863_0.102_17)] mb-2">אישור סופי</div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 h-8 rounded bg-[oklch(0.348_0.111_17)] hover:bg-[oklch(0.445_0.151_17)] active:bg-[oklch(0.295_0.082_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)] text-[11px] font-bold transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              aria-label={confirmingAction.confirm!.confirmLabel ?? 'הפעל'}
            >
              {confirmingAction.confirm!.confirmLabel ?? 'הפעל'}
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 h-8 rounded bg-[oklch(0.302_0_0)] hover:bg-[oklch(0.388_0_0)] active:bg-[oklch(0.238_0_0)] text-white text-[11px] font-medium transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              aria-label="ביטול"
            >
              ביטול
            </button>
          </div>
        </>
      )}
    </div>
  );
}
