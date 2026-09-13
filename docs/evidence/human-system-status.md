# System status — HUMAN 0.3, 2026-09-13

Operation 03 builds on canonical PHOTON `90ef1203c9d2fec2aca8375330670d67d17e4692`. Read [HUMAN_SPEC](HUMAN_SPEC.md) for the implementation and [executable evidence](evidence/human-validation.md) for actual checks, measurements and recovered failures. The preceding complete status is preserved in [PHOTON status](evidence/photon-system-status.md); its measurements are historical, not current HUMAN results.

The production ambition remains an original Indian open world with GTA VI-like visual quality on modern **60+ CU-class, RT-capable GPUs**. The local Intel HD 2000 is a compatibility machine, not the visual ceiling. The current WebGL2 backend does not execute hardware ray tracing. No target-class hardware was available to certify performance. Twenty operations alone cannot certify AAA art, animation, world density or performance.

## Feature truth

| Feature | Classification | Evidence and limitations |
| --- | --- | --- |
| Skinned playable character, named skeleton, normalized weights | IMPLEMENTED AND VERIFIED | 51 bones; 35,304 hero triangles; real GPU skinning, CPU deformed-vertex regression and live pose updates. Original Rapier controller retained. |
| Four varied cast samples and seeded citizen descriptors | IMPLEMENTED AND VERIFIED | Stable cell/slot identities, distinct proportions/garments/hair, deterministic reconstruction tests. 100 resident citizens. |
| Crowd representations 0–4 and resource ownership | IMPLEMENTED BUT LIMITED | Hero/cast plus at most 12 streamed rigs; decreasing tessellation, reduced update rate, far instancing and offscreen data. Same skeleton at tiers 1/2, static far template, abrupt transitions. Explicit disposal tested. |
| Broad citizen contact capsules | IMPLEMENTED BUT LIMITED | Tier 1 standalone colliders deflect/block player; tested separation and release. No per-limb response, avoidance or physical animation; one-step placement lag possible. |
| Anatomy, clothing, hair and material grammar | IMPLEMENTED BUT LIMITED | Original procedural overlapping surfaces, opaque PBR skin, shaped hair, layered skinned clothes, simple mouth/teeth and eyes. Visible stylization and joint/garment seams. Not final photoreal art. |
| Gait, gaze, blink, smile and elbow correction | EXPERIMENTAL | Live procedural bone/morph controls. No planted feet, contact-aware locomotion, mocap, robust expressions or anatomically calibrated deformation. |
| Wet/dirt/dust/bruise controls | IMPLEMENTED BUT LIMITED | Bounded uniform material changes; wetness follows rain. No spatial masks, accumulation, wound simulation or persistent injury. |
| GENESIS streaming, physics, interior, save and vehicle proxies | IMPLEMENTED BUT LIMITED | Preserved executable systems; vehicle dynamics and traffic intelligence remain absent. Citizens now use HUMAN representations. |
| PHOTON HDR, PBR, probe and planar reflection architecture | IMPLEMENTED BUT LIMITED | Preserved WebGL2 passes; technique-specific limitations remain in RENDERING_SPEC and PHOTON_TECHNIQUES. No hardware RT implied. |
| Production human import pipeline | PLANNED | Scale/weight/morph validation primitives and written integration contract exist; no imported production character or glTF adapter delivered. |
| Physical hair/cloth, facial speech, IK, motion matching, ragdoll | PLANNED | Subsequent systems must integrate with this rig/identity/resource contract. |
| Native engine/WebGPU/RT execution and target-GPU profiling | NOT POSSIBLE IN CURRENT ENVIRONMENT | Browser requestAdapter returned null; no executable native engine or target GPU used. |

## Validation and performance

Eight unit-test files pass, including seven new HUMAN cases covering identity, path/LOD, weighted geometry, actual deformation, ownership, surface state and Rapier contacts. Existing fixed-clock tests now verify elapsed simulated time. Production build passes: 47 modules, app 101.90 kB (35.10 kB gzip), rendering 496.67 kB, physics/WASM 2,216.11 kB. Existing physics bundle-size warning remains.

Live HUMAN checks passed 8/8 on the final-feature build. See evidence for actual counts and startup-inclusive local measurements. Corrected gameplay passed 11/11; final rendering passed 8/8 including stable 39 textures and 45 geometries across quality switches with character ownership held constant. The 316-frame gameplay sample measured 6.897 FPS and 144.988 ms mean on the local Intel GPU. Full conditions and sample caveats are in the evidence file. GPU queries are asynchronous; CPU material/probe compilation spikes and weak-device stalls remain significant. Reported JS heap is not total VRAM.

## Recovery and next integration

Use npm ci, npm test, npm run build, then the production preview. The UI exposes Validate humans, Run diagnostics, Compare rendering and Inspect character. Validation temporarily disables competing controls and character inspection, restoring state afterward. A context loss requires reload; local saved props/player remain recoverable.

Do not discard the working framework to pursue visual polish. Next steps are in [NEXT_TASK](NEXT_TASK.md): contact-aware animation and an original production-quality human asset through explicit joint/material/LOD contracts. No later operation was launched.
