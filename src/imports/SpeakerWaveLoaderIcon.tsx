import { DotmSquare18 } from '@/app/components/ui/dotm-square-18';

/**
 * Animated sound-wave bars used as the Play-audio toggle's "on" glyph — the
 * same `DotmSquare18` broadcast loader the speaker now-playing chip uses, wrapped
 * as an icon component so it can drop into the `Button` icon slot (which renders
 * `<Icon size={..} />`). `color="currentColor"` lets the bars inherit the pressed
 * button's white text instead of a fixed preset hue.
 */
export function SpeakerWaveLoaderIcon({ size }: { size?: number; className?: string }) {
  return (
    <DotmSquare18
      size={size}
      dotSize={2}
      speed={0.8}
      pattern="full"
      color="currentColor"
      animated
      opacityBase={0.12}
      opacityMid={0.42}
      opacityPeak={1}
      ariaLabel="Broadcasting"
    />
  );
}
