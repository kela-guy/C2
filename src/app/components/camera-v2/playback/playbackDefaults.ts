/**
 * Single source of truth for playback defaults.
 *
 * The playback surface is intentionally minimal — one 50/50 split layout
 * with a play/pause + scrubber + exit transport. Everything that used to
 * be persisted (PiP geometry, speed, loop, bookmarks) is gone, so this
 * module only exposes the open-time rewind, the buffering grace window,
 * and the open-state factory.
 */

import type { PlaybackState } from '../types';

/**
 * How far back from the end of the clip the operator lands when they
 * open playback for the first time on a feed. Keeps the toggle from
 * dumping them at `0` for long recordings.
 */
export const PLAYBACK_REWIND_OPEN_SEC = 30;

/**
 * How long a `waiting` event has to persist before we surface the
 * buffering spinner — short enough to feel responsive, long enough that
 * a hiccup doesn't flash chrome.
 */
export const PLAYBACK_BUFFERING_GRACE_MS = 600;

/**
 * Build the open-state for a freshly enabled playback session.
 *
 *   - Starts paused at `max(0, durationSec - PLAYBACK_REWIND_OPEN_SEC)`
 *     so the operator scrubs deliberately rather than the clip
 *     auto-running from `0`.
 *   - Status is `paused` once we know the duration, otherwise `loading`
 *     so the spinner shows until `loadedmetadata` lands.
 */
export function makeOpenPlaybackState(partial: {
  sourceId?: string;
  durationSec?: number;
} = {}): PlaybackState {
  const durationSec = partial.durationSec ?? 0;
  const startPos = Math.max(0, durationSec - PLAYBACK_REWIND_OPEN_SEC);
  return {
    enabled: true,
    sourceId: partial.sourceId,
    positionSec: durationSec > 0 ? startPos : 0,
    durationSec,
    isPlaying: false,
    status: durationSec > 0 ? 'paused' : 'loading',
    isScrubbing: false,
  };
}
