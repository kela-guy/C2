/**
 * Flow Builder — author-and-save panel (docked inline-start / right in RTL).
 *
 * The builder is purely for COMPOSING and SAVING a flow. Running a flow
 * happens from the Simulations panel — so this panel has no transport
 * (no Play/Pause/Step). Its single primary action is Save.
 *
 * Presentation + draft-state owner. Draft + preset list live in
 * Dashboard (so closing the panel never loses work, and a save here
 * surfaces immediately as a card in Simulations); the panel is a pure
 * presentation layer over those props.
 *
 * All copy via the `flowBuilder` strings namespace; all colors and
 * typography via Tailwind (Heebo only — no mono/uppercase/tracking,
 * which break Hebrew, the source language); logical direction-aware
 * classes so it reads correctly in RTL and LTR.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, Trash2, Plus, Bird } from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import { DroneCardIcon, CarIcon, TankIcon, TruckIcon } from '@/primitives/MapIcons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { DockedPanel } from '@/app/components/DockedPanel';
import {
  type FlowDef,
  type FlowEntity,
  type FlowLocationPresetKey,
  type FlowPlayback,
  type FlowPlaybackSpeed,
  DEFAULT_FLOW_TIMING,
  FLOW_LOCATION_PRESETS,
  deriveActForEntity,
  upsertFlowPreset,
  deleteFlowPreset,
} from '@/lib/flowBuilder';
import {
  CAMERA_ASSETS,
  RADAR_ASSETS,
  LIDAR_ASSETS,
  findDetectingSensorAssets,
  type MapAsset,
} from '@/app/components/tacticalAssets';
import { CameraIcon, RadarIcon, LidarIcon } from '@/app/components/tacticalIcons';
import type { Affiliation } from '@/primitives/markerStyles';
import { SEVERITY_TW } from './severityTokens';
import { FlowBranchDiagram } from './FlowBranchDiagram';

// ─── Type scale (Heebo only) ────────────────────────────────────────────
const TYPE_SECTION_TITLE = 'text-xs font-semibold text-slate-11';
const TYPE_FIELD_LABEL = 'text-xs-plus font-medium text-slate-10';
const TYPE_HINT = 'text-xs-plus text-slate-9 leading-snug';
const TYPE_CHIP = 'text-2xs font-semibold';
const TYPE_GROUP_LABEL = 'text-2xs font-medium text-slate-9';
const TYPE_BTN = 'text-xs font-medium';

// Elevated surface fill for the remaining form controls (preset select +
// inputs) so they read as a filled surface (≈ SURFACE.level2 opacity)
// rather than a bare outline. Tailwind-only per the panel's guardrail.
const SURFACE_CONTROL = 'bg-white/[0.08] hover:bg-state-hover-overlay border border-white/5';

// Selected / unselected chip-toggle treatment, shared by every
// single-choice picker so they all read the same way.
const CHIP_ON = 'border-white/30 bg-white/10 text-white';
const CHIP_OFF = 'border-white/10 bg-white/[0.04] text-slate-11 hover:bg-state-hover-overlay';

// ─── Constants / defaults ──────────────────────────────────────────────

const ENTITY_OPTIONS: FlowEntity[] = ['drone', 'car', 'tank', 'truck', 'bird'];
const LOCATION_OPTIONS: FlowLocationPresetKey[] = ['sector-north', 'sector-east', 'sector-south', 'sector-west'];
const SPEED_OPTIONS: FlowPlaybackSpeed[] = [0.5, 1, 2, 4];

/**
 * Map-marker glyph per entity, rendered inside the entity chips so the
 * picker matches what the operator sees on the tactical map.
 */
const ENTITY_ICON: Record<FlowEntity, (size: number) => React.ReactNode> = {
  drone: (size) => <DroneCardIcon size={size} />,
  car: (size) => <CarIcon color="currentColor" size={size} />,
  tank: (size) => <TankIcon color="currentColor" size={size} />,
  truck: (size) => <TruckIcon color="currentColor" size={size} />,
  bird: (size) => <Bird size={size} />,
};

type SensorGroupDef = { key: 'cameras' | 'radars' | 'lidar'; assets: MapAsset[]; Icon: SensorGlyph };
type SensorGlyph = (props: { size?: number; fill?: string }) => React.ReactNode;
const SENSOR_GROUPS: SensorGroupDef[] = [
  { key: 'cameras', assets: CAMERA_ASSETS, Icon: CameraIcon },
  { key: 'radars', assets: RADAR_ASSETS, Icon: RadarIcon },
  { key: 'lidar', assets: LIDAR_ASSETS, Icon: LidarIcon },
];

function newDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Build a fresh default flow draft. Exported so Dashboard can seed state. */
export function defaultFlowDraft(): FlowDef {
  return defaultDraft();
}

function defaultDraft(): FlowDef {
  return {
    id: newDraftId(),
    name: '',
    version: 1,
    entity: 'drone',
    affiliation: 'hostile',
    sensorIds: ['RAD-NVT-RADA'],
    location: { kind: 'preset', key: 'sector-north' },
    investigation: { pointCamera: false },
    act: deriveActForEntity('drone'),
    timing: { ...DEFAULT_FLOW_TIMING },
    playback: { mode: 'auto', speed: 1 },
  };
}

function flowsEqual(a: FlowDef, b: FlowDef): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ─── Component ─────────────────────────────────────────────────────────

export interface FlowBuilderPanelProps {
  open: boolean;
  onClose: () => void;
  /** Panel width in px (matches the right-dock group). */
  width?: number;
  /** Skip the slide transition during cross-panel switches. */
  noTransition?: boolean;
  /** Draft state owned by Dashboard (survives panel close). */
  draft: FlowDef;
  onDraftChange: (draft: FlowDef) => void;
  /** Saved preset list + loaded id, shared with the Simulations panel. */
  presets: FlowDef[];
  onPresetsChange: (presets: FlowDef[]) => void;
  loadedPresetId: string | null;
  onLoadedPresetIdChange: (id: string | null) => void;
}

export function FlowBuilderPanel({
  open,
  onClose,
  width,
  noTransition,
  draft,
  onDraftChange,
  presets,
  onPresetsChange,
  loadedPresetId,
  onLoadedPresetIdChange,
}: FlowBuilderPanelProps) {
  const tAll = useStrings();
  const t = tAll.flowBuilder;

  const setPresets = onPresetsChange;
  const setLoadedPresetId = onLoadedPresetIdChange;

  // Read the draft from a ref inside setDraft so multiple functional
  // updates in one tick all see the latest value (the prop `draft` is a
  // stale closure between renders).
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const setDraft = useCallback(
    (next: FlowDef | ((prev: FlowDef) => FlowDef)) => {
      const value = typeof next === 'function' ? (next as (prev: FlowDef) => FlowDef)(draftRef.current) : next;
      onDraftChange(value);
    },
    [onDraftChange],
  );
  const updateDraft = useCallback(
    (patch: Partial<FlowDef>) => setDraft((d) => ({ ...d, ...patch })),
    [setDraft],
  );

  const loadedPreset = useMemo(
    () => (loadedPresetId ? presets.find((p) => p.id === loadedPresetId) ?? null : null),
    [loadedPresetId, presets],
  );
  const isDirty = useMemo(
    () => (loadedPreset ? !flowsEqual(loadedPreset, draft) : draft.name.trim().length > 0),
    [draft, loadedPreset],
  );

  // ── Preset selection (with dirty-discard guard) ───────────────────────
  const [pendingPresetId, setPendingPresetId] = useState<string | null>(null);
  const applyPreset = useCallback((id: string) => {
    if (id === '__new__') {
      setDraft(defaultDraft());
      setLoadedPresetId(null);
      return;
    }
    const p = presets.find((pp) => pp.id === id);
    if (p) {
      setDraft({ ...p });
      setLoadedPresetId(p.id);
    }
  }, [presets, setDraft, setLoadedPresetId]);
  const handleSelectPreset = useCallback((id: string) => {
    if (isDirty && id !== (loadedPresetId ?? '__new__')) {
      setPendingPresetId(id);
      return;
    }
    applyPreset(id);
  }, [applyPreset, isDirty, loadedPresetId]);

  // ── Save / Save as / Delete / Export / Import ─────────────────────────
  const handleSave = useCallback(() => {
    const next: FlowDef = loadedPresetId
      ? { ...draft, id: loadedPresetId }
      : { ...draft, id: `flow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    const finalName = next.name.trim() || t.namePresetFallback(presets.length);
    const stored: FlowDef = { ...next, name: finalName };
    const after = upsertFlowPreset(stored);
    setPresets(after);
    setDraft(stored);
    setLoadedPresetId(stored.id);
    toast.success(t.toasts.saved(finalName));
  }, [draft, loadedPresetId, presets.length, setDraft, setLoadedPresetId, setPresets, t]);

  const handleSaveAs = useCallback(() => {
    const fresh: FlowDef = {
      ...draft,
      id: `flow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: draft.name.trim() || t.namePresetFallback(presets.length),
    };
    const after = upsertFlowPreset(fresh);
    setPresets(after);
    setDraft(fresh);
    setLoadedPresetId(fresh.id);
    toast.success(t.toasts.saved(fresh.name));
  }, [draft, presets.length, setDraft, setLoadedPresetId, setPresets, t]);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const handleDelete = useCallback(() => {
    if (!loadedPresetId) return;
    const removed = presets.find((p) => p.id === loadedPresetId);
    const after = deleteFlowPreset(loadedPresetId);
    setPresets(after);
    setDraft(defaultDraft());
    setLoadedPresetId(null);
    if (removed) toast.success(t.toasts.deleted(removed.name));
  }, [loadedPresetId, presets, setDraft, setLoadedPresetId, setPresets, t]);

  // ── Sensors ───────────────────────────────────────────────────────────
  const draftLatLon = useMemo(() => {
    if (draft.location.kind === 'custom') return { lat: draft.location.lat, lon: draft.location.lon };
    return FLOW_LOCATION_PRESETS[draft.location.key];
  }, [draft.location]);
  const handleAutoPickSensors = useCallback(() => {
    const assets = findDetectingSensorAssets(draftLatLon.lat, draftLatLon.lon);
    updateDraft({ sensorIds: assets.map((a) => a.id) });
  }, [draftLatLon, updateDraft]);
  const toggleSensor = useCallback((id: string) => {
    setDraft((d) => ({
      ...d,
      sensorIds: d.sensorIds.includes(id) ? d.sensorIds.filter((s) => s !== id) : [...d.sensorIds, id],
    }));
  }, [setDraft]);

  // ── Entity + affiliation ──────────────────────────────────────────────
  // Picking an entity re-derives the effector: the response follows from
  // what the entity is, not a separate operator choice.
  const handleSelectEntity = useCallback(
    (entity: FlowEntity) => updateDraft({ entity, act: deriveActForEntity(entity) }),
    [updateDraft],
  );
  const handleSelectAffiliation = useCallback(
    (affiliation: Affiliation) => updateDraft({ affiliation }),
    [updateDraft],
  );

  // ── Auto-focus the name input on open ─────────────────────────────────
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => nameInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const showFirstRunHint = presets.length === 0 && loadedPresetId == null && draft.name.trim().length === 0;

  // ── Footer (single primary Save + optional first-run hint) ─────────────
  const footer = (
    <div className="px-4 py-3 space-y-2">
      {showFirstRunHint && (
        <p className={`${TYPE_HINT} text-center`}>{t.onboarding.firstRunHint}</p>
      )}
      <button
        type="button"
        onClick={handleSave}
        className={[
          `w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded ${TYPE_BTN}`,
          'bg-white text-slate-2 hover:bg-slate-11 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
        ].join(' ')}
      >
        <Check size={14} />
        <span>{t.buttons.save}</span>
      </button>
    </div>
  );

  const title = (
    <div className="min-w-0">
      <p className="text-xs-plus text-slate-9 leading-none">{t.panel.title}</p>
      <h2 className="text-sm font-semibold text-white truncate mt-0.5">
        {draft.name.trim() || t.labels.newFlow}
      </h2>
    </div>
  );

  const headerExtra = isDirty ? (
    <button
      type="button"
      onClick={handleSave}
      className={`${TYPE_CHIP} px-1.5 py-0.5 rounded border border-orange-400/40 bg-orange-400/10 text-orange-300 hover:bg-orange-400/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring`}
    >
      {t.panel.unsavedBadge}
    </button>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <DockedPanel
      open={open}
      onClose={onClose}
      side="start"
      width={width}
      noTransition={noTransition}
      closeOnEsc
      dataHandoff="flow-builder-panel"
      title={title}
      headerExtra={headerExtra}
      closeAriaLabel={t.panel.close}
      bodyClassName="px-4 py-3 space-y-4"
      footer={footer}
    >
      {/* ── Preset picker + name + secondary toolbar ──────────────── */}
      <Section title={t.labels.preset}>
        <Select value={loadedPresetId ?? '__new__'} onValueChange={handleSelectPreset}>
          <SelectTrigger className={`w-full text-xs ${SURFACE_CONTROL}`}>
            <SelectValue placeholder={t.labels.newFlow} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__new__">{t.labels.newFlow}</SelectItem>
            {presets.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          ref={nameInputRef}
          type="text"
          value={draft.name}
          onChange={(e) => updateDraft({ name: e.target.value })}
          placeholder={t.labels.flowNamePlaceholder}
          className={`w-full mt-2 rounded px-2 py-1.5 text-xs text-white placeholder:text-slate-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring ${SURFACE_CONTROL}`}
          aria-label={t.labels.flowName}
        />
        {loadedPresetId && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <ToolbarButton onClick={handleSaveAs} icon={<Plus size={12} />} label={t.buttons.saveAs} />
            <ToolbarButton
              onClick={() => setConfirmDelete(true)}
              icon={<Trash2 size={12} />}
              label={t.buttons.delete}
              tone="danger"
            />
          </div>
        )}
      </Section>

      {/* ── Detection ────────────────────────────────────────────── */}
      <Section title={t.sections.detectionTitle} hint={t.sections.detectionHint}>
        <Field label={t.labels.entity}>
          <ChipGrid
            value={draft.entity}
            options={ENTITY_OPTIONS.map((e) => ({
              value: e,
              label: t.entities[e],
              icon: ENTITY_ICON[e](16),
            }))}
            onChange={handleSelectEntity}
          />
        </Field>

        <Field label={t.labels.location}>
          <ChipGrid
            value={draft.location.kind === 'preset' ? draft.location.key : 'sector-north'}
            options={LOCATION_OPTIONS.map((k) => ({ value: k, label: t.locations[k] }))}
            onChange={(v) => updateDraft({ location: { kind: 'preset', key: v } })}
          />
        </Field>

        <Field label={t.labels.sensors}>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleAutoPickSensors}
              className={`w-full px-2 py-1.5 rounded border border-white/10 bg-white/[0.04] hover:bg-state-hover-overlay ${TYPE_BTN} text-slate-11 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring`}
            >
              {t.labels.autoBySensors}
            </button>
            {SENSOR_GROUPS.map((g) => (
              <SensorGroup
                key={g.key}
                title={t.sensorGroups[g.key]}
                assets={g.assets}
                Icon={g.Icon}
                selectedIds={draft.sensorIds}
                onToggle={toggleSensor}
              />
            ))}
          </div>
        </Field>
      </Section>

      {/* ── Investigation ────────────────────────────────────────── */}
      <Section title={t.sections.investigationTitle} hint={t.sections.investigationHint}>
        <Field label={t.labels.classifyDelay}>
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={(draft.timing.classifyMs / 1000).toString()}
            onChange={(e) => {
              const n = Math.max(0, parseFloat(e.target.value) || 0);
              updateDraft({ timing: { ...draft.timing, classifyMs: Math.round(n * 1000) } });
            }}
            className={`w-full rounded px-2 py-1.5 text-xs text-white tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring ${SURFACE_CONTROL}`}
          />
        </Field>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!draft.investigation.pointCamera}
            onChange={(e) => updateDraft({
              investigation: { ...draft.investigation, pointCamera: e.target.checked },
            })}
            className="size-3.5 accent-cyan-400"
          />
          <span className="text-xs text-slate-11">{t.labels.pointCamera}</span>
        </label>
      </Section>

      {/* ── Escalation (branching preview + affiliation picker) ──── */}
      <Section title={t.sections.escalationTitle} hint={t.sections.escalationHint}>
        <FlowBranchDiagram
          draft={draft}
          entityIcon={ENTITY_ICON[draft.entity](16)}
          onSelectAffiliation={handleSelectAffiliation}
        />
      </Section>

      {/* ── Playback config (authored, runs from Simulations) ─────── */}
      <Section title={t.sections.transportTitle} hint={t.sections.transportHint}>
        <Field label={t.labels.playbackMode}>
          <ChipGrid
            value={draft.playback.mode}
            options={(['auto', 'manual'] as const).map((m) => ({ value: m, label: t.playback[m] }))}
            onChange={(m) => updateDraft({
              playback: m === 'auto'
                ? ({ mode: 'auto', speed: draft.playback.mode === 'auto' ? draft.playback.speed : 1 } as FlowPlayback)
                : ({ mode: 'manual' } as FlowPlayback),
            })}
          />
        </Field>

        {draft.playback.mode === 'auto' && (
          <Field label={t.labels.speed}>
            <div className="grid grid-cols-4 gap-1.5">
              {SPEED_OPTIONS.map((s) => {
                const active = draft.playback.mode === 'auto' && draft.playback.speed === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateDraft({ playback: { mode: 'auto', speed: s } })}
                    className={[
                      'px-2 py-1.5 rounded border text-xs tabular-nums transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
                      active ? CHIP_ON : CHIP_OFF,
                    ].join(' ')}
                    aria-pressed={active}
                  >
                    {s}×
                  </button>
                );
              })}
            </div>
          </Field>
        )}
      </Section>

      {/* ── Dirty-discard guard ──────────────────────────────────── */}
      <AlertDialog open={pendingPresetId !== null} onOpenChange={(o: boolean) => !o && setPendingPresetId(null)}>
        <AlertDialogContent className="border-white/10 bg-slate-1 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.discardConfirm.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-10">
              {t.discardConfirm.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-slate-11 hover:bg-state-hover-overlay">
              {t.discardConfirm.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={() => {
                if (pendingPresetId !== null) applyPreset(pendingPresetId);
                setPendingPresetId(null);
              }}
            >
              {t.discardConfirm.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete confirmation ──────────────────────────────────── */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="border-white/10 bg-slate-1 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.simulations.deleteConfirm.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-10">
              {loadedPreset ? t.simulations.deleteConfirm.description(loadedPreset.name) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-slate-11 hover:bg-state-hover-overlay">
              {t.simulations.deleteConfirm.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={() => {
                handleDelete();
                setConfirmDelete(false);
              }}
            >
              {t.simulations.deleteConfirm.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DockedPanel>
  );
}

// ─── Small subcomponents ───────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className={TYPE_SECTION_TITLE}>{title}</h3>
        {hint && <p className={`${TYPE_HINT} mt-0.5`}>{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className={TYPE_FIELD_LABEL}>{label}</label>
      {children}
    </div>
  );
}

/** Compact secondary (ghost) toolbar button. Save is the primary action. */
function ToolbarButton({
  onClick,
  icon,
  label,
  tone,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone?: 'danger';
}) {
  const toneClasses =
    tone === 'danger'
      ? [SEVERITY_TW.CRITICAL.chipBorder, SEVERITY_TW.CRITICAL.chipBg, SEVERITY_TW.CRITICAL.text, 'hover:bg-red-500/20'].join(' ')
      : 'border-white/10 bg-white/[0.04] text-slate-11 hover:bg-state-hover-overlay';
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        `flex items-center gap-1 px-2 py-1 rounded border ${TYPE_BTN}`,
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
        toneClasses,
      ].join(' ')}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/** Shared single-choice picker: a 2-col grid of filled toggle chips. */
function ChipGrid<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={[
              'flex items-center gap-1.5 px-2 py-2 rounded border text-xs text-start transition-colors min-w-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
              active ? CHIP_ON : CHIP_OFF,
            ].join(' ')}
            aria-pressed={active}
          >
            {o.icon && (
              <span className="shrink-0 inline-flex items-center" aria-hidden>{o.icon}</span>
            )}
            <span className="min-w-0 flex-1 truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SensorGroup({
  title,
  assets,
  Icon,
  selectedIds,
  onToggle,
}: {
  title: string;
  assets: MapAsset[];
  Icon: SensorGlyph;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <h4 className={TYPE_GROUP_LABEL}>{title}</h4>
      <div className="grid grid-cols-3 gap-1.5">
        {assets.map((s) => {
          const checked = selectedIds.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              className={[
                'flex flex-col items-center justify-center gap-1 px-1.5 py-2 rounded border text-center min-w-0',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
                checked
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                  : 'border-white/10 bg-white/[0.04] text-slate-11 hover:bg-state-hover-overlay',
              ].join(' ')}
              aria-pressed={checked}
              title={s.typeLabel}
            >
              <span className="shrink-0" aria-hidden>
                {Icon({ size: 18, fill: 'currentColor' })}
              </span>
              <span className="w-full min-w-0 truncate text-2xs leading-tight">{s.typeLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

