import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'GridblockShell',
  filePath: 'src/app/components/gridblock/GridblockShell.tsx',
  purpose:
    'Reusable 3-row x 5-column chrome shell that hosts a map / main content area between two vertical icon rails and two collapsible side panels, with a header and footer row above and below. Owns layout geometry and panel reveal/collapse animation only - all domain rendering happens inside the slot props (header, leftRail, leftPanel, map, rightPanel, rightRail, footer). The grid uses logical-edge borders so the chrome mirrors correctly under dir="rtl".',
  location: 'Composition (gridblock shell)',
  status: 'in-progress',

  props: [
    { name: 'header', type: 'ReactNode', required: true, description: 'Top chrome row. Typically <GridblockHeader />.' },
    { name: 'footer', type: 'ReactNode', required: true, description: 'Bottom chrome row. Typically <GridblockFooter />.' },
    { name: 'leftRail', type: 'ReactNode', required: true, description: 'Vertical icon rail on the inline-start edge.' },
    { name: 'rightRail', type: 'ReactNode', required: true, description: 'Vertical icon rail on the inline-end edge.' },
    { name: 'leftPanel', type: 'ReactNode | null', required: true, description: 'Side panel content for inline-start. null collapses the panel column to 0 with an animated grid-template-columns transition.' },
    { name: 'rightPanel', type: 'ReactNode | null', required: true, description: 'Side panel content for inline-end. null collapses the column to 0.' },
    { name: 'map', type: 'ReactNode', required: true, description: 'Map / main content cell. Always claims the remaining 1fr.' },
    { name: 'leftPanelWidthPx', type: 'number', required: false, defaultValue: '300', description: 'Width the inline-start panel expands to when its slot is non-null. Typically driven by useGridblockPanelSizes for per-operator persistence.' },
    { name: 'rightPanelWidthPx', type: 'number', required: false, defaultValue: '300', description: 'Width the inline-end panel expands to when its slot is non-null.' },
    { name: 'onLeftPanelResize', type: '(widthPx: number) => void', required: false, description: 'Called when the operator drags or keyboard-nudges the left panel edge against the map. Receives the new width in CSS pixels (already clamped to [240, 600] by useGridblockPanelSizes). Omit to disable resizing on this side (no handle is mounted).' },
    { name: 'onRightPanelResize', type: '(widthPx: number) => void', required: false, description: 'Called when the operator drags or keyboard-nudges the right panel edge. Mirror of onLeftPanelResize.' },
    { name: 'leftResizeAriaLabel', type: 'string', required: false, defaultValue: '"Resize left panel"', description: 'Accessible label for the left panel resize separator. Pass a localized string when available.' },
    { name: 'rightResizeAriaLabel', type: 'string', required: false, defaultValue: '"Resize right panel"', description: 'Accessible label for the right panel resize separator.' },
  ],

  states: [
    { name: 'both panels closed', trigger: 'leftPanel === null && rightPanel === null', description: 'Map fills the entire content row between the two rails. Panel columns are 0px.', implementedInPrototype: true },
    { name: 'left panel open', trigger: 'leftPanel !== null', description: 'Left panel column expands to leftPanelWidthPx; map column shrinks elastically; AnimatePresence fades+slides the panel in from the inline-start edge.', implementedInPrototype: true },
    { name: 'right panel open', trigger: 'rightPanel !== null', description: 'Mirror of "left panel open".', implementedInPrototype: true },
    { name: 'both panels open', trigger: 'leftPanel !== null && rightPanel !== null', description: 'Both panel columns are at their respective widthPx; map gets the remaining 1fr.', implementedInPrototype: true },
    { name: 'drag resizing', trigger: 'pointerdown on a GridblockResizeHandle followed by pointermove', description: 'Handle claims the pointer via setPointerCapture, sets data-gridblock-resizing on documentElement to suppress the column-track transition, then emits new widthPx values through onLeftPanelResize / onRightPanelResize on every pointermove. Because the handle owns the pointer, the drag tracks the cursor 1:1 even when it leaves the viewport, hovers a different OS window, or crosses Cesium\'s canvas.', implementedInPrototype: true },
    { name: 'rtl', trigger: 'dir="rtl" on an ancestor', description: 'Visual order of cells reverses (right rail on left, left rail on right). Edge borders paint on logical (inline-start/end) sides so seams stay correct. Resize handles flip their delta sign so dragging the cursor toward the panel always grows it.', implementedInPrototype: true },
    { name: 'reduced motion', trigger: 'prefers-reduced-motion: reduce', description: 'Grid column transition disabled; rail/icon press transforms disabled. Panel content still mounts/unmounts but without slide.', implementedInPrototype: true },
  ],

  interactions: [
    { trigger: 'change', element: 'leftPanel prop transitions from null to a node', result: 'Left panel column animates 0 -> leftPanelWidthPx; AnimatePresence fades panel content in (240ms ease-out, x: -12 -> 0).' },
    { trigger: 'change', element: 'leftPanel prop transitions to null', result: 'Panel content fades out (180ms ease-in, x: 0 -> -12), then column animates back to 0px.' },
    { trigger: 'change', element: 'rightPanel prop', result: 'Same as leftPanel but mirrored on the inline-end side.' },
    { trigger: 'pointerdown', element: 'GridblockResizeHandle (map-adjacent edge of an open panel cell)', result: 'Captures the rendered cell width as a baseline, claims the pointer via setPointerCapture(pointerId), and sets data-gridblock-resizing on <html>. Every subsequent pointermove (routed to the handle by pointer capture) fires the matching onResize callback with the new width.' },
    { trigger: 'pointerup / pointercancel / lostpointercapture', element: 'GridblockResizeHandle during a drag', result: 'Releases the captured pointer, clears the drag baseline, and removes data-gridblock-resizing. The final width is whatever onResize last reported. Same end-state regardless of which exit path fires.' },
    { trigger: 'window blur / document.visibilitychange to hidden', element: 'window during a drag', result: 'Treated as an aborted drag: clears data-gridblock-resizing, releases capture if still held, and drops the drag baseline. Prevents the shell from coming back from an alt-tab or minimised tab with the column transition still suppressed.' },
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
      { name: 'footer-height', value: '33px', usage: 'Height of the bottom chrome row.' },
      { name: 'map-inset', value: '4px', usage: 'Page-bg moat around the map tile.' },
      { name: 'panel-width-default', value: '300px', usage: 'Initial width of each side panel column. Operator can drag the resize handle to override; useGridblockPanelSizes persists the choice per side.' },
      { name: 'panel-width-min', value: '240px', usage: 'Lower clamp for the resize handle (PANEL_WIDTH_MIN_PX in useGridblockPanelSizes). No upper cap — the shell clamps the rendered column at the viewport via CSS `min()` so the right panel can grow to full width and hide the map.' },
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
      'Resize handles render as role="separator" with aria-orientation="vertical" and aria-valuenow / -valuemin / -valuemax in CSS pixels.',
    ],
    keyboardNav: [
      'Tab traversal follows source order: header -> left rail -> left panel -> resize handle -> map -> right panel -> resize handle -> right rail -> footer. RTL flips the visual order but DOM order is unchanged so screen readers and Tab order stay logical.',
      'When a resize handle is focused: ArrowLeft / ArrowRight nudges ±16px, Shift+Arrow nudges ±64px.',
    ],
    focusManagement: 'Shell does not trap or move focus. Panel mount/unmount is handled by AnimatePresence; consumers should preserve focus when their panels open or close. Resize handles are tabbable when their panel is open.',
  },

  tasks: [
    {
      id: 'GS-1',
      title: 'Wire DashboardV2 onto GridblockShell',
      priority: 'P0',
      estimate: 'M',
      description: 'Compose the new dashboard around GridblockShell with three left tabs (targets, cameras, devices) and an empty right rail.',
      files: [{ path: 'src/app/components/dashboard-v2/DashboardV2.tsx', action: 'create', description: 'New page mounting GridblockShell with hooks-driven panel content.' }],
      acceptanceCriteria: [
        'Selecting a left tab opens the matching panel and the map shrinks elastically.',
        'Selecting the same tab again collapses the panel and the map expands back.',
        'RTL flip reverses cell order without breaking seams.',
      ],
    },
  ],

  notes: [
    'Shell is content-agnostic: it never imports domain components. All target / camera / device rendering happens in the consumer page.',
    'Right rail occupies a column even when its tab list is empty. This keeps the grid symmetric and means adding right-rail tabs later is a pure-content change with no layout shift.',
    'CSS uses logical edges (border-inline-start / border-inline-end) so the seams paint correctly under dir="rtl". translateX in the panel reveal animation is in pixels, but the panels are placed in source order so the slide direction stays "toward the rail" in both LTR and RTL.',
    'Panels stay mounted at all times (the column track interpolates between two fully-defined widths). This is what gives the shell its smooth elastic-resize feel without conditional mounting flicker.',
  ],
};
