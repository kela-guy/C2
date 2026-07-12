/**
 * Animated Cesium materials for the "virtual wall" coverage effects.
 *
 * - `EnergyWallMaterialProperty` — a custom shader material for
 *   `WallGraphics`: a vertical gradient (solid base fading to a transparent
 *   top) with a slow energy pulse traveling along the wall and subtle
 *   horizontal scanlines. Registered once in Cesium's material cache under
 *   the `EnergyWall` fabric type.
 * - `createRadarSweepImage` — a canvas texture (conic gradient trailing a
 *   bright leading edge) used as an `ImageMaterialProperty` on a rotating
 *   ellipse to read as a radar PPI sweep.
 *
 * Both are time-driven: consumers must keep the scene rendering while these
 * materials are on screen (CesiumMap spins a requestRender loop whenever any
 * marker carries an animated wall/sweep).
 */

import * as Cesium from 'cesium';

const ENERGY_WALL_TYPE = 'C2EnergyWall';

/** Seconds for one pulse cycle along the wall. */
const PULSE_PERIOD_SEC = 3.2;

let registered = false;

/**
 * Register the EnergyWall fabric in Cesium's global material cache.
 * Idempotent — safe to call from every consumer.
 */
function registerEnergyWallMaterial(): void {
  if (registered) return;
  registered = true;
  // `_materialCache` is not in the public typings but is the documented
  // extension point for custom fabric types (used by every "PolylineTrail"
  // style material in the wild).
  (
    Cesium.Material as unknown as {
      _materialCache: { addMaterial: (type: string, def: object) => void };
    }
  )._materialCache.addMaterial(ENERGY_WALL_TYPE, {
    fabric: {
      type: ENERGY_WALL_TYPE,
      uniforms: {
        color: new Cesium.Color(0.13, 0.83, 0.93, 1.0),
        // Normalised 0..1 pulse phase, advanced from JS each frame.
        time: 0,
      },
      source: /* glsl */ `
        czm_material czm_getMaterial(czm_materialInput materialInput)
        {
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;

          // Vertical gradient: solid at the base, dissolving toward the top.
          float fade = pow(clamp(1.0 - st.t, 0.0, 1.0), 1.5);

          // A bright rim right at the top edge sells the "force field" read.
          float rim = smoothstep(0.92, 1.0, st.t) * 0.6;

          // Energy pulse traveling along the wall (s wraps around the ring).
          float phase = fract(st.s * 2.0 - time);
          float pulse = smoothstep(0.0, 0.10, phase) * (1.0 - smoothstep(0.10, 0.30, phase));

          // Subtle horizontal scanlines for texture.
          float scan = 0.9 + 0.1 * sin(st.t * 80.0);

          float alpha = (fade * (0.30 + 0.35 * pulse) + rim) * scan;
          material.diffuse = color.rgb * (0.9 + 0.9 * pulse);
          material.emission = color.rgb * (0.5 + 1.1 * pulse);
          material.alpha = color.a * alpha;
          return material;
        }
      `,
    },
    translucent: true,
  });
}

/**
 * Entity-API material property that renders the EnergyWall fabric. Time is
 * derived from the wall clock so all walls pulse in a shared rhythm.
 */
export class EnergyWallMaterialProperty {
  private readonly color: Cesium.Color;

  /** Never constant — the pulse advances every frame. */
  readonly isConstant = false;
  readonly definitionChanged = new Cesium.Event();

  constructor(color: Cesium.Color) {
    registerEnergyWallMaterial();
    this.color = color;
  }

  getType(): string {
    return ENERGY_WALL_TYPE;
  }

  getValue(_time: Cesium.JulianDate, result?: Record<string, unknown>): Record<string, unknown> {
    const out = result ?? {};
    out.color = this.color;
    out.time = (performance.now() / 1000 / PULSE_PERIOD_SEC) % 1;
    return out;
  }

  equals(other?: unknown): boolean {
    return (
      other instanceof EnergyWallMaterialProperty &&
      Cesium.Color.equals(this.color, other.color)
    );
  }
}

/** Cast helper — Entity graphics accept any MaterialProperty-shaped object. */
export function energyWallMaterial(cssColor: string, alpha = 1): Cesium.MaterialProperty {
  const color = Cesium.Color.fromCssColorString(cssColor).withAlpha(alpha);
  return new EnergyWallMaterialProperty(color) as unknown as Cesium.MaterialProperty;
}

let sweepImageCache: HTMLCanvasElement | null = null;

/** Cached radar-sweep texture — one canvas shared by every sweep entity. */
export function getRadarSweepImage(): HTMLCanvasElement {
  if (!sweepImageCache) sweepImageCache = createRadarSweepImage();
  return sweepImageCache;
}

/**
 * Build the radar-sweep texture: transparent disc with a bright leading edge
 * trailing off over ~90°. Drawn in white; tint at use-time via
 * `ImageMaterialProperty.color`.
 */
export function createRadarSweepImage(size = 512): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;

  // Trailing conic gradient: bright at angle 0, fading backwards.
  const gradient = ctx.createConicGradient(0, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.25)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.0)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(half, half, half, 0, Math.PI * 2);
  ctx.fill();

  // Crisp leading edge line.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = size * 0.006;
  ctx.beginPath();
  ctx.moveTo(half, half);
  ctx.lineTo(size, half);
  ctx.stroke();

  return canvas;
}
