# OPERATION 06 — SECONDARY LIFE

**ASTRA POWER: ASTRA MEDIUM**

**USE:** @GitHub @Fal @Hugging Face @Magnific @Adobe

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
Make characters remain alive-looking above the skeleton by implementing hair, cloth, facial performance, gaze and speech coupling.

Hair should not be a rigid helmet. Implement the strongest feasible approach using guide strands or card groups, Verlet/spring dynamics, gravity, inertia, damping, wind/gusts, head acceleration, body/shoulder collision volumes, clothing collision approximation, wetness/water influence, LOD, shadowing and anisotropic specular response. Long/short and wet/dry hair must behave differently.

Cloth should respond to distance/bending constraints, damping, gravity, wind, body collisions, inertia, character acceleration, vehicle speed, rain, wetness, fabric type and LOD. A loose kurta must not behave like a fitted shirt; saree, dupatta, lungi/veshti, dhoti, shawl, raincoat, jacket and police uniform should not all share identical motion. Prioritize stable simulation over chaos.

Facial performance should use FACS-inspired action units where practical, blendshape combinations, jaw/lip/cheek/brow/eyelid movement, blink timing, eye saccades, pupil/gaze behavior where feasible, head-eye coordination, microexpressions, breathing, swallowing approximation, listening behavior, reaction timing, emotion states, visemes, phoneme-to-viseme mapping, coarticulation approximation, speech timing, conversation gaze and attention shifts. Characters should look toward relevant sounds, people and objects without permanent robotic eye contact or synchronized blinking.

Integrate all secondary systems with character LOD and runtime performance. Test multiple simultaneous characters in wind, rain, conversation and movement. Profile and commit.

## END-OF-RUN HANDOFF
Before ending, leave the repository in a recoverable state. Update `/docs/SYSTEM_STATUS.md` with what actually works, what is partial/broken, measured performance, and current limitations. Update `/docs/NEXT_TASK.md` with the next exact integration step. Commit stable work to GitHub. Do not claim completion unless the feature was run or inspected in the real executable environment.


---