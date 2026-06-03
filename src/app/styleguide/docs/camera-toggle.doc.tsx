/**
 * Co-located doc module for CameraToggleButton — a single on/off camera
 * control built on the base Button. Off invites "point the camera"; pressing
 * slews (pending) and settles into a brighter pressed "live" state. Meta lives
 * in `registry/manifest.json` (parentId: button -> Family section).
 */
import { useState } from 'react';
import { Video } from '@/lib/icons/central';
import { CameraToggleButton } from '@/primitives';
import cameraToggleSrc from '@/primitives/CameraToggleButton.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

function ToggleDemo() {
  const [on, setOn] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <div className="w-40">
      <CameraToggleButton
        on={on}
        pending={pending}
        offLabel="Point camera"
        onLabel="Release camera"
        offIcon={Video}
        onIcon={Video}
        onToggle={() => {
          if (pending) return;
          setPending(true);
          window.setTimeout(() => {
            setPending(false);
            setOn((v) => !v);
          }, 900);
        }}
      />
    </div>
  );
}

export const cameraToggleDoc: ComponentDocModule = {
  id: 'camera-toggle',
  source: cameraToggleSrc,
  usage: `import { CameraToggleButton } from "@/primitives"
import { Video } from "@/lib/icons/central"

<CameraToggleButton
  on={live}
  pending={slewing}
  offLabel="Point camera"
  onLabel="Release camera"
  offIcon={Video}
  onIcon={Video}
  onToggle={handleToggle}
/>`,
  examples: [
    {
      id: 'interactive',
      title: 'Point → slew → release',
      description: 'Click to slew (pending spinner); it settles into the brighter "live" pressed state. Click again to release.',
      render: () => <ToggleDemo />,
    },
    {
      id: 'states',
      title: 'Off / live',
      description: 'The off state invites pointing; the on state reads the same idle or hovered so "live" stays legible.',
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <CameraToggleButton on={false} offLabel="Point camera" onLabel="Release camera" offIcon={Video} onIcon={Video} onToggle={() => {}} />
          </div>
          <div className="w-40">
            <CameraToggleButton on offLabel="Point camera" onLabel="Release camera" offIcon={Video} onIcon={Video} onToggle={() => {}} />
          </div>
        </div>
      ),
    },
  ],
};
