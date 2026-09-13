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

## PHOTON integration (operation 02)

`Runtime` owns `Photon`; the latter owns the material laboratory, atmosphere, reflections, postprocess, timing queries, and rain display. Input, fixed physics, streaming, save state and depot ownership retain their GENESIS contracts. The new lab is a render-only fixture within the existing central region. Its geometry cannot be cited as delivered vehicle/character simulation.

The previous renderer factory returned a `dispose` property which overwrote `Runtime.prototype.dispose()` through Object.assign. It is now named `disposeRenderer`; full runtime cleanup explicitly releases PHOTON resources and the renderer's sun shadow, removes canvas/context listeners, then releases renderer state. Shared original assets remain cell-safe. Probe/planar/scene/meter targets have explicit owners and are reused or disposed on resize. GPU queries are bounded and dropped on disjoint events.

Render metrics reset once before the entire render graph. CPU pass submission and asynchronous GPU query values are separate. Rendering can perform more than one scene submission per application frame; draw and triangle counts include those passes. Facade LOD affects window batch visibility only, not physics or persistence.

## HUMAN integration (operation 03)

Runtime owns HumanSystem and updates it after physics and camera placement, before PHOTON rendering. Citizen identity is separate from representation; the resident registry reconstructs stable cell/slot seeds on streaming. The original cell pedestrian boxes remain owned and disposed by their cells but are hidden while HUMAN is active. HumanSystem provides hero/cast, bounded near rigs, one far InstancedMesh and data-only offscreen records. Tier 1 contacts are standalone colliders and do not alter the rigid-body baseline. Dispose HUMAN first, including contacts, before freeing the original physics world. See HUMAN_SPEC.md for exact limits and the future imported-asset adapter contract.

## PROMETHEUS integration (operation 04)

Runtime owns MotionDirector and its removable MotionLab; HumanSystem owns per-character MotionController instances. A controller layers contact-aware bone output over HUMAN's retained face/finger pose, using world-space two-bone solvers. Ground sampling reads Rapier colliders while excluding sensors and standalone citizen contacts. The player still owns achieved root translation; motion never drives the capsule with an unvalidated clip. Fixed simulation elapsed time feeds hero pose timing, and moving visual roots are interpolated through bounded 60 Hz pose substeps. Lab exits release its fixtures before world disposal. Retargeters capture rest poses before playback and map source changes into character-owned target rigs, then enforce contact constraints.
