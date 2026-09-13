# GTA INDIA — SECONDARY LIFE 0.6

Original Indian open-world technical prototype. Production intent: modern **60+ CU-class, RT-capable GPUs with 16 GB VRAM** and GTA VI/RDR2-level visual ambition. Current procedural graphics remain far below that target; no hardware RT backend or target-GPU acceptance is claimed.

Operation 06 adds live hair-guide strips, garment-panel simulation, facial shape controls, gaze and timed viseme performance to the existing physical-character foundation. Run `npm ci`, `npm test`, `npm run build`, then `npm run preview -- --port 4173`. Open http://localhost:4173/.

Use **Inspect character**, then **View: Front / Back / Face**. The secondary controls select long/short hair, ten material/panel presets, wind and expression. **Conversation poses** drives timed mouth shapes; it has no recorded speech audio. **Sound cue** plays an original brief tone and redirects attention. The Light control's Rain setting drives gradual wetness. Walk/run and Apply impact exercise actual attachment motion and fall/recovery. **Validate secondary life** runs the dedicated live checks; all previous laboratories remain available.

Garments are attached simulation panels rather than complete sewn assets; hair uses sparse strips, collision volumes are approximations, and facial shapes are FACS-inspired artistic controls. These limits and measured results are in [SYSTEM_STATUS](docs/SYSTEM_STATUS.md), [SECONDARY_LIFE_SPEC](docs/SECONDARY_LIFE_SPEC.md) and [evidence](docs/evidence/secondary-life-validation.md).

Continuity starts with [AGENTS.md](AGENTS.md), [OPERATION_LEDGER](docs/OPERATION_LEDGER.md) and [NEXT_TASK](docs/NEXT_TASK.md). Completed operation prompts supplied again are reference. A stopped preview server does not delete the committed game. Operations 01–05 and their evidence remain in Git history and the repository.

## Earlier foundations

An original open-world engineering prototype in the fictional Indian port city of Navapur. OPERATION 05 — EUPHORIA INDIA adds articulated hero reactions, disturbance assessment, partial physical animation, full physical falls and a bounded return to locomotion. It extends the committed PROMETHEUS contact-motion framework and preserves the GENESIS playable district, PHOTON rendering laboratory, weighted HUMAN hero/cast, deterministic citizens and crowd detail tiers. The operation name identifies original project code; this build does not contain NaturalMotion’s proprietary Euphoria engine.

The production target is modern **60+ CU-class, RT-capable hardware**, with an original Indian world and GTA VI/RDR2-level visual ambition. The local Intel GPU is a compatibility test device and does not define the visual ceiling. Current characters remain stylized procedural assets; contact motion and facial deformation are experimental and below the intended production standard. The executable renderer uses WebGL2 without hardware ray tracing, and target-GPU performance is unverified. See [system status](docs/SYSTEM_STATUS.md) for actual behavior, measurements and limitations.

## Run

Node 20.19+ recommended.

```sh
npm ci
npm run dev
```

Open the printed localhost URL. `npm run build` creates a portable `dist/`; `npm run preview` serves that production build. All engine code is bundled; runtime needs no third-party CDN. Serve over HTTP/HTTPS, not `file://`. A localhost tab needs this server to remain running; reopening an old tab does not restart it. A stopped server does not remove the saved source or committed milestone.

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

The original PHOTON comparison is retained as [historical rendering evidence](docs/evidence/photon-comparison.json), and the preceding motion milestone has [PROMETHEUS verification](docs/evidence/prometheus-validation.md). [System status](docs/SYSTEM_STATUS.md) identifies current operation results, build revisions and remaining validation. A screenshot demonstrates appearance only. It does not replace either executable harness or measured performance.

## PROMETHEUS motion laboratory

Use **Enter motion lab** to enter an elevated contact course within the existing district. **Leave motion lab** restores the outside player position and removes the temporary fixtures. The course contains flat ground, stairs, a curb, a slope, uneven paving, a narrow doorway, a wall, seats/handles, a movable box and a shallow puddle sensor. It adds no city expansion. World saving is disabled inside the temporary lab.

| Control                   | Purpose                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Course / Go to course     | Place the player at a selected course start. Walk with WASD; use Shift and Space to examine running and jumping. This is an explicit test placement.                  |
| Contact / Align and reach | Position the character for an object-relative hand or seat experiment. Stationary contact holds movement until released.                                              |
| Release                   | Blend out of the current hand contact and resume movement.                                                                                                            |
| Compare body sizes        | Place two different HUMAN bodies around the same physical handle to inspect retargeted contact.                                                                       |
| Movement                  | Choose natural, wet, mud, sand, shallow-water, injury, fatigue, carrying-pose or urgency parameters. These are motion styles, not complete environmental simulations. |
| Validate motion           | Run the motion integration harness and display measured pass/fail results. Controls are locked during the run.                                                        |

The visible hero follows achieved capsule movement. Ground rays feed alternating stance/swing targets, retained foot placement, terrain-normal alignment and bounded pelvis compensation. Procedural acceleration, turning, lean and arm layers supplement the inherited face/finger layer. Telemetry measures contact error and actual ankle motion so a state label alone cannot establish correct movement.

**IMPLEMENTED BUT LIMITED:** movement/context control, explicit rig mapping and retargeting, the physical laboratory, and dynamic box contact targets. **EXPERIMENTAL:** gait, foot locking, terrain adaptation, standing reach, body offsets and seat poses. Seat trials do not establish correct complete sitting; scooter/rickshaw rigs do not provide riding or vehicle entry. Reaching a box does not create a grasp or carrying constraint. **PLANNED:** production animation assets, motion matching, root-motion warping, anatomical constraints, complete seated/vehicle transitions. Operation 06 adds bounded secondary motion described above. Operation 05 adds the bounded physical reactions described below; it does not complete those production systems.

Focused regressions inspect actual bone endpoints, invariant limb lengths, unreachable targets, retargeting axes, movement cadence, terrain traversal and repeated resource release. Run **Validate motion**, **Validate humans**, **Run diagnostics**, and **Compare rendering** when changing this integration. Current executable outcomes are recorded in [system status](docs/SYSTEM_STATUS.md); this README does not substitute for a completed browser run. Read the [PROMETHEUS specification](docs/PROMETHEUS_SPEC.md) and [animation contract](docs/ANIMATION_SPEC.md) for the full technique boundaries.

## EUPHORIA INDIA reaction laboratory

Choose an impact scenario, direction, character mass and friction in the physical reaction controls, then select **Apply impact**. Compare the small shoulder bump, hard push and heavy collapse. Motorcycle/car choices inject parameterized impact events; **Occupant deceleration / brace** is a posture and impulse trial. These controls do not provide a drivable vehicle or attached occupant simulation. The existing motion lab supplies actual stair and wall collision fixtures.

**IMPLEMENTED AND VERIFIED at the physics-test level:** thirteen mass-bearing capsule links, twelve constrained joints, bounded quaternion PD torque drives, measured COM/momentum/energy and exact cleanup. Tests measure actual limb motion and contacts, including tumbling over eight stair risers. Four joints have activation-relative hinge limits; other joints lack anatomical cone limits, and the rig has no self-collision.

**IMPLEMENTED BUT LIMITED:** small disturbances use a controller-owned kinematic pelvis with twelve dynamic links. PROMETHEUS retains visible foot-contact and recovery-step authority through IK after physical pose mapping. The simulated lower-body colliders can therefore differ from the final rendered legs in partial mode. Heavy disturbances release the pelvis so all thirteen links are dynamic and disable the original player collider. Full falls use physical leg poses without that contact override.

**EXPERIMENTAL:** a support hull, capture-point estimate and friction policy assess disturbances; sampled step requests, protective arm targets and a brief nearby-wall constraint provide bounded responses. These are not a proven free-standing dynamic biped controller. **Recover** requests a supported, clear standing capsule location during a full fall, or clears a partial reaction. Automatic settling recovery blends back into the motion pose and restores controller ownership. The get-up is a placement and pose blend, with limits on limb clearance; new full-body impacts cancel an ongoing recovery.

**Validate reactions** runs the executable reaction harness. The HUD distinguishes physical mode, balance estimates, actual body/joint counts, contact information, joint errors and measured cost. Run the inherited human, motion, gameplay and rendering checks when changing integration. Test count or a displayed state alone is not evidence of successful movement; use [system status](docs/SYSTEM_STATUS.md) and its linked evidence for completed runs and final acceptance status. See [EUPHORIA specification](docs/EUPHORIA_SPEC.md) for exact contracts and limitations.

The operation’s graphics increment replaces several near/hero garment and limb primitive forms with continuous cross-section profiles and adds original woven normal/roughness detail. Weighted skinning and lower-detail crowd representations remain supported. This is a concrete silhouette and surface improvement; production anatomy, realistic hair/cloth motion and the intended GTA VI/RDR2-level visual result remain unfinished. The current renderer remains WebGL2 without hardware RT, and no target-GPU frame rate is claimed.

## Continuity

Read [AGENTS.md](AGENTS.md), the [operation ledger](docs/OPERATION_LEDGER.md), [system status](docs/SYSTEM_STATUS.md), [next task](docs/NEXT_TASK.md), [architecture](docs/ARCHITECTURE.md) and relevant subsystem specs before editing. The ledger records committed milestones and the active operation; supplied prompt references are archived under [docs/operations](docs/operations). HUMAN and PROMETHEUS are committed foundations and must not be restarted because their prompts are supplied again. [GitHub is the canonical source](https://github.com/yuvaa1000-ship-it/GTA-India). Commit a recoverable, verified milestone before proceeding to the next authorized operation. Each remaining operation must include a concrete graphics improvement and its inspection or measurement; an operation number is not evidence of a percentage of final visual quality.

Nearby citizens now use bounded skinned rigs with procedural contact motion; distant visible citizens retain simplified static instanced representations. Vehicles remain moving instanced proxies, without traffic intelligence or vehicle dynamics. The HUD reports actual active animation rigs. The renderer uses WebGL2; a WebGPU adapter probe does not change that backend. Physical materials/probe/planar reflections are **IMPLEMENTED BUT LIMITED**; box-projected probe correction, screen-space AO, and adaptive resolution have experimental limits. SSR, SSGI, cascaded shadows, temporal reconstruction, volumetric lighting, true subsurface skin, and HLOD/impostors remain **PLANNED**. Consult the [technique truth table](docs/PHOTON_TECHNIQUES.md), [geometry ceilings](docs/GEOMETRY_BUDGET.md), and [performance budget](docs/PERFORMANCE_BUDGET.md) for exact scope. Missing metrics remain unavailable, and no frame-rate target is implied by a quality label.

## HUMAN character milestone

Operation 03 adds a real weighted playable rig, four diverse procedural cast samples, stable citizen identities and distance-based crowd representations. Use **Inspect character** for the close camera (arrows orbit; movement anchors), **Follow character** to resume the chase view, and **Validate humans** for executable skin/identity/capacity checks. PHOTON material inspection and lighting controls remain available. Nearby citizens have broad capsule contact; crowd AI, production locomotion, final faces and physical cloth/hair are still incomplete. These procedural people validate the framework and are not the final visual standard.

Read [HUMAN specification](docs/HUMAN_SPEC.md) and current [system status](docs/SYSTEM_STATUS.md). The modern high-end GPU target is preserved; no performance result on this local PC is a production-quality ceiling.
