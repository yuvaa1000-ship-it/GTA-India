# Animation contract — HUMAN and PROMETHEUS

The player retains its Rapier capsule/controller and real 51-bone weighted HUMAN rig. Operation 04 adds a motion controller, procedural state/context grammar, world-contact IK, runtime retargeting and a removable motion laboratory. Read [PROMETHEUS_SPEC](PROMETHEUS_SPEC.md) for technique classifications, APIs, experiment boundaries and primary references. [SYSTEM_STATUS](SYSTEM_STATUS.md) records actual executable verification and measurement conditions.

## Ownership and inputs

`HumanSystem` owns a `MotionController` for the hero, four cast characters and every instantiated nearby citizen. `Runtime` owns `MotionDirector`, including the lab and physics ground sampler. Existing rig/citizen lifetime and streaming limits remain. Controllers do not own the physics world or shared materials.

The player controller owns world translation. Actual displacement, grounded state and vertical velocity drive animation; bounded facing follows travel. Context influences desired speed/traction and procedural pose. These are controller-driven roots. Imported clip root motion, root-motion warping and motion matching remain PLANNED.

Pose order retains HUMAN's face/finger layer, applies lean and arm offsets, updates stance/swing targets, compensates the pelvis, solves legs, retains planted ankle orientation and corrects hand contact. Teleports reset anchors, jumping releases support and supported landing reacquires it. Nonuniform chest breathing scale is reset before IK to preserve rigid segment lengths.

## Behavior and limits

IMPLEMENTED AND VERIFIED through focused unit tests: direct two-bone positional IK, invariant lengths, unreachable-target reporting, rest-relative quaternion retargeting, joint-axis correction, explicit skeleton aliases, proportional root translation and actual world-contact placement across different heights. This does not certify imported production rigs or anatomical joint limits.

IMPLEMENTED BUT LIMITED: priority states, bounded surface/injury/fatigue/carry/urgency context, acceleration/deceleration, ordered procedural layers, parameter damping, bounded motion substeps and inherited crowd pose rates. Tier 2 remains less frequently updated; far instances remain static. There is no hierarchical state graph, authored blend tree, montage system or general animation asset player.

EXPERIMENTAL: alternating foot placement/locking, retained stance yaw, terrain normals, pelvis lowering, speed-dependent stride, standing reach, turn-in-place, leaning/banking, head stabilization and gradual hand-contact release. Actual bone matrices are available to tests/telemetry. Static-support assumptions, missing hits, sole clearance, self-intersection and artistic motion quality remain limitations.

Seat trials lower the pelvis without complete position/orientation alignment or authored sitting transitions. Scooter/rickshaw seats and grips are dimensioned fixtures, not complete riding/entry systems. The box has actual dynamics; reaching it does not create a grasp or carrying constraint.

## Bone and contact invariants

Preserve the HUMAN names or provide an explicit adapter. Units are metres, +Y is up, +Z is forward and the root starts at the feet. Direct arm chains are upper arm → forearm → hand; legs are thigh → shin → ankle. Twist bones remain helper branches. Do not stretch limb translations to conceal a missed contact.

Capture rest poses before animation. Mapping is one-to-one source name → target name with validated parent relationships. Imported rigs supply measured heights. Root translation scales by target/source height; scene placement and bone lengths do not. Contact inputs are world coordinates. Transform object-local attachments before solving them. A shared handle has one world point; short and tall bodies use different local positions and joint rotations to reach it.

Ground queries inspect actual physics geometry and exclude the player, sensors and standalone citizen contacts. Retained foot X/Z points are in world space, not moving-platform local frames. Rotating/horizontal platform attachment, heel/toe support, pressure and foot-mesh collision remain PLANNED.

## Missing systems

PLANNED: production animation/mocap assets, motion matching and feature databases, pose search, learned motion models, authored motion graphs, clip-distance matching, root-motion warping, complete hierarchical state machines/blend trees/montages, true pose inertialization, general imported hierarchy conversion, anatomical limits, collision-aware whole-body IK and constrained balance.

PLANNED: complete seated contact, vehicle entry, moving/rotating attachment frames, two-handed grips, equipment/weapon alignment, door actuation, synchronized two-character actions, conversation gestures, footwear-specific gait, crowd avoidance, obstacle anticipation, water-depth-driven movement, calibrated biomechanics, disturbance reactions, per-bone/partial ragdolls, recovery motion and physical secondary dynamics.

HUMAN skinning, twist approximation, blink/smile/jaw/gaze and elbow morph remain available. They are not production facial performance, speech animation, muscle simulation or cloth/hair physics.

## Verification and production target

Observe actual endpoints/matrices rather than state labels or stationary target values alone. Retain stance anchors to assess accumulated foot drift, measure reach residuals against original object points and verify resource cleanup. Motion checks supplement HUMAN, GENESIS and PHOTON regressions. Record observed failures and measurements in evidence; source inspection alone is not a passed browser run.

The production target is modern 60+ CU-class, RT-capable GPUs and an original Indian world with GTA VI/RDR2-level visual ambition. This local machine is a compatibility environment, not the visual ceiling. Current WebGL2 execution has no hardware RT and target-GPU performance is unverified. Procedural HUMAN assets and experimental motion remain below the intended production standard.
