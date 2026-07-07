/**
 * Co-located doc module for the MapMarker block — the composable tactical
 * marker (surface / ring / glyph / glow / overlays) driven by
 * resolveMarkerStyle(). Meta + anatomy live in `registry/manifest.json`.
 */
import {
  MapMarker,
  resolveMarkerStyle,
  resolveAssetMarkerStyle,
  ASSET_HEALTHS,
  ASSET_HEALTH_LABELS,
  AFFILIATION_LABELS,
  type Affiliation,
} from '@/primitives';
import { DroneCardIcon, UnknownIcon } from '@/primitives/MapIcons';
import mapMarkerSrc from '@/primitives/MapMarker.tsx?raw';
import markerStylesSrc from '@/primitives/markerStyles.ts?raw';
import type { ComponentDocModule } from '../registry/types';

const AFFS: Affiliation[] = ['friendly', 'hostile', 'possibleThreat', 'unknown'];

export const mapMarkersDoc: ComponentDocModule = {
  id: 'map-markers',
  source: mapMarkerSrc,
  relatedFiles: [{ file: 'markerStyles.ts', code: markerStylesSrc }],
  usage: `import { MapMarker, resolveMarkerStyle } from "@/primitives"
import { DroneCardIcon } from "@/primitives/MapIcons"

const style = resolveMarkerStyle("default", "hostile")

<MapMarker
  icon={<DroneCardIcon size={20} />}
  style={style}
  surfaceSize={36}
  ringSize={28}
  label="TRK-4471"
  showLabel={hovered}
/>`,
  examples: [
    {
      id: 'affiliations',
      title: 'Affiliations',
      description:
        'resolveMarkerStyle(state, affiliation) picks the palette: friendly stays white-on-black ring, hostile red, possible-threat orange, unknown yellow. The glyph rides style.glyphColor.',
      code: `{AFFILIATIONS.map((aff) => (
  <MapMarker
    icon={<DroneCardIcon size={20} />}
    style={resolveMarkerStyle("default", aff)}
    surfaceSize={36}
    ringSize={28}
  />
))}`,
      render: () => (
        <div className="flex items-end gap-8">
          {AFFS.map((aff) => {
            const style = resolveMarkerStyle('default', aff);
            return (
              <div key={aff} className="flex flex-col items-center gap-2">
                <MapMarker
                  icon={<span style={{ color: style.glyphColor }}><DroneCardIcon size={20} /></span>}
                  style={style}
                  surfaceSize={36}
                  ringSize={28}
                />
                <span className="text-2xs text-slate-9">{AFFILIATION_LABELS[aff]}</span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      id: 'interaction',
      title: 'Interaction states',
      description:
        'hovered / selected flip the ring white and light the inner glow; hover a marker here to see the built-in pulse. expired desaturates to a dashed gray ring.',
      code: `<MapMarker style={resolveMarkerStyle("default", "hostile")} … />
<MapMarker style={resolveMarkerStyle("selected", "hostile")} … />
<MapMarker style={resolveMarkerStyle("expired", "hostile")} … />`,
      render: () => (
        <div className="flex items-end gap-8">
          {(['default', 'selected', 'expired'] as const).map((state) => {
            const style = resolveMarkerStyle(state, 'hostile');
            return (
              <div key={state} className="flex flex-col items-center gap-2">
                <MapMarker
                  icon={<span style={{ color: style.glyphColor }}><DroneCardIcon size={20} /></span>}
                  style={style}
                  surfaceSize={36}
                  ringSize={28}
                />
                <span className="text-2xs text-slate-9">{state}</span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      id: 'asset-health',
      title: 'Friendly-asset health',
      description:
        'resolveAssetMarkerStyle(health, interaction) recolors only the resting ring by health tier — warning amber, error red, offline dashed gray — while the glyph stays white so identity never changes.',
      code: `<MapMarker style={resolveAssetMarkerStyle("warning")} … />
<MapMarker style={resolveAssetMarkerStyle("error")} … />
<MapMarker style={resolveAssetMarkerStyle("offline")} … />`,
      render: () => (
        <div className="flex items-end gap-8">
          {ASSET_HEALTHS.map((health) => {
            const style = resolveAssetMarkerStyle(health);
            return (
              <div key={health} className="flex flex-col items-center gap-2">
                <MapMarker
                  icon={<span style={{ color: style.glyphColor }}><DroneCardIcon size={20} /></span>}
                  style={style}
                  surfaceSize={36}
                  ringSize={28}
                />
                <span className="text-2xs text-slate-9">{ASSET_HEALTH_LABELS[health]}</span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      id: 'overlays',
      title: 'Overlays — compass badge, status badge, label',
      description:
        'heading + showBadge add a compass letter at the ring edge; statusBadgeText pins a corner chip; label + showLabel float a tooltip above the marker.',
      code: `<MapMarker
  icon={<DroneCardIcon size={20} />}
  style={resolveMarkerStyle("default", "hostile")}
  heading={270}
  showBadge
  statusBadgeText="GPS"
  statusBadgeTone="danger"
  label="TRK-4471"
  showLabel
/>`,
      render: () => {
        const style = resolveMarkerStyle('default', 'hostile');
        return (
          <div className="px-16 py-6">
            <MapMarker
              icon={<span style={{ color: style.glyphColor }}><DroneCardIcon size={20} /></span>}
              style={style}
              surfaceSize={42}
              ringSize={34}
              heading={270}
              showBadge
              statusBadgeText="GPS"
              statusBadgeTone="danger"
              label="TRK-4471"
              showLabel
            />
          </div>
        );
      },
    },
  ],
  edgeCases: [
    {
      id: 'unclassified',
      label: 'Unclassified blip',
      note: 'A sensor-only track renders as a plain gray glyph with no ring — it carries no urgency color until classified.',
      render: () => (
        <MapMarker
          icon={<UnknownIcon size={24} />}
          style={resolveMarkerStyle('default', 'unknown', { ringWidth: 0, ringOpacity: 0 })}
          surfaceSize={36}
          ringSize={28}
        />
      ),
    },
    {
      id: 'ring-larger',
      label: 'Ring larger than surface',
      note: 'ringSize can exceed surfaceSize — the outer hit area grows to the larger of the two.',
      render: () => {
        const style = resolveMarkerStyle('default', 'possibleThreat');
        return (
          <MapMarker
            icon={<span style={{ color: style.glyphColor }}><DroneCardIcon size={18} /></span>}
            style={style}
            surfaceSize={30}
            ringSize={46}
          />
        );
      },
    },
  ],
};
