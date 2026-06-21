/**
 * Geo Entities Layers — DEV sandbox.
 *
 * Mounts the live production `<Dashboard>` with the map-draw panel auto-
 * opened and the panel-design variant switcher visible at the top of the
 * panel. Used to A/B between the five candidate draw-panel designs
 * (Opt 1..4 + Original) against the real platform UI.
 *
 * Lives at `/geo-entities-layers-sandbox` in DEV. Production builds tree-
 * shake the route entirely (see {@link import('@/app/App')}).
 */

import { Dashboard } from '../Dashboard';

export default function GeoEntitiesLayersSandbox() {
  return <Dashboard drawPanelLab />;
}
