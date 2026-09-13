# GTA INDIA — HUMAN

An original open-world engineering prototype in the fictional Indian port city of Navapur. OPERATION 03 — HUMAN adds a reusable weighted character framework, a playable skinned hero, four cast samples, deterministic citizens, crowd detail tiers and nearby contact capsules. It preserves the GENESIS playable district and PHOTON WebGL2 rendering laboratory.

The production target is modern 60+ CU-class, RT-capable hardware; the local Intel GPU is a compatibility test device. Current characters are original stylized procedural assets, with experimental movement and facial deformation. They are an executable foundation, not final photoreal human art. The current renderer uses WebGL2 and does not execute hardware ray tracing. See [system status](docs/SYSTEM_STATUS.md) for verified behavior, measurements and limitations.

## Run

Node 20.19+ recommended.

```sh
npm ci
npm run dev
```

Open the printed localhost URL. `npm run build` creates a portable `dist/`; `npm run preview` serves that production build. All engine code is bundled; runtime needs no third-party CDN. Serve over HTTP/HTTPS, not `file://`.

## Play and inspect

Click **Enter the district**. WASD moves, Shift runs, Space jumps, and left/right arrows orbit the chase camera. Walk into crates to push them. Press E near the teal doorway at (-9, -10) to enter the depot; E exits. **Save**/**Load** use this browser origin's local storage. **Return to plaza** recovers your position. Desktop keyboard is required; mobile controls are not implemented.

**Inspect materials** returns the player to the plaza, anchors player movement, and switches to an orbit around the material laboratory. Use the left/right arrows to inspect surface response from different angles; **Follow player** restores exploration. **Hide HUD**/**Show HUD** changes telemetry visibility.

| Control             | Purpose                                                                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality             | Performance, Balanced, and Reference change render scale, shadow and planar target sizes, update rate, AO/bloom, and glass transmission. Reference is a costly comparison configuration. |
| Light               | Switch between authored Sunset, Night, and Rain conditions. Rain changes surface wetness and adds local visual rain streaks.                                                             |
| Puddle reflections  | Toggle the geometry-based planar puddle capture. The fallback physical-water coupons use the environment/material path.                                                                  |
| Auto exposure       | Adapt exposure from sampled rendered-image luminance; disabling it returns exposure to 1.                                                                                                |
| Adaptive resolution | Enable the experimental frame-duration-based scale controller; disabled by default.                                                                                                      |
| Refresh probe       | Request a fresh local environment capture when the laboratory and its streamed surroundings are ready.                                                                                   |

**Compare rendering** runs eight rendering checks and four fixed-camera comparison configurations: Balanced sunset without planar capture, Balanced sunset with planar capture, Performance rain, and Reference night. It checks framebuffer support, material response parameters, captures, image metering, physics preservation, window LOD, and target lifetime. Controls are temporarily locked while the comparison runs. A completed report includes actual samples and pass/fail results; the check count alone is not evidence that a run passed.

**Run diagnostics** executes the eleven inherited gameplay/streaming checks, including movement, jumping, building collision, cell eviction, prop persistence, and depot transitions. Run both harnesses when changing rendering integration. **Export metrics** downloads the last completed report, or current metrics if there is no report. **Close report** dismisses the results. `npm test` runs pure-logic, Rapier, resource-lifetime, input, material, and rendering-policy regressions.

The latest recorded PHOTON comparison belongs in [rendering evidence](docs/evidence/photon-comparison.json); [system status](docs/SYSTEM_STATUS.md) identifies its build and limitations. A screenshot demonstrates appearance only. It does not replace either executable harness or measured performance.

## Continuity

Read [system status](docs/SYSTEM_STATUS.md), [next task](docs/NEXT_TASK.md), [architecture](docs/ARCHITECTURE.md), [rendering specification](docs/RENDERING_SPEC.md), and relevant subsystem specs before editing. [GitHub is the canonical source](https://github.com/yuvaa1000-ship-it/GTA-India). PHOTON builds on GENESIS commit `43114ceaaaf0eb5e82df5749fba5beb93f4c8dcd`; the current milestone must be recoverable and committed before another operation starts. Later operations are not launched automatically.

NPCs and vehicles remain **moving instanced proxies**, without traffic intelligence or vehicle dynamics. Animation-agent count is zero. The renderer uses WebGL2; a WebGPU adapter probe does not change that backend. Physical materials/probe/planar reflections are **IMPLEMENTED BUT LIMITED**; box-projected probe correction, screen-space AO, and adaptive resolution have experimental limits. SSR, SSGI, cascaded shadows, temporal reconstruction, volumetric lighting, true subsurface skin, and HLOD/impostors remain **PLANNED**. Consult the [technique truth table](docs/PHOTON_TECHNIQUES.md), [geometry ceilings](docs/GEOMETRY_BUDGET.md), and [performance budget](docs/PERFORMANCE_BUDGET.md) for exact scope. Missing metrics remain unavailable, and no frame-rate target is implied by a quality label.

## HUMAN character milestone

Operation 03 adds a real weighted playable rig, four diverse procedural cast samples, stable citizen identities and distance-based crowd representations. Use **Inspect character** for the close camera (arrows orbit; movement anchors), **Follow character** to resume the chase view, and **Validate humans** for executable skin/identity/capacity checks. PHOTON material inspection and lighting controls remain available. Nearby citizens have broad capsule contact; crowd AI, production locomotion, final faces and physical cloth/hair are still incomplete. These procedural people validate the framework and are not the final visual standard.

Read [HUMAN specification](docs/HUMAN_SPEC.md) and current [system status](docs/SYSTEM_STATUS.md). The modern high-end GPU target is preserved; no performance result on this local PC is a production-quality ceiling.
