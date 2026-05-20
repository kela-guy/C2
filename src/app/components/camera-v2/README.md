# camera-v2

Rebuilt video feature. Mounted in the live `Dashboard` as the camera viewer
(replacing the deleted legacy `CameraViewerPanel`). Iterated on its own
`/playground` route during design validation; the playground was folded into
the dashboard once approved and the route removed.

## Layout

- `VideoPanel.tsx` — public surface. Hosts an operator-controlled layout
  picker (`VideoLayoutPicker`) and renders one of four presets: `single` /
  `stack-2` / `grid-2x2` / `hero-filmstrip`. Holds up to 5 feeds total
  (1 hero + 4 thumbs). Handles panel-level drop. Adding feeds is driven
  entirely by drag/drop or pin-from-devices.
- `VideoLayoutPicker.tsx` — segmented icon row anchored to the panel's
  top inline-end corner (mirrors the Apple Finder view-mode control).
  Four icons: `Square` (single), `Rows2` (stack), `Grid2x2` (grid),
  `LayoutPanelTop` (hero+filmstrip). Disables presets that cannot fit
  the current feed count. Stays `dir="ltr"` even in RTL apps so the
  layout-shape glyphs read correctly.
- `CameraFeedTile.tsx` — a single feed with overlays. Owns hover/focus state,
  per-tile keyboard shortcuts, the empty drop-target, and the live-vs-playback
  split. Accepts a `tileVariant` (`'fill' | 'hero' | 'thumb'`) that controls
  in-tile chrome — thumbs hide the noisy bottom strips and gain the centered
  "Use as main" overlay.
- `TileDetectionAlert.tsx` — two-tier red-gradient detection signal mounted
  inside each tile (state ring + one-shot pulse on new detection ids).
  Suppressed on hero tiles when `feed.showDetections` is on (boxes already
  convey it).
- `useDetectionPulse.ts` — hook that drives `TileDetectionAlert`. Tracks a
  `Set<string>` of seen detection ids per tile and bumps a `pulseKey` when a
  new id appears. Two tiles showing the same `cameraId` get independent
  counters by design.
- `CameraTopHud.tsx` — always-visible top overlay. Centered CoD-Warzone
  heading strip.
- `CameraCompassStrip.tsx` — horizontal heading strip (replaces the previous
  circular `CameraCompassHud`).
- `CameraControlBar.tsx` — hover-revealed bottom bar. Lock (icon-only),
  Day/Night, AI scan (ScanSearch + Sparkles), Designate target (crosshair
  icon), Settings (gear), Fullscreen.
- `CameraSettingsMenu.tsx` — Radix Popover anchored to the gear button.
  Sections: Playback investigation, Display.
- `CameraContextMenu.tsx` — right-click menu (Take/Release, Day/Night, AI,
  Designate target, Reset view, Open settings, Pin to grid stub).
- `DesignateTargetOverlay.tsx` — armed when `feed.designateMode` is true.
  Forces the cursor to crosshair, draws a follow-cursor reticle and amber
  inset ring, shows a hint banner ("לחץ כדי לסמן יעד · Esc לביטול"), and
  fires `onDesignateTarget(normX, normY)` on click before the parent exits
  the mode. A brief amber "ping" lingers at the chosen point as a receipt.
- `CameraTelemetryStrip.tsx` — bottom-center read-only telemetry, drone-only
  (altitude + velocity). Cameras render nothing here; their controllable
  telemetry (zoom, day/night, AI, designate, etc.) lives on the control bar.
- `DroneHud.tsx` — right-edge stat column. Mounts only when
  `status.deviceType === 'drone'` (battery / signal / distance / relative
  bearing).
- `playback/PlaybackContainer.tsx` — playback investigation surface. A
  single bottom-half frame inside the tile. Owns the playback `<video>`
  ref, wires every media event (`loadedmetadata`, `error`, `waiting`,
  `playing`, `pause`, `ended`, autoplay rejection), and renders the
  status chrome (loading / buffering / replay / error).
- `playback/playbackDefaults.ts` — single source of truth for playback
  defaults: rewind-on-open (30s), buffering grace (600ms), and the
  `makeOpenPlaybackState` constructor.
- `PlaybackTimeline.tsx` — minimal transport. Play/pause + Radix
  scrubber + clip/remaining clocks. No inline exit — leaving playback
  goes through the live half (Settings → playback row, `P`, or `Esc`).
  Pinned LTR via `<DirIsland>`.
- `CameraDetectionsOverlay.tsx` — bounding-box overlay (mocked data).
- `types.ts` — `CameraFeed`, `CameraStatus`, `DetectionBox`,
  `PlaybackState` (+ `PlaybackStatus`).

## Pin & swap

- Pin/unpin/LRU logic lives in `useVideoFeeds` (`pinDevice`, `unpinDevice`,
  `recordTileFocus`, `pinnedDeviceIds`). `CamerasPanel` and `DevicesPanel`
  both call into the same hook via Dashboard wiring.
- The devices panel exposes hover-revealed pin + center-on-map icons on
  camera + drone rows (`onPinToFeed` / `onUnpinFromFeed`). The expanded card
  footer still has a text pin button.
- When `feeds.length === 0`, `VideoPanel` renders `VideoPanelEmptyState`
  with copy pointing operators to pin from the devices list.
- Each tile is a drop target. Drop on a tile → swap. Drop on the panel
  background → same logic as click-to-pin.
- Maximum feed count is 5 (so `hero-filmstrip` can hold a hero + 4 thumbs).

## Layouts

The panel never auto-picks a layout from feed count anymore; the operator
chooses via the picker. Persistence lives at the parent (PlaygroundPage /
Dashboard) under `localStorage` key `c2.video-layout.v1` so the panel
re-opens in the same shape across sessions.

When the chosen layout cannot fit `feeds.length` (e.g. `hero-filmstrip`
with one feed), the panel falls back deterministically:

```
hero-filmstrip → grid-2x2 → stack-2 → single
```

The chosen value is preserved in props so the picker keeps reflecting
operator intent — only the rendered layout adapts.

### Hero+Filmstrip

- `feeds[activeFeedIndex]` takes the top ~78% of panel height. Same chrome as
  `fill` (full HUD, control bar, designate, playback split).
- Remaining feeds render as a horizontal grid (`grid-flow-col
  auto-cols-fr`) across the bottom ~22%. Each thumb gets a centered
  "Use as main" overlay (Hebrew: "הצג כראשי") that fades in on hover or
  focus. Click promotes the thumb; double-click on the thumb body does
  the same. Inner interactive elements (`button`, `[role=button]`, `a`,
  `input`, `[data-no-promote]`) are excluded from the double-click
  gesture so existing tile controls still work.

## Detection signal

Each tile mounts `TileDetectionAlert` (unless suppressed). It runs in two
tiers:

1. **State ring** — present whenever `detections.length > 0`. A 2px inset
   red shadow plus a soft top→bottom red gradient frames the tile. Pure
   visual (`pointer-events-none`); 200ms opacity fade on mount.
2. **Pulse on new** — when `useDetectionPulse` observes a detection id
   that wasn't in the previous render, it bumps `pulseKey`. The pulse
   layer re-mounts keyed by that integer, animating opacity 0 → 0.95 →
   0.6 → 0 over ~650ms (degrades to a flat 0 → 0.6 → 0 fade under
   `prefers-reduced-motion: reduce`).

The intent is twofold: the always-on ring tells the operator "this feed
has activity right now"; the pulse grabs their eye when something new
arrives — important when the feed is rendering as a thumb and the
operator is staring at the hero. On the hero tile itself, the ring is
suppressed when `feed.showDetections` is on, because the boxes already
carry the same information.

## Keyboard shortcuts (when a tile is focused)

- `T` — take / release control
- `D` — day / night
- `X` — toggle designate-target mode (cursor → crosshair, next click designates)
- `S` — open / close settings popover
- `P` — toggle playback investigation
- `F` — fullscreen
- `Esc` — designate cancel → settings close → playback exit → fullscreen exit
  (priority order; the most local context wins first)

## Keyboard shortcuts (when the playback transport is focused)

- `Arrow ←/→` — move the scrubber by one step

## Playback investigation surface

Playback is the operator's investigation tool inside a live operational
tile. It is intentionally surfaced *next to* the live feed rather than
replacing it, so the operator can compare live and recorded footage at
the same scale.

### Layout

One mode: a vertical 50/50 split. Live shrinks to the top half; the
playback container takes the bottom half (`top-1/2`, `border-t-2
border-red-500/80`). The live HUD (drone overlay, telemetry strip,
control bar) renders *inside the live frame* so its bottom edge tracks
the live half — when playback is open the control bar surfaces on
hover at the live/playback divider rather than disappearing or
overlapping the playback transport. The playback container has its own
chrome (PLAYBACK badge, scrubber) anchored inside the bottom half. It
deliberately renders **no** exit affordance — the operator returns to
live by toggling the feature off from the live half (Settings →
playback row, `P`, or `Esc`), keeping the investigation surface
focused on the recording rather than on navigation.

The `CameraFeedTile` wrapper uses `isolate` to scope the tile's
stacking context so the `z-30` playback surface stays bounded inside
the tile — it can never paint over global panels (e.g. DevicesPanel
at `z-10`) that geometrically overlap the tile.

### State model

Per-feed playback state lives in `feed.playback: PlaybackState`. It is
runtime-only: `enabled`, `sourceId`, `positionSec`, `durationSec`,
`isPlaying`, `status`, `isScrubbing`, `errorMessage`. There is no
persistence and no preference layer — every camera open starts fresh.

When the operator opens playback for the first time on a feed,
`makeOpenPlaybackState` rewinds to `max(0, durationSec - 30)` and starts
paused so the operator scrubs deliberately rather than the clip
auto-running from `0`.

### Status chrome

The playback frame surfaces a localised, *actionable* state for every
media condition:

- `loading` / `idle (durationSec === 0)` — spinner overlay.
- `buffering` — spinner overlay after a 600ms grace timer.
- `ended` — "Replay" button overlay.
- `error` — error card with an inline retry button. Browser autoplay
  rejection and `onError` events both route here.

### Edge cases

- **Foreign-locked** (`controlOwner === 'other'`) — playback stays
  fully usable. Read-only investigation is not a control op.
- **Camera swap with playback open** — both `VideoPanel.handleSwapFeed`
  and `PlaygroundPage.handlePinDevice` (LRU swap + empty-slot fill)
  reset `playback` to `undefined` on cameraId replacement so the
  position / sourceId / errorMessage from the outgoing camera cannot
  bleed onto the incoming one. Critical for the multi-tile (up to 5)
  grid.
- **Autoplay-rejected `play()`** — the container catches the rejection
  and surfaces a paused state with a Play button instead of failing
  silently.

## Promotion path → Dashboard

Once the `/playground` design is locked in, this is the swap into the live
`Dashboard`:

1. **Replace the import** in `src/app/components/Dashboard.tsx`:

   ```ts
   // before
   import { CameraViewerPanel } from './CameraViewerPanel';
   import type { CameraFeed } from './CameraViewerPanel';

   // after
   import { VideoPanel } from './camera-v2/VideoPanel';
   import type { CameraFeed } from './camera-v2/types';
   ```

   `CameraFeed` gained `mode`, `showDetections?`, `designateMode?`, and
   `playback?`. Initialise each new feed with `{ cameraId, mode: 'day' }`.

2. **Lift state** into Dashboard:

   - `panelFullscreen: boolean`
   - `layout: LayoutKind` and `activeFeedIndex: number` (default `'grid-2x2'` /
     `0`). Persist them — plus `feeds[]` (cameraId + mode) — to
     `localStorage` under `c2.video-layout.v1`. `useVideoFeeds` owns the
     read/write + one-shot migration from the legacy `{ layout, heroIndex }`
     shape. Clamp `activeFeedIndex` whenever a feed is removed.
   - `ownership: Record<string, 'self' | 'other' | 'none'>` (replaces today's
     `cameraControlRequest` countdown — keep the 10s request flow but write
     the result into `ownership` on completion).
   - `zoomById: Record<string, number>` (display only until PTZ is wired).
   - `detectionsByCameraId` — wire to your real detection feed. The
     `TileDetectionAlert` will start firing automatically as soon as a
     non-empty array shows up for a feed; supply `firstSeenAt` on the
     box if the backend has it (otherwise the hook synthesises arrival
     via id-set diff).

3. **Wire the existing handlers** that are already plumbed through
   `ListOfSystems` (today they're no-ops at lines 1729-1731 of `Dashboard`):

   - `onTakeControl(targetId)` → set `pendingRequest` for the camera assigned
     to that target.
   - `onReleaseControl(targetId)` → clear ownership.
   - `onSensorModeChange(targetId, mode)` → flip the feed's `mode` for the
     camera assigned to that target.

4. **Build the `statusByCameraId` map** in Dashboard from existing state:

   - `bearingDeg` / `fovDeg` — from `CAMERA_ASSETS`.
   - `controlOwner` / `controlOwnerName` — from the new `ownership` state.
   - `assignedTargetId` / `assignedTargetLabel` — derive from
     `cameraLookAtRequest` + the active target.
   - `linkedFromDeviceId` / `linkedFromDeviceLabel` — from the slewing
     orchestrator (when present).
   - `deviceType` — `'camera'` or `'drone'`. Drones reuse the same tile and
     get the `DroneHud` overlay automatically.

5. **Panel fullscreen**: when `panelFullscreen` is true, set the map's
   `ResizablePanel.defaultSize` to 0 (or hide it) and the video panel's to
   100. Otherwise keep the existing 55/45 split.

6. **Devices panel**: `DevicesPanelHost` passes `onPinToFeed` /
   `onUnpinFromFeed` / `pinnedDeviceIds` from `useVideoFeeds`. The panel-level
   drop already works because `VideoPanel` registers a `useDrop` itself.

7. **Delete the legacy files**:

   - `src/app/components/CameraViewerPanel.tsx`
   - `src/app/components/CameraViewerPanel.spec.ts`

## Out of scope

- Real RTSP/WebRTC stream wiring — still uses `/videos/target-feed.mov` and
  `/videos/weapon-feed.mp4` as the day/night placeholders.
- Live PTZ commands — zoom slider only updates UI state.
- Real detection backend — `detectionsByCameraId` is mocked.
- Multi-operator presence — `controlOwner: 'other'` is currently a local mock.
- Real recording archive — playback half reuses `weapon-feed.mp4`. The
  duration is now read from `<video>.onLoadedMetadata` instead of the old
  hardcoded `60s`, but the source URL is still placeholder.
- Real drone telemetry — synthetic 1Hz tick on `/playground`.
