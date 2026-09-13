# Performance budget

Targets are DESIGN CHOICES, not results. The user-defined production target is modern graphics hardware in the 60+ compute-unit class with ray-tracing support. The local Intel HD 2000 is a compatibility/correctness environment, not the visual-quality ceiling or production acceptance GPU. Compute-unit counts are architecture-dependent; select an exact GPU, driver, resolution and scene before claiming performance acceptance. The current WebGL2 renderer does not execute hardware ray tracing. Reference hardware remains to be defined. Provisional desktop timing target: 60 FPS / 16.67 ms typical frame, p95 <25 ms; CPU <8 ms; physics <3 ms; population <2 ms; streaming <2 ms steady state. The original GENESIS limits of 300 draws, 100k submitted triangles and 256 MB JS heap were prototype accounting targets, not ceilings for the final high-end game. Production scene/VRAM budgets must be derived on the specified target hardware with the actual visual workload. PHOTON does not automatically meet these targets by selecting a named quality profile.

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

## HUMAN capacity and production quality

Modern high-end hardware remains the target. HUMAN keeps the full generated hero (32,268 triangles after OP05, 51 bones) and four cast rigs independent of local render FPS. Maximum streamed weighted actors: 12; other residents use one far instanced representation or data only. Up to 100 resident citizen identities, plus hero and 4 cast. Up to 18 human geometry resources and 17 active skeletons; each near character has 6 material groups and 8 morph targets after OP06. Tier 1 contact capsules add colliders but no rigid bodies. The current local renderer is a compatibility measurement; no modern-GPU throughput, 60 FPS acceptance or RT execution is claimed. See HUMAN_SPEC and HUMAN evidence for measured costs and artifacts.

## PROMETHEUS costs and bounds

Motion retains HUMAN's hero geometry and crowd cap. A moving character can take up to six bounded pose substeps per rendered update; final matrices are submitted once per render. IK and retargeting use CPU vector/quaternion work, not GPU compute or a neural network. Telemetry records actual endpoint errors and update cost; cadence tests observe every substep. The removable lab owns 34 bodies/colliders, one geometry and five materials. Its return to baseline waits for both streaming requests and ready cell uploads. Modern target GPU acceptance and total VRAM cost remain unmeasured. See evidence for local timing, with shader/driver and capture overhead explicitly included.

## EUPHORIA costs and bounds — Operation 05

One active hero articulation adds 13 bodies/colliders and 12 joints; partial mode has one kinematic pelvis and 12 dynamic links, full mode has 13 dynamic links. Wall bracing can temporarily add one joint. Reactions use the existing 60 Hz fixed physics schedule. The motion lab adds 34 bodies. The normal exterior returns to 226 bodies/zero reaction joints after disposal and streaming convergence. No physical crowd capacity is implied by the 100 resident citizen identities.

The partial sole correction is analytic IK after physical pose mapping. Its cost is CPU work; full falls retain physical mapping. The runtime reports actual post-correction foot error separately from base animation error. Reaction CPU is the latest fixed-update controller cost, not a per-rendered-frame aggregate or the complete Rapier solver cost. Physics timing and whole-frame timing remain necessary.

Graphics increment 05 reduces hero triangles from 35,304 to 32,268 and vertices from 20,825 to 19,413 while retaining 51 bones and six material groups. Two additional shared 128-square RGBA normal/roughness maps add 128 KiB base texels (about 171 KiB with mipmaps). Crowd cap and full hero quality remain independent of local FPS. Detailed local timings and final-build conditions are in [evidence](evidence/euphoria-validation.md); no modern-GPU result has been extrapolated.

## SECONDARY LIFE configured workload — Operation 06

The production target explicitly includes **16 GB VRAM** on the requested modern 60+ CU-class RT-capable GPU. That is target capacity, not permission to allocate unbounded resources and not a measured device result.

At most nine secondary owners: hero, visible cast and eligible Tier 1 actors. Detailed cloth has 143 particles / 240 triangles; near cloth has 42 particles / 60 triangles. Detailed short hair has 108 guide particles / 180 triangles; long hair 198 / 360. Near hair halves the guide count. These meshes add two material draws per selected actor per applicable render pass, with potential shadow/transmission repetition. The shared 64×256 RGBA hair map costs 64 KiB base texels (about 85 KiB with mipmaps). Dynamic CPU position/normal arrays and five new face-morph arrays add memory beyond this texture count. Total GPU VRAM is not exposed by the runtime.

Each update uses steps no larger than 1/120 second and seven distance/contact sweeps; no change is made to the complete hero resolution because the compatibility PC is slow. Secondary CPU is measured around facial updates, lifecycle management, solver and vertex/normal upload preparation. It does not include GPU rasterization. Rendering can still be dominated by earlier PHOTON passes. Record actual particle counts, update cost, overall mean/p95, drawing-buffer size, submitted geometry, active characters and resource restoration in evidence.
