# Graphics progress — operations 05 through 20

The user requires a concrete graphics improvement alongside every remaining operation, aimed at modern high-end 60+ CU-class, RT-capable GPUs. GTA VI and RDR2 are visual-quality references, not copied content or an achieved quality claim. Local Intel HD 2000 results are compatibility evidence. No operation count or percentage guarantees production AAA completion.

| Operation             | Intended graphics increment                                                   | Evidence/state                                     |
| --------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| 05 EUPHORIA INDIA     | Continuous near-character profiles, garment construction and woven PBR detail | Implemented and inspected in live build; see below |
| 06 SECONDARY LIFE     | Hair/cloth silhouette and secondary movement                                  | Implemented; see increment 06 and live evidence    |
| 07 MACHINE            | Original vehicle body forms, wheels, lights and material definition           | Planned                                            |
| 08 IMPACT             | Visible material/damage response to impacts                                   | Planned                                            |
| 09 MONSOON            | Rain, wetness, water/surface response                                         | Planned                                            |
| 10 BHARAT             | Recognizable original Indian streets and architectural asset quality          | Planned                                            |
| 11 LIVING CITY        | Crowd/traffic variation and natural visible behavior                          | Planned                                            |
| 12 LAW & CONSEQUENCE  | Readable physical/environmental consequences and character presentation       | Planned                                            |
| 13 SENSES             | Camera, environmental cues and scene presentation                             | Planned                                            |
| 14 SAGA               | Story-character expressions, staging and lighting                             | Planned                                            |
| 15 PLAYER EXPERIENCE  | Camera transitions and visual-interface consistency                           | Planned                                            |
| 16 BIOSPHERE          | Vegetation/terrain material and silhouette quality                            | Planned                                            |
| 17 EMERGENCE          | Persistent interaction-driven visual changes                                  | Planned                                            |
| 18 THE VERTICAL SLICE | Asset/lighting consistency across the playable slice                          | Planned                                            |
| 19 EXTENDED LOOK      | Advanced rendering integration and target-hardware inspection                 | Planned                                            |
| 20 SCALE              | Preserve measured visual quality through LOD/streaming/performance work       | Planned                                            |

Operations 05 and 06 have delivered the increments below in consecutive milestones. These are review targets, not premature implementation of later operations. At each milestone record its actual visual change, capture/inspect it in the executable scene, compare resource cost and document remaining defects.

## Increment 05

Before: separated ellipsoid torso/limb volumes made joints and clothing visibly bulbous. After: continuous tapered cross-sections retain volume through knees/elbows; structured collar, cuffs, hem, front placket and pockets give clothing a defined form. Two shared original 128-square textures add normal/roughness weave detail. Near eyes/eyelids are revised.

Real browser inspection used the existing Inspect character camera under Balanced sunset before and after the change. The resulting silhouette and garment features are visible in rendered gameplay; this is appearance evidence only. Physics/motion validation is independent.

Hero tier0:20,825→19,413 vertices;35,304→32,268 triangles. Tier1:14,128→13,396 triangles;far tier remains2,648 triangles. All51 bones,three morph buffers,six material groups and normalized weights remain. Two extra shared128×128 RGBA textures cost128 KiB of base texels (~171 KiB with mipmaps). No per-character texture duplication.

Remaining visible limitations: procedural stylization, simplified faces/hands, separate body/garment surfaces and some intersections, uncalibrated weights, no true skin scattering and no simulated cloth. More realistic graphics remain a major production workload; the current result is well below the user's final quality reference.

## Increment 06

Added visible simulated guide strips with original fibre alpha texture, anisotropic specular response and shadowing; reduced the rigid scalp volume. Added deforming fabric panels with edge colour and existing woven surface maps. Cast members show different panel/hair presets. Five additional facial morphs deform brows, lips and cheeks rather than only changing a label. Front/back/face viewpoints expose these details; the inspection spawn no longer intersects the decorative curb.

The added cloth is a panel proxy, not complete fitted/sewn garments. Hair is a sparse ribbon approximation, and facial anatomy/environment remain stylized. Resource and live behavior evidence is recorded in evidence/secondary-life-validation.md. Operations07–20 remain unstarted.
