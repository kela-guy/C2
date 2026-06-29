/**
 * Geo Entities Type — DEV sandbox.
 *
 * Mounts the live production `<Dashboard>` with the map-draw panel auto-
 * opened and a 5-tab (Opt 1..Opt 5) switcher visible at the top of the
 * panel that swaps the zone-Type selector's layout. Used to A/B between
 * the five candidate Type-section designs against the real platform UI.
 *
 * Lives at `/geo-entities-type-sandbox` in DEV. Production builds tree-
 * shake the route entirely (see {@link import('@/app/App')}).
 */

import { Dashboard } from '../Dashboard';

export default function GeoEntitiesTypeSandbox() {
  return <Dashboard typePanelLab />;
}
