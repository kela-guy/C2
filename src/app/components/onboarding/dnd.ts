/** Shared react-dnd contract between the asset tray (drag) and map (drop). */
import type { AssetKind } from './coverageModel';

export const ONBOARDING_DND_TYPE = 'onboarding-asset';

export interface OnboardingDragItem {
  kind: AssetKind;
}
