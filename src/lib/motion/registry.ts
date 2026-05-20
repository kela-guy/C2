import { createMotionTrack, type MotionQuery, type MotionTrack } from './motionTracker';
import type { MovementMode, MovementSample } from './types';

export class MotionRegistry {
  private readonly tracks = new Map<string, MotionTrack>();
  private readonly lastSourceTimeMs = new Map<string, number>();
  private readonly monoIngestMs = new Map<string, number>();

  ingest(samples: readonly MovementSample[]): void {
    const seen = new Set<string>();

    for (const sample of samples) {
      if (!Number.isFinite(sample.lat) || !Number.isFinite(sample.lon)) continue;
      seen.add(sample.id);

      if (sample.mode === 'static') {
        this.tracks.delete(sample.id);
        this.lastSourceTimeMs.delete(sample.id);
        this.monoIngestMs.delete(sample.id);
        continue;
      }

      let mode: MovementMode = sample.mode;
      const prevTime = this.lastSourceTimeMs.get(sample.id);
      if (prevTime != null && sample.sourceTimeMs < prevTime - 1) {
        mode = 'seek';
      }

      let track = this.tracks.get(sample.id);
      if (!track) {
        track = createMotionTrack();
        this.tracks.set(sample.id, track);
      }

      let ingestT = sample.sourceTimeMs;
      if (mode === 'live') {
        const prevMono = this.monoIngestMs.get(sample.id) ?? 0;
        ingestT = Math.max(sample.sourceTimeMs, prevMono + 1);
        this.monoIngestMs.set(sample.id, ingestT);
      }

      track.pushSample(sample.lat, sample.lon, ingestT, {
        mode,
        headingDeg: sample.headingDeg ?? null,
      });
      this.lastSourceTimeMs.set(sample.id, ingestT);
    }

    for (const id of this.tracks.keys()) {
      if (!seen.has(id)) {
        this.tracks.delete(id);
        this.lastSourceTimeMs.delete(id);
        this.monoIngestMs.delete(id);
      }
    }
  }

  query(id: string, now: number): MotionQuery | null {
    return this.tracks.get(id)?.query(now) ?? null;
  }

  peek(id: string): MotionQuery | null {
    return this.tracks.get(id)?.peek() ?? null;
  }

  has(id: string): boolean {
    return this.tracks.has(id);
  }

  advance(now: number): void {
    for (const track of this.tracks.values()) {
      track.query(now);
    }
  }
}
