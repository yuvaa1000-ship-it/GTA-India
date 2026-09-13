# Animation contract — HUMAN, PROMETHEUS and physical reactions

The player retains its Rapier capsule/controller and real 51-bone weighted HUMAN rig. Operation 04 adds procedural motion, world-contact IK, retargeting and a removable laboratory. Operation 05 layers transient physical reactions over this work. Read [PROMETHEUS_SPEC](PROMETHEUS_SPEC.md) and [EUPHORIA_SPEC](EUPHORIA_SPEC.md) for technique classifications, APIs and limitations. [SYSTEM_STATUS](SYSTEM_STATUS.md) records executable verification and measurements.

## Ownership and inputs

`HumanSystem` owns a `MotionController` for the hero, four cast characters and every instantiated nearby citizen. `Runtime` owns `MotionDirector`, including the lab and physics ground sampler. Existing rig/citizen lifetime and streaming limits remain. Controllers do not own the physics world or shared materials.

The player controller owns ordinary and partial-reaction world translation. Actual displacement, grounded state and vertical velocity drive animation; bounded facing follows travel. Context influences desired speed/traction and procedural pose. Full physical falls temporarily transfer root authority to the articulation and disable the original player collider. Imported clip root motion, root-motion warping and motion matching remain PLANNED.

Pose order retains HUMAN's face/finger layer, applies lean and arm offsets, updates stance/swing targets, compensates the pelvis, solves legs, retains planted ankle orientation and corrects hand contact. Teleports reset anchors, jumping releases support and supported landing reacquires it. Nonuniform chest breathing scale is reset before IK to preserve rigid segment lengths.

## Behavior and limits

IMPLEMENTED AND VERIFIED through focused unit tests: direct two-bone positional IK, invariant lengths, unreachable-target reporting, rest-relative quaternion retargeting, joint-axis correction, explicit skeleton aliases, proportional root translation and actual world-contact placement across different heights. This does not certify imported production rigs or anatomical joint limits.

IMPLEMENTED BUT LIMITED: priority states, bounded surface/injury/fatigue/carry/urgency context, acceleration/deceleration, ordered procedural layers, parameter damping, bounded motion substeps and inherited crowd pose rates. Tier 2 remains less frequently updated; far instances remain static. There is no hierarchical state graph, authored blend tree, montage system or general animation asset player.

EXPERIMENTAL: alternating foot placement/locking, retained stance yaw, terrain normals, pelvis lowering, speed-dependent stride, standing reach, turn-in-place, leaning/banking, head stabilization and gradual hand-contact release. Actual bone matrices are available to tests/telemetry. Static-support assumptions, missing hits, sole clearance, self-intersection and artistic motion quality remain limitations.

Seat trials lower the pelvis without complete position/orientation alignment or authored sitting transitions. Scooter/rickshaw seats and grips are dimensioned fixtures, not complete riding/entry systems. The box has actual dynamics; reaching it does not create a grasp or carrying constraint.

## Bone and contact invariants

Preserve the HUMAN names or provide an explicit adapter. Units are metres, +Y is up, +Z is forward and the root starts at the feet. Direct arm chains are upper arm → forearm → hand; legs are thigh → shin → ankle. Twist bones remain helper branches. Do not stretch limb translations to conceal a missed contact.

Capture rest poses before animation. Mapping is one-to-one source name → target name with validated parent relationships. Imported rigs supply measured heights. Root translation scales by target/source height; scene placement and bone lengths do not. Contact inputs are world coordinates. Transform object-local attachments before solving them. A shared handle has one world point; short and tall bodies use different local positions and joint rotations to reach it.

Ground queries inspect actual physics geometry and exclude the player, sensors, standalone citizen contacts and active hero-reaction colliders. Retained foot X/Z points are in world space, not moving-platform local frames. Rotating/horizontal platform attachment, heel/toe support, pressure and foot-mesh collision remain PLANNED; physical foot links are approximate capsules.

## Physical-reaction layer

`PhysicalReactions` owns a transient thirteen-link `Articulation` and balance policy. Partial mode keeps a controller-owned kinematic pelvis with twelve dynamic links. Full mode releases all thirteen links and uses the disabled player body only for camera/streaming. Bounded internal PD torques drive actual physics toward captured procedural targets. This is not a clip swap or target-pose teleport for dynamic bodies.

Capture animation targets after the normal procedural pose and protective lean/arm offsets, then blend physical orientations onto that pose. Physical chest/head links drive `spine`/`neck`; intervening visual rotations retain their activation pose. Other mappings preserve the existing limb translations. Full mode also maps actual pelvis translation. The 51 render bones remain distinct from thirteen physical bodies.

Grounded partial disturbances with impulse magnitude/mass above 0.9 N·s/kg can invoke `MotionController.requestRecoveryStep` from the balance policy's direction/distance. The request requires stable initial foot anchors, chooses the disturbance-side foot, checks real ground and bounds the travel before starting a 0.24 s clearance swing. The opposite foot remains support. At most one accepted policy step is requested per episode during its initial 1.8 s. This supplements displacement-driven stepping so a push can request visible corrective placement even at coarse update cadence. Small disturbances fade back to ordinary animation. Full falls settle, select a capsule-clear standing location and blend to locomotion readiness. Fresh impacts interrupt recovery. A clear final capsule does not prove that every interpolated limb is collision-free. The get-up is a controlled root placement and pose blend, not a force-driven stand-up, captured animation or general recovery planner.

After physical pose mapping, grounded partial reactions apply final analytic leg IK to the retained stance or current swing point, then restore foot orientation against the support normal. This ordering prevents `Articulation.sync` from overwriting the corrective step's visible ankle path. Dynamic leg colliders are not repositioned to match this visual correction; collider/rendered-leg divergence remains an explicit hybrid limitation. Full falls use the actual physical leg mapping and can depart from ordinary procedural anchors.

A requested step, incremented counter or moving target is insufficient evidence: measure actual rendered ankle lift and stance drift after every layer. Ordinary PROMETHEUS planted-foot tests do not certify a driven full physical fall. Articulation tests separately inspect real link contacts, constraints, bone placement, energy and lifetime. The policy target now feeds a bounded procedural step, but this remains distinct from a force-controlled dynamic biped.

Protective arm poses and the integrated bounded `WallBrace` helper are experimental. WallBrace attempts contact during bracing using a forearm endpoint proxy and fixed wall, not an anatomical hand/grasp model; live catch claims require executable evidence. Vehicle/deceleration scenarios are parameterized disturbances, not finished vehicles or occupant attachments.

## Missing systems

PLANNED: production animation/mocap assets, motion matching and feature databases, pose search, learned motion models, authored motion graphs, clip-distance matching, root-motion warping, complete hierarchical state machines/blend trees/montages, true pose inertialization, general imported hierarchy conversion, calibrated anatomical limits, collision-aware whole-body IK and optimized constrained balance.

PLANNED: complete seated contact, vehicle entry, moving/rotating attachment frames, two-handed grips, equipment/weapon alignment, door actuation, synchronized two-character actions, conversation gestures, footwear-specific gait, crowd avoidance, general obstacle anticipation, water-depth-driven movement, calibrated biomechanics, physical crowd reactions, self-collision, anatomically detailed ragdolls, dynamically actuated get-up and two-way coupled secondary dynamics. The limited hero articulation/partial reaction/recovery layer above is implemented separately from these remaining systems.

HUMAN skinning, twist approximation, blink/smile/jaw/gaze and elbow morph remain available. Operation 05 also improves near/hero garment and limb geometry through continuous profiles and woven material detail. These remain procedural assets. Operation 06 adds bounded facial cue performance and cloth/hair dynamics described in SECONDARY_LIFE_SPEC; production anatomy, dialogue audio and muscle simulation remain future work.

## Verification and production target

Observe actual endpoints/matrices rather than state labels or stationary target values alone. Retain stance anchors to assess accumulated foot drift, measure reach residuals against original object points and verify resource cleanup. Motion checks supplement HUMAN, GENESIS and PHOTON regressions. Record observed failures and measurements in evidence; source inspection alone is not a passed browser run.

An earlier integrated build passed 14/14 reaction, 8/8 HUMAN, 11/11 GENESIS and 8/8 PHOTON checks. Additional 6/10 Hz recovery tests exposed zero footsteps, then no rendered ankle lift and approximately 24 cm of sliding despite target movement. The new ground-checked request and final partial-leg IK address those failures. Final verification passed 89/89 automated tests, including actual ankle lift and planted residual at 6/10 Hz, plus 14/14 live reactions and 15/15 live motion checks. Behavior remains a limited hybrid, with exact endpoint evidence recorded separately.

The production target is modern 60+ CU-class, RT-capable GPUs and an original Indian world with GTA VI/RDR2-level visual ambition. This local machine is a compatibility environment, not the visual ceiling. Current WebGL2 execution has no hardware RT and target-GPU performance is unverified. Procedural HUMAN assets and experimental motion remain below the intended production standard.

## Operation 06 output ordering

SecondarySystem restores prior additive face rotations before HUMAN/PROMETHEUS. After EUPHORIA's final mapping and partial sole solve, it applies fresh bounded face/gaze output and updates cloth/hair attachments from the final bone matrices. Full-fall head rotation remains physical; additive head aiming is also suppressed during active reach interactions. Blink schedules and attention expiry are character-specific. Timed phoneme cues feed jaw and lip shape channels with overlap, not audio-derived visemes. Existing sole/hand constraints and the OP05 tests remain the regression boundary.
