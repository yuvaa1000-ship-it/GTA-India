# HUMAN executable evidence — 2026-09-13

Backend: WebGL2 through ANGLE/Mesa Intel HD Graphics 2000 (SNB GT1), OpenGL 3.3. Viewport 1280×720; Balanced backing buffer 1088×612. WebGPU adapter returned null. No modern target GPU was available; these are local compatibility measurements.

The first final-feature HUMAN check passed 8/8: weighted hero, cast diversity, live skeleton updates, deterministic identities, citizen capacity, bounded rigs, retained physics and finite pose matrices. Hero: 20,825 vertices, 35,304 triangles, 51 bones, three morphs; measured height including hair 1.78072 m. Four cast seeds produce heights 1.91009, 1.60175, 1.69386 and 1.74533 m, with different garment/hair combinations. Live check observed 13 pose updates. Population 100; nine active rigs, one contact capsule, 226 rigid bodies, 25 cells. Near/far/data tiers were [5,1,3,20,76].

Early 50-frame sample includes shader/stream startup: 3.51 FPS, 285.12 ms mean, 899.99 ms p95; scene GPU 94.36 ms, planar 29.69 ms, post 14.29 ms (asynchronous latest samples, not synchronized sums); 574 draws, 830,962 submitted triangles, 44 geometries, 31 textures, 58.69 MiB reported JS heap. This is not steady-state target performance.

Close character camera was visually inspected: actual skinned hero, cast and walking citizens render within the preserved plaza. Face, hair forms, hands, layered clothing, eyes and mouth are visible. Models visibly comprise stylized overlapping procedural surfaces; shoulders/joints and clothing require authored replacement. This inspection is appearance evidence; live pose/deformation and physics checks establish executable behavior.

First gameplay regression passed 10/11. Locomotion moved 1.88 m during a wall-clock second because the slow renderer drops catch-up simulation time. The test now waits for elapsed fixed simulation time; the production controller and catch-up budget are preserved. Streaming created 101/evicted 76 cells, retained 25 residents, 226 bodies before/after and 44 geometries before/after. Separate contact regression initially assumed a complete stop; the actual capsule trajectory slid around the citizen, so it now checks separation and deflection. A negative startup frame sample exposed mixed timestamp origins; initialization now uses the first animation-frame timestamp.

Final regression results are recorded below after running the corrected build.

## Corrected build: index-Bv5svphS.js

Gameplay **11/11 passed**: movement 4.50 m, jump 0.89 m, building stop x=11.65 before wall x=11.99, 101 cells created/76 evicted/25 resident, 226 rigid bodies before/after, geometries 41 before/43 after (changing crowd representations within the 12-rig allowance), saved prop retained, interior entry/exit and no worker errors.

316-frame traversal-inclusive sample: 6.897 FPS, 144.988 ms mean, 450.005 ms p95, CPU 70.434 ms, physics 2.582 ms, population 0.539 ms, streaming 1.709 ms. Latest human update 1.775 ms; eight active rigs, two contact capsules, 100 citizens; 561 draws, 857,384 submitted triangles, 43 geometries, 29 textures, 75.939 MiB JS heap. Latest GPU scene 91.249 ms, planar 28.601 ms, post 13.368 ms. These values do not predict performance on a modern GPU. Meter CPU sample still spikes (~515 ms) on this driver despite asynchronous PBO retrieval; the implementation avoids a synchronous readPixels result but cannot guarantee stall-free submission.

Final code regression: eight test files passed with no failures; production build passed with 47 modules. The app chunk is 101.72 kB before gzip. The inherited large physics bundle warning remains.

The first HUMAN rendering comparison passed seven functional checks but failed its inherited global allocation comparison (textures 37→39, geometries 44→45) while a citizen entered a detailed representation. The render-target lifecycle portion now temporarily freezes HUMAN ownership/poses, waits for rendering to settle, and compares the unchanged crowd across repeated quality switches. The preceding four performance samples retain live citizens. Finally restoration always releases the freeze. This isolates rendering ownership; it does not replace the separate streaming and exact character-disposal tests.

## Final build: index-BR-tQtBl.js

Rendering **8/8 passed**: HDR completeness, material hierarchy, 89 planar captures, five filtered probe captures, 13 image-meter samples with no async error, 226 bodies before/after, nine detailed window cells out of 25, and target lifecycle textures **39→39**, geometries **45→45**. Three Performance/Balanced resource-switch cycles were executed with frozen character ownership; normal updates were restored afterward.

| Live rendering condition | Samples | FPS | Mean / p95 ms | Backing buffer | Latest draws / submitted triangles |
| --- | ---: | ---: | --- | --- | --- |
| Balanced, no planar | 25 | 4.323 | 231.332 / 499.995 | 1088×612 | 346 / 518,582 |
| Balanced, planar | 25 | 3.713 | 269.331 / 450.005 | 1088×612 | 343 / 518,532 |
| Rain, Performance | 27 | 4.463 | 224.072 / 550.015 | 896×503 | 519 / 704,904 |
| Night, Reference | 11 | 1.844 | 542.421 / 683.310 | 1280×720 | 919 / 1,200,400 |

A separate user game tab was present during this final run, so shared-device contention further limits performance interpretation. Draw/triangle values are the latest whole render-graph frame, not averages; captures run on different cadences. These short samples verify executable paths, not reliable comparative benchmarks. Hero geometry was not reduced for Performance. Final app chunk: 101.90 kB (35.10 kB gzip).

Final HUMAN rerun after the rendering test: **8/8 passed**, including seven live pose updates during the timed observation, finite bone matrices, unchanged valid hero geometry, 100 citizens, eight active rigs, two contact capsules and 226 rigid bodies. This confirms updates resumed after the lifecycle freeze. Browser log inspection captured no errors; the existing upstream Rapier initialization deprecation warning remains.
