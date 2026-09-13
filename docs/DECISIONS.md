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
