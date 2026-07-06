/**
 * `/devices-lab` — sandbox for the next-gen device panel + the card-layout
 * study. The real registry-driven panel docks on the side; the main area
 * holds only the low-fi layout variations we are choosing between.
 *
 * Nothing here ships to production: once the design is signed off the
 * folder is promoted into `devices-panel/` and this route is removed.
 */

import { useCallback, useState } from 'react';
import { DirectionProvider as RadixDirectionProvider } from '@radix-ui/react-direction';
import { Link } from 'react-router-dom';
import { ChevronLeft } from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import { LAYOUT_TOKENS } from '@/primitives/tokens';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DevicesPanel } from './devices-panel';
import { MOCK_DEVICES } from './devices-panel-next/mockDevices';
import { CardLayoutLab } from './devices-panel-next/lab/CardLayoutLab';
import { GotchaCardLab } from './devices-panel-next/lab/GotchaCardLab';
import { CardErrorOptionsLab } from './devices-panel-next/lab/CardErrorOptionsLab';
import { DeviceTileStates } from './devices-panel-next/lab/DeviceTileStates';
import { TooltipDesigns } from './devices-panel-next/lab/TooltipDesigns';
import { FloodlightToggleLab } from './devices-panel-next/lab/FloodlightToggleLab';
import { FeedPinLab } from './devices-panel-next/lab/FeedPinLab';

export default function DevicesLabPage() {
  const t = useStrings();
  const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr');
  const [floodlightOnIds, setFloodlightOnIds] = useState<Set<string>>(new Set());
  const [speakerPlayingIds, setSpeakerPlayingIds] = useState<Set<string>>(new Set());
  const [pinnedDeviceIds, setPinnedDeviceIds] = useState<Set<string>>(new Set());

  const toggleId = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, next?: boolean) => {
      setter((prev) => {
        const updated = new Set(prev);
        const shouldHave = next ?? !updated.has(id);
        if (shouldHave) updated.add(id);
        else updated.delete(id);
        return updated;
      });
    },
    [],
  );

  return (
    <div dir={dir} className="relative h-screen w-screen overflow-hidden bg-[#0b0b0d] text-white">
      {/* Radix primitives (tooltips, menus, tabs) portal outside this div; mirror
          the lab LTR/RTL toggle here so placement and chevrons flip with it. */}
      <RadixDirectionProvider dir={dir}>
      {/* Faux map backdrop so the docked panel reads in context. */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(56,189,248,0.08), transparent 45%), radial-gradient(circle at 70% 70%, rgba(248,113,113,0.06), transparent 40%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 100% 100%, 40px 40px, 40px 40px',
        }}
        aria-hidden="true"
      />

      <DevicesPanel
        devices={MOCK_DEVICES}
        open
        noTransition
        title={t.dashboard.devicesPanelTitle}
        closeAriaLabel={t.dashboard.devicesPanelClose}
        typeLabels={t.devices.typeLabels}
        connectionStateLabels={t.devices.connectionLabels}
        strings={t.devices.strings}
        onClose={() => {}}
        onFlyTo={(lat, lon) => console.info('[devices-lab] flyTo', lat, lon)}
        onJamActivate={(id) => console.info('[devices-lab] jam', id)}
        onFloodlightToggle={(id, next) => toggleId(setFloodlightOnIds, id, next)}
        onSpeakerToggle={(id, next) => toggleId(setSpeakerPlayingIds, id, next)}
        onPinToFeed={(id) => toggleId(setPinnedDeviceIds, id, true)}
        onUnpinFromFeed={(id) => toggleId(setPinnedDeviceIds, id, false)}
        floodlightOnIds={floodlightOnIds}
        speakerPlayingIds={speakerPlayingIds}
        pinnedDeviceIds={pinnedDeviceIds}
      />

      <main
        className="relative h-full overflow-y-auto"
        style={{ paddingInlineStart: LAYOUT_TOKENS.sidebarWidthPx + 32 }}
      >
        <div className="max-w-[1400px] px-8 py-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white"
            >
              <ChevronLeft size={14} />
              Back to dashboard
            </Link>

            <div
              className="inline-flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.04] p-0.5"
              role="group"
              aria-label="Text direction"
            >
              {(['ltr', 'rtl'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDir(value)}
                  aria-pressed={dir === value}
                  className={`rounded px-2.5 py-1 text-xs font-medium uppercase tracking-wide transition-colors ${
                    dir === value ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <CardLayoutLab />
          </div>

          <div className="mt-10">
            <CardErrorOptionsLab />
          </div>

          <div className="mt-12 border-t border-white/[0.06] pt-8">
            <Tabs defaultValue="gotcha" dir={dir} className="gap-8">
              <TabsList variant="line">
                <TabsTrigger value="gotcha">Gotcha card</TabsTrigger>
                <TabsTrigger value="tiles">Device tiles</TabsTrigger>
                <TabsTrigger value="tooltips">Tooltips</TabsTrigger>
                <TabsTrigger value="floodlight">Floodlight toggle</TabsTrigger>
                <TabsTrigger value="feed">Add to feed</TabsTrigger>
              </TabsList>

              <TabsContent value="gotcha">
                <GotchaCardLab />
              </TabsContent>

              <TabsContent value="tiles">
                <DeviceTileStates />
              </TabsContent>

              <TabsContent value="tooltips">
                <TooltipDesigns />
              </TabsContent>

              <TabsContent value="floodlight">
                <FloodlightToggleLab />
              </TabsContent>

              <TabsContent value="feed">
                <FeedPinLab />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      </RadixDirectionProvider>
    </div>
  );
}
