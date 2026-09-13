# PROMETHEUS executable evidence — 2026-09-13

Starting canonical source: HUMAN 31564d8531e6844193d754c03e6f228727fedf17. Local backend: ANGLE/Mesa Intel HD Graphics 2000 (SNB GT1), OpenGL 3.3, WebGL2. WebGPU adapter unavailable. Production target remains modern 60+ CU-class/RT hardware; no such device was measured.

## Reproduced failures and repairs

1. A retained foot target initially looked locked numerically while the actual ankle missed it by about 11 cm during slow movement. Reach-aware pelvis compensation now precedes the final leg solve; tests measure the actual world ankle, not only its target.
2. Airborne feet failed to relock on a stationary landing. Landing now reacquires supported anchors and clears old contact history.
3. Stationary turning changed body yaw without taking steps. Foot yaw thresholds now schedule alternating pivot steps; stance foot orientations remain held in world space.
4. Releasing a hand target initially caused a 52.5 cm single-frame jump. The previous target now participates in the decaying reach layer until release finishes. Tested maximum remains below a 15 cm per-frame engineering bound; this is damping, not full inertialization.
5. Fast movement outran the first swing timing and produced up to 60 cm ankle error at 8 m/s. Shorter speed-matched swings, landing prediction and bounded moving-root pose substeps repaired the tested flat-ground cases. Tests observe every internal substep at 60 and 10 rendered updates per second, across short/tall bodies and 2.5, 5.5 and 8 m/s.
6. The initial browser resource-recovery check ran while only 23 of 25 cells had returned: 208 bodies plus two ready cells, rather than 226 bodies. The first repair still observed the previous position before the next streaming update. The final repair first advances simulation after the return teleport, then waits for pending/ready work to finish and compares the baseline synchronously. The lab's independent repeated-lifetime test verifies exact removal of its 34 bodies/colliders.

## First integrated browser run (index-CjJLCSqG.js)

Fourteen of fifteen checks passed; the only failure was the premature recovery count above. The test executed real player movement and Rapier queries in the rendered production build:

- Lab owns 34 bodies/colliders, 34 fixtures, one dynamic object, seven targets, one shared geometry and five materials.
- Slow walk covered 1.85594 m with eight steps. Actual solved contact error and drift were near floating-point precision in this flat supported case.
- Jump released both contacts, and supported landing restored both.
- Stairs reached capsule-center Y=7.92448; slope Y=7.96697; curb peak Y=7.06517; uneven paving peak Y=7.10511. Floor standing center is about Y=6.885.
- Doorway passage ended Z=28.63622; wall stopped at Z=25.33510.
- Hero hand-to-handle error was 5.12e-8 m after settling.
- Cast heights 1.91009 and 1.60175 m retargeted 51 named bones to the same actual handle. Root scale ratios 1.09775 and 0.92054; final hand errors near floating-point precision. This verifies positional retargeting, not production anatomical quality.

Traversal-inclusive local sample: 250 frames, 5.537 FPS, mean180.599 ms, p95 550 ms; CPU94.063 ms, physics3.385 ms, population0.630 ms, streaming1.112 ms. Latest HUMAN update6.745 ms. Latest GPU scene107.527 ms, planar25.544 ms, post17.304 ms. Backing buffer972×814, Balanced scale0.85. 497 draw submissions/798,864 submitted triangles,43 geometries,29 textures,46.966 MiB JS heap at the partial-stream recovery snapshot. GPU samples are asynchronous and latest-frame pass counts vary with capture cadence. This is compatibility evidence, not a modern-GPU benchmark.

Visual inspection showed the actual elevated course, stairs, ramp, doorway, shallow puddle, chair/vehicle alignment rigs, movable box and skinned player. They remain dimensioned test fixtures and stylized HUMAN assets. No decorative art, generated video, new map region or mission was added.

## Final verification

Production motion build `index-D5m0UP4E.js`: **15/15 motion checks passed**. The same build passed **11/11 inherited gameplay/streaming checks**. The last UI review then repaired Release to restore comparison actors as well as clear the hero target; subsequent build and UI/regression results follow below.

Final motion result:

| Check               | Measured result                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Physical lab        | 34 owned bodies/colliders, seven targets                                                                                           |
| Supported idle      | Two actual foot contacts                                                                                                           |
| Slow walk           | 1.789009 m, eight steps; maximum solved contact error 7.944e-15 m and actual drift 7.108e-15 m in this controlled flat-ground case |
| Jump / landing      | Contacts released to zero in rising state, restored to two after landing                                                           |
| Stairs              | Capsule-center Y=7.968024 m                                                                                                        |
| Curb                | Peak Y=7.067391 m                                                                                                                  |
| Slope               | Capsule-center Y=7.843809 m                                                                                                        |
| Uneven paving       | Peak Y=7.105041 m                                                                                                                  |
| Doorway             | End Z=28.636343 m                                                                                                                  |
| Wall                | End Z=25.335093 m, blocked as expected                                                                                             |
| Standing hand reach | Actual hand error 6.250e-8 m, reachable                                                                                            |
| Two body sizes      | 1.910091 / 1.601746 m tall, 51 mapped bones each; actual contact errors near floating-point precision                              |
| Pose validity       | All tested bone matrices finite                                                                                                    |
| Lab recovery        | 226 bodies before and after; zero lab bodies, colliders, fixtures, targets, geometries and materials after disposal                |

Motion-run compatibility profile: 311 sampled frames, 5.5355 FPS, mean180.6526 ms, p95 583.325 ms; CPU93.6164 ms, physics4.20785 ms, population0.61904 ms, streaming1.14108 ms. Latest HUMAN update7.64 ms. Latest GPU scene102.88968 ms, planar31.05488 ms, post17.1728 ms. Exposure CPU readback spike606.82 ms and probe capture503.555 ms were reported, not omitted. Final snapshot316 draw submissions/507,700 submitted triangles,42 geometries,27 textures,42.501 MiB JS heap,100 citizens,50 vehicle proxies,226 bodies,7 active rigs,25 resident cells,zero pending/ready. Resolution972×814; Balanced sunset scale0.85, planar on, auto exposure on, adaptation off. Pass timings are asynchronous latest samples; these totals are not a synchronized GPU-frame sum. Shader/driver/capture overhead and camera path affect this old-device result. No modern-GPU throughput was measured.

Inherited gameplay regression: ground contact,4.11 m movement,0.89 m jump height delta, building stopX11.65 at wall11.99;141 created/116 evicted/25 resident cells;226 bodies restored;42→43 geometries within the12-rig allocation allowance;prop persistence,interior entry/exit,zero worker errors.

`node --test tests/*.test.js`: **56 passed,0 failed**, including23 new motion/IK/lab checks and33 inherited checks. Fast flat-ground tests cover heights1.54/1.92 m,2.5/5.5/8 m/s and60/10 pose updates per second, measuring internal substeps. Production build completed with55 modules. Existing Rapier/WASM bundle-size warning remains; no build error. Numerical tolerances are engineering acceptance choices, not proof of natural biomechanics. Slow or fast flat-ground precision must not be generalized to arbitrary terrain, moving platforms, running flight phases or production skeletal assets.

### Final UI and inherited rendering/character regression

Final UI build `index-BB1vJIaB.js` (same motion engine; Release additionally calls `restoreCast()` during body comparison) ran in the actual in-app browser.

- **8/8 HUMAN checks passed**: weighted hero asset, four distinct cast heights,13 live pose updates in the sampling interval, deterministic identities,100 resident citizens,bounded active rigs,226 physics bodies and finite skin matrices.
- **8/8 PHOTON checks passed**: HDR framebuffer,material hierarchy,159 planar captures,five filtered probe captures,21 image-meter samples with no asynchronous error,226→226 physics bodies,15 detailed/25 resident cells,and exact target-lifetime recovery (33→33 textures,42→42 geometries).
- Manual visual inspection confirmed the two different body proportions reaching the physical handle. **Release** now removes both comparison actors from the temporary placement and returns them to their normal cast positions; the following rendered frame confirmed their removal from the handle. HUD hiding and contact controls were exercised. This verifies the interaction control and visible placement, not production anatomy or art quality.

Fixed-camera local render comparison (the scene still contains dynamic citizens, so this is not a perfectly static microbenchmark):

| Configuration               | Samples | Buffer   |    FPS | Mean / p95 ms     |  CPU ms | Physics / population / streaming ms | Draws / triangles | Heap MiB |
| --------------------------- | ------: | -------- | -----: | ----------------- | ------: | ----------------------------------- | ----------------- | -------: |
| Balanced sunset, planar off |      37 | 972×814  | 5.7964 | 172.5215 /616.655 | 59.5134 | 2.3801 /0.8153 /0.2997              | 300 /432,138      |  47.0051 |
| Balanced sunset, planar on  |      34 | 972×814  | 5.6354 | 177.45 /333.33    | 71.1147 | 2.4860 /0.5118 /0.3590              | 460 /599,488      |  48.8787 |
| Performance rain            |      43 | 800×670  | 7.1075 | 140.6966 /149.99  | 59.5764 | 2.7710 /0.5265 /0.3978              | 301 /432,184      |  55.8837 |
| Reference night             |      15 | 1144×958 | 2.1951 | 455.5523 /666.67  | 51.3277 | 1.9543 /0.9840 /0.6380              | 757 /911,112      |  53.0455 |

Latest GPU scene/post/planar ms respectively: Balanced off130.7083/19.2702/N/A; Balanced on122.6797/16.6589/22.2710; Performance rain96.8224/7.5298/16.7007; Reference night343.8719/42.2283/65.3698. These are asynchronously reported pass samples. Reference quality was executed despite its slow local frame rate; no quality preset was reduced to claim target acceptance.

Final-build motion rerun on `index-BB1vJIaB.js`: **15/15 passed again**, including1.788067 m slow travel/eight steps, jump/landing, all six traversal courses,6.250e-8 m hand error,51-bone short/tall contact mapping,finite matrices,and226→226 body recovery with zero remaining lab resources. This rerun started after the manual comparison-release check, exercising entry/reset from an already active laboratory. No engine-code changes followed this run. Browser console inspection found no errors; only the inherited Rapier compatibility initialization deprecation warning was present.

Final acceptance totals: **56/56 Node tests;15/15 motion;11/11 inherited gameplay;8/8 HUMAN;8/8 PHOTON**, plus manual live contact/release and fixture inspection. The gameplay regression was run on `index-D5m0UP4E.js`; final UI build `index-BB1vJIaB.js` changes only the Release handler relative to it. Rendering and HUMAN checks and the repeated motion check ran on the final UI build. Source and documentation are committed together; build output is reproducible via `npm run build` and remains ignored by Git.
