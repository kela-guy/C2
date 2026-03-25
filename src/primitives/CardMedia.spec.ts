import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'CardMedia',
  filePath: 'src/primitives/CardMedia.tsx',
  purpose: 'Renders the visual media slot for target cards — supports static images, live video feeds, video playback with scrubber controls, badge overlays, tracking labels, and a fullscreen lightbox.',
  location: 'TargetCard/Slots',
  status: 'prototype',

  props: [
    { name: 'src', type: 'string', required: false, description: 'URL of the image or video source. When absent with placeholder="none", component returns null.' },
    { name: 'type', type: "'video' | 'image'", required: false, defaultValue: "'image'", description: 'Media type — controls height, overlay indicators, and whether video controls render' },
    { name: 'placeholder', type: "'camera' | 'none'", required: false, defaultValue: "'none'", description: 'Placeholder mode when src is absent. "none" hides the component entirely.' },
    { name: 'overlay', type: 'React.ReactNode', required: false, description: 'Arbitrary overlay rendered as pointer-events-none layer on top of the media' },
    { name: 'badge', type: "'threat' | 'warning' | 'bird' | null", required: false, description: 'Badge icon shown in the bottom-left corner of the media area' },
    { name: 'trackingLabel', type: 'string', required: false, description: 'Sensor/tracking label displayed in a cyan pill at bottom-left (e.g. "PTZ-North")' },
    { name: 'aspectRatio', type: 'string', required: false, description: 'CSS aspect-ratio value applied via inline style' },
    { name: 'showControls', type: 'boolean', required: false, defaultValue: 'false', description: 'When true with type="video", shows inline playback controls (scrubber, play/pause, skip) and expand button' },
    { name: 'className', type: 'string', required: false, defaultValue: "''", description: 'Additional CSS classes on outer container' },
    { name: 'alt', type: 'string', required: false, defaultValue: "'תצפית מטרה'", description: 'Alt text for images (accessibility)' },
  ],

  states: [
    {
      name: 'default (static image)',
      trigger: 'src provided, type="image"',
      description: 'Displays image with grayscale + contrast filter, opacity-70 base with hover to 90%, dark overlay, and optional badge',
      implementedInPrototype: true,
      storyProps: {
        src: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&q=80&w=400&h=240',
        type: 'image',
        badge: 'threat',
      },
    },
    {
      name: 'live video feed',
      trigger: 'type="video", showControls=false',
      description: 'Autoplay muted looping video with LIVE indicator (pulsing red dot), PTZ camera label, and badge overlay',
      implementedInPrototype: true,
      storyProps: {
        src: '/videos/target-feed.mov',
        type: 'video',
        badge: 'threat',
      },
      visualNotes: 'h-[160px] container, red pulse dot on LIVE badge, PTZ camera label top-left',
    },
    {
      name: 'video with playback controls',
      trigger: 'type="video", showControls=true',
      description: 'Video with inline scrubber bar, play/pause toggle, skip ±5s buttons, progress time display, and expand-to-lightbox hover overlay',
      implementedInPrototype: true,
      storyProps: {
        src: '/videos/target-feed.mov',
        type: 'video',
        showControls: true,
      },
      visualNotes: 'Playback label top-right, gradient toolbar at bottom, cyan accent scrubber',
    },
    {
      name: 'expanded lightbox',
      trigger: 'User clicks expand button on video with controls',
      description: 'Portal-rendered fullscreen lightbox with larger video player, scrubber, play/pause, skip buttons, and close button',
      implementedInPrototype: true,
      visualNotes: 'Fixed overlay z-[9999], scale(0.92)->scale(1) enter animation, 90vw max-w-800px video, bg-black/80 backdrop-blur',
    },
    {
      name: 'bird badge',
      trigger: 'badge="bird"',
      description: 'Amber shield-alert icon in bottom corner for bird/false-positive classification',
      implementedInPrototype: true,
      storyProps: {
        src: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&q=80&w=400&h=240',
        type: 'image',
        badge: 'bird',
      },
    },
    {
      name: 'warning badge',
      trigger: 'badge="warning"',
      description: 'Gray alert-triangle icon for warning-level detections',
      implementedInPrototype: true,
      storyProps: {
        src: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?auto=format&fit=crop&q=80&w=400&h=200',
        type: 'image',
        badge: 'warning',
      },
    },
    {
      name: 'loading',
      trigger: 'src is loading or image/video has not yet decoded',
      description: 'No loading state — media renders as-is with no skeleton or placeholder while the browser loads',
      implementedInPrototype: false,
      visualNotes: 'Should show shimmer placeholder at the same height until onLoad fires',
    },
    {
      name: 'error',
      trigger: 'Image/video src fails to load (404, CORS)',
      description: 'Broken image or empty black box — no fallback UI',
      implementedInPrototype: false,
      visualNotes: 'Should show camera-off icon or retry prompt on load failure',
    },
    {
      name: 'empty (no src)',
      trigger: 'src is undefined/empty, placeholder="none"',
      description: 'Component returns null — renders nothing',
      implementedInPrototype: true,
    },
    {
      name: 'disabled',
      trigger: 'Parent card in resolved/expired state',
      description: 'No disabled visual — media plays/displays identically regardless of card state',
      implementedInPrototype: false,
      visualNotes: 'Should reduce opacity or stop autoplay when card is resolved',
    },
  ],

  interactions: [
    {
      trigger: 'hover',
      element: 'Static image',
      result: 'Image opacity transitions from 70% to 90%',
      animation: { property: 'opacity', from: '0.7', to: '0.9', duration: '150ms', easing: 'ease' },
    },
    {
      trigger: 'hover',
      element: 'Expand overlay (showControls video)',
      result: 'Expand button fades in over the video with backdrop blur',
      animation: { property: 'opacity', from: '0', to: '1', duration: '200ms', easing: 'ease' },
      keyboard: 'Not focusable via Tab (button is opacity-0 until hover)',
    },
    {
      trigger: 'click',
      element: 'Expand button',
      result: 'Opens lightbox portal with current video time preserved',
    },
    {
      trigger: 'click',
      element: 'Play/Pause button (controls or lightbox)',
      result: 'Toggles video playback',
      keyboard: 'Enter/Space (native button)',
    },
    {
      trigger: 'click',
      element: 'Skip Back button',
      result: 'Rewinds video by 5 seconds',
      keyboard: 'Enter/Space (native button)',
    },
    {
      trigger: 'click',
      element: 'Skip Forward button',
      result: 'Advances video by 5 seconds',
      keyboard: 'Enter/Space (native button)',
    },
    {
      trigger: 'click',
      element: 'Scrubber bar (slider)',
      result: 'Seeks video to clicked position',
      keyboard: 'ArrowLeft/ArrowRight: ±5s seek',
    },
    {
      trigger: 'click',
      element: 'Lightbox backdrop',
      result: 'Closes lightbox (click on backdrop only)',
    },
    {
      trigger: 'keydown',
      element: 'Document (while lightbox open)',
      result: 'Escape key closes the lightbox',
      keyboard: 'Escape',
    },
    {
      trigger: 'click',
      element: 'Lightbox close button (X)',
      result: 'Closes lightbox',
      keyboard: 'Enter/Space (native button)',
    },
  ],

  tokens: {
    colors: [
      { name: 'media-overlay', value: 'rgba(0,0,0,0.2)', usage: 'Semi-transparent overlay on all media (bg-black/20)' },
      { name: 'live-dot', value: '#ef4444 (red-500)', usage: 'Pulsing LIVE indicator dot' },
      { name: 'badge-threat', value: '#ef4444 (red-500)', usage: 'Threat badge icon color' },
      { name: 'badge-bird', value: '#fbbf24 (amber-400)', usage: 'Bird badge icon color' },
      { name: 'badge-warning', value: '#a1a1aa (zinc-400)', usage: 'Warning badge icon color' },
      { name: 'tracking-bg', value: 'rgba(22,78,99,0.8) (cyan-900/80)', usage: 'Tracking label pill background' },
      { name: 'tracking-ring', value: 'rgba(34,211,238,0.3)', usage: 'Tracking label border ring' },
      { name: 'tracking-icon', value: '#67e8f9 (cyan-300)', usage: 'Tracking label camera icon' },
      { name: 'tracking-text', value: '#a5f3fc (cyan-200)', usage: 'Tracking label text' },
      { name: 'scrubber-fill', value: '#22d3ee (cyan-400)', usage: 'Scrubber progress bar fill' },
      { name: 'scrubber-track', value: 'rgba(255,255,255,0.15)', usage: 'Scrubber background track' },
      { name: 'lightbox-backdrop', value: 'rgba(0,0,0,0.8)', usage: 'Lightbox backdrop with backdrop-blur' },
      { name: 'controls-bg', value: '#111111', usage: 'Lightbox control bar background' },
    ],
    typography: [
      { name: 'live-label', fontFamily: 'system', fontSize: '9px', fontWeight: '500', lineHeight: '1', usage: 'LIVE badge text (uppercase tracking-wide)' },
      { name: 'camera-label', fontFamily: 'monospace', fontSize: '9px', fontWeight: '400', lineHeight: '1', usage: 'PTZ / Playback camera label' },
      { name: 'tracking-label', fontFamily: 'system', fontSize: '9px', fontWeight: '600', lineHeight: '1', usage: 'Tracking sensor label pill text' },
      { name: 'timestamp', fontFamily: 'monospace', fontSize: '9px-11px', fontWeight: '400', lineHeight: '1', usage: 'Playback time display (tabular-nums)' },
    ],
    spacing: [
      { name: 'image-height', value: '100px', usage: 'Fixed height for image type (h-[100px])' },
      { name: 'video-height', value: '160px', usage: 'Fixed height for video type (h-[160px])' },
      { name: 'badge-padding', value: '8px', usage: 'Badge area padding (p-2)' },
      { name: 'indicator-padding', value: '6px 8px', usage: 'LIVE/PTZ pill padding (px-1.5 py-0.5)' },
      { name: 'lightbox-width', value: '90vw / max 800px', usage: 'Lightbox video max dimensions' },
    ],
    borderRadius: [
      { name: 'indicator-pill', value: '2px', usage: 'LIVE/PTZ indicator rounded-sm' },
      { name: 'lightbox-container', value: '8px', usage: 'Lightbox video container rounded-lg' },
      { name: 'scrubber-bar', value: '9999px', usage: 'Scrubber track and fill (rounded-full)' },
    ],
    shadows: [
      { name: 'lightbox-ring', value: '0 0 0 1px rgba(255,255,255,0.1), 0 25px 60px rgba(0,0,0,0.6)', usage: 'Lightbox container shadow' },
      { name: 'expand-ring', value: '0 0 0 1px rgba(255,255,255,0.15)', usage: 'Expand button pill ring' },
    ],
    animations: [
      { name: 'live-pulse', property: 'opacity', duration: 'infinite', easing: 'ease-in-out', usage: 'Pulsing LIVE dot via animate-pulse' },
      { name: 'lightbox-enter-backdrop', property: 'opacity', duration: '200ms', easing: 'ease-out', usage: 'Lightbox backdrop fade in' },
      { name: 'lightbox-enter-panel', property: 'transform, opacity', duration: '250ms', easing: 'ease-out', usage: 'Lightbox panel scale(0.92)->scale(1) + fade' },
      { name: 'scrubber-width', property: 'width', duration: '100ms', easing: 'linear', usage: 'Scrubber fill width transition' },
    ],
  },

  flows: [
    {
      name: 'Expand and review recording',
      type: 'happy',
      steps: [
        { actor: 'user', action: 'Views inline video with playback controls', result: 'Video plays inline with scrubber, skip, play/pause' },
        { actor: 'user', action: 'Hovers over video to reveal expand button', result: 'Expand overlay fades in' },
        { actor: 'user', action: 'Clicks expand button', result: 'Lightbox opens at current playback position' },
        { actor: 'user', action: 'Uses lightbox controls to review footage', result: 'Full playback with scrubber, skip, time display' },
        { actor: 'user', action: 'Presses Escape or clicks backdrop', result: 'Lightbox closes' },
      ],
    },
    {
      name: 'Image load failure',
      type: 'error',
      steps: [
        { actor: 'system', action: 'Image src returns 404 or CORS error', result: 'Browser shows broken image icon' },
        { actor: 'user', action: 'Sees broken media area', result: 'No fallback UI or retry mechanism' },
      ],
    },
  ],

  accessibility: {
    role: 'img (for images), slider (for scrubber)',
    ariaAttributes: [
      'alt attribute on <img> elements',
      'aria-hidden="true" on decorative icons (Camera, ShieldAlert, AlertTriangle)',
      'aria-label="הרחב הקלטה" on expand button',
      'aria-label="סגור" on lightbox close button',
      'role="slider" with aria-valuemin/max/now/text on scrubber',
      'aria-label="מיקום בסרטון" on scrubber bar',
      'aria-label on play/pause and skip buttons (Hebrew)',
      '<track kind="captions" /> on all video elements',
    ],
    keyboardNav: [
      'Tab: navigates to scrubber and control buttons (when showControls)',
      'ArrowLeft/ArrowRight: ±5s seek on focused scrubber',
      'Enter/Space: activates play/pause, skip, expand, close buttons',
      'Escape: closes lightbox when open',
    ],
    focusManagement: 'No focus trap in lightbox — focus can escape to elements behind the overlay. Expand button is not keyboard-reachable (opacity-0 until hover).',
    screenReaderNotes: 'Video captions track is empty — no actual captions are provided. Badge icons are aria-hidden but their meaning is not communicated to screen readers through other means.',
  },

  tasks: [
    {
      id: 'CM-1',
      title: 'Add loading skeleton for media',
      priority: 'P0',
      estimate: 'M',
      description: 'Show a shimmer/skeleton placeholder at the correct height (100px for images, 160px for video) while the media source is loading. Use onLoad/onLoadedData events to swap.',
      files: [{ path: 'src/primitives/CardMedia.tsx', action: 'modify', description: 'Add loading state with skeleton and onLoad handler' }],
      acceptanceCriteria: [
        'Skeleton shows at correct height before media loads',
        'Skeleton transitions smoothly to loaded media',
        'Works for both image and video types',
      ],
    },
    {
      id: 'CM-2',
      title: 'Add error fallback for failed media',
      priority: 'P0',
      estimate: 'S',
      description: 'Detect image/video load errors and show a fallback UI (camera-off icon + "Failed to load" message) instead of a broken image.',
      files: [{ path: 'src/primitives/CardMedia.tsx', action: 'modify', description: 'Add onError handler with fallback state' }],
      acceptanceCriteria: [
        'Failed image shows camera-off icon fallback',
        'Failed video shows fallback with retry option',
        'Fallback maintains correct container height',
      ],
    },
    {
      id: 'CM-3',
      title: 'Add focus trap to lightbox',
      priority: 'P1',
      estimate: 'M',
      description: 'Trap focus inside the lightbox when open. Focus should move to the close button on open and return to the expand button on close.',
      files: [{ path: 'src/primitives/CardMedia.tsx', action: 'modify', description: 'Add focus trap and focus return logic in VideoLightbox' }],
      acceptanceCriteria: [
        'Focus moves to close button when lightbox opens',
        'Tab cycles only within lightbox controls',
        'Focus returns to expand button when lightbox closes',
      ],
      dependencies: ['CM-1'],
    },
    {
      id: 'CM-4',
      title: 'Make expand button keyboard-accessible',
      priority: 'P1',
      estimate: 'S',
      description: 'The expand button is invisible (opacity-0) until hover, making it unreachable by keyboard. Add focus-visible styling so keyboard users can access it.',
      files: [{ path: 'src/primitives/CardMedia.tsx', action: 'modify', description: 'Add focus-visible:opacity-100 to expand button' }],
      acceptanceCriteria: [
        'Expand button becomes visible on focus-visible',
        'Keyboard users can Tab to and activate the expand button',
      ],
    },
    {
      id: 'CM-5',
      title: 'Remove debug agent log fetch call',
      priority: 'P0',
      estimate: 'S',
      description: 'Remove the inline fetch() call to localhost:7712 that logs render data. This is debug instrumentation that should not ship.',
      files: [{ path: 'src/primitives/CardMedia.tsx', action: 'modify', description: 'Delete lines 36-38 (#region agent log)' }],
      acceptanceCriteria: [
        'No fetch calls to localhost in the component',
        'Component renders identically without the log',
      ],
    },
  ],

  hardcodedData: [
    {
      current: "Arbitrary height values: h-[160px] for video, h-[100px] for image",
      replaceWith: 'CARD_TOKENS.media.videoHeight / imageHeight',
      location: 'CardMedia.tsx line 41',
    },
    {
      current: "Debug fetch to http://127.0.0.1:7712/ingest/... on every render",
      replaceWith: 'Remove entirely — debug instrumentation',
      location: 'CardMedia.tsx lines 36-38',
    },
    {
      current: "Lightbox max-width: 90vw/max-w-[800px] and maxHeight: 70vh",
      replaceWith: 'CSS custom properties or CARD_TOKENS.media.lightbox dimensions',
      location: 'CardMedia.tsx lines 189, 273',
    },
    {
      current: "Inline controls background color #111",
      replaceWith: 'CARD_TOKENS.surface.level0 or similar token',
      location: 'CardMedia.tsx line 278',
    },
  ],

  notes: [
    'The component has two completely separate video player implementations: VideoWithControls (inline) and LightboxVideo (lightbox). They share similar scrubber/controls logic that could be unified.',
    'savedTimeRef preserves the inline video playback position when opening the lightbox — the lightbox video seeks to this time on loadedmetadata.',
    'The grayscale + contrast-125 filter on images creates a surveillance/tactical aesthetic that should be preserved in any refactor.',
    'Hebrew RTL is used for button labels and the tracking label container (dir="rtl").',
    'The agent log fetch call in the render body is a debug artifact that fires on every render and should be removed before production.',
  ],
};
