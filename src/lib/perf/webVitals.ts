/**
 * `web-vitals/attribution` integration.
 *
 * Why a separate module from `observers.ts` even though there's
 * conceptual overlap (both touch LCP, CLS, INP):
 *   - `web-vitals` does the *aggregation* spec-correctly. INP is the
 *     75th percentile of all interactions (or 98th for ≥50 interactions);
 *     CLS is the cumulative non-input shift; LCP is the final candidate
 *     at page-unload. Reimplementing those rules ourselves would just
 *     diverge from the platform definitions.
 *   - The attribution build adds LoAF correlation per interaction, so
 *     we get "this hover took 340 ms because of these scripts" as a
 *     single payload. Doing this manually would require re-implementing
 *     web-vitals' interaction-bucketing logic.
 *   - The raw observers above still feed our HUD's per-event histograms.
 *     This module feeds the aggregated metrics + the INP-attribution
 *     panel.
 *
 * `reportAllChanges: true` is critical: the default behavior reports
 * the *final* INP at page-unload, which never fires for a long-lived
 * operator console. With `reportAllChanges`, we get every update so
 * the HUD shows live INP.
 */

import {
  onCLS,
  onINP,
  onLCP,
  onFCP,
  onTTFB,
  type CLSMetricWithAttribution,
  type INPMetricWithAttribution,
  type LCPMetricWithAttribution,
  type FCPMetricWithAttribution,
  type TTFBMetricWithAttribution,
} from 'web-vitals/attribution';
import { recordEvent } from './sink';

interface RegisteredFlag {
  done: boolean;
}

const registered: RegisteredFlag = { done: false };

export function setupWebVitals(): void {
  if (registered.done) return;
  registered.done = true;

  onCLS(
    (m: CLSMetricWithAttribution) => {
      recordEvent({
        category: 'webvitals',
        name: 'CLS',
        t: performance.now(),
        value: m.value,
        args: {
          rating: m.rating,
          delta: m.delta,
          largestShiftValue: m.attribution.largestShiftValue,
          largestShiftTarget: m.attribution.largestShiftTarget,
        },
      });
    },
    { reportAllChanges: true },
  );

  onLCP(
    (m: LCPMetricWithAttribution) => {
      recordEvent({
        category: 'webvitals',
        name: 'LCP',
        t: performance.now(),
        value: m.value,
        args: {
          rating: m.rating,
          element: m.attribution.element,
          url: m.attribution.url,
          timeToFirstByte: m.attribution.timeToFirstByte,
          resourceLoadDelay: m.attribution.resourceLoadDelay,
          resourceLoadDuration: m.attribution.resourceLoadDuration,
          elementRenderDelay: m.attribution.elementRenderDelay,
        },
      });
    },
    { reportAllChanges: true },
  );

  onINP(
    (m: INPMetricWithAttribution) => {
      // The big win: INP attribution carries `longAnimationFrameEntries`
      // overlapping the interaction time-range. Each LoAF has scripts[],
      // which is what tells us *which function* was slow — not just
      // "there was an interaction that took 350 ms".
      const loafScripts = (m.attribution.longAnimationFrameEntries ?? [])
        .flatMap((entry) =>
          (entry.scripts ?? []).map((s) => ({
            invoker: s.invoker,
            sourceURL: s.sourceURL,
            sourceFunctionName: s.sourceFunctionName,
            duration: s.duration,
          })),
        )
        .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
        .slice(0, 5);
      recordEvent({
        category: 'webvitals',
        name: 'INP',
        t: performance.now(),
        value: m.value,
        args: {
          rating: m.rating,
          interactionType: m.attribution.interactionType,
          interactionTarget: m.attribution.interactionTarget,
          inputDelay: m.attribution.inputDelay,
          processingDuration: m.attribution.processingDuration,
          presentationDelay: m.attribution.presentationDelay,
          loadState: m.attribution.loadState,
          loafScripts,
        },
      });
    },
    { reportAllChanges: true },
  );

  onFCP((m: FCPMetricWithAttribution) => {
    recordEvent({
      category: 'webvitals',
      name: 'FCP',
      t: performance.now(),
      value: m.value,
      args: { rating: m.rating, timeToFirstByte: m.attribution.timeToFirstByte },
    });
  });

  onTTFB((m: TTFBMetricWithAttribution) => {
    recordEvent({
      category: 'webvitals',
      name: 'TTFB',
      t: performance.now(),
      value: m.value,
      args: {
        rating: m.rating,
        waitingDuration: m.attribution.waitingDuration,
        cacheDuration: m.attribution.cacheDuration,
        dnsDuration: m.attribution.dnsDuration,
        connectionDuration: m.attribution.connectionDuration,
        requestDuration: m.attribution.requestDuration,
      },
    });
  });
}
