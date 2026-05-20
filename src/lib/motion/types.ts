export type MovementMode = 'live' | 'replay' | 'seek' | 'static';

export interface MovementSample {
  id: string;
  lat: number;
  lon: number;
  headingDeg?: number;
  sourceTimeMs: number;
  mode: MovementMode;
}
