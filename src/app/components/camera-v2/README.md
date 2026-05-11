# camera-v2

Rebuilt video feature. Currently lives only on `/playground`. Once the design
is validated there, swap it into the live `Dashboard` and delete the legacy
`CameraViewerPanel`.

## Layout

- `VideoPanel.tsx` — public surface. Picks a layout (1 fill / 2 stack / 2x2
  grid) and handles panel-level drop. Adding feeds is driven entirely by
  drag/drop or pin-from-devices.
- `CameraFeedTile.tsx` — a single feed with overlays. Owns hover/focus state,
  per-tile keyboard shortcuts, the empty drop-target, and the live-vs-playback
  split.
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
  scrubber + clip/remaining clocks + exit. Pinned LTR via `<DirIsland>`.
- `CameraDetectionsOverlay.tsx` — bounding-box overlay (mocked data).
- `types.ts` — `CameraFeed`, `CameraStatus`, `DetectionBox`,
  `PlaybackState` (+ `PlaybackStatus`).

## Pin & swap

- The devices panel exposes a `Pin` button on camera + drone cards
  (`onPinToFeed` prop). Clicking pins the device into the next available slot,
  appends, or swaps the least-recently-focused tile when the panel is full.
- Each tile is a drop target. Drop on a tile → swap. Drop on the panel
  background → same logic as click-to-pin.

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
chrome (PLAYBACK badge, scrubber, exit) anchored inside the bottom
half.

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
  bleed onto the incoming one. Critical for the multi-tile (up to 4)
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
   - `ownership: Record<string, 'self' | 'other' | 'none'>` (replaces today's
     `cameraControlRequest` countdown — keep the 10s request flow but write
     the result into `ownership` on completion).
   - `zoomById: Record<string, number>` (display only until PTZ is wired).
   - `detectionsByCameraId` — wire to your real detection feed.

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

6. **Devices panel**: pass `onPinToFeed` so operators can pin from the
   existing `DevicesPanel`. The panel-level drop already works because
   `VideoPanel` registers a `useDrop` itself.

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
