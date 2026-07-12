/**
 * `/onboarding` — the concept-video base-protection scene.
 *
 * Full-screen cinematic: Google Photorealistic 3D Tiles fill the surface, a
 * single intro → build → protected flow runs on top (see OnboardingFlow).
 * The route is English-only regardless of the app-wide Hebrew default — a
 * nested DirectionProvider forces LTR for this subtree, and the original
 * `<html dir>` / `lang` are restored on unmount.
 */

import { useEffect, useState } from 'react';
import { DirectionProvider } from '@/lib/direction';
import { OnboardingFlow } from './OnboardingFlow';

export default function OnboardingLabPage() {
  // Capture the pre-mount direction during render (before the nested
  // provider's effect rewrites <html dir>), restore it when leaving the
  // route so the rest of the app returns to the user's preference.
  const [prevHtmlState] = useState(() => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  }));
  useEffect(() => {
    return () => {
      const html = document.documentElement;
      if (prevHtmlState.dir) html.setAttribute('dir', prevHtmlState.dir);
      if (prevHtmlState.lang) html.setAttribute('lang', prevHtmlState.lang);
    };
  }, [prevHtmlState]);

  return (
    <DirectionProvider forceDirection="ltr">
      <div className="relative h-screen w-screen overflow-hidden bg-[#0b0b0d] font-sans text-white">
        <OnboardingFlow />
      </div>
    </DirectionProvider>
  );
}
