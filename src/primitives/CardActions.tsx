import React, { useState } from 'react';
import { ActionButton } from './ActionButton';

export interface CardAction {
  id: string;
  label: string;
  icon?: React.ElementType;
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  onClick: (e: React.MouseEvent) => void;
  confirm?: {
    title: string;
    description?: string;
    confirmLabel?: string;
    doubleConfirm?: boolean;
  };
  disabled?: boolean;
  className?: string;
  title?: string;
}

export interface CardActionsProps {
  actions: CardAction[];
  layout?: 'row' | 'grid' | 'stack';
  className?: string;
}

export function CardActions({ actions, layout = 'row', className = '' }: CardActionsProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(1);

  if (actions.length === 0) return null;

  const confirmingAction = confirmingId ? actions.find((a) => a.id === confirmingId) : null;

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

  const primary = actions.filter((a) => a.size === 'lg');
  const rest = actions.filter((a) => a.size !== 'lg');

  const cols = Math.min(rest.length, 4);

  return (
    <div className={`px-2 py-2 border-b border-white/5 ${className}`} dir="rtl">
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols || 1}, 1fr)` }}
      >
        {primary.map((action) => (
          <div key={action.id} style={{ gridColumn: `1 / -1` }}>
            <ActionButton
              label={action.label}
              icon={action.icon}
              variant={action.variant ?? 'primary'}
              size="lg"
              onClick={(e) => handleClick(action, e!)}
              disabled={action.disabled}
              title={action.title}
              className={`w-full ${action.className ?? ''}`}
            />
          </div>
        ))}

        {rest.map((action) => (
          <ActionButton
            key={action.id}
            label={action.label}
            icon={action.icon}
            variant={action.variant ?? 'secondary'}
            size={action.size ?? 'sm'}
            onClick={(e) => handleClick(action, e!)}
            disabled={action.disabled}
            title={action.title}
            className={`w-full ${action.className ?? ''}`}
          />
        ))}
      </div>

      {confirmingAction?.confirm && (
        <div
          className="mt-1 p-3 rounded border border-white/10 bg-white/[0.02]"
          role="alertdialog"
          aria-labelledby="confirm-title"
          aria-describedby={confirmingAction.confirm.description ? 'confirm-desc' : undefined}
          aria-modal="true"
        >
          {confirmStep === 1 ? (
            <>
              <div id="confirm-title" className="text-[11px] font-semibold text-zinc-200 mb-2">
                {confirmingAction.confirm.title}
              </div>
              {confirmingAction.confirm.description && (
                <div id="confirm-desc" className="text-[10px] text-zinc-400 mb-3 text-pretty">
                  {confirmingAction.confirm.description}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex-1 h-8 rounded border border-red-500 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[11px] font-semibold transition-colors active:scale-[0.98]"
                  aria-label={confirmingAction.confirm.confirmLabel ?? 'אישור'}
                >
                  {confirmingAction.confirm.confirmLabel ?? 'אישור'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 h-8 rounded border border-white/10 text-zinc-400 text-[11px] hover:bg-white/5 transition-colors"
                  aria-label="ביטול"
                >
                  ביטול
                </button>
              </div>
            </>
          ) : (
            <>
              <div id="confirm-title" className="text-[11px] font-bold text-red-400 mb-2">אישור סופי</div>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex-1 h-8 rounded border border-red-500 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[11px] font-bold transition-colors active:scale-[0.98]"
                  aria-label={confirmingAction.confirm.confirmLabel ?? 'הפעל'}
                >
                  {confirmingAction.confirm.confirmLabel ?? 'הפעל'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 h-8 rounded border border-white/10 text-zinc-400 text-[11px] hover:bg-white/5 transition-colors"
                  aria-label="ביטול"
                >
                  ביטול
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
