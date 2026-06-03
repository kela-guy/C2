/**
 * Co-located doc module for the CopyButton primitive. Meta lives in
 * `registry/manifest.json`.
 */
import { CopyButton } from '@/primitives';
import copyButtonSrc from '@/primitives/CopyButton.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const copyButtonDoc: ComponentDocModule = {
  id: 'copy-button',
  source: copyButtonSrc,
  usage: `import { CopyButton } from "@/primitives"

<CopyButton value="32.46356, 35.00042" copyLabel="Copy coordinates" copiedLabel="Copied" />`,
  examples: [
    {
      id: 'sizes',
      title: 'Sizes',
      description: 'Quiet, hover-revealed copy affordance. The Check glyph lands ~2px larger than Copy for visible success without layout shift. Forced visible here.',
      render: () => (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-sm text-zinc-300">
            <span>SN-48213</span>
            <CopyButton value="SN-48213" copyLabel="Copy serial" copiedLabel="Copied" size="sm" alwaysVisible />
          </div>
          <div className="flex items-center gap-2 font-mono text-sm text-zinc-300">
            <span>32.46356, 35.00042</span>
            <CopyButton value="32.46356, 35.00042" copyLabel="Copy coordinates" copiedLabel="Copied" size="md" alwaysVisible />
          </div>
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-value',
      label: 'Long value',
      note: 'The button copies the full value regardless of how the adjacent text is truncated — the glyph stays a fixed 24px and never grows with the value.',
      render: () => (
        <div className="flex w-[220px] items-center gap-2 font-mono text-sm text-zinc-300">
          <span className="min-w-0 flex-1 truncate">32.463561, 35.000427, 410m MSL</span>
          <CopyButton
            value="32.463561, 35.000427, 410m MSL"
            copyLabel="Copy coordinates"
            copiedLabel="Copied"
            alwaysVisible
          />
        </div>
      ),
    },
    {
      id: 'hover-revealed',
      label: 'Hover-revealed (resting)',
      note: 'Default behavior: hidden at opacity-0 until the parent group/copy row is hovered or the button is focused. Hover this tile to reveal it.',
      render: () => (
        <div className="group/copy flex items-center gap-2 rounded-md px-2 py-1 font-mono text-sm text-zinc-300 hover:bg-white/[0.04]">
          <span>SN-48213</span>
          <CopyButton value="SN-48213" copyLabel="Copy serial" copiedLabel="Copied" />
        </div>
      ),
    },
    {
      id: 'empty-disabled',
      label: 'Empty value (disabled)',
      note: 'An empty value auto-disables the button (opacity-30, cursor-not-allowed) so there is nothing to copy by accident.',
      render: () => (
        <div className="flex items-center gap-2 font-mono text-sm text-zinc-500">
          <span>—</span>
          <CopyButton value="" copyLabel="Copy value" copiedLabel="Copied" alwaysVisible />
        </div>
      ),
    },
  ],
};
