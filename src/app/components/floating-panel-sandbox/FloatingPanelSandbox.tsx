/**
 * Floating Panel Sandbox — DEV-only surface.
 *
 * V1 (chosen direction): unified two-stage panel.
 *
 *   - CLOSED (default): the panel is a single 28x28 chip showing the
 *     SELECTED tool's icon (Polygon on first load). This chip is the
 *     "always-visible" affordance and the trigger that expands the
 *     strip. A fresh draft would begin with whatever tool this chip
 *     currently shows.
 *   - OPEN: the SAME chip grows horizontally to reveal the three
 *     OTHER tools beside the selected one. There is ONE shared
 *     container (single background, border, shadow) — the icons
 *     inside are flat glyphs, not individual chip-buttons. Hovering
 *     an icon paints a subtle fill in its slot; the SELECTED icon
 *     (anchored on the right) carries a stronger fill so the current
 *     tool is obvious at a glance.
 *
 * Picking one of the OTHER tools makes it the new selected tool —
 * the closed chip's face swaps to that icon — and collapses the strip
 * ("panel closes very easily"). Clicking the already-selected anchor
 * chip while open just collapses (keeps the selection); clicking
 * anywhere off the strip also collapses.
 *
 * Route: /floating-panel-sandbox (DEV only, tree-shakes out of prod).
 * Buttons are inert wrt to the production draw engine — the sandbox
 * owns its own local `armed` + `open` state so hover, pressed and
 * open/closed transitions all read live in the preview.
 */

import { useState, type ComponentType, type SVGProps } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { MapPin, type IconProps } from '@/lib/icons/central';
import {
  CircleDrawIcon,
  LineDrawIcon,
  PolygonDrawIcon,
} from '../map-draw/icons';

// ---------------------------------------------------------------------------
// Tool registry — the four canonical drawing primitives. There is no
// hard-coded "primary": the SELECTED tool is the one anchored on the
// right edge of the closed chip, and it doubles as the tool a fresh
// draft would start with. Order here is the stable order the "extras"
// (every tool EXCEPT the selected one) render in to the LEFT of the
// anchor inside the container (`justify-end` + `overflow-hidden` clips
// the extras when the container is at its w-7 closed width).
// ---------------------------------------------------------------------------

type ToolId = 'polygon' | 'line' | 'circle' | 'point';

type Tool = {
  id: ToolId;
  label: string;
  Icon:
    | ComponentType<IconProps>
    | ((props: { size?: number } & SVGProps<SVGSVGElement>) => JSX.Element);
};

const TOOLS: Tool[] = [
  { id: 'polygon', label: 'Polygon', Icon: PolygonDrawIcon },
  { id: 'line', label: 'Line', Icon: LineDrawIcon },
  { id: 'circle', label: 'Circle', Icon: CircleDrawIcon },
  { id: 'point', label: 'POI', Icon: MapPin },
];

// ---------------------------------------------------------------------------
// Placement — where the strip anchors on the mock map. Radio at the top
// reparents the strip so the reviewer can preview each anchor.
// ---------------------------------------------------------------------------

type Anchor =
  | 'topRight'
  | 'topCenter'
  | 'topLeft'
  | 'bottomCenter'
  | 'bottomRight';

const ANCHORS: { id: Anchor; label: string; className: string }[] = [
  { id: 'topRight', label: 'Top-right', className: 'top-3 right-3' },
  {
    id: 'topCenter',
    label: 'Top-center',
    className: 'top-3 left-1/2 -translate-x-1/2',
  },
  { id: 'topLeft', label: 'Top-left', className: 'top-3 left-3' },
  {
    id: 'bottomCenter',
    label: 'Bottom-center',
    className: 'bottom-3 left-1/2 -translate-x-1/2',
  },
  { id: 'bottomRight', label: 'Bottom-right', className: 'bottom-3 right-3' },
];

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

export default function FloatingPanelSandbox() {
  const [anchor, setAnchor] = useState<Anchor>('topRight');
  // The selected tool doubles as the closed chip's face AND the tool a
  // fresh draft would begin with. Polygon is the default on first load.
  const [selected, setSelected] = useState<ToolId>('polygon');
  const [open, setOpen] = useState(false);

  // Picking one of the OTHER tools promotes it to the selected slot —
  // the closed chip's face swaps to it — and collapses immediately
  // ("the panel closes very easily"). The initial draw stage would then
  // start from this newly selected tool.
  const chooseTool = (id: ToolId) => {
    setSelected(id);
    setOpen(false);
  };

  const toggleStrip = () => {
    // The anchor chip is the open/close trigger. Clicking it while open
    // just collapses — it does NOT disarm the selected tool (the user
    // is closing the panel, not clearing their pick).
    setOpen((prev) => !prev);
  };

  const requestClose = () => setOpen(false);

  return (
    <TooltipProvider>
      <div
        dir="ltr"
        className="min-h-screen w-full bg-[#0f0f10] px-6 py-8 text-white"
      >
        <header className="mb-6 flex flex-col gap-1">
          <h1 className="text-lg font-semibold">
            Floating Geo Entities Panel — V1
          </h1>
          <p className="max-w-3xl text-[12.5px] text-white/55">
            Two-stage strip. Closed = single chip showing the SELECTED
            tool (Polygon by default). Click it and the SAME chip widens
            to reveal the three OTHER tools beside it — one shared
            container, flat icons inside, hover paints a subtle fill.
            Picking another tool swaps the closed chip's face to it and
            collapses; clicking the selected chip again or outside the
            strip also collapses.
          </p>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <AnchorRadio value={anchor} onChange={setAnchor} />
          <span className="text-[12px] text-white/45">
            State: <strong className="text-white/80">{open ? 'open' : 'closed'}</strong>
            <span className="mx-2 text-white/25">·</span>
            Selected: <strong className="text-white/80">{selected}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setSelected('polygon');
              setOpen(false);
            }}
            className="ml-auto rounded-md border border-white/10 bg-transparent px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            Reset
          </button>
        </div>

        <MapMockFrame anchor={anchor} onOutsideClick={requestClose}>
          <FloatingStripV1
            selected={selected}
            open={open}
            onChoose={chooseTool}
            onToggle={toggleStrip}
          />
        </MapMockFrame>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Anchor radio — segmented pill above the preview.
// ---------------------------------------------------------------------------

function AnchorRadio({
  value,
  onChange,
}: {
  value: Anchor;
  onChange: (a: Anchor) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Placement"
      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#161616] p-1"
    >
      <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-white/50">
        Anchor
      </span>
      {ANCHORS.map((a) => {
        const active = value === a.id;
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(a.id)}
            className={`rounded px-2.5 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
              active
                ? 'bg-white/[0.10] text-white ring-1 ring-inset ring-white/15'
                : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
            }`}
          >
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock map frame. Clicking the empty surface fires `onOutsideClick`
// so the "click outside to close" behaviour reads live without a real
// map underneath.
// ---------------------------------------------------------------------------

function MapMockFrame({
  anchor,
  children,
  onOutsideClick,
}: {
  anchor: Anchor;
  children: React.ReactNode;
  onOutsideClick?: () => void;
}) {
  const anchorClass =
    ANCHORS.find((a) => a.id === anchor)?.className ?? 'top-3 right-3';
  return (
    <div
      onMouseDown={(e) => {
        // Only fire outside-click when the mousedown lands on the
        // frame itself, not on a child (the strip). Matches the
        // production "click outside" pattern via
        // `target === currentTarget`.
        if (e.target === e.currentTarget) onOutsideClick?.();
      }}
      className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(ellipse_at_top,#1c1e24_0%,#0b0c0f_100%)]"
    >
      {/* Grid overlays so the surface reads as "map" not empty
          canvas. Pointer-events-none so clicks fall through to the
          frame's onMouseDown handler above. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      />

      {/* Mock 2D/3D toggle at bottom-left so the sandbox shows the
          strip's real neighbours on the tactical map. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-3 grid h-7 w-7 place-items-center rounded-[2px] border border-white/10 bg-black/70 text-[11px] font-medium text-white/70 backdrop-blur-md"
      >
        3D
      </div>

      <div className={`absolute ${anchorClass} z-10 pointer-events-auto`}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FloatingStripV1 — the unified two-stage panel.
//
// Structure (example: Line is the selected tool):
//   ┌─────────────────────────────────┐    closed: only the SELECTED
//   │ [poly][circle][poi][  LINE    ] │    tool's slot is visible; the
//   └─────────────────────────────────┘    others are clipped by
//     |----------- w-28 ------------|      overflow-hidden.
//
//     [  LINE  ]                           open: the container's width
//     |-- w-7 --|                          transitions from w-7 to w-28
//                                          revealing the other tools.
//
// The anchored slot (right edge) is ALWAYS the selected tool, so the
// closed chip's face tracks whatever the user last picked. The other
// three tools render to its left and become selectable on expand;
// choosing one promotes it into the anchor slot.
//
// The container carries the SHARED chrome (background, border,
// shadow, backdrop blur). The individual icons are flat — no
// per-icon chip — so hovering them paints an interior fill within
// the strip, which is exactly the "one panel, choose an icon inside"
// behaviour requested.
// ---------------------------------------------------------------------------

type StripProps = {
  selected: ToolId;
  open: boolean;
  onChoose: (id: ToolId) => void;
  onToggle: () => void;
};

function FloatingStripV1({ selected, open, onChoose, onToggle }: StripProps) {
  const selectedTool = TOOLS.find((t) => t.id === selected) ?? TOOLS[0];
  // Every tool EXCEPT the selected one, in the registry's stable order.
  // These render to the LEFT of the anchor and clip away when closed.
  const others = TOOLS.filter((t) => t.id !== selected);

  return (
    <div
      role="toolbar"
      aria-label="Geo Entities"
      // `justify-end` + `overflow-hidden` = the other tools clip to the
      // LEFT as the container narrows; the selected tool stays glued to
      // the right edge. `transition-[width]` animates reveal / collapse.
      className={`flex h-7 items-center justify-end overflow-hidden rounded-[2px] border border-white/10 bg-black/70 shadow-[0_4px_12px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[width] duration-200 ease-out ${
        open ? 'w-28' : 'w-7'
      }`}
    >
      {others.map((tool) => (
        <IconSlot
          key={tool.id}
          tool={tool}
          active={false}
          onClick={() => onChoose(tool.id)}
          // Keyboard tab-order + AT visibility should follow the
          // visible state. Clipped tools are inert / hidden until
          // the panel opens.
          reachable={open}
        />
      ))}
      <IconSlot
        tool={selectedTool}
        // The anchor is always the current selection, so it reads as
        // pressed to keep the active tool obvious at a glance.
        active
        onClick={onToggle}
        reachable
        // The anchor's tooltip flips to "Close" when the strip is open
        // so the user reads its secondary function correctly (opening
        // the strip happens on the first click while it's still closed).
        tooltipOverride={open ? 'Close' : undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// IconSlot — one flat icon inside the shared strip container. No
// background, no border, no shadow of its own; just a hover fill
// and a slightly stronger fill when armed (`aria-pressed`).
// ---------------------------------------------------------------------------

function IconSlot({
  tool,
  active,
  onClick,
  reachable,
  tooltipOverride,
}: {
  tool: Tool;
  active: boolean;
  onClick: () => void;
  reachable: boolean;
  tooltipOverride?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={active}
          aria-label={tool.label}
          aria-hidden={!reachable || undefined}
          tabIndex={reachable ? 0 : -1}
          onClick={onClick}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-[2px] text-[#949494] transition-colors hover:bg-white/[0.08] hover:text-white aria-pressed:bg-white/[0.14] aria-pressed:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/40"
        >
          <tool.Icon size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6} className="text-[11px]">
        {tooltipOverride ?? tool.label}
      </TooltipContent>
    </Tooltip>
  );
}
