# Architecture

## Implemented dependency direction

`main -> core/runtime -> subsystem services -> config / engine libraries`.
`streaming/manager -> world/cell -> rendering assets + physics helpers + save store`.
`cell.worker -> world/generate` (pure serializable descriptors only).
`debug/diagnostics -> runtime public interfaces` is a test adapter. Runtime does not import diagnostics. No subsystem imports main. No circular module dependencies.

Runtime owns the scene, physics world, input, clock, streaming, player, depot and telemetry. Cells own their rigid bodies and instance buffers. Shared Assets owns material/geometry resources; pooled crate meshes borrow these. Disposal releases cells before shared assets and frees WASM once. Main binds UI and page exit. Fixed physics is 60 Hz with at most five catch-up steps. Visibility changes discard accumulated time and clear input.

## Extension map (contracts, not implemented systems)

| Domain                                                          | Future boundary / owner                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| materials, lighting, reflections                                | rendering services; renderer-neutral settings and explicit resource release |
| world, streaming                                                | pure descriptors; worker generation; main-thread GPU/physics registration   |
| characters, animation, procedural-animation, physical-animation | entity IDs, pose snapshots, fixed-step physics coupling                     |
| facial, hair, cloth                                             | optional character-owned simulation adapters; bounded LOD                   |
| vehicles, two-wheelers, rickshaws, damage                       | body ownership and tire/contact interfaces, later MACHINE work              |
| water, weather                                                  | world parameter snapshots and bounded region effects                        |
| AI, traffic, pedestrians, crowds, police                        | fixed-rate intent/state services; no direct scene ownership                 |
| combat, interaction                                             | validated gameplay commands and event outcomes                              |
| audio                                                           | spatial emitters owned by entities; AudioWorklet when justified             |
| missions, narrative                                             | persistent state machine and authored data                                  |
| UI, save                                                        | command binding, versioned persistence; no raw engine serialization         |
| assets, config                                                  | provenance registry, budgets, immutable shared resource ownership           |
| debug, tests, performance                                       | public probes and measured results; no fabricated counters                  |

Do not create empty implementations to imply these systems exist. Extract a module when a real owner and tested behavior exist. Core runtime coordinates services; it must not accumulate subsystem behavior.

## Streaming

64m cells in a 5×5 Chebyshev radius; center-first squared-distance priority. At most two worker requests pending and one cell GPU/physics upload per rendered frame. Stale results are dropped. Eviction precedes allocation, bounded to 25 cells. Four crate meshes per cell are reused through a pool capped at 100. Shared geometry/materials; per-cell instance buffers released on eviction.

Persistent crate transforms use stable cell/prop IDs, survive unload, and serialize to browser storage on Save. Cache is bounded at 2048 records and discards oldest insertion records: not unlimited world persistence. Unloaded pedestrian/vehicle proxies reconstruct analytically from world time, with one-second updates beyond 90m; they do not retain identities. Actual traffic/pedestrian AI is PLANNED.

A depot interior has its own five colliders, entered near (-9,-10); exterior anchor remains streamed while inside. Leaving releases all room colliders. World travel is clamped to ±2048m; no floating origin required within this prototype. Large-world origin shifting is PLANNED. Worker failures are exposed; retry/fallback and asset-network streaming remain limitations.
