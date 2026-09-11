# Next task

Remain on OPERATION 01 if the current milestone cannot be recovered or its regression tests fail. Otherwise GENESIS is the foundation for the user's separate OPERATION 02 — PHOTON run. No later operation has been launched automatically.

1. Clone canonical main, read SYSTEM_STATUS.md and the specs, `npm ci`, `npm test`, `npm run build`, `npm run preview`.
2. Run browser diagnostics and export a baseline on documented hardware/resolution. Preserve tests for controller contact, pushing, cell ownership, save loading and depot transitions.
3. First integration strike: investigate the frame budget on real hardware, expose explicit render/shadow quality settings, and profile worker/upload stalls independently. Do not equate `navigator.gpu` with a usable adapter. Keep WebGL2 working while evaluating a WebGPU backend.
4. Integrate the PHOTON reflection/lighting increment as specified by the user in that separate operation. Keep new buffers and render passes within named resource ownership and add before/after timing evidence.

GENESIS limitations worth addressing before broad expansion: actual visibility-cell count; timeout/retry for worker failures; persistence beyond the 2048-record cap; interpolation and stronger controller feel; all-world save correctness for moved cross-cell props; camera smoothing near walls; hard world boundary UX. Moving proxies can intersect the player, one another and buildings at junction edges. Do not present them as implemented traffic AI.
