/**
 * `/devices-lab` error-state study — six device-card variants that each
 * surface the currently-hidden error/Logs/Notifications affordances
 * differently. All six are wired against the same errored camera and open
 * a single shared `AllErrorsModal` so the lab can compare *trigger style*
 * without distraction from the error data itself.
 *
 * Sandbox-only. Reuses the production card primitives exported from
 * `CardLayoutLab.tsx` (`DeviceTile`, `NameBlock`, `Telemetry`, `CameraHero`,
 * `CardShell`, `FooterBar`) so each variant reads as a real row.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronRight } from '@/lib/icons/central';
import { CameraIcon } from '../../tacticalIcons';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { NotificationIcon, MapPinIcon } from '../../devices-panel/icons';
import {
  CameraHero,
  CardShell,
  DeviceTile,
  FooterBar,
  NameBlock,
  Telemetry,
} from './CardLayoutLab';
import { ActionControl, type LabDevice } from './presentationRules';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/**
 * One stress device shared by every variant — an errored PTZ camera with
 * two unread errors and a `critical` tile tint, so the only thing that
 * varies between variants is the *trigger style* for opening the modal.
 */
const ERROR_DEVICE: LabDevice = {
  id: 'CAM-1',
  name: 'PTZ North',
  kind: 'camera',
  Icon: CameraIcon,
  meta: 'FOV 62° · 82%',
  stats: [
    { label: 'Location', value: '32.811, 35.021' },
    { label: 'Bearing', value: '145°' },
    { label: 'Field of view', value: '62°' },
  ],
  online: true,
  cameraPreview: true,
  errorCount: 2,
  health: 'critical',
  healthReason: 'Sensor fault',
};

type ErrorSeverity = 'critical' | 'warning';
interface DeviceError {
  id: string;
  severity: ErrorSeverity;
  message: string;
  detail?: string;
  /** Seconds ago — rendered as a relative timestamp. */
  ago: number;
}

const MOCK_ERRORS: DeviceError[] = [
  {
    id: 'e1',
    severity: 'critical',
    message: 'Sensor fault — image stream interrupted',
    detail: 'IR sensor failed self-test at 13:42:08',
    ago: 92,
  },
  {
    id: 'e2',
    severity: 'critical',
    message: 'PTZ motor stalled',
    detail: 'Pan axis encoder did not advance after command',
    ago: 412,
  },
  {
    id: 'e3',
    severity: 'warning',
    message: 'Low signal-to-noise ratio',
    detail: 'IR noise floor above threshold for 3 min',
    ago: 947,
  },
];

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// ---------------------------------------------------------------------------
// Local glyphs
// ---------------------------------------------------------------------------

/**
 * Exact glyph the operator pasted into the brief — a 3×3 dot-matrix "logs"
 * mark. `fill="currentColor"` so it inherits the surrounding tone (red in
 * the danger context, white/60 in the calm one).
 */
function LogsGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 2H9.75H14.25H15V3.5H14.25H9.75H9V2ZM9 12.5H9.75H14.25H15V14H14.25H9.75H9V12.5ZM9.75 7.25H9V8.75H9.75H14.25H15V7.25H14.25H9.75ZM1 12.5H1.75H2.25H3V14H2.25H1.75H1V12.5ZM1.75 2H1V3.5H1.75H2.25H3V2H2.25H1.75ZM1 7.25H1.75H2.25H3V8.75H2.25H1.75H1V7.25ZM5.75 12.5H5V14H5.75H6.25H7V12.5H6.25H5.75ZM5 2H5.75H6.25H7V3.5H6.25H5.75H5V2ZM5.75 7.25H5V8.75H5.75H6.25H7V7.25H6.25H5.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Shared "All errors" modal
// ---------------------------------------------------------------------------

interface AllErrorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: LabDevice;
  errors: DeviceError[];
}

function AllErrorsModal({ open, onOpenChange, device, errors }: AllErrorsModalProps) {
  const criticalCount = errors.filter((e) => e.severity === 'critical').length;
  const warningCount = errors.length - criticalCount;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-surface-2 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-white">
            <AlertTriangle size={16} className="text-red-400" />
            {device.name} — errors
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            {criticalCount} critical{warningCount > 0 ? ` · ${warningCount} warning` : ''}
          </DialogDescription>
        </DialogHeader>
        <ul className="-mx-2 max-h-[320px] overflow-y-auto">
          {errors.map((err) => (
            <li
              key={err.id}
              className="flex gap-3 rounded px-2 py-2.5 hover:bg-state-hover"
            >
              <span
                className={`mt-1 size-1.5 shrink-0 rounded-full ${
                  err.severity === 'critical' ? 'bg-red-400' : 'bg-amber-400'
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-white">{err.message}</span>
                  <span className="shrink-0 text-2xs tabular-nums text-white/40">
                    {formatAgo(err.ago)}
                  </span>
                </div>
                {err.detail && (
                  <p className="mt-0.5 text-xs-plus text-white/55">{err.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose
            className="rounded px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-state-hover-overlay hover:text-white"
          >
            Close
          </DialogClose>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/25"
          >
            Acknowledge all
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Small shared affordances used across variants
// ---------------------------------------------------------------------------

/**
 * Compact icon-only header button. Smaller, ghost-style, matches the
 * 6×6 hit area of the production primary-cluster glyphs.
 */
function HeaderIconButton({
  ariaLabel,
  tone = 'neutral',
  badge,
  children,
  onClick,
  pressed = false,
}: {
  ariaLabel: string;
  tone?: 'neutral' | 'danger';
  badge?: ReactNode;
  children: ReactNode;
  onClick: () => void;
  pressed?: boolean;
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-red-300 hover:bg-red-500/15 hover:text-red-200'
      : pressed
        ? 'bg-white/10 text-white'
        : 'text-white/70 hover:bg-state-hover-overlay hover:text-white';
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`relative inline-flex size-6 items-center justify-center rounded transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring [&_svg]:size-3 ${toneClass}`}
      >
        {children}
      </button>
      {badge}
    </span>
  );
}

/** Small count badge for the icon buttons. */
function CountBadge({ count, tone = 'danger' }: { count: number; tone?: 'danger' | 'neutral' }) {
  if (count <= 0) return null;
  return (
    <span
      className={`pointer-events-none absolute -end-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-3xs font-semibold leading-none ring-2 ring-[#141414] ${
        tone === 'danger' ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
      }`}
    >
      {count}
    </span>
  );
}

/**
 * Show-on-map glyph rendered without going through the registry — variants
 * that build a custom header use this so the map button stays consistent
 * with the rest of the lab without dragging in the full action dispatcher.
 */
function ShowOnMapButton() {
  return (
    <button
      type="button"
      aria-label="Show on map"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex size-6 items-center justify-center rounded text-white/70 transition-colors duration-150 hover:bg-state-hover-overlay hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring [&_svg]:size-3"
    >
      <MapPinIcon size={12} />
    </button>
  );
}

/**
 * Footer "Logs" inline button — labeled version of the pasted glyph, used
 * by the variants that promote Logs out of the overflow menu.
 */
function LogsFooterButton({ errorCount = 0 }: { errorCount?: number }) {
  const hasErrors = errorCount > 0;
  return (
    <button
      type="button"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors duration-150 [&_svg]:size-3.5 ${
        hasErrors
          ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
          : 'bg-white/[0.05] text-white/70 hover:bg-state-hover-overlay hover:text-white'
      }`}
    >
      <LogsGlyph size={14} />
      <span>Logs{hasErrors ? ` · ${errorCount}` : ''}</span>
    </button>
  );
}

/** Footer "Notifications" inline button. */
function NotificationsFooterButton() {
  return (
    <button
      type="button"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex h-7 items-center gap-1.5 rounded bg-white/[0.05] px-2 text-xs font-medium text-white/70 transition-colors duration-150 hover:bg-state-hover-overlay hover:text-white [&_svg]:size-3.5"
    >
      <NotificationIcon size={14} />
      <span>Notifications</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

interface VariantProps {
  onOpenErrors: () => void;
  errorCount: number;
}

/**
 * Opt 1 — Icon trio near map.
 * Three icon-only buttons sit beside Show-on-map in the header: red warning
 * triangle (with count), Logs glyph, and Notifications. The warning glyph
 * is the quick "see what happened" trigger.
 */
function VariantIconTrio({ onOpenErrors, errorCount }: VariantProps) {
  return (
    <CardShell
      open
      onToggle={() => {}}
      header={
        <>
          <DeviceTile device={ERROR_DEVICE} />
          <NameBlock device={ERROR_DEVICE} />
          <div
            className="flex shrink-0 items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <HeaderIconButton
              ariaLabel={`View ${errorCount} errors`}
              tone="danger"
              badge={<CountBadge count={errorCount} />}
              onClick={onOpenErrors}
            >
              <AlertTriangle size={12} />
            </HeaderIconButton>
            <HeaderIconButton ariaLabel="Open logs" onClick={onOpenErrors}>
              <LogsGlyph size={12} />
            </HeaderIconButton>
            <HeaderIconButton ariaLabel="Notifications" onClick={() => {}}>
              <NotificationIcon size={12} />
            </HeaderIconButton>
            <ShowOnMapButton />
          </div>
        </>
      }
    >
      {ERROR_DEVICE.cameraPreview && <CameraHero />}
      <Telemetry device={ERROR_DEVICE} />
    </CardShell>
  );
}

/**
 * Opt 2 — Surfaced Notifications + quiet error icon button.
 * Notifications is promoted out of the overflow as a ghost bell in the
 * header next to a quiet error icon button (count-only badge). Both sit
 * inboard of Show-on-map; the error button opens the modal.
 */
function VariantQuietErrorButton({ onOpenErrors, errorCount }: VariantProps) {
  return (
    <CardShell
      open
      onToggle={() => {}}
      header={
        <>
          <DeviceTile device={ERROR_DEVICE} />
          <NameBlock device={ERROR_DEVICE} />
          <div
            className="flex shrink-0 items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <HeaderIconButton ariaLabel="Notifications" onClick={() => {}}>
              <NotificationIcon size={12} />
            </HeaderIconButton>
            <HeaderIconButton
              ariaLabel={`View ${errorCount} errors`}
              tone="danger"
              badge={<CountBadge count={errorCount} />}
              onClick={onOpenErrors}
            >
              <LogsGlyph size={12} />
            </HeaderIconButton>
            <ShowOnMapButton />
          </div>
        </>
      }
    >
      {ERROR_DEVICE.cameraPreview && <CameraHero />}
      <Telemetry device={ERROR_DEVICE} />
      <FooterBar>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenErrors();
          }}
          className="inline-flex h-7 items-center gap-1.5 rounded bg-white/[0.05] px-2 text-xs font-medium text-white/70 transition-colors duration-150 hover:bg-state-hover-overlay hover:text-white [&_svg]:size-3.5"
        >
          <LogsGlyph size={14} />
          <span>Logs</span>
        </button>
      </FooterBar>
    </CardShell>
  );
}

/**
 * Opt 3 — "Error" chip in the header.
 * A prominent red pill reading `2 Errors` sits between the name and
 * Show-on-map. Wording stays "Error" (not "Warning") so the operator reads
 * it as a real fault, not a soft caution.
 */
function VariantErrorChip({ onOpenErrors, errorCount }: VariantProps) {
  return (
    <CardShell
      open
      onToggle={() => {}}
      header={
        <>
          <DeviceTile device={ERROR_DEVICE} />
          <NameBlock device={ERROR_DEVICE} />
          <div
            className="flex shrink-0 items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onOpenErrors}
              className="inline-flex h-6 items-center gap-1 rounded-full bg-red-500/15 px-2 text-xs-plus font-semibold uppercase tracking-wide text-red-300 transition-colors duration-150 hover:bg-red-500/25 [&_svg]:size-3"
            >
              <AlertTriangle size={12} />
              {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
            </button>
            <ShowOnMapButton />
          </div>
        </>
      }
    >
      {ERROR_DEVICE.cameraPreview && <CameraHero />}
      <Telemetry device={ERROR_DEVICE} />
      <FooterBar>
        <LogsFooterButton errorCount={errorCount} />
        <NotificationsFooterButton />
      </FooterBar>
    </CardShell>
  );
}

/**
 * Opt 4 — Error banner strip.
 * A full-width red strip pinned to the top of the expanded body reads
 * `2 errors detected — View`. The whole strip is the trigger; Logs +
 * Notifications stay in the inline footer.
 */
function VariantBanner({ onOpenErrors, errorCount }: VariantProps) {
  return (
    <CardShell
      open
      onToggle={() => {}}
      header={
        <>
          <DeviceTile device={ERROR_DEVICE} />
          <NameBlock device={ERROR_DEVICE} />
          <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <ShowOnMapButton />
          </div>
        </>
      }
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenErrors();
        }}
        className="flex w-full items-center justify-between gap-2 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300 transition-colors duration-150 hover:bg-red-500/15 [&_svg]:size-3.5"
      >
        <span className="flex items-center gap-1.5">
          <AlertTriangle size={14} />
          {errorCount} {errorCount === 1 ? 'error' : 'errors'} detected
        </span>
        <span className="inline-flex items-center gap-0.5 text-red-300/80">
          View
          <ChevronRight size={14} />
        </span>
      </button>
      {ERROR_DEVICE.cameraPreview && <CameraHero />}
      <Telemetry device={ERROR_DEVICE} />
      <FooterBar>
        <LogsFooterButton errorCount={errorCount} />
        <NotificationsFooterButton />
      </FooterBar>
    </CardShell>
  );
}

/**
 * Opt 5 — Clickable status pill under the name.
 * The name block grows a tight red pill ("Sensor fault") that sits beneath
 * the device name and reads as a clickable diagnosis. Footer keeps inline
 * Logs + Notifications.
 */
function VariantStatusPill({ onOpenErrors, errorCount }: VariantProps) {
  return (
    <CardShell
      open
      onToggle={() => {}}
      header={
        <>
          <DeviceTile device={ERROR_DEVICE} />
          <div className="min-w-0 flex-1 text-start">
            <div className="truncate text-sm font-medium text-slate-11">{ERROR_DEVICE.name}</div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenErrors();
              }}
              className="mt-0.5 inline-flex items-center gap-1 rounded-sm bg-red-500/15 px-1.5 py-0.5 text-2xs font-medium text-red-300 transition-colors duration-150 hover:bg-red-500/25 [&_svg]:size-3"
            >
              <AlertTriangle size={10} />
              {ERROR_DEVICE.healthReason ?? 'Error'}
              <span className="text-red-300/70">· {errorCount}</span>
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <ShowOnMapButton />
          </div>
        </>
      }
    >
      {ERROR_DEVICE.cameraPreview && <CameraHero />}
      <Telemetry device={ERROR_DEVICE} />
      <FooterBar>
        <LogsFooterButton errorCount={errorCount} />
        <NotificationsFooterButton />
      </FooterBar>
    </CardShell>
  );
}

/**
 * Opt 6 — Explicit CTA button in the footer.
 * The footer's action row leads with a danger primary button `View 2
 * errors`. Most direct path to the modal, at the cost of footer real
 * estate. Logs + Notifications follow it.
 */
function VariantExplicitCta({ onOpenErrors, errorCount }: VariantProps) {
  return (
    <CardShell
      open
      onToggle={() => {}}
      header={
        <>
          <DeviceTile device={ERROR_DEVICE} />
          <NameBlock device={ERROR_DEVICE} />
          <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <ActionControl id="showOnMap" device={ERROR_DEVICE} iconOnly />
          </div>
        </>
      }
    >
      {ERROR_DEVICE.cameraPreview && <CameraHero />}
      <Telemetry device={ERROR_DEVICE} />
      <FooterBar>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenErrors();
          }}
          className="inline-flex h-7 items-center gap-1.5 rounded bg-red-500/15 px-2.5 text-xs font-semibold text-red-300 transition-colors duration-150 hover:bg-red-500/25 [&_svg]:size-3.5"
        >
          <AlertTriangle size={14} />
          View {errorCount} {errorCount === 1 ? 'error' : 'errors'}
        </button>
        <LogsFooterButton />
        <NotificationsFooterButton />
      </FooterBar>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

interface OptionDef {
  id: string;
  title: string;
  caption: string;
  Component: (props: VariantProps) => ReactNode;
}

const OPTIONS: OptionDef[] = [
  {
    id: 'icon-trio',
    title: 'Opt 1 — Icon trio',
    caption: 'Warning + Logs + Bell beside Show-on-map. Warning glyph opens the modal.',
    Component: VariantIconTrio,
  },
  {
    id: 'quiet-button',
    title: 'Opt 2 — Surfaced bell + quiet error',
    caption: 'Notifications promoted out of overflow; a quiet Logs button with a count opens the modal.',
    Component: VariantQuietErrorButton,
  },
  {
    id: 'error-chip',
    title: 'Opt 3 — "Error" chip',
    caption: 'Red pill reading "2 Errors" in the header. Wording stays Error, not Warning.',
    Component: VariantErrorChip,
  },
  {
    id: 'banner',
    title: 'Opt 4 — Error banner',
    caption: 'Full-width red strip at the top of the body; the whole strip is the trigger.',
    Component: VariantBanner,
  },
  {
    id: 'status-pill',
    title: 'Opt 5 — Diagnosis pill',
    caption: 'A clickable "Sensor fault · 2" pill under the name names the failure mode.',
    Component: VariantStatusPill,
  },
  {
    id: 'explicit-cta',
    title: 'Opt 6 — Explicit CTA',
    caption: 'A danger primary "View 2 errors" button leads the footer. Most direct path.',
    Component: VariantExplicitCta,
  },
];

export function CardErrorOptionsLab() {
  const [openId, setOpenId] = useState<string | null>(null);
  const errorCount = useMemo(
    () => MOCK_ERRORS.filter((e) => e.severity === 'critical').length,
    [],
  );
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h3 className="text-sm font-semibold text-white">Error-state options</h3>
        <p className="max-w-[680px] text-xs text-white/55">
          Six ways the card can announce an error and offer a one-click jump to the full
          error list. The card body is identical across variants — only the trigger style
          changes. Every trigger opens the same{' '}
          <span className="text-white/80">All errors</span> modal.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {OPTIONS.map((opt) => (
          <figure key={opt.id} className="space-y-2">
            <figcaption className="space-y-0.5">
              <div className="text-xs font-medium text-white/85">{opt.title}</div>
              <div className="text-xs-plus leading-relaxed text-white/50">{opt.caption}</div>
            </figcaption>
            <div className="w-full max-w-[380px] overflow-visible rounded-md border border-white/[0.06] bg-surface-2">
              <opt.Component
                onOpenErrors={() => setOpenId(opt.id)}
                errorCount={errorCount}
              />
            </div>
          </figure>
        ))}
      </div>

      <AllErrorsModal
        open={openId !== null}
        onOpenChange={(next) => {
          if (!next) setOpenId(null);
        }}
        device={ERROR_DEVICE}
        errors={MOCK_ERRORS}
      />
    </section>
  );
}
