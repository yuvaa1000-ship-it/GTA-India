# SECONDARY LIFE validation — 2026-09-13

Starting local and GitHub main: d7d0569c474e2589a4faf6b0304d250a56455448. The supplied chat export contains the earlier handoff, not the complete construction transcript; the actual OP03/04/05 source commits are intact. The attachment's Operation 06 section is the active instruction, and its 03–05 sections are reference. No prior operation was restarted.

Initial full Node suite: 96/96 tests (92 top-level plus four nested cadence cases), zero failures, 56.366 seconds. This includes the preserved OP05/OP04 physics/motion tests and seven new secondary tests. Existing morph-count assertions were updated from three to eight because five actual facial shape buffers were added; the original three channels remain at the same indices.

The new tests observe free-cloth motion under wind, fixed root-row positions, dry/wet and fabric trajectory differences, capsule/floor separation, finite long/short hair at 60/10 Hz, teleport reset, smooth overlapping visemes, actual nonzero brow/lip/cheek deltas, independent blink timing, dynamic mesh buffers and exactly-once disposal.

Initial browser shader warm-up briefly blocked interaction. It then rendered with no console errors. At the first steady HUD sample the old Intel HD 2000 device reported about 2 FPS / 592.74 ms mean, secondary CPU 168.82 ms for six owners / 1,531 particles. This exposed unnecessary collision-distance work. A capsule AABB rejection and squared-distance test were added before square roots, retaining all particle counts, seven constraint iterations and collision projection. These preliminary costs are not final results or target-GPU measurements.

Before/after inspection uses the existing character in Balanced sunset. The old inspection spawn sits on a decorative curb with no collider and hides footwear; OP06 changes only the inspection position to clear road space. Added front/back/face viewpoints expose garment and facial output. This camera placement repair is distinct from adding physical curbs to the world.

## Final optimized build

Production build index-BSqOLW7Y.js: 68 modules, app 197.27 kB / 65.39 kB gzip; renderer 496.68 / 124.26 kB, physics 2,216.11 / 830.69 kB. Build completed in 21.84 seconds with the existing physics chunk-size advisory. After capsule broad-phase optimization, all seven focused secondary tests passed in 12.59 seconds. No particle resolution or constraint iteration count was reduced.

## Live secondary checks: 9/9 PASS

- Multiple actors: seven owners and 1,717 particles with long hero hair and dupatta panel.
- Wind: actual free-cloth travel 0.075336529 m and hair-guide travel 0.007570886 m over the sampled interval; finite state; maximum relative cloth edge error 0.085289526 (8.53%). This is a sampled constraint error, not a claim of inextensible fabric.
- Wetness: 0.846645033, hair roughness 0.286070344, cloth roughness 0.633738093. Wet input changed actual material values and simulated state.
- Face: observed MBP/E/L/O/AA/S/U visemes, actual brow morph weight 0.8, seven independently seeded blink owners.
- Gaze: object target produced yaw -0.79004157 rad and pitch -0.03810947 rad.
- Full fall: actual full-physical episode, finite particles throughout 43 sampled polls, recovery to balanced.
- All ten presets: 143 cloth particles each, 20 or 30 solver steps in each replacement interval, all finite.
- Disable cleanup: zero secondary owners, hero restored to one original child.
- World restoration: 226 bodies before/after and zero temporary joints.

The report metrics cover a mixed 511-frame window, not an isolated controlled feature benchmark: 3.253072 FPS; 307.401710 ms average, 533.33 ms p95; CPU 253.979550 ms; physics 7.412329 ms; AI 1.150607 ms; streaming 0.790078 ms. Latest secondary cost 103.805 ms for six owners / 1,531 particles, not an average. GPU scene snapshot 125.72128 ms, 924 ms old; pass timings are asynchronous and should not be summed as a synchronized frame. Balanced sunset at 1098×814 on ANGLE/Mesa Intel HD Graphics 2000, adaptive resolution off. Snapshot: 350 submissions, 487,124 submitted triangles, 52 geometries, 30 textures, 78.168 MiB JS heap, 25 cells with no pending loads, seven animation rigs, 100 citizen identities and 50 vehicle proxies. Those population counts do not assert fully simulated traffic or pedestrians. Target 60+ CU RT 16 GB GPU remains unmeasured.

## Inherited live regression on the same build

Physical reactions: 14/14 PASS. Bump, push, fall and stairs each allocated 13 links / 12 joints with approximately 75 kg summed mass, then recovered. Maximum measured stair joint separation 0.004352420 m; normal world restored to 226 bodies and zero joints. Vehicle mass-dependent injected events retained distinct impulses; actual driving remains outside this milestone.

Motion: 15/15 PASS. Walk 1.815613 m with eight executed steps; jump released contacts and landing restored them; stairs, curb, slope, uneven floor, doorway and wall checks passed. Hand-reach error 5.11682e-8 m, two body-size retarget trials finite with 51 mapped bones, lab resources returned to the original 226 bodies.

HUMAN: 8/8 PASS. Hero retains 19,413 vertices / 32,268 triangles / 51 bones and exposes all eight named morph buffers. Four diverse cast identities remain; deterministic citizen identities, 100-citizen capacity, bounded rigs, live skeleton updates, finite poses and 226 world bodies passed.

GENESIS: 11/11 PASS. Locomotion moved 4.18 m, jump rose 0.89 m, building collision stopped at x=11.65 before the x=11.99 wall. Streaming reached 161 created / 136 evicted / 25 resident cells, restored 226 bodies, and retained prop state across unload/reload. Geometry count 55→58 stayed inside the existing allowance of 12; no allowance was weakened. Depot entry/exit and absence of worker errors passed. Final formatter-only rebuild reproduced the identical index-BSqOLW7Y.js asset hash in 20.31 seconds.

PHOTON on index-BSqOLW7Y.js: 8/8 PASS. Actual HDR framebuffer completeness and material hierarchy passed; planar capture advanced to 1,587 and five probe captures were filtered. Image metering completed 220 samples without async errors. Physics remained 226 bodies, window detail covered 15 of 25 cells, and repeated target reuse retained 44 textures / 62 geometries.

## Visual inspection and last correction

Rear view under Balanced sunset confirmed actual long strips and a folded, border-colored hanging panel in the running scene. Face view confirmed mouth opening and head/eye orientation changes while conversation cues ran. These observations are appearance evidence; dynamics are established independently by the live measurements above. Sparse coverage, large simplified facial features and the procedural city remain clearly visible limitations.

Rear/face inspection exposed the reduced scalp cap's wrong center/radius combination: its truncated lower rim sat above the head surface, leaving exposed scalp and a detached-looking edge. The final correction centers its ellipsoid on the same head center, with approximately 1.5% outward clearance and a lower rim. This changes the static cap fit only; solver, facial logic and resource counts are unchanged. All 18 focused secondary/character-visual/HUMAN tests passed (25.347 seconds). Final build index-B135abQ7.js compiled 68 modules in 21.07 seconds; application size remains 197.27 / 65.39 kB gzip.

Final index-B135abQ7.js live secondary rerun: **9/9 PASS**. Six owners / 1,621 particles; wind moved sampled cloth 0.049943906 m and hair 0.068942072 m, maximum relative cloth edge error 8.7652%. Wetness/roughness matched the earlier test, all seven observed speaking visemes returned, actual brow morph was 0.8, and gaze yaw reached -0.790040447 rad. Full physical fall stayed finite across 45 sampled polls and recovered to balanced. All ten fabric replacements were finite; disabling released every secondary owner; 226 bodies / zero joints restored. Final unobstructed rear view confirmed the cap now covers more upper scalp, attached long strips, the hanging folded panel and visible shoes off the curb. Sparse gaps and simplified construction remain. The scalp-only correction did not alter prior solver, streaming, physics or rendering-target code; the complete inherited harness results above identify the preceding build explicitly.

Final manual controls: Sound cue click and Rain selection executed; the face/rain view rendered actual rain streaks and the corrected scalp surface. Audible output was not independently captured, so the tone's acoustic quality is not verified. Final console inspection contained no errors, only the inherited Rapier initialization-parameter deprecation warning.
