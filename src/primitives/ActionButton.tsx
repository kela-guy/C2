/**
 * ActionButton — now a thin preset of the base {@link Button}.
 *
 * Historically this file *was* the base button. It has been promoted to
 * `Button.tsx`; `ActionButton` is kept as a back-compat alias so the existing
 * card action rows and toolbars keep working unchanged. It renders the base
 * Button with the legacy `action-button` handoff stamp. Prefer importing
 * `Button` directly in new code.
 *
 * @deprecated Use `Button` from `@/primitives` instead.
 */
import { Button, type ButtonProps } from './Button';
import {
  BUTTON_VARIANTS,
  BUTTON_SIZES,
  type ButtonVariant,
  type ButtonSize,
} from './buttonTokens';

// Back-compat token aliases — the button family now reads from `buttonTokens`.
export const ACTION_BUTTON_VARIANTS = BUTTON_VARIANTS;
export const ACTION_BUTTON_SIZES = BUTTON_SIZES;
export type ActionButtonVariant = ButtonVariant;
export type ActionButtonSize = ButtonSize;

export type ActionButtonProps = Omit<ButtonProps, 'asChild' | 'children' | 'dataHandoff'>;

export function ActionButton(props: ActionButtonProps) {
  return <Button {...props} dataHandoff="action-button" />;
}
