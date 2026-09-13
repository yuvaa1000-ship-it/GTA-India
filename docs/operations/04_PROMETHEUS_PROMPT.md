# OPERATION 04 — PROMETHEUS

**ASTRA POWER: ASTRA MAX**

**USE:** @GitHub @Hugging Face @Wolfram @DigitalOcean

# GTA INDIA — SHARED CONTINUITY CONTRACT

You are working on **GTA INDIA**, an original, extremely ambitious Indian open-world crime/action game and technical showcase. Reality is the primary reference. GTA VI, RDR2, GTA IV, GTA V, Cyberpunk 2077, Watch Dogs, BeamNG.drive, modern racing simulators, film VFX, robotics, biomechanics, computational physics, and modern game-development research may be studied only as technical/quality references. Do not copy copyrighted characters, maps, dialogue, missions, UI, logos, music, fictional brands, vehicle designs, source code, proprietary assets, or other protected expression.

## NON-NEGOTIABLE RULES
- Build, run, inspect, test, profile, fix, regression-test, and commit.
- Never call concept art, generated video, screenshots, labels, or comments proof of gameplay.
- Classify major features as: IMPLEMENTED AND VERIFIED / IMPLEMENTED BUT LIMITED / EXPERIMENTAL / PLANNED / NOT POSSIBLE IN CURRENT ENVIRONMENT.
- GitHub is the canonical persistent source of truth. Before changing anything, read the repository state, especially `/docs/SYSTEM_STATUS.md`, `/docs/NEXT_TASK.md`, `/docs/ARCHITECTURE.md`, and the relevant subsystem spec.
- Preserve existing working systems. Do not restart the project or silently downgrade sophisticated systems because they are difficult.
- If a feature is impossible in the current runtime, say so and implement the strongest honest approximation.
- Use connected plugins as specialized departments, not as a checklist. Invoke only what this operation needs.
- Never present rumors about competitor technology as confirmed fact. Separate CONFIRMED FACT / INFERENCE / DESIGN CHOICE / EXPERIMENTAL IMPLEMENTATION.
- Performance is a feature: measure FPS, frame time, CPU/GPU cost, draw calls, triangles, active NPCs, active vehicles, physics, AI, animation, memory, and streaming wherever possible.
- Before the Work run ends, update `SYSTEM_STATUS.md`, `NEXT_TASK.md`, relevant subsystem documentation, and commit a stable milestone.

## FAILURE RECOVERY
When something fails: capture the actual error → reproduce → isolate → diagnose → fix root cause → run again → regression-test → commit. Do not delete the feature merely to make the error disappear unless no viable repair exists.

## QUALITY PRIORITY UNDER PRESSURE
1. executable stability
2. player feel
3. physical interaction
4. character animation
5. character physical reactions
6. vehicle physics
7. traffic/pedestrian intelligence
8. reflections/lighting
9. materials
10. weather/water
11. environmental density
12. story implementation
13. map expansion

## AUTONOMY
Do not repeatedly ask whether to add traffic, reflections, physics, NPCs, weather, audio, etc. The answer is yes. Make professional engineering decisions. Ask only when blocked by authorization, credentials, financial expenditure, irreversible external action, or a major genuinely non-inferable creative decision.

## SUCCESS PHILOSOPHY
Success is not code length, plugin count, polygon marketing numbers, animation-file counts, or screenshots. Success is a character who has weight; feet that understand the ground; hands that understand objects; faces that understand conversation; hair that understands motion; cloth that understands wind; vehicles that understand tires and mass; scooters that understand balance; rickshaws that understand three-wheel dynamics; water that understands objects; rain that understands surfaces; traffic that understands traffic; pedestrians that understand events; police that understand information; materials that understand light; reflections that understand geometry; audio that understands space; and a city that understands consequences.


## THIS OPERATION
Scope lock: you are the Advanced Character Motion Laboratory. Do not expand the map, write missions, or spend time on decorative assets. Solve human movement.

Do not chase an arbitrary claim such as hundreds of thousands of animation files. Build an animation grammar capable of enormous combinatorial motion from reusable high-quality primitives. Treat perceived motion space as combinations of base locomotion × speed × direction × slope × surface × weather × footwear × injury × carried object × weapon state × fatigue × emotional state × crowd density × obstacle proximity × conversation state × urgency × body type × personality × reaction × physical disturbance.

Investigate and implement the strongest feasible combination of hierarchical animation state machines, blend trees, layers, additive animation, montages, motion matching, pose databases/search, motion graphs, runtime and procedural retargeting, IK retargeting, root motion and root-motion warping, stride/orientation warping, distance/speed/foot-phase matching, foot locking and foot IK, pelvis compensation, terrain adaptation, hand/reach/look-at IK, head/eye tracking, aim offsets, spine aiming, turn-in-place, motion warping, trajectory prediction, inertialization, pose interpolation/correction, contextual/contact-aware animation, constraint-based interaction, procedural leaning/banking/balance correction, ragdoll blending, partial ragdolls, secondary motion, and environment-aware locomotion.

Runtime retargeting is a priority: skeleton mapping, bone-chain retargeting, joint orientation correction, limb-length compensation, contact preservation, root scaling, pelvis correction, hand/foot placement, reach constraints, object-relative IK, seat-relative IK, vehicle-entry alignment, door-handle alignment, weapon alignment, two-character interaction alignment, and terrain-aware poses. A short and tall character must not place hands at the same absolute world height when opening the same door.

Locomotion must respond to speed, acceleration, deceleration, turn radius, surface friction, stairs, curbs, ramps, slopes, uneven ground, puddles, mud, sand, water depth, crowd contact, obstacles, carried objects, injury, fatigue, and urgency, with subtle weight shift, hip rotation, shoulder counter-rotation, head stabilization, arm swing, breathing, foot compression approximation, step timing, anticipation, and follow-through.

Build a motion lab with flat ground, stairs, curb, slope, uneven terrain, narrow doorway, chair, car door, scooter, rickshaw, movable object, wall and puddle. Test multiple body proportions. Feet should stay planted when appropriate; hands should reach actual objects; characters should adapt rather than slide. Profile and commit.

## END-OF-RUN HANDOFF
Before ending, leave the repository in a recoverable state. Update `/docs/SYSTEM_STATUS.md` with what actually works, what is partial/broken, measured performance, and current limitations. Update `/docs/NEXT_TASK.md` with the next exact integration step. Commit stable work to GitHub. Do not claim completion unless the feature was run or inspected in the real executable environment.


---
