/**
 * Substrate / Elevated primitives.
 *
 * Implements fluid-functionalism's eight-level surface system as a
 * pair of React primitives backed by the OKLCH tokens in
 * `src/styles/palette.css`.
 *
 * Three pieces:
 *
 *   1. `<Substrate level>` — explicitly seeds the surface level for
 *      a subtree. Used at the GridblockShell root and inside
 *      Dialog/Sheet content (modals re-seed the floor because they
 *      anchor at an absolute level, regardless of where the trigger
 *      lived in the substrate ladder).
 *
 *   2. `<Elevated>` — wraps a panel and lifts it `lift` levels
 *      above the surrounding substrate (or sets `level` absolutely).
 *      Writes `data-substrate={N}` on its rendered element; CSS in
 *      palette.css picks the matching `--surface` + `--shadow`
 *      via attribute selectors. No inline `style={{}}` writes.
 *      Also provides a new SubstrateContext value to children so
 *      a popover-inside-card-inside-dialog stacks correctly.
 *
 *   3. Role wrappers — single point of truth for elevation policy.
 *      Tooltips lift +3 from wherever they mount; popovers and
 *      menus lift +2; dialogs and sheets anchor absolutely at
 *      level 5. Changing tooltip elevation later means editing
 *      this file, not the 30+ tooltip callsites.
 *
 * Why an attribute-driven approach (not inline style)?
 *
 *   - DevTools surface inspection is cleaner — you can see
 *     `data-substrate="5"` in the elements panel and read off the
 *     surface from the CSS rule.
 *   - Themes (.light) override surfaces via the same cascade rule
 *     without needing the primitive to recompute.
 *   - Fewer React commits write to `style.background` per render.
 */

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/app/components/ui/utils";

export type SubstrateLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const SubstrateContext = createContext<SubstrateLevel>(1);

/**
 * Read the current substrate level. Defaults to 1 when no provider
 * is mounted (matches the visual contract — the page itself is
 * substrate 1).
 */
export function useSubstrate(): SubstrateLevel {
  return useContext(SubstrateContext);
}

/**
 * Resolve a target substrate level given a base and either an
 * absolute `level` or a relative `lift`. Clamped to 1..8 so a
 * deeply-nested popover-in-tooltip-in-dialog can't overshoot
 * the ladder.
 */
export function resolveElevatedLevel(
  base: SubstrateLevel,
  args: { level?: SubstrateLevel; lift?: number },
): SubstrateLevel {
  const target = args.level ?? base + (args.lift ?? 0);
  const clamped = Math.max(1, Math.min(8, target));
  return clamped as SubstrateLevel;
}

/* ────────────────────────────────────────────────────────────
 * <Substrate>
 * ────────────────────────────────────────────────────────────
 *
 * Pure context provider — does NOT paint a surface itself.
 * Use to declare "the current floor for anything mounted inside
 * me is level N" without rendering a wrapper div with a bg.
 */
export interface SubstrateProps {
  level: SubstrateLevel;
  children: ReactNode;
}

export function Substrate({ level, children }: SubstrateProps) {
  const value = useMemo(() => level, [level]);
  return (
    <SubstrateContext.Provider value={value}>
      {children}
    </SubstrateContext.Provider>
  );
}

/* ────────────────────────────────────────────────────────────
 * <Elevated>
 * ────────────────────────────────────────────────────────────
 *
 * Paints a surface at `level` (absolute) or `lift` above the
 * current substrate (relative). Writes `data-substrate={N}` so the
 * CSS rule in palette.css applies the right `--surface` / `--shadow`,
 * then opens a new SubstrateContext so further-nested overlays
 * lift from this level.
 *
 * - `asChild` (Radix Slot pattern) merges the data-attribute + className
 *   into the immediate child instead of rendering a wrapper div.
 *   Use this when you want the Radix portal content node itself to
 *   carry the substrate attribute (avoids an extra DOM layer).
 *
 * Painting:
 *
 *   className="bg-[var(--surface)] shadow-[var(--shadow)]"
 *
 * The `--surface` / `--shadow` vars are populated by the
 * `[data-substrate="N"]` rule from palette.css.
 */
export interface ElevatedProps {
  /** Absolute substrate level (ignores parent). */
  level?: SubstrateLevel;
  /** Relative lift above the current substrate. */
  lift?: number;
  /**
   * When true, merges props into the immediate child element
   * instead of rendering a wrapper div. The child must be a
   * single React element.
   */
  asChild?: boolean;
  className?: string;
  children: ReactNode;
}

export function Elevated({
  level,
  lift,
  asChild = false,
  className,
  children,
}: ElevatedProps) {
  const base = useSubstrate();
  const next = resolveElevatedLevel(base, { level, lift });
  const value = useMemo(() => next, [next]);

  const surfaceClass = cn(
    "bg-[var(--surface)] shadow-[var(--shadow)]",
    className,
  );

  let painted: ReactNode;
  if (asChild) {
    // Radix-style asChild — the single child element receives the
    // data-substrate attribute + className merged with whatever it
    // already had. Avoids a wrapper div around portal content
    // (Popover.Content, Tooltip.Content, etc. don't like extra DOM).
    const only = Children.only(children) as ReactElement<{
      className?: string;
      "data-substrate"?: number;
    }>;
    if (!isValidElement(only)) {
      painted = children;
    } else {
      painted = cloneElement(only, {
        "data-substrate": next,
        className: cn(only.props.className, surfaceClass),
      });
    }
  } else {
    painted = (
      <div data-substrate={next} className={surfaceClass}>
        {children}
      </div>
    );
  }

  return (
    <SubstrateContext.Provider value={value}>
      {painted}
    </SubstrateContext.Provider>
  );
}

/* ────────────────────────────────────────────────────────────
 * Role wrappers
 * ────────────────────────────────────────────────────────────
 *
 * Single point of truth for elevation policy. Each Radix overlay
 * wraps its Content with the matching role surface; if you ever
 * need to bump tooltip lift from +3 to +4, edit this file alone.
 *
 * - PopoverSurface     lift +2  (popover above its anchor)
 * - MenuSurface        lift +2  (dropdown, context, select, menubar)
 * - HoverCardSurface   lift +2  (mouse-only popover)
 * - TooltipSurface     lift +3  (sits above everything)
 * - DialogSurface      level 5  (modal anchors absolute)
 * - SheetSurface       level 5  (slide-over also anchors absolute)
 *
 * Modals (Dialog / Sheet) intentionally use absolute `level` rather
 * than `lift`. They portal to <body>, so the parent's substrate
 * isn't relevant — they need a stable floor regardless of where
 * the trigger was mounted.
 */
export const PopoverSurface = (props: Omit<ElevatedProps, "level" | "lift">) => (
  <Elevated lift={2} {...props} />
);

export const MenuSurface = (props: Omit<ElevatedProps, "level" | "lift">) => (
  <Elevated lift={2} {...props} />
);

export const HoverCardSurface = (
  props: Omit<ElevatedProps, "level" | "lift">,
) => <Elevated lift={2} {...props} />;

export const TooltipSurface = (props: Omit<ElevatedProps, "level" | "lift">) => (
  <Elevated lift={3} {...props} />
);

export const DialogSurface = (props: Omit<ElevatedProps, "level" | "lift">) => (
  <Elevated level={5} {...props} />
);

export const SheetSurface = (props: Omit<ElevatedProps, "level" | "lift">) => (
  <Elevated level={5} {...props} />
);
