# Cesium engagement line — dash animation (DEFERRED)

> **Status:** dropped for now. Static dashed line + animated particle dots are
> shipping. Animated *dashes themselves* (sliding along the line) didn't land
> after several attempts. This doc captures what we tried so the next pass can
> pick up without rewinding.
>
> **Files involved:**
> - `src/primitives/CesiumMap.tsx` — primitive-side polyline + material logic
> - `src/app/components/CesiumTacticalMap.tsx` — wires the engagement-line
>   polyline into `CesiumMap.polylines[]`
> - `src/app/components/useEngagementLine.ts` — the **Mapbox** reference
>   implementation we're trying to match

---

## Goal

Visual parity with the Mapbox engagement line. On Mapbox, the line:

1. Renders as a **static dashed pattern** (`'line-dasharray': [4, 4]`)
2. The dashes themselves **animate** — their lengths morph cyclically via
   `setPaintProperty(layer, 'line-dasharray', pattern)` every ~20 ms, producing
   a "growing dash → sliding gap" wave that reads as flow direction
3. **Three circle particles** flow along the line with spring easing, rendered
   as separate GeoJSON point features (a glow circle + a core circle each)

The Cesium parity work covers (1) and (3); (2) is the missing piece.

## Current state on Cesium (working)

| Piece | Implementation | Notes |
|---|---|---|
| Static dashed line | `Cesium.PolylineDashMaterialProperty` (when we revert the failed animation) | Default 16-bit `0xFF00` pattern, `dashLength: 12`. Matches Mapbox's static spacing. |
| Spring-eased particle dots | 3 `Cesium.Entity` point primitives per polyline. Position = `Cesium.CallbackPositionProperty` driven by `Date.now()`, sampling a per-line endpoints ref + the spring LUT ported from `useEngagementLine.ts` | Cesium's render loop polls `CallbackPositionProperty` every frame, so the dots animate without any RAF on our side. |
| Line endpoint easing | `polyline.positions = Cesium.CallbackProperty(...)` for 2-point dashed lines. Stores `{prev, curr, changedAt}` per id and ease-out cubics between them over 300 ms | Kills the 1 Hz jitter from dashboard tick updates. |
| Distance badge | HTML marker at the midpoint, coloured to match the line | Simple. |
| Effector highlight | `state='selected'` on the resolved Regulus / launcher marker | Uses the same engagement-pair resolution as Mapbox. |

## What we tried for animated dashes (none stuck)

### Attempt 1 — bit-rotate the `dashPattern` via `CallbackProperty`

```ts
new Cesium.PolylineDashMaterialProperty({
  color,
  dashLength: 16,
  dashPattern: new Cesium.CallbackProperty(() => {
    const base = 0xff00;
    const shift = Math.floor(Date.now() / 60) % 16;
    return ((base << shift) | (base >>> (16 - shift))) & 0xffff;
  }, false),
});
```

**Result:** visibly glitchy. Each step rotates the bit pattern by 1 bit, but
that's a *within-cycle reshuffle* — a dash bit at position 8 disappears and a
gap bit at position 0 turns into a dash. That's not a continuous slide; it's a
wrap-around shuffle that flickers because the visible pattern keeps cycling
without ever truly translating along the line.

### Attempt 2 — custom `Cesium.Material` via fabric, update `time` uniform inside `MaterialProperty.getValue`

```ts
const material = new Cesium.Material({
  fabric: {
    type: 'CesiumMapAnimatedDash',
    uniforms: { color, time: 0, dashLength: 16, speed: 24 },
    source: `
      czm_material czm_getMaterial(czm_materialInput materialInput) {
        czm_material material = czm_getDefaultMaterial(materialInput);
        float pixelDist = materialInput.s * (czm_pixelRatio * czm_viewport.z) * 0.5;
        float pos = mod(pixelDist - time * speed, dashLength * 2.0);
        if (pos < dashLength) {
          material.diffuse = color.rgb;
          material.alpha = color.a;
        } else {
          material.alpha = 0.0;
        }
        return material;
      }
    `,
  },
  translucent: true,
});

return {
  isConstant: false,
  definitionChanged: new Cesium.Event(),
  getType: () => 'CesiumMapAnimatedDash',
  getValue: () => {
    material.uniforms.time = (Date.now() % 1_000_000) / 1000;
    return material;
  },
  equals: () => false,
};
```

**Result:** dashes were static. Hypothesis confirmed in attempt 3: Cesium
polyline graphics only invokes `MaterialProperty.getValue()` when
`definitionChanged` fires, **not** every frame. The uniform was set exactly
once at material bind and never updated.

### Attempt 3 — keep the custom material, tick the uniform in `viewer.scene.preRender`

```ts
const dashMaterialsRef = useRef<Map<string, Cesium.Material>>(new Map());

// In the polyline effect, when creating a dashed material:
const { property, material } = createAnimatedDashMaterialProperty(...);
dashMaterialsRef.current.set(line.id, material);
// Use `property` as polyline.material, keep `material` reference for tick.

// In the existing preRender listener:
const tNow = (Date.now() % 1_000_000) / 1000;
for (const m of dashMaterialsRef.current.values()) {
  (m.uniforms as { time: number }).time = tNow;
}
```

**Result:** still not moving. The uniform value is being updated on the
JavaScript-side `Material.uniforms` object every frame, but it isn't
propagating to the GPU.

## Hypotheses for why attempt 3 didn't work

These are unverified — pick one to test first when picking this back up.

1. **Cesium reads uniforms from the GeometryInstance's appearance, not the
   Material directly.** Polyline graphics under entity API use
   `PolylineGraphics → PolylineGeometryUpdater → PolylineCollection / Primitive`.
   The `Primitive` may snapshot uniform values at primitive-creation time,
   so mutating `material.uniforms.time` after bind has no effect on the GPU
   draw. **Test:** drop down to `PolylineCollection` directly (lower-level
   API) and set its appearance with our custom material to see if uniform
   mutation propagates there.

2. **`fabric.translucent: true` may be triggering a non-update render path.**
   Cesium has separate render paths for opaque vs translucent. The
   translucent path may cache uniforms differently. **Test:** make the
   material opaque (no alpha discard) and see if it animates.

3. **The Material type name is registered globally at first construction
   and reused, but the uniforms object is per-instance.** That should be
   fine, but if `Cesium.Material._materialCache` is sharing a single
   uniforms object across instances, our updates would be racy or no-op.
   **Test:** verify that distinct `Material` instances have distinct
   `uniforms` objects (`console.log(material.uniforms === otherMaterial.uniforms)`).

4. **The pre-render hook fires before Cesium has snapshotted uniforms for
   the upcoming frame.** Maybe we need `viewer.scene.postUpdate` or a
   different hook that runs *before* uniforms are gathered for the draw
   call. **Test:** swap `preRender` for `postUpdate` and see if behaviour
   changes.

5. **`czm_viewport.z` may not be the value I think in this shader stage.**
   The pixel-distance calculation could be returning a constant / zero,
   leaving `pixelDist` static and the dashes never advancing. **Test:**
   simplify the shader to just `material.alpha = step(0.5, fract(time));`
   — the entire line should blink in/out once a second if uniforms are
   actually live.

6. **Cesium polyline graphics may bypass our custom material entirely
   when `definitionChanged` never fires after first bind.** It might be
   re-using a cached primitive that has the *initial* material with `time = 0`
   baked in. **Test:** call `definitionChanged.raiseEvent()` once per
   second and see whether updates take effect (if so, switch to a hybrid
   approach: tick uniforms in pre-render *and* fire `definitionChanged`
   on a low cadence).

## Approaches we haven't tried yet

- **Drop `Entity` and use `PolylineCollection` directly.** Lower-level API,
  full control over the appearance + material, no `MaterialProperty`
  abstraction in the way. Mapbox-style fine-grained control would be
  natural here.
- **Use `Cesium.PolylineMaterialAppearance` on a `Primitive` with a
  custom shader.** Same idea as above, but via the `Primitive` /
  `GeometryInstance` route.
- **Use a moving repeating-texture material** (`Image` material) with the
  texture's `repeat` and `translate` properties animated, so the texture
  itself slides along the line. Easier than custom GLSL.
- **Render the dashes as N separate small line segments** (or even
  per-dash entities) and animate each segment's position. Brutal but
  guaranteed to work.
- **Skip dash animation entirely** and add more / brighter particles, or
  a "comet trail" effect on each particle (a short fading polyline
  trailing the dot). Same reading of "flow direction" without the
  dash gymnastics.

## When picking this back up

1. Read this doc.
2. Pick attempt 1 from §"Hypotheses": drop down to `PolylineCollection`
   and re-attempt with custom appearance.
3. If that doesn't work either, try the canary shader from §"Hypothesis 5"
   (`step(0.5, fract(time))`) to verify *whether the uniform tick is
   reaching the GPU at all*. If yes → the issue is in the dash math; if
   no → the issue is in the uniform-propagation chain.

## What's currently shipping (after revert)

- Static dashed line via stock `PolylineDashMaterialProperty`
- 3 spring-eased particle dots
- Endpoint easing for 1 Hz jitter
- Distance badge at midpoint
- Effector highlight via `state='selected'`

The line still *reads* as an active engagement — the dots provide enough
motion to communicate direction. Animated dashes would be polish on top.
