/**
 * Co-located doc module for the CardMedia block — the surveillance
 * image/video slot of a TargetCard. Meta lives in `registry/manifest.json`.
 */
import { CardMedia } from '@/primitives';
import cardMediaSrc from '@/primitives/CardMedia.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const cardMediaDoc: ComponentDocModule = {
  id: 'card-media',
  source: cardMediaSrc,
  usage: `import { CardMedia } from "@/primitives"

<CardMedia src="/videos/target-feed.mov" type="video" />
<CardMedia src="/videos/target-feed.mov" type="video" showControls trackingLabel="נעול על מטרה" />`,
  examples: [
    {
      id: 'live-video',
      title: 'Live video',
      description:
        'Autoplaying muted loop with the Live badge + PTZ chip. HUD chrome follows the app direction; playback time itself always stays LTR.',
      code: `<CardMedia src="/videos/target-feed.mov" type="video" />`,
      render: () => (
        <div className="w-[320px]">
          <CardMedia src="/videos/target-feed.mov" type="video" />
        </div>
      ),
    },
    {
      id: 'playback',
      title: 'Playback with controls + lightbox',
      description:
        'showControls swaps the live chrome for a scrub bar and skip controls; hovering reveals an Expand affordance that opens the recording in a dialog, resuming from the same position.',
      code: `<CardMedia src="/videos/weapon-feed.mp4" type="video" showControls />`,
      render: () => (
        <div className="w-[320px]">
          <CardMedia src="/videos/weapon-feed.mp4" type="video" showControls />
        </div>
      ),
    },
    {
      id: 'tracking',
      title: 'Tracking label',
      description: 'trackingLabel pins a cyan camera-lock chip to the bottom-start corner while an optical track is engaged.',
      code: `<CardMedia src="/videos/target-feed.mov" type="video" trackingLabel="נעול על מטרה" />`,
      render: () => (
        <div className="w-[320px]">
          <CardMedia src="/videos/target-feed.mov" type="video" trackingLabel="נעול על מטרה" />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'no-src',
      label: 'No source',
      note: 'Without src and with placeholder="none" (the default) the block renders nothing — a card never shows an empty black box.',
      render: () => (
        <div className="flex w-[240px] items-center justify-center text-xs text-slate-9">
          <CardMedia />
          <span>no src → renders null</span>
        </div>
      ),
    },
    {
      id: 'aspect',
      label: 'Custom aspect ratio',
      note: 'aspectRatio overrides the fixed type-based height when a feed needs a specific frame.',
      render: () => (
        <div className="w-[240px]">
          <CardMedia src="/videos/target-feed.mov" type="video" aspectRatio="21 / 9" className="h-auto" />
        </div>
      ),
    },
  ],
};
