# Decisions — 2026-09-11

- CONFIRMED FACT: canonical repo initially had only README.md at d71cad8fbfe1959ca1562d3d95d13b50381f8716. No continuity/subsystem docs existed.
- CONFIRMED FACT: local Node 20.19.2, npm, Git, Python and Chrome available. No UnrealEditor/Godot executable found on PATH; no /dev/dri in the shell sandbox. This does not prove the separate browser lacks a GPU.
- CONFIRMED FACT: DigitalOcean droplet list returned empty. No remote compute provisioned and no charge authorized. Native engine target unavailable in audited local environment.
- DESIGN CHOICE: Three.js WebGL2 + Rapier WASM + Vite. Version-pinned dependencies with lockfile; all runtime dependencies bundled locally, no CDN dependency.
- DESIGN CHOICE: no generated media/model download, Hugging Face job or Wolfram invocation was needed for GENESIS. Connected services are not a checklist. No remote assets or competitor code imported.
- CONFIRMED FACT: initial shell Git request failed DNS in restricted network. User granted network access; clone succeeded. npm initially failed EROFS on home cache; corrected by `--cache /tmp/gta-npm-cache`.
- CONFIRMED FACT: first browser creation used a stale session binding. Selecting the returned browser ID 1 created a functioning tab and exposed the executable. No code workaround was needed.
- DESIGN CHOICE: 25 cells, bounded crate pool/cache, center-priority worker requests. Analytical distant proxy updates are an honest minimal background-simulation LOD.
- DESIGN CHOICE: keep intended later subsystem boundaries in architecture contracts rather than empty modules masquerading as implementation.
- DESIGN CHOICE: no change to the model/effort of this existing task is claimed; GENESIS is the only operation executed here.

- CONFIRMED FACT: browser renderer identified Intel HD Graphics 2000 through the WebGL debug renderer extension; this differs from the shell's restricted device view.
- EXPERIMENTAL IMPLEMENTATION, subsequently executable-verified: static environment instancing replaced per-object street submission, reducing approximately 240 draws to 114 without removing scene content. Camera uses building AABBs to avoid raycasting every decorative surface.
- FIX: frame telemetry initially inherited the 100ms simulation clamp; changed telemetry to actual wall-clock intervals so stalls are not hidden. Physics alone remains clamped.
- FIX: short Space/E taps could be lost between rendered frames; introduced a separate one-shot action queue and event-order regression test.
- FIX: saved prop maps could be overwritten when clearing live cells during Load; preserve a cloned loaded snapshot before disposal writes.

## PHOTON — 2026-09-12

- DESIGN CHOICE: preserve the canonical GENESIS executable; add a separate Photon render service and lab within the existing plaza.
- CONFIRMED FACT: installed Three0.180 Reflector defaults to half-float plus four MSAA samples; this implementation uses explicit zero MSAA and capability-checked target formats.
- DESIGN CHOICE: filtered cubemap + bounded planar puddle captures gives different costs/responses for rough surfaces and important flat water. Full SSR/SSGI is deferred pending measured budget and artifact work.
- EXPERIMENTAL IMPLEMENTATION: custom box-projected probe, eight-sample depth AO, height-fog integral approximation, image-space edge softening, tiny bloom gather, procedural cloud attenuation, and optional render-scale feedback. None is labeled as a competitor's proprietary renderer.
- FIX: renamed renderer-service dispose method to prevent shadowing runtime cleanup; full disposal now reaches cell physics, render targets, textures, lights, workers and event handlers.
- FIX: local probe captures require residency at their own location; a distant quality change no longer overwrites the plaza probe with an unloaded view.
- FIX: timer-query disjoint events discard every pending result; stale invalid measurements cannot later appear valid.
- FIX: physical puddle fallback follows final capture visibility; distance/frustum culling preserves a surface.
- DESIGN CHOICE: use existing local compute. No new DigitalOcean server, paid generation, model download or Wolfram job is necessary for these GLSL/raster integration changes.

## PHOTON target hardware clarification — 2026-09-12

USER DIRECTION: target modern GPUs in the 60+ CU class with RT capabilities. Preserve the high-quality rendering path even when the local Intel HD 2000 runs slowly. Local measurements qualify compatibility and expose bugs; they do not define the intended visual ceiling. Actual hardware ray tracing remains unimplemented in this WebGL2 backend. A specific modern GPU/resolution baseline is required before advertising a frame-rate target.

## HUMAN — 2026-09-13

USER DIRECTION: eventual GTA VI-like graphical ambition in an original Indian setting; do not make the local PC the production target. DESIGN CHOICE: establish a replaceable weighted procedural character framework with deterministic identity and separately owned representations, retaining full hero geometry. CONFIRMED IMPLEMENTATION: Three SkinnedMesh/linear blend skinning, original parametric assets, named 51-bone rig, bounded crowd, surface controls and broad contact capsules. EXPERIMENTAL: procedural gait, morph corrections and facial surface forms. Production art, mocap and high-end hardware acceptance remain necessary; operation count is not proof of AAA quality. No third-party assets were generated or bought during this milestone.

## PROMETHEUS — 2026-09-13

USER DIRECTION: Operation 03 is reference; execute Operation 04 only. Maintain modern 60+ CU-class/RT GPU production target and GTA VI/RDR2 quality ambition. DESIGN CHOICE: solve motion on the existing weighted humans and use dimensioned collision fixtures inside existing world bounds, with no decorative-asset or map expansion. CONFIRMED IMPLEMENTATION: stateful procedural contact controller, analytic limb IK, explicit rest-axis retargeting, physics-backed course and measured endpoint regressions. EXPERIMENTAL: gait timing, leaning, pelvis compensation and interaction posture. Motion matching, authored motion clips, real inertialization, physical animation and polished visual quality are not implied by passing numerical tests.

## EUPHORIA INDIA — 2026-09-13

- USER DIRECTION: Operation 05 extends committed HUMAN and PROMETHEUS work. Re-supplied Operation 03/04 prompts are continuity references, not instructions to rebuild those milestones. Preserve the original Indian setting, GTA VI/RDR2 visual ambition and modern **60+ CU-class, RT-capable GPU** production target. The local Intel GPU remains a compatibility device.
- DESIGN CHOICE: root `AGENTS.md`, `OPERATION_LEDGER.md` and archived operation prompts establish a recoverable entry point. Read them with status/next-task/specification files before implementation. Each remaining operation 05–20 must include a concrete graphics increment with inspection or measurement. No fixed percentage or promise that operation count guarantees AAA quality is justified.
- DESIGN CHOICE: implement original Rapier physical-animation code on the existing 51-bone HUMAN rig. The operation label does not imply that NaturalMotion’s proprietary Euphoria engine, a neural controller or motion capture is present.
- CONFIRMED IMPLEMENTATION: thirteen explicitly mass-bearing capsule links, twelve joints, four activation-relative hinges, shape-derived inertia, damping, CCD, contact measurements and bounded quaternion PD drives. Internal parent/child torque impulses are equal and opposite. Numerical tests inspect actual momentum, bone positions, joint errors, multi-riser contacts and exact resource release. Anatomical cone limits, self-collision and physical crowd interactions remain absent.
- DESIGN CHOICE: partial reactions retain a controller-owned kinematic pelvis and twelve dynamic links so ordinary locomotion can continue. Full reactions release all thirteen links, disable the original capsule and map the physical pelvis into the rendered skeleton. The disabled player body is only a camera/streaming proxy in full mode.
- EXPERIMENTAL IMPLEMENTATION: support-hull/capture-point estimates, friction/stance policy, tuned controller displacement, sampled recovery-step requests and brief wall constraints provide bounded perturbation responses. Partial mode explicitly restores visible sole contact using PROMETHEUS IK after physical mapping; its visible legs may differ from simulated colliders. This is not proof of unsupported dynamic biped balance.
- DESIGN CHOICE: recovery selects a supported, unoccupied standing capsule position, blends the physical pose into animation and checks clearance again before restoring collision. This provides a bounded locomotion handoff, not a dynamically actuated get-up or swept collision guarantee for every limb. New full-body impacts cancel stale recovery state.
- DESIGN CHOICE: car, motorcycle and occupant-deceleration tests are impact-event approximations. No vehicle dynamics, attached occupant or seat-belt simulation is implied by their labels. Preserve these boundaries for the later vehicle operation.
- CONFIRMED IMPLEMENTATION: the graphics increment adds continuous near/hero garment and limb profiles plus original woven normal/roughness detail within the existing weighted character/material ownership. It preserves distant representation limits. Procedural anatomy remains stylized; cloth shading is not cloth dynamics or final production art.
- VERIFICATION BOUNDARY: an initial executable pass reported 14 reaction, 8 HUMAN, 11 GENESIS and 8 PHOTON checks passing. Those results precede ongoing final integration checks and do not constitute final acceptance of the latest working tree. `SYSTEM_STATUS.md` and its revision-specific evidence own final test outcomes and measured performance.
- TARGET LIMITATION: the current renderer remains WebGL2 without hardware ray tracing. High-end target hardware was unavailable for acceptance; no current frame-rate or image-quality guarantee follows from a preset name, CU count or local result.

## Operation 06 — SECONDARY LIFE

- CONTINUITY: Local/GitHub OP05 d7d0569 verified; resupplied03–05 prompts treated as reference. The latest exact06 prompt is archived. The user clarified 16 GB VRAM alongside the preserved high-end60+ CU/RT target.
- DESIGN CHOICE: Reuse current rigs, original procedural maps and authored guide/panel data; no paid asset generation or remote compute is necessary for this bounded integration.
- EXPERIMENTAL IMPLEMENTATION: Compliant distance constraints approximate flexible material; second-neighbour bending, rest tethers, one-way capsule projection and panel presets are not full fibre/shell simulations.
- DESIGN CHOICE: Facial additive output follows final physical pose and restores before the next animated pose. Explicit authored speech cues drive real shape/bone channels; they are not generated dialogue audio or inferred phonemes.
- GRAPHICS: Add actual animated strips/panels and five facial shape channels, reduce rigid scalp volume, expose front/back/face views. Character inspection moves off a non-colliding curb; city-wide curb collision remains prior work.
- PERFORMANCE: Preserve hero detail; optimize rejected collision queries before reducing workload. Target-class performance must be measured on real hardware and is not inferred from local FPS.
