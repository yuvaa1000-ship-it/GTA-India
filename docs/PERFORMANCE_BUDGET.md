# Performance budget

Targets are DESIGN CHOICES, not results. The user-defined production target is modern graphics hardware in the 60+ compute-unit class with ray-tracing support. The local Intel HD 2000 is a compatibility/correctness environment, not the visual-quality ceiling or production acceptance GPU. Compute-unit counts are architecture-dependent; select an exact GPU, driver, resolution and scene before claiming performance acceptance. The current WebGL2 renderer does not execute hardware ray tracing. Reference hardware remains to be defined. Provisional desktop target: 60 FPS / 16.67ms typical frame, p95 <25ms; CPU <8ms; physics <3ms; population <2ms; streaming <2ms steady state; <300 submitted draws; <100k submitted triangles; <256MB JS heap. PHOTON does not automatically meet these targets by selecting a named quality profile.

Hard prototype bounds: 25 resident cells, 100 NPC proxies, 50 vehicle proxies, 226 exterior rigid bodies (9/cell + player), 231 inside depot, 100 pooled crate meshes, 2048 persistent prop records, two pending worker jobs, one upload/frame. Resident-cell count is reported; actual frustum-visible cell count is not separately measured.

Measurements must include renderer backend, render resolution, shadow size, sample count, mean/p95 wall-frame time, physics/population/stream time, draw/triangle counts, active entities, heap and resource counts. GPU query latency is asynchronous; unsupported metrics show N/A. Worker generation duration and total process/GPU memory are currently unmeasured.

## Historical GENESIS evidence — Operation 01

These measurements predate PHOTON's material laboratory, render graph, quality settings, and additional reflection/postprocessing passes. They are retained as historical results, not current PHOTON FPS or a controlled before/after comparison. See [system status](SYSTEM_STATUS.md) for the current build and [PHOTON comparison evidence](evidence/photon-comparison.json) for its measured configurations.

Initial GENESIS interactive preview showed approximately 22 FPS, ~45ms mean frame, ~83ms p95, 240 draws and 17,008 triangles with 25 cells. This preliminary sample included browser startup/inspection overhead; it fails the provisional frame budget. Do not advertise 60 FPS. Run the diagnostic/export flow and record a fresh baseline after changes.

Optimized production baseline: 20.46 FPS / 48.88ms mean / 83.34ms p95 across 405 diagnostic frames, Intel HD Graphics 2000, 639×698 canvas, 1024² shadows. CPU 26.82ms, physics 5.56ms, population .84ms, streaming 2.00ms, latest GPU sample 26.80ms, 114 draws, 18,856 triangles, 18.81MB JS heap. Draw/triangle/entity budgets passed; frame/CPU/physics targets did not. These are observations of the tested browser, not a hardware-normalized benchmark.

Final GENESIS regression (410 samples): 28.79 FPS, 34.73ms mean / 50.00ms p95, CPU 13.90ms, physics 2.80ms, population .66ms, streaming 1.37ms; latest GPU 26.74ms; 115 draws / 18,904 triangles; 26.25MB heap. Engine/render configuration unchanged between those GENESIS runs; run variability is material. See [historical final evidence](evidence/runtime-final.json).

## PHOTON configured workload limits — Operation 02

The following are settings from `src/rendering/quality.js`, not measured FPS guarantees. Render scale multiplies the separately capped device pixel ratio: `min(devicePixelRatio, 1.5) × scale`. Always record the resulting drawing-buffer dimensions; a preset name alone is insufficient to reproduce the workload.

| Profile     | Render scale | Sun shadow map | Planar target | Eligible planar update rate | AO  | Bloom | Glass                 |
| ----------- | -----------: | -------------: | ------------: | --------------------------- | --- | ----- | --------------------- |
| Performance |         0.70 |           512² |          192² | Every third rendered frame  | Off | Off   | Alpha fallback        |
| Balanced    |         0.85 |          1024² |          320² | Every second rendered frame | Off | On    | Alpha fallback        |
| Reference   |         1.00 |          1024² |          512² | Every rendered frame        | On  | On    | Physical transmission |

Planar capture is additionally gated by distance, a frustum bound, and laboratory visibility. Two puddle masks share one horizontal target. Updates can repeat scene/shadow work, and physical transmission can add renderer-managed scene work. Target resolution is therefore not a complete pass-cost estimate. Reference enables expensive effects for inspection; it has no separate approved frame-rate target and is not a claim of reference-quality optics.

A dirty local probe captures six 128² faces before PMREM filtering. It waits for the laboratory's streamed surroundings and reuses its filtered output target. This avoids continuous recapture but produces event-driven spikes and stale dynamic content between captures. Report recapture/PMREM cost separately from steady-state rendering; it must not disappear from the evidence simply because a fixed-camera sample starts after warm-up.

The main color/depth target follows the drawing-buffer resolution. The exposure meter uses a fixed 16×16 byte target and periodic WebGL2 pixel-buffer/fence readback; record pending/error state and completed samples. HDR scene/planar targets depend on a tested half-float framebuffer. The unsigned-byte fallback skips local PMREM and has different highlight/exposure behavior; code coverage of this branch is not a substitute for running it on unsupported hardware.

Adaptive resolution is **EXPERIMENTAL**, optional, and disabled by default. Its current cooldown controller adjusts scale between 0.5 and 1 using sampled wall-frame duration; it lowers scale above 39ms and raises it below 25ms. Those thresholds are controller settings, not a 60 FPS guarantee. Disable adaptation in comparisons intended to isolate a single feature. Do not attribute a faster run to shader optimization if its rendered resolution changed.

All fifteen asset categories have four screen-space design tiers in [geometry budgets](GEOMETRY_BUDGET.md). Their per-asset triangle ceilings do not override the aggregate scene budget or imply production meshes exist. Current runtime integration hides distant facade-window detail with hysteresis while retaining the building/collision representation. Geometry simplification, full asset LOD chains, HLOD and impostors remain planned.

## PHOTON measurement contract

Use **Compare rendering** and export its report to retain the eight rendering checks and four configurations. The two Balanced sunset runs compare planar off/on under the same preset and condition. Performance rain and Reference night change several settings and lighting together; they are workload profiles, not isolated proof of any one effect's cost. Fixed-camera timing must be supplemented by a camera-path review for artifacts and transition costs.

The latest committed results and actual pass/fail counts are identified in [system status](SYSTEM_STATUS.md) and [PHOTON comparison evidence](evidence/photon-comparison.json). Preliminary measurements from before a rendering or readback fix must be labeled with their source build and must not be substituted for the final regression. No current PHOTON numerical results are inferred from the GENESIS table above.

For each new measurement, record:

- Commit/build, browser, GPU/backend, device scale, drawing-buffer dimensions, quality, lighting, planar/probe state, exposure mode, adaptive state, and camera pose/path.
- Warm-up/capture state, number of measured frames, mean/p95 wall-frame time, CPU submission, physics/population/streaming costs, and completed metering samples/errors.
- Latest available scene/planar/post/meter/probe GPU values together with sample age. GPU timings are asynchronous per-pass samples, not synchronized averages; CPU and GPU values cannot be blindly summed.
- Draws and triangles submitted across the frame's render passes, active proxies/bodies, resident/queued cells, facade-detail cells, JS heap, geometry/texture allocations, and resource counts before/after quality changes. Draw/triangle counts are frame snapshots rather than a unique visible-mesh inventory or per-run averages.

The developer HUD exposes a subset; exported metrics carry additional pass and capability details. JS heap is not process memory or VRAM, and geometry/texture allocation counts are not byte budgets. PHOTON adds render resources while preserving the inherited gameplay population/body limits. The target-lifetime comparison is a bounded reuse check, not a long-duration leak proof. Use the next task's modern-GPU baseline and transmission/probe/scene profiling to select further work without discarding the actual old-GPU findings.
