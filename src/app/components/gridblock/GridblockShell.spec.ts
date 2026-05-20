import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'GridblockShell',
  filePath: 'src/app/components/gridblock/GridblockShell.tsx',
  purpose:
    'Reusable 2-row x 5-column chrome shell that hosts a map / main content area between two vertical icon rails and two collapsible side panels, with a header row above. Owns layout geometry and panel reveal/collapse animation only - all domain rendering happens inside the slot props (header, startRail, startPanel, map, endPanel, endRail). Mode-specific chrome like the History timeline mounts inside the relevant slot (e.g. the map slot owns its own footer when it needs one) so the shell stays a pure geometry contract. The grid uses logical-edge borders so the chrome mirrors correctly under dir="rtl", and the panel-resize gesture is a three-zone elastic drag with snap-back and drag-to-close.',
  location: 'Composition (gridblock shell)',
  status: 'in-progress',

  props: [
    { name: 'header', type: 'ReactNode', required: true, description: 'Top chrome row. Typically <GridblockHeader />.' },
    { name: 'startRail', type: 'ReactNode', required: true, description: 'Vertical icon rail on the inline-start edge.' },
    { name: 'endRail', type: 'ReactNode', required: true, description: 'Vertical icon rail on the inline-end edge.' },
    { name: 'startPanel', type: 'ReactNode | null', required: true, description: 'Side panel content for inline-start. null collapses the panel column to 0 with an animated grid-template-columns transition.' },
    { name: 'endPanel', type: 'ReactNode | null', required: true, description: 'Side panel content for inline-end. null collapses the column to 0.' },
    { name: 'map', type: 'ReactNode', required: true, description: 'Map / main content cell. Always claims the remaining 1fr.' },
    { name: 'startPanelWidthPx', type: 'number', required: false, defaultValue: '300', description: 'Width the inline-start panel expands to when its slot is non-null. Typically driven by useGridblockPanelSizes for per-operator persistence.' },
    { name: 'endPanelWidthPx', type: 'number', required: false, defaultValue: '300', description: 'Width the inline-end panel expands to when its slot is non-null.' },
    { name: 'onStartPanelResize', type: '(widthPx: number) => void', required: false, description: 'Called when the operator drags or keyboard-nudges the inline-start panel edge against the map. Receives the new width in CSS pixels (clamped loosely to [0, PANEL_WIDTH_MAX_PX] by useGridblockPanelSizes so the elastic zone can render below MIN during drag). Omit to disable resizing on this side (no handle is mounted).' },
    { name: 'onEndPanelResize', type: '(widthPx: number) => void', required: false, description: 'Called when the operator drags or keyboard-nudges the inline-end panel edge. Mirror of onStartPanelResize, clamped to [0, PANEL_WIDTH_END_MAX_PX] (intentionally loose so the cameras panel can grow toward full-width).' },
    { name: 'onStartPanelClose', type: '() => void', required: false, description: 'Called once when the operator drags the inline-start panel below PANEL_WIDTH_CLOSE_THRESHOLD_PX (120px) and releases. The shell resets the stored width to MIN before invoking this callback, so consumers only need to clear their open/closed state. Omit to disable drag-to-close on this side (sub-threshold drags then snap back to MIN like any other elastic release).' },
    { name: 'onEndPanelClose', type: '() => void', required: false, description: 'Same as onStartPanelClose but for the inline-end panel.' },
    { name: 'startPanelMaxPx', type: 'number', required: false, defaultValue: 'PANEL_WIDTH_MAX_PX', description: "Upper bound the inline-start resize handle reports as aria-valuemax. The actual width clamp lives in the controlling hook; this prop only feeds assistive tech. Pass a tighter value when a mode-specific cap is in effect." },
    { name: 'endPanelMaxPx', type: 'number', required: false, defaultValue: 'PANEL_WIDTH_MAX_PX', description: 'Same as startPanelMaxPx, for the inline-end handle. Dashboard passes PANEL_WIDTH_END_MAX_PX by default and overrides to PANEL_WIDTH_END_MAX_HISTORY_PX (720) while the History panel is open so screen readers reflect the operative ceiling.' },
    { name: 'startResizeAriaLabel', type: 'string', required: false, defaultValue: '"Resize panel"', description: 'Accessible label for the inline-start resize separator. Pass a localized string when available. Default is side-neutral so it reads correctly under dir="rtl".' },
    { name: 'endResizeAriaLabel', type: 'string', required: false, defaultValue: '"Resize panel"', description: 'Accessible label for the inline-end resize separator.' },
  ],

  states: [
    { name: 'both panels closed', trigger: 'startPanel === null && endPanel === null', description: 'Map fills the entire content row between the two rails. Panel columns are 0px.', implementedInPrototype: true },
    { name: 'start panel open', trigger: 'startPanel !== null', description: 'Inline-start panel column expands to startPanelWidthPx; map column shrinks elastically; AnimatePresence fades+slides the panel in from the inline-start edge.', implementedInPrototype: true },
    { name: 'end panel open', trigger: 'endPanel !== null', description: 'Mirror of "start panel open".', implementedInPrototype: true },
    { name: 'both panels open', trigger: 'startPanel !== null && endPanel !== null', description: 'Both panel columns are at their respective widthPx; map gets the remaining 1fr.', implementedInPrototype: true },
    { name: 'drag resizing (above MIN)', trigger: 'pointerdown on a GridblockResizeHandle followed by pointermove with width >= 300px', description: 'Handle claims the pointer via setPointerCapture, sets data-gridblock-resizing on documentElement to suppress the column-track transition, then emits new widthPx values through onStartPanelResize / onEndPanelResize on every pointermove. Because the handle owns the pointer, the drag tracks the cursor 1:1 even when it leaves the viewport, hovers a different OS window, or crosses Cesium\'s canvas.', implementedInPrototype: true },
    { name: 'drag in elastic zone', trigger: 'pointermove drags the width below PANEL_WIDTH_MIN_PX (300) but above PANEL_WIDTH_CLOSE_THRESHOLD_PX (120)', description: 'The panel keeps tracking the cursor 1:1 visually — the hook accepts loose values [0, MAX] for live state. On release, the handle calls onResize(snapMinPx) to snap the stored width back to MIN. The grid-template-columns transition re-engages on release so the snap reads as an animated settle, not a jump.', implementedInPrototype: true },
    { name: 'drag below close threshold', trigger: 'pointermove drags the width below PANEL_WIDTH_CLOSE_THRESHOLD_PX (120) and consumer provides onStartPanelClose / onEndPanelClose', description: 'On release, the handle calls onResize(snapMinPx) to reset the stored width and then onStartPanelClose / onEndPanelClose. The reset-then-close order means the next time the panel re-opens it does so at MIN, not at the sub-threshold drag width.', implementedInPrototype: true },
    { name: 'rtl', trigger: 'dir="rtl" on an ancestor', description: 'Visual order of cells reverses (end rail on left, start rail on right). Edge borders paint on logical (inline-start/end) sides so seams stay correct. Resize handles flip their delta sign so dragging the cursor toward the panel always grows it.', implementedInPrototype: true },
    { name: 'reduced motion', trigger: 'prefers-reduced-motion: reduce', description: 'Grid column transition disabled; rail/icon press transforms disabled. Panel content still mounts/unmounts but without slide.', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'change', element: 'startPanel prop transitions from null to a node', result: 'Inline-start panel column animates 0 -> startPanelWidthPx; AnimatePresence fades panel content in (240ms ease-out, x: -12 -> 0).' },
    { trigger: 'change', element: 'startPanel prop transitions to null', result: 'Panel content fades out (180ms ease-in, x: 0 -> -12), then column animates back to 0px.' },
    { trigger: 'change', element: 'endPanel prop', result: 'Same as startPanel but mirrored on the inline-end side.' },
    { trigger: 'pointerdown', element: 'GridblockResizeHandle (map-adjacent edge of an open panel cell)', result: 'Captures the rendered cell width as a baseline, claims the pointer via setPointerCapture(pointerId), and sets data-gridblock-resizing on <html>. Every subsequent pointermove (routed to the handle by pointer capture) fires the matching onResize callback with the new width and updates an internal lastWidthRef used by the release resolver.' },
    { trigger: 'pointerup / pointercancel / lostpointercapture', element: 'GridblockResizeHandle during a drag', result: 'Releases the captured pointer, clears the drag baseline, removes data-gridblock-resizing, then resolves the gesture endpoint: width < closeThresholdPx with onClose set → onResize(snapMinPx) then onClose(); width < snapMinPx → onResize(snapMinPx); otherwise → no-op (live path already wrote the final width). Same end-state regardless of which exit path fires.' },
    { trigger: 'window blur / document.visibilitychange to hidden', element: 'window during a drag', result: 'Treated as an aborted drag: clears data-gridblock-resizing, releases capture if still held, drops the drag baseline, and runs the same close/snap/no-op resolver as a normal pointerup. Prevents the shell from coming back from an alt-tab or minimised tab with the column transition still suppressed.' },
    { trigger: 'keydown', element: 'GridblockResizeHandle (focused)', result: 'ArrowLeft / ArrowRight nudges the width by ±16px (±64px with Shift). Direction-aware: the visual movement of the cursor always matches the visual movement of the edge.' },
  ],

  tokens: {
    colors: [
      { name: 'page-bg', value: '#111113', usage: 'Outer chrome background and the moat around the map tile.' },
      { name: 'bg', value: '#0e0f12', usage: 'Map cell background (inside the 4px page-bg moat).' },
      { name: 'surface', value: '#111317', usage: 'Side-panel background.' },
      { name: 'surface-elevated', value: '#1a1c20', usage: 'Panel header strip + popover surfaces.' },
      { name: 'border', value: '#2f2f2f', usage: '1px hairline between every chrome cell.' },
    ],
    typography: [],
    spacing: [
      { name: 'rail-width', value: '32px', usage: 'Width of each vertical icon rail column.' },
      { name: 'header-height', value: '32px', usage: 'Height of the top chrome row.' },
      { name: 'footer-height', value: '33px', usage: 'Height of the History timeline strip when the map slot mounts one as a footer (not consumed by the shell itself).' },
      { name: 'map-inset', value: '4px', usage: 'Page-bg moat around the map tile.' },
      { name: 'panel-width-default', value: '300px', usage: 'Initial width of each side panel column. Operator can drag the resize handle to override; useGridblockPanelSizes persists the choice per side.' },
      { name: 'panel-width-min', value: '300px', usage: 'Snap-back floor on drag release (PANEL_WIDTH_MIN_PX in useGridblockPanelSizes). Live state can dip below this during the elastic zone of a drag; release pulls it back up to this value.' },
      { name: 'panel-width-close-threshold', value: '120px', usage: 'Drag-release width below which the resize handle treats the gesture as drag-to-close (PANEL_WIDTH_CLOSE_THRESHOLD_PX). The handle resets the stored width to MIN and invokes onStartPanelClose / onEndPanelClose; consumers clear their open/closed state.' },
      { name: 'panel-width-max-start', value: '400px', usage: 'Upper clamp on the stored width for the inline-start panel (PANEL_WIDTH_MAX_PX). Targets / devices / history list surfaces saturate around this width.' },
      { name: 'panel-width-max-end', value: '2000px', usage: 'Upper clamp on the stored width for the inline-end panel (PANEL_WIDTH_END_MAX_PX). Intentionally loose so the cameras panel can grow toward full-width; the shell clamps the *rendered* column at the viewport via CSS `min()` so the operator can drag past the visible cap and reverse it cleanly. While the History panel is open the dashboard tightens this cap to PANEL_WIDTH_END_MAX_HISTORY_PX (720px).' },
      { name: 'resize-handle-width', value: '8px', usage: 'Pointer hit target on the map-adjacent edge of each open side panel. Fully transparent at rest; the 1px accent line lights only on hover, drag, and keyboard focus.' },
    ],
    animations: [
      { name: 'panel-reveal-enter', property: 'transform, opacity', from: 'x:-12,opacity:0', to: 'x:0,opacity:1', duration: '240ms', easing: 'cubic-bezier(0.32,0.72,0,1)' },
      { name: 'panel-reveal-exit', property: 'transform, opacity', from: 'x:0,opacity:1', to: 'x:-12,opacity:0', duration: '180ms', easing: 'cubic-bezier(0.4,0,1,1)' },
      { name: 'grid-column-transition', property: 'grid-template-columns', from: '0px', to: 'panelWidthPx', duration: '240ms', easing: 'cubic-bezier(0.65,0,0.35,1)' },
    ],
  },

  accessibility: {
    role: 'none',
    ariaAttributes: [
      'Inherits semantics from slot content (header role, region role on rails, etc.).',
      'Resize handles render as role="separator" with aria-orientation="vertical" and aria-valuenow / -valuemin / -valuemax in CSS pixels. aria-valuemin reflects the snap floor (PANEL_WIDTH_MIN_PX), not the close threshold — assistive tech surfaces the operative resize range, not the close gesture.',
    ],
    keyboardNav: [
      'Tab traversal follows source order: header -> start rail -> start panel -> resize handle -> map (including any in-slot footer like the History timeline) -> end panel -> resize handle -> end rail. RTL flips the visual order but DOM order is unchanged so screen readers and Tab order stay logical.',
      'When a resize handle is focused: ArrowLeft / ArrowRight nudges ±16px, Shift+Arrow nudges ±64px. Keyboard nudges do not trigger drag-to-close — close is a pointer gesture only.',
    ],
    focusManagement: 'Shell does not trap or move focus. Panel mount/unmount is handled by AnimatePresence; consumers should preserve focus when their panels open or close. Resize handles are tabbable when their panel is open.',
  },

  tasks: [
    {
      id: 'GS-1',
      title: 'Wire DashboardV2 onto GridblockShell',
      priority: 'P0',
      estimate: 'M',
      description: 'Compose the new dashboard around GridblockShell with three start-rail tabs (targets, cameras, devices) and an empty end rail.',
      files: [{ path: 'src/app/components/dashboard-v2/DashboardV2.tsx', action: 'create', description: 'New page mounting GridblockShell with hooks-driven panel content.' }],
      acceptanceCriteria: [
        'Selecting a start-rail tab opens the matching panel and the map shrinks elastically.',
        'Selecting the same tab again collapses the panel and the map expands back.',
        'RTL flip reverses cell order without breaking seams.',
        'Dragging a panel below 120px and releasing closes it.',
        'Dragging a panel between 120 and 300px and releasing snaps it back to 300px.',
      ],
    },
  ],

  notes: [
    'Shell is content-agnostic: it never imports domain components. All target / camera / device rendering happens in the consumer page.',
    'End rail occupies a column even when its tab list is empty. This keeps the grid symmetric and means adding end-rail tabs later is a pure-content change with no layout shift.',
    'CSS uses logical edges (border-inline-start / border-inline-end) so the seams paint correctly under dir="rtl". translateX in the panel reveal animation is in pixels, but the panels are placed in source order so the slide direction stays "toward the rail" in both LTR and RTL.',
    'Panels stay mounted at all times (the column track interpolates between two fully-defined widths). This is what gives the shell its smooth elastic-resize feel without conditional mounting flicker.',
    'Prop names are in logical-direction terms (start/end), matching the resize handle\'s side prop and the underlying CSS classes (gridblock-panel-cell--start / --end). The HE/RTL production locale paints "start" on the visual right; the API does not lie about that anymore.',
    'The three-zone resize gesture (free / snap-back / close) lives entirely in GridblockResizeHandle.endDrag — the shell just forwards onClose. This keeps the geometry contract free of gesture state and lets consumers opt in to drag-to-close by passing or omitting onStartPanelClose / onEndPanelClose.',
  ],
};
