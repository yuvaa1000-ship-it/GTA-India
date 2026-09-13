# Physics

IMPLEMENTED AND VERIFIED by executable tests: Rapier 0.19.0 compatibility WASM; Y-up meters/seconds; gravity -18m/s²; fixed 1/60s. Capsule half-height .55m plus radius .32m, kinematic position controller, .015m clearance, .3m autostep, .25m ground snap, nominal 75kg impulse coupling. Walk 4.5m/s, sprint 8m/s, jump vertical velocity 7m/s. These are gameplay tuning DESIGN CHOICES, not biomechanics validation.

Ground and buildings use fixed boxes. Four 0.9m dynamic crates per cell: density 8kg/m³, friction .7, restitution .1, CCD. Ground friction .8. Test covers actual crate displacement on contact. No vehicle physics, articulated bodies, ragdolls, deformable structures or water interaction.

Simulation pauses if the player's center cell is absent. A floor fall below -10m triggers plaza recovery. Clamped catch-up prevents the spiral of death but loses simulation time during extreme stalls; performance telemetry records unclamped wall-clock frame intervals.

Primary reference: https://rapier.rs/docs/user_guides/javascript/character_controller/ . Tests exercise the installed WASM rather than assuming API availability.

HUMAN adds disposable standalone capsule colliders for nearby Tier 1 citizens, with no extra rigid bodies. Contacts can deflect the player but do not produce physical reactions or avoidance. A real Rapier regression checks minimum separation and collider release. FixedClock now exposes accumulated simulated seconds so executable movement tests remain meaningful when rendering drops physics catch-up time. First-frame timestamps initialize from the animation-frame clock rather than mixing it with a later startup timestamp.
