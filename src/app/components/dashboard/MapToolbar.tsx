/**
 * MapToolbar — topbar above the map cell, mirroring Lattice C2
 * reference structure: `<header>` with left actions (icon group +
 * search input group) and a right-aligned map-settings button.
 */

import { useCallback, useState, type ChangeEvent, type FormEvent } from "react";
import { MapPin, Ruler, Search, SlidersHorizontal } from "@/lib/icons/central";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/shared/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useIsRtl } from "@/lib/direction";
import { useStrings } from "@/lib/intl";
import type { MapViewMode } from "./mapViewMode";

interface MapToolbarProps {
  mapViewMode: MapViewMode;
  onMapViewModeChange: (mode: MapViewMode) => void;
  onDropLocation?: () => void;
  onMeasure?: () => void;
  /**
   * Called when the operator submits a coord pair. Implementations
   * are free to interpret the raw string (lat,lon vs MGRS vs
   * military grid) — the toolbar only forwards the trimmed value.
   */
  onCoordSearch?: (raw: string) => void;
}

export function MapToolbar({
  mapViewMode,
  onMapViewModeChange,
  onDropLocation,
  onMeasure,
  onCoordSearch,
}: MapToolbarProps) {
  const t = useStrings();
  const isRtl = useIsRtl();
  const labels = t.gridblock.mapToolbar;
  const [mapMenuOpen, setMapMenuOpen] = useState(false);

  return (
    <header className="flex h-8 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-[var(--gridblock-border)] bg-[var(--gridblock-bar)] text-xs leading-4 text-[var(--gridblock-text-secondary)]">
      <div className="flex h-8 overflow-hidden">
        <div className="flex items-center border-l border-l-[var(--gridblock-border)]">
          <ToolbarIconButton
            label={labels.dropLocation}
            onClick={onDropLocation}
            ariaHasPopup
          >
            <MapPin size={18} />
          </ToolbarIconButton>
          <ToolbarIconButton label={labels.measure} onClick={onMeasure}>
            <Ruler size={18} />
          </ToolbarIconButton>
        </div>

        <div className="flex w-[260px] flex-col items-center justify-center border-l border-l-[var(--gridblock-border-strong)] p-1">
          <CoordSearchField
            ariaLabel={labels.coordSearchAriaLabel}
            placeholder={labels.coordSearchPlaceholder}
            onSubmit={onCoordSearch}
          />
        </div>
      </div>

      <div className="flex h-full w-8 items-center justify-center border-r border-r-white/10">
        <DropdownMenu open={mapMenuOpen} onOpenChange={setMapMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={labels.mapSettings}
              title={labels.mapSettings}
              className="flex size-8 items-center justify-center rounded-none text-[var(--gridblock-text-secondary)] transition-colors duration-150 hover:bg-state-hover-strong hover:text-[var(--gridblock-text-primary)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--border-strong)] data-[state=open]:bg-state-hover-strong data-[state=open]:text-[var(--gridblock-text-primary)]"
            >
              <SlidersHorizontal size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            dir={isRtl ? "rtl" : "ltr"}
            side="bottom"
            align="end"
            sideOffset={6}
            className="min-w-[200px] rounded-sm border-border-default bg-surface-3 p-1 text-start text-slate-11"
          >
            <DropdownMenuLabel className="block w-full px-2 py-1.5 text-start text-[11px] font-semibold text-slate-11">
              {labels.mapViewSection}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border-default" />
            <DropdownMenuRadioGroup
              value={mapViewMode}
              onValueChange={(value) => onMapViewModeChange(value as MapViewMode)}
            >
              <DropdownMenuRadioItem
                value="current"
                className="rounded-sm py-1.5 text-start text-[12px] text-slate-12 focus:bg-state-hover-strong focus:text-slate-12"
              >
                {labels.mapViewCurrent}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="monochromeTerrain"
                className="rounded-sm py-1.5 text-start text-[12px] text-slate-12 focus:bg-state-hover-strong focus:text-slate-12"
              >
                {labels.mapViewMonochromeTerrain}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="monochromeLight"
                className="rounded-sm py-1.5 text-start text-[12px] text-slate-12 focus:bg-state-hover-strong focus:text-slate-12"
              >
                {labels.mapViewMonochromeLight}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

interface ToolbarIconButtonProps {
  label: string;
  onClick?: () => void;
  ariaHasPopup?: boolean;
  children: React.ReactNode;
}

function ToolbarIconButton({
  label,
  onClick,
  ariaHasPopup,
  children,
}: ToolbarIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-haspopup={ariaHasPopup ? "true" : undefined}
          aria-expanded={ariaHasPopup ? "false" : undefined}
          className="gridblock-iconbtn"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface CoordSearchFieldProps {
  ariaLabel: string;
  placeholder: string;
  onSubmit?: (raw: string) => void;
}

function CoordSearchField({
  ariaLabel,
  placeholder,
  onSubmit,
}: CoordSearchFieldProps) {
  const [value, setValue] = useState("");

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) return;
      onSubmit?.(trimmed);
    },
    [value, onSubmit],
  );

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex h-full w-full items-center gap-2 border border-border-strong bg-state-hover-strong px-2"
    >
      <Search
        size={16}
        className="shrink-0 text-[var(--gridblock-text-muted)]"
      />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="h-full w-full bg-transparent text-xs leading-4 text-[var(--gridblock-text-primary)] placeholder:text-[var(--gridblock-text-muted)] focus:outline-none"
      />
    </form>
  );
}
