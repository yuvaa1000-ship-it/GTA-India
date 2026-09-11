# System status — GENESIS 0.1, 2026-09-11

Operation 01 only. Recoverable source/build foundation for **GTA INDIA**, original fictional Navapur. No later operation executed. Canonical main began at `d71cad8fbfe1959ca1562d3d95d13b50381f8716`. This file belongs to the GENESIS milestone commit; use `git log -1` for its final SHA.

## Feature truth

| Feature                                                                                                                  | Classification                      | Evidence / limits                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production WebGL2 executable, sun, shadows, procedural materials                                                         | IMPLEMENTED AND VERIFIED            | Vite production build run in Codex browser; actual scene inspected                                                                                                                            |
| Capsule walking, jump, grounded collision, crate pushing                                                                 | IMPLEMENTED AND VERIFIED            | Rapier execution tests; browser movement/jump/building collision diagnostics                                                                                                                  |
| Keyboard actions, camera-relative movement, chase camera                                                                 | IMPLEMENTED BUT LIMITED             | Short-tap and blur event regression; camera obstruction; no gamepad/mobile, skeletal gait or interpolation                                                                                    |
| Worker cells, prioritized loading, bounded resident set, mesh pool, lifetime cleanup                                     | IMPLEMENTED AND VERIFIED            | 101 creations/76 evictions; 25 cells, 226 bodies and 2 geometries after traversal; 80 additional Node lifecycle cycles                                                                        |
| Prop persistence and browser Save/Load                                                                                   | IMPLEMENTED BUT LIMITED             | Versioned validated local storage; transform persistence verified; 2048-record cap, not unlimited world state                                                                                 |
| Depot interior transition                                                                                                | IMPLEMENTED AND VERIFIED            | Separate collidable room; entry/exit restores exterior and releases bodies                                                                                                                    |
| Pedestrian/vehicle population and background LOD                                                                         | IMPLEMENTED BUT LIMITED             | 100/50 moving cuboid proxies; analytical transform LOD; no collision avoidance, information, driving or persistent identity                                                                   |
| Developer HUD                                                                                                            | IMPLEMENTED BUT LIMITED             | Real frame/CPU/GPU query/physics/population/streaming/draws/triangles/entity/heap/allocation/residency counters; frustum-visible cell count, worker execution cost and total VRAM unavailable |
| Native professional engine                                                                                               | NOT POSSIBLE IN CURRENT ENVIRONMENT | No executable Unreal/Godot detected in audited shell; no existing remote droplet                                                                                                              |
| WebGPU rendering/compute                                                                                                 | PLANNED                             | API exposed in browser; adapter not requested or verified; actual renderer is WebGL2                                                                                                          |
| Foot IK, physical animation, facial, hair, cloth, real vehicle dynamics, weather, water, audio, police, combat, missions | PLANNED                             | Boundaries documented, no implementation claims                                                                                                                                               |
| Large-world origin shifting and durable city simulation                                                                  | PLANNED                             | Prototype clamps travel at ±2048m and has bounded local persistence                                                                                                                           |

No experimental advanced rendering or competitor engine technology is claimed as implemented.

## Verification

- `npm test`: **7/7 pass**. Real physics, lifecycle, deterministic generation, save validation and keyboard event timing.
- `npm run build`: pass. Production bundle, worker and local WASM dependency produced.
- Browser production diagnostic baseline: **11/11 pass**. Grounded Y=.885m, movement 4.65m, jump delta .75m, wall stop x=11.65 before wall x=11.99, persistent prop, interior entry/exit, no worker errors.
- Browser console inspection: no captured errors; known nonfatal upstream Rapier initialization deprecation warning.
- Final regression run and manual control observations are recorded in `docs/evidence/`.

## Measured performance, not a target claim

Baseline: ANGLE / Mesa **Intel HD Graphics 2000 (SNB GT1)**, OpenGL 3.3, WebGL2. Canvas 639×698, device scale 1, 1024² shadows. 405 frame samples included diagnostic traversal and uploads, not a controlled steady-state benchmark.

| Metric                                                        |            Observed |
| ------------------------------------------------------------- | ------------------: |
| Average FPS / frame                                           |     20.46 / 48.88ms |
| p95 frame                                                     |             83.34ms |
| CPU submission / physics                                      |      26.82 / 5.56ms |
| Population transforms / streaming main thread                 |        .84 / 2.00ms |
| Latest asynchronous GPU elapsed sample                        |             26.80ms |
| Draw calls / triangles                                        |        114 / 18,856 |
| JS heap                                                       |             18.81MB |
| Resident cells / NPC proxies / vehicle proxies / rigid bodies | 25 / 100 / 50 / 226 |
| Geometry / texture allocation counts                          |               2 / 1 |

Static instancing reduced submitted draws from about 240 to 114 while retaining scene content. This hardware/runtime did **not** achieve the provisional 60 FPS budget. Graphics hardware is old, but a definitive bottleneck attribution requires further profiling; CPU and GPU timing should not be summed blindly. SharedArrayBuffer, cross-origin isolation, OffscreenCanvas and AudioWorklet APIs are exposed, but only Worker/WASM/WebGL2 are actively used.

## Current limitations and recovery

Generic procedural urban blockout, no final assets; traffic passes through objects; hard region boundary; no streamed network assets, authentic regional street research, true city state or audio. Save/Load belongs to one browser origin; dev and preview ports have different saves. Cross-cell prop migration and out-of-range persistent transforms need a proper entity registry. Camera smoothing can briefly intersect walls. Worker timeout/retry, mobile UX and long-duration soak remain unverified. Large WASM bundle costs startup bytes. No performance target is falsely marked passed.

Use `npm ci`, `npm test`, `npm run build`, `npm run preview`. A standard static server must serve MIME types correctly; set COOP/COEP headers to retain isolation (not required for the current physics worker setup). If storage is denied, UI reports it. If graphics context is lost, reload; no silent engine downgrade. Remote compute was not provisioned; no paid generation was requested.

### Final regression measurement

Final engine/input build repeated all 11 browser diagnostics successfully: 410 samples, **28.79 FPS**, 34.73ms mean and 50.00ms p95. CPU 13.90ms, physics 2.80ms, population .66ms, streaming 1.37ms, latest GPU sample 26.74ms, 115 draws/18,904 triangles, 26.25MB JS heap. Same renderer and 639×698 resolution. Resource counts remained 25 cells/226 bodies/2 geometries. The spread from the earlier run is retained in evidence; do not attribute all improvement to the input fix or treat these as controlled benchmarks. Frame and CPU budgets still fail.

Manual final production control check: Enter dismissed the title, three real W presses moved z=8.0 to z=7.6; Save, Return to plaza and Load restored z=7.6 with all 25 cells repopulated. See `evidence/manual-controls.md`.
