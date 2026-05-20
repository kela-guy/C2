/**
 * Left- and right-rail tab declarations for the dashboard.
 *
 * Left rail (visual right in RTL):
 *   - `targets`  → live target list (driven by useTacticalTargets +
 *                  useEffectorWorkflow)
 *   - `devices`  → devices panel (driven by useDevicesAndAssets)
 *
 * Right rail (visual left in RTL):
 *   - `cameras`  → video panel (driven by useVideoFeeds)
 *
 * Cameras lives on the opposite rail so its panel slides in from the
 * visual-left edge — operators read targets/devices on one side and
 * the video stack on the other without the panels stacking on top of
 * each other.
 */

import { History, Target, Video, LayoutGrid2 } from "@/lib/icons/central";
import type { GridblockRailTab } from "@/app/components/gridblock";

export type DashboardLeftTabId = "targets" | "devices" | "history";

interface DashboardLeftTabLabels {
  targets: string;
  devices: string;
  history: string;
}

export function getDashboardLeftTabs(
  labels: DashboardLeftTabLabels,
): ReadonlyArray<GridblockRailTab<DashboardLeftTabId>> {
  return [
    { id: "targets", label: labels.targets, icon: <Target size={16} /> },
    { id: "devices", label: labels.devices, icon: <LayoutGrid2 size={16} /> },
    { id: "history", label: labels.history, icon: <History size={16} /> },
  ];
}

/**
 * Compile-time exhaustive guard. Used in switch statements over
 * `DashboardLeftTabId`s so adding a new tab forces every consumer
 * to handle it.
 */
export function assertNeverDashboardTab(value: never): never {
  throw new Error(`Unhandled dashboard left-rail tab: ${String(value)}`);
}

export type DashboardRightTabId = "cameras";

interface DashboardRightTabLabels {
  cameras: string;
}

export function getDashboardRightTabs(
  labels: DashboardRightTabLabels,
): ReadonlyArray<GridblockRailTab<DashboardRightTabId>> {
  return [
    { id: "cameras", label: labels.cameras, icon: <Video size={16} /> },
  ];
}

export function assertNeverDashboardRightTab(value: never): never {
  throw new Error(`Unhandled dashboard right-rail tab: ${String(value)}`);
}
