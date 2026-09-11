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
