# Performance budget

Targets are DESIGN CHOICES, not results. Reference hardware remains to be defined. Provisional desktop target: 60 FPS / 16.67ms typical frame, p95 <25ms; CPU <8ms; physics <3ms; population <2ms; streaming <2ms steady state; <300 submitted draws; <100k submitted triangles; <256MB JS heap.

Hard prototype bounds: 25 resident cells, 100 NPC proxies, 50 vehicle proxies, 226 exterior rigid bodies (9/cell + player), 231 inside depot, 100 pooled crate meshes, 2048 persistent prop records, two pending worker jobs, one upload/frame. Resident-cell count is reported; actual frustum-visible cell count is not separately measured.

Measurements must include renderer backend, render resolution, shadow size, sample count, mean/p95 wall-frame time, physics/population/stream time, draw/triangle counts, active entities, heap and resource counts. GPU query latency is asynchronous; unsupported metrics show N/A. Worker generation duration and total process/GPU memory are currently unmeasured.

See SYSTEM_STATUS.md and runtime evidence for actual results. Initial interactive preview showed approximately 22 FPS, ~45ms mean frame, ~83ms p95, 240 draws and 17,008 triangles with 25 cells. This preliminary sample included browser startup/inspection overhead; it fails the provisional frame budget. Do not advertise 60 FPS. Run the diagnostic/export flow and record a fresh baseline after changes.

Optimized production baseline: 20.46 FPS / 48.88ms mean / 83.34ms p95 across 405 diagnostic frames, Intel HD Graphics 2000, 639×698 canvas, 1024² shadows. CPU 26.82ms, physics 5.56ms, population .84ms, streaming 2.00ms, latest GPU sample 26.80ms, 114 draws, 18,856 triangles, 18.81MB JS heap. Draw/triangle/entity budgets passed; frame/CPU/physics targets did not. These are observations of the tested browser, not a hardware-normalized benchmark.

Final regression (410 samples): 28.79 FPS, 34.73ms mean / 50.00ms p95, CPU 13.90ms, physics 2.80ms, population .66ms, streaming 1.37ms; latest GPU 26.74ms; 115 draws / 18,904 triangles; 26.25MB heap. Engine/render configuration unchanged; run variability is material. See `evidence/runtime-final.json`.
