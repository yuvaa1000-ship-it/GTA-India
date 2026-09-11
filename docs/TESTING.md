# Verification and recovery

`npm test`: deterministic cell priority/negative coordinates, catch-up limits, malformed save rejection, actual Rapier ground/jump/wall/push behavior, 80 cell create/dispose cycles, depot lifetime and position restoration.

`npm run build`: ES2022 production build with worker bundle. Known warning: Rapier compatibility embeds WASM in a >500kB engine chunk (about 2.2MB uncompressed, .83MB gzip). Splitting the same embedded WASM does not remove its startup bytes. No warning suppression applied. Rapier 0.19 compatibility initialization logs an upstream deprecated-parameter warning although its public `init()` accepts no arguments; this is nonfatal and covered by executable tests.

Browser: use Run diagnostics, wait for completion, read every PASS/FAIL and export metrics. The harness uses real world stepping/rendering, not a mock. It temporarily drives player intent and teleports only for isolated fixtures/streaming churn; walking/jumping/collision are measured outcomes. It does not prove keyboard input, art quality, traffic intelligence, long-session reliability or cross-device performance. Manual browser interactions check actual controls and Save/Load.

If failure occurs: keep the actual error, reproduce it, isolate subsystem, repair, rerun targeted test and browser flow, then update SYSTEM_STATUS and NEXT_TASK. Never delete a sophisticated feature just to clear errors. Context loss stops execution and asks for reload; local saves survive. Worker errors surface in diagnostics but automatic fallback is not yet implemented.
