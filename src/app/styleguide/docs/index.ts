/**
 * Registry of co-located doc modules, keyed by component id. Each entry is a
 * `ComponentDocModule` living next to this file as `<id>.doc.tsx`. The
 * manifest joins these in by id; components without a module render a
 * "not yet migrated" stub in the shell.
 *
 * Migrated in waves (strangler) — add the import + map entry as each lands.
 */
import type { ComponentDocModule } from '../registry/types';
import { buttonDoc } from './button.doc';
import { actionButtonDoc } from './action-button.doc';
import { cameraToggleDoc } from './camera-toggle.doc';
import { targetCardDoc } from './target-card.doc';
import { badgeDoc } from './badge.doc';
import { newUpdatesDoc } from './new-updates.doc';
import { splitActionDoc } from './split-action.doc';
import { accordionDoc } from './accordion.doc';
import { telemetryDoc } from './telemetry.doc';
import { copyButtonDoc } from './copy-button.doc';
import { motionDoc } from './motion.doc';
import { scrollingListDoc } from './scrolling-list.doc';

export const DOC_MODULES: Record<string, ComponentDocModule> = {
  [motionDoc.id]: motionDoc,
  [scrollingListDoc.id]: scrollingListDoc,
  [buttonDoc.id]: buttonDoc,
  [actionButtonDoc.id]: actionButtonDoc,
  [cameraToggleDoc.id]: cameraToggleDoc,
  [targetCardDoc.id]: targetCardDoc,
  [badgeDoc.id]: badgeDoc,
  [newUpdatesDoc.id]: newUpdatesDoc,
  [splitActionDoc.id]: splitActionDoc,
  [accordionDoc.id]: accordionDoc,
  [telemetryDoc.id]: telemetryDoc,
  [copyButtonDoc.id]: copyButtonDoc,
};
