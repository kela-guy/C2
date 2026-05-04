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
- `CameraTelemetryStrip.tsx` — bottom-center telemetry. Camera = zoom + FOV;
  drone = zoom + altitude + velocity.
- `DroneHud.tsx` — right-edge stat column. Mounts only when
  `status.deviceType === 'drone'` (battery / signal / distance / relative
  bearing).
- `PlaybackTimeline.tsx` — scrubber + transport for the playback half of the
  live-vs-playback split.
- `CameraDetectionsOverlay.tsx` — bounding-box overlay (mocked data).
- `types.ts` — `CameraFeed`, `CameraStatus`, `DetectionBox`, `PlaybackState`.

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
- `P` — toggle playback investigation (live-vs-playback split)
- `F` — fullscreen
- `Esc` — cancel designate-target mode, then close settings, then exit fullscreen

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
- Real recording archive — playback half reuses `weapon-feed.mp4` with a
  faked 60s timeline.
- Real drone telemetry — synthetic 1Hz tick on `/playground`.
