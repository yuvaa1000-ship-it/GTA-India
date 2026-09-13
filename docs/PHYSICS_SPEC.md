# Physics

IMPLEMENTED AND VERIFIED by executable tests: Rapier 0.19.0 compatibility WASM; Y-up meters/seconds; gravity -18m/s²; fixed 1/60s. Capsule half-height .55m plus radius .32m, kinematic position controller, .015m clearance, .3m autostep, .25m ground snap, nominal 75kg impulse coupling. Walk 4.5m/s, sprint 8m/s, jump vertical velocity 7m/s. These are gameplay tuning DESIGN CHOICES, not biomechanics validation.

Ground and buildings use fixed boxes. Four 0.9m dynamic crates per cell: density 8kg/m³, friction .7, restitution .1, CCD. Ground friction .8. Test covers actual crate displacement on contact. No vehicle physics, articulated bodies, ragdolls, deformable structures or water interaction.

Simulation pauses if the player's center cell is absent. A floor fall below -10m triggers plaza recovery. Clamped catch-up prevents the spiral of death but loses simulation time during extreme stalls; performance telemetry records unclamped wall-clock frame intervals.

Primary reference: https://rapier.rs/docs/user_guides/javascript/character_controller/ . Tests exercise the installed WASM rather than assuming API availability.

HUMAN adds disposable standalone capsule colliders for nearby Tier 1 citizens, with no extra rigid bodies. Contacts can deflect the player but do not produce physical reactions or avoidance. A real Rapier regression checks minimum separation and collider release. FixedClock now exposes accumulated simulated seconds so executable movement tests remain meaningful when rendering drops physics catch-up time. First-frame timestamps initialize from the animation-frame clock rather than mixing it with a later startup timestamp.

## PROMETHEUS contact integration

The existing 60 Hz Rapier character controller remains authoritative over root translation. Desired horizontal velocity now approaches its target at a bounded 14 m/s² under movement input and 20 m/s² during stopping, scaled by the selected style's traction factor. Style also scales walk/run speed. These are explicit gameplay tuning parameters, not measured shoe friction or biomechanical acceleration. Achieved movement, grounded state and vertical velocity feed animation; animation does not teleport the physics body during ordinary walking.

Character movement queries exclude sensors. A separate downward physics query starts 0.65 m above the foot reference and travels 1.5 m, excluding the player, sensors and standalone citizen capsules. Hits with normal Y below 0.45 are rejected. The resulting height/normal drive experimental leg IK and pelvis adjustment. Single-point support does not establish whole-sole contact, collision-free limb motion, anatomical limits or balance. Planted anchors are world-space points; moving or rotating support attachment remains incomplete.

The removable motion lab sits at surface Y=6 within the existing map volume. It owns exactly 34 rigid bodies/colliders, including one dynamic 0.9 m box and one shallow puddle sensor. Fixtures include eight 0.18 m stair rises, a 0.18 m curb, a roughly 14-degree rotated cuboid slope, uneven paving, a 1.2 m doorway and a wall, plus dimensioned seat/handle contact rigs. The slope includes a short entry lip within the existing 0.3 m autostep allowance. The box uses density 8 kg/m³, friction 0.8, zero restitution and CCD. Seats, vehicle entry, grasping and water-depth response are not implemented physics systems.

Focused tests verify actual terrain heights/normals, capsule traversal over stairs/curb/slope/paving, doorway passage, wall blocking, dynamic-box settling, sensor exclusion from lab support sampling and exact resource release across repeated lab entry/exit. Traversal tests measure capsule positions at 60 Hz; standing center height on the lab floor is approximately 6.885 m. The player can walk off the top of a staircase or ramp, so a later lower position does not imply failed ascent. Browser integration results and current measurements are recorded separately in SYSTEM_STATUS.md.
