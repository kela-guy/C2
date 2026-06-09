/**
 * `/onboarding` — previewable lab for the auto-coverage onboarding experience.
 *
 * Full-screen "command table": the live Cesium 3D map fills the surface, the
 * step rail docks inline-end, and the protection-score HUD floats over the
 * map. Not wired into production first-run yet (deferred until the trust /
 * credibility discovery assumptions pass — see docs/discovery/).
 */

import { OnboardingFlow } from './OnboardingFlow';

export default function OnboardingLabPage() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0b0b0d] font-sans text-white">
      <OnboardingFlow />
    </div>
  );
}
