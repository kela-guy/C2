/**
 * Static SVGs under public/icons/ — filenames match React export names.
 * Update those files when paths change in TacticalMap.tsx or MapIcons.tsx.
 */

export type IconAssetCategory = 'tactical' | 'card';

export interface StyleguideIconAsset {
  subdir: IconAssetCategory;
  fileName: string;
  /** Same as fileName without .svg, for docs */
  exportName: string;
}

export const STYLEGUIDE_ICON_ASSETS: StyleguideIconAsset[] = [
  { subdir: 'tactical', fileName: 'CameraIcon.svg', exportName: 'CameraIcon' },
  { subdir: 'tactical', fileName: 'SensorIcon.svg', exportName: 'SensorIcon' },
  { subdir: 'tactical', fileName: 'RadarIcon.svg', exportName: 'RadarIcon' },
  { subdir: 'tactical', fileName: 'LidarIcon.svg', exportName: 'LidarIcon' },
  { subdir: 'tactical', fileName: 'LauncherIcon.svg', exportName: 'LauncherIcon' },
  { subdir: 'tactical', fileName: 'DroneHiveIcon.svg', exportName: 'DroneHiveIcon' },
  { subdir: 'tactical', fileName: 'DroneIcon.svg', exportName: 'DroneIcon' },
  { subdir: 'tactical', fileName: 'DroneIcon-enemy.svg', exportName: 'DroneIcon-enemy' },
  { subdir: 'tactical', fileName: 'MissileIcon.svg', exportName: 'MissileIcon' },
  { subdir: 'card', fileName: 'DroneCardIcon.svg', exportName: 'DroneCardIcon' },
  { subdir: 'card', fileName: 'MissileCardIcon.svg', exportName: 'MissileCardIcon' },
];

export function iconPublicUrl(subdir: IconAssetCategory, fileName: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}icons/${subdir}/${fileName}`;
}

/** Best-effort multi-file download (may be limited by the browser after a few files). */
export async function downloadAllStyleguideIcons(): Promise<void> {
  for (const { subdir, fileName } of STYLEGUIDE_ICON_ASSETS) {
    const url = iconPublicUrl(subdir, fileName);
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // ignore individual failures
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}
