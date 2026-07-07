/**
 * Registry of co-located doc modules, keyed by component id. Each entry is a
 * `ComponentDocModule` living next to this file as `<id>.doc.tsx`. The
 * manifest joins these in by id; components without a module render a
 * "not yet migrated" stub in the shell.
 *
 * Migrated in waves (strangler) — add the import + map entry as each lands.
 * Folded families live on the surviving doc: ActionButton + SplitActionButton
 * + CopyButton on `button`, StatusChip + HealthStatus (StatusDot/HealthBadge)
 * + ActivityTimestampChip + NewUpdatesPill on `badge`, AccordionSection on
 * `accordion`, CameraToggleButton on `toggle`.
 */
import type { ComponentDocModule } from '../registry/types';
import { buttonDoc } from './button.doc';
import { toggleDoc } from './toggle.doc';
import { targetCardDoc } from './target-card.doc';
import { badgeDoc } from './badge.doc';
import { accordionDoc } from './accordion.doc';
import { telemetryDoc } from './telemetry.doc';
import { motionDoc } from './motion.doc';
import { scrollingListDoc } from './scrolling-list.doc';
import { tokensDoc } from './tokens.doc';
import { conventionsDoc } from './conventions.doc';
import { inputDoc } from './input.doc';
import { textareaDoc } from './textarea.doc';
import { selectDoc } from './select.doc';
import { checkboxDoc } from './checkbox.doc';
import { switchDoc } from './switch.doc';
import { sliderDoc } from './slider.doc';
import { tabsDoc } from './tabs.doc';
import { dialogDoc } from './dialog.doc';
import { popoverDoc } from './popover.doc';
import { dropdownMenuDoc } from './dropdown-menu.doc';
import { tooltipDoc } from './tooltip.doc';
import { sonnerDoc } from './sonner.doc';
import { cardHeaderDoc } from './card-header.doc';
import { cardActionsDoc } from './card-actions.doc';
import { cardDetailsDoc } from './card-details.doc';
import { cardIdentityDoc } from './card-identity.doc';
import { cardSensorsDoc } from './card-sensors.doc';
import { cardMediaDoc } from './card-media.doc';
import { cardLogDoc } from './card-log.doc';
import { cardClosureDoc } from './card-closure.doc';
import { cardTimelineDoc } from './card-timeline.doc';
import { cardFooterDockDoc } from './card-footer-dock.doc';
import { filterBarDoc } from './filter-bar.doc';
import { mapMarkersDoc } from './map-markers.doc';
import { mapIconsDoc } from './map-icons.doc';

export const DOC_MODULES: Record<string, ComponentDocModule> = {
  [tokensDoc.id]: tokensDoc,
  [conventionsDoc.id]: conventionsDoc,
  [motionDoc.id]: motionDoc,
  [scrollingListDoc.id]: scrollingListDoc,
  [buttonDoc.id]: buttonDoc,
  [toggleDoc.id]: toggleDoc,
  [targetCardDoc.id]: targetCardDoc,
  [badgeDoc.id]: badgeDoc,
  [accordionDoc.id]: accordionDoc,
  [telemetryDoc.id]: telemetryDoc,
  [inputDoc.id]: inputDoc,
  [textareaDoc.id]: textareaDoc,
  [selectDoc.id]: selectDoc,
  [checkboxDoc.id]: checkboxDoc,
  [switchDoc.id]: switchDoc,
  [sliderDoc.id]: sliderDoc,
  [tabsDoc.id]: tabsDoc,
  [dialogDoc.id]: dialogDoc,
  [popoverDoc.id]: popoverDoc,
  [dropdownMenuDoc.id]: dropdownMenuDoc,
  [tooltipDoc.id]: tooltipDoc,
  [sonnerDoc.id]: sonnerDoc,
  [cardHeaderDoc.id]: cardHeaderDoc,
  [cardActionsDoc.id]: cardActionsDoc,
  [cardDetailsDoc.id]: cardDetailsDoc,
  [cardIdentityDoc.id]: cardIdentityDoc,
  [cardSensorsDoc.id]: cardSensorsDoc,
  [cardMediaDoc.id]: cardMediaDoc,
  [cardLogDoc.id]: cardLogDoc,
  [cardClosureDoc.id]: cardClosureDoc,
  [cardTimelineDoc.id]: cardTimelineDoc,
  [cardFooterDockDoc.id]: cardFooterDockDoc,
  [filterBarDoc.id]: filterBarDoc,
  [mapMarkersDoc.id]: mapMarkersDoc,
  [mapIconsDoc.id]: mapIconsDoc,
};
