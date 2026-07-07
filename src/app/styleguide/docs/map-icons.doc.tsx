/**
 * Co-located doc module for the MapIcons primitive — the first-party
 * tactical glyph set. Meta lives in `registry/manifest.json`.
 */
import {
  DroneCardIcon,
  MissileCardIcon,
  CarCardIcon,
  TankCardIcon,
  TruckCardIcon,
  HumanCardIcon,
  UnknownCardIcon,
  JamWaveIcon,
  DroneCardIcon as Drone,
  UnknownIcon,
  HumanIcon,
  CarIcon,
} from '@/primitives/MapIcons';
import mapIconsSrc from '@/primitives/MapIcons.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const CARD_ICONS: { name: string; Icon: typeof DroneCardIcon }[] = [
  { name: 'DroneCardIcon', Icon: DroneCardIcon },
  { name: 'MissileCardIcon', Icon: MissileCardIcon },
  { name: 'CarCardIcon', Icon: CarCardIcon },
  { name: 'TankCardIcon', Icon: TankCardIcon },
  { name: 'TruckCardIcon', Icon: TruckCardIcon },
  { name: 'HumanCardIcon', Icon: HumanCardIcon },
  { name: 'UnknownCardIcon', Icon: UnknownCardIcon },
];

export const mapIconsDoc: ComponentDocModule = {
  id: 'map-icons',
  source: mapIconsSrc,
  usage: `import { DroneCardIcon, UnknownIcon } from "@/primitives"

// In-UI tile — rides currentColor:
<span className="text-slate-11"><DroneCardIcon size={15} /></span>

// On the map — color prop + black legibility stroke:
<UnknownIcon color={style.glyphColor} size={32} />`,
  examples: [
    {
      id: 'card-set',
      title: 'Card variants',
      description:
        'The *CardIcon variants are stroke-free and ride currentColor, so they inherit the tile\'s text tone — use these inside CardHeader icon boxes, device rows, and any in-UI surface.',
      code: `<span className="text-slate-11">
  <DroneCardIcon size={20} />
</span>`,
      render: () => (
        <div className="flex flex-wrap items-end gap-6">
          {CARD_ICONS.map(({ name, Icon }) => (
            <div key={name} className="flex w-16 flex-col items-center gap-2 text-slate-11">
              <Icon size={20} />
              <span dir="ltr" className="text-3xs text-slate-9">{name.replace('CardIcon', '')}</span>
            </div>
          ))}
          <div className="flex w-16 flex-col items-center gap-2 text-slate-11">
            <JamWaveIcon size={20} />
            <span dir="ltr" className="text-3xs text-slate-9">JamWave</span>
          </div>
        </div>
      ),
    },
    {
      id: 'map-set',
      title: 'Map variants',
      description:
        'Map variants take an explicit color prop (severity- or affiliation-driven) and carry a black stroke + drop shadow so the glyph stays legible over satellite imagery.',
      code: `<UnknownIcon color={style.glyphColor} size={32} />
<HumanIcon color={style.glyphColor} size={32} />
<CarIcon color={style.glyphColor} size={32} />`,
      render: () => (
        <div className="flex items-end gap-8">
          <UnknownIcon size={32} />
          <HumanIcon size={32} />
          <CarIcon size={32} />
        </div>
      ),
    },
    {
      id: 'toned',
      title: 'Toned by context',
      description:
        'Because card variants ride currentColor, wrapping them in a toned text utility is all it takes — no per-icon color plumbing.',
      code: `<span className="text-accent-danger-text"><DroneCardIcon size={20} /></span>
<span className="text-accent-warning-text"><DroneCardIcon size={20} /></span>
<span className="text-slate-9"><DroneCardIcon size={20} /></span>`,
      render: () => (
        <div className="flex items-center gap-6">
          <span className="text-accent-danger-text"><Drone size={20} /></span>
          <span className="text-accent-warning-text"><Drone size={20} /></span>
          <span className="text-accent-success-text"><Drone size={20} /></span>
          <span className="text-slate-9"><Drone size={20} /></span>
        </div>
      ),
    },
  ],
};
