# PHOTON geometry budgets

## Truth and ownership

**IMPLEMENTED AND VERIFIED:** pure perspective pixel-radius estimation, selection among four geometry tiers, a relative projected-error ceiling, and transition hysteresis in `src/rendering/lod.js`. Node tests exercise distance, drawing-buffer resolution, field of view, camera inside a bound, threshold crossings, hysteresis, invalid input, and all fifteen category policies. This establishes tested selection math. It does not establish a GPU performance improvement by itself.

**DESIGN CHOICE:** all counts below are per-asset authoring ceilings. They are not current resident meshes, verified simplification quality, or supported concurrent populations. Source meshes must supply measured relative simplification error before the error ceiling can become a geometric quality guarantee. The default relative errors are provisional authoring estimates, not measured Hausdorff errors.

**IMPLEMENTED BUT LIMITED:** existing world cells use shared box geometry and GPU instancing with bounded ownership. Their cuboid population proxies do not need high triangle-count asset variants. An application of this selector must retain the original geometry when no authored replacement exists; an absent LOD must not hide a gameplay actor. Renderer integration and its measured evidence are recorded in `SYSTEM_STATUS.md` and `RENDERING_SPEC.md`.

**PLANNED:** offline mesh simplification and measured error metadata, city-block HLOD baking, vegetation/vehicle impostors, silhouette-aware vegetation transitions, material variant selection for every asset family, crossfade/dither transitions, skinning/animation LOD, and occlusion-aware aggregate allocation. This module does not implement those systems or a virtualized geometry renderer.

The rendering service chooses a tier; the entity or asset owner applies mesh/material visibility and owns resources. The helper imports no runtime, world, or renderer module, allocates no GPU resources, and changes no colliders or simulation detail. It never disposes shared geometry.

## Per-asset design ceilings

Counts are triangles. L0 is the finest tier; L3 is the least detailed geometry tier. Each object should be substantially below its ceiling when possible. The provisional global triangle/draw/frame budgets in `PERFORMANCE_BUDGET.md` still constrain simultaneous assets; summing all L0 ceilings is not a viable scene budget.

| Category key    | Asset unit                           |     L0 |     L1 |    L2 |    L3 | Nominal radius boundaries L0/L1/L2 (px) | Error ceiling (px) |
| --------------- | ------------------------------------ | -----: | -----: | ----: | ----: | --------------------------------------- | -----------------: |
| heroProtagonist | Hero protagonist, whole character    | 32,000 | 14,000 | 4,500 | 1,000 | 210 / 90 / 26                           |                1.0 |
| storyNPC        | Important story NPC, whole character | 24,000 | 10,000 | 3,200 |   700 | 190 / 80 / 24                           |                1.2 |
| pedestrian      | Normal pedestrian                    | 12,000 |  5,000 | 1,500 |   300 | 150 / 60 / 18                           |                1.5 |
| crowdPedestrian | Crowd pedestrian                     |  5,000 |  1,800 |   500 |    96 | 120 / 45 / 12                           |                2.0 |
| heroCar         | Hero car including wheels            | 40,000 | 18,000 | 5,500 | 1,100 | 230 / 95 / 28                           |                1.0 |
| scooter         | Scooter including wheels             | 14,000 |  6,000 | 1,800 |   350 | 180 / 70 / 20                           |                1.3 |
| motorcycle      | Motorcycle including wheels          | 18,000 |  8,000 | 2,400 |   450 | 190 / 75 / 22                           |                1.2 |
| autoRickshaw    | Auto-rickshaw including wheels       | 18,000 |  7,500 | 2,500 |   550 | 190 / 80 / 24                           |                1.3 |
| trafficVehicle  | Traffic vehicle                      | 14,000 |  5,500 | 1,800 |   350 | 160 / 60 / 18                           |                1.8 |
| bus             | Bus                                  | 22,000 |  9,000 | 2,800 |   650 | 230 / 90 / 26                           |                1.5 |
| truck           | Truck                                | 24,000 | 10,000 | 3,200 |   700 | 230 / 90 / 26                           |                1.5 |
| buildingFacade  | Facade module, not whole city block  | 16,000 |  6,000 | 1,800 |   240 | 260 / 100 / 28                          |                1.5 |
| interior        | One visible room                     | 24,000 |  9,000 | 2,500 |   400 | 260 / 110 / 32                          |                1.3 |
| vegetation      | One tree/shrub specimen              |  7,000 |  2,500 |   650 |    96 | 170 / 65 / 20                           |                2.0 |
| streetProp      | One street prop                      |  4,000 |  1,400 |   350 |    48 | 130 / 50 / 14                           |                1.5 |

Each frozen policy contains `label`, `maxErrorPixels`, and four `tiers`. A tier contains `maxTriangles`, `minRadiusPixels`, `geometricErrorRatio`, and `materialTier`. Material tiers are `full`, `reduced`, `simple`, and `distant`; these labels are an integration contract, not shader implementations. The default relative geometric errors are 0, .004, .018, and .065 times the bounding radius. Asset-specific policies can replace these values and triangle ceilings without changing the selection code.

## Projection and transitions

The center-plane approximation is:

`radiusPixels = worldRadius × viewportHeight / (2 × tan(verticalFov / 2) × distance)`.

Use vertical FOV in degrees and the actual drawing-buffer height, after pixel ratio and dynamic resolution. `distance` is nonnegative camera-to-center distance in world units. `worldRadius` includes the maximum world scale of the object. A camera at or inside a nonzero bound selects L0. Zero radius or zero drawing-buffer height selects L3. Negative, non-finite, or invalid camera parameters are rejected instead of poisoning tier selection.

This is a cheap center-plane screen-size estimate, not exact projected sphere coverage. It can underestimate large off-axis objects. Frustum/occlusion culling, camera-space depth handling, reflection-camera selection, near-plane clipping, and enlarged bounds for animation remain the caller's responsibility. These limits matter for large facades and skinned characters.

`projectedErrorPixels = radiusPixels × geometricErrorRatio`.

At each adjacent transition, the permitted radius is the smaller of the nominal pixel boundary and `maxErrorPixels / nextTier.geometricErrorRatio`. The selector uses the coarsest eligible tier, subject to history. With the default 12% hysteresis, it demotes only below 88% of a boundary and promotes above 112%. An error-ceiling violation immediately promotes, even within the hysteresis band. This prevents stability from overriding the declared error budget. Teleports can cross multiple tiers in one call. Pass `previousLevel: null` on first assignment or after an asset policy changes.

## Integration contract

```js
import { GEOMETRY_POLICIES, selectLOD } from "../rendering/lod.js";

const tier = selectLOD({
  policy: "autoRickshaw", // or a supplied four-tier policy object
  worldRadius: scaledBoundingRadius,
  distance: camera.position.distanceTo(worldCenter),
  viewportHeight: renderer.domElement.height,
  fovDegrees: camera.getEffectiveFOV(),
  previousLevel: actor.renderLOD ?? null,
});
actor.renderLOD = tier;
// Apply the authored variant. Keep colliders, identity, and persistent state.
const triangleCeiling = GEOMETRY_POLICIES.autoRickshaw.tiers[tier].maxTriangles;
```

For an array of authored meshes, make exactly the chosen mesh visible, retaining ownership with the asset. If using `THREE.LOD`, disable its automatic distance updater before applying this independent screen-space choice. Avoid changing shared material uniforms per actor; use authored material variants or per-instance data. A future LOD service should record selected tier counts, actual submitted triangles, transition counts, and allocation counts alongside CPU/GPU timing.

## Detail strategy and next integration

Preserve face, hand, wheel, handlebar, glass-edge and vehicle-body silhouettes at nearby tiers. Midrange meshes should replace non-silhouette bevels and tread with normal/detail-normal textures where available. Distant facades can merge repeated trim and windows into HLOD meshes; far vegetation needs alpha/overdraw measurement before billboard adoption. Parallax/displacement should only be admitted when their shader/geometry cost and grazing-angle artifacts improve on a simpler mesh. These are authoring and research decisions, not current implementation claims.

Next: attach a real authored four-tier asset to this selector, record its measured simplification errors, inspect transitions while moving the camera and changing resolution, and compare actual draw/triangle/frame metrics with selection forced to L0. Maintain tests for existing physics, streaming, lifetime cleanup, and depot transitions. Any measured improvement must name hardware, resolution, scene, sample count, quality preset, and reflection/shadow passes. The triangle ceilings alone prove no performance target.
