# HUMAN — reusable character framework

Operation 03 builds on PHOTON commit `90ef1203c9d2fec2aca8375330670d67d17e4692`. The target remains modern 60+ CU-class, RT-capable hardware, with GTA VI as a quality reference for the eventual original Indian open world. Twenty operation labels do not guarantee that production quality: final anatomy, authored assets, motion capture, animation, environments, lighting, gameplay and hardware validation remain substantial work. The local Intel GPU is not the visual ceiling.

## Runtime ownership

`Runtime -> HumanSystem -> HumanCharacter -> rig / weighted geometry / surfaces`.

HumanSystem replaces the visible player capsule with a rig while retaining the original Rapier player body and controller. It adds four cast samples inside the existing plaza and replaces the cells' visible pedestrian boxes with human representations. Original vehicle proxies, world generation, PHOTON passes and saves remain intact. No external character assets or paid generation services were used. All current geometry and pore normals are original procedural source.

Each character owns one merged SkinnedMesh, six material groups, one skeleton and its geometry. HumanSurfaces owns one shared 128² pore-like normal texture. Character disposal releases geometry, six materials and skeleton/bone texture once. HumanSystem owns the far instance buffer, material and geometry, active registry and contacts. Runtime disposes HUMAN before streaming, player and physics.

## Identity and diversity

Grammar version 1 hashes `citizen:cellX,cellZ:slot` with FNV-like integer arithmetic, then uses deterministic random streams. Unload/reload reconstructs the same identity independently of generation order. Height, girth, shoulder/hip dimensions, face width, jaw and nose proportions, complexion, age descriptor, posture, stride, hair, facial hair, three garment forms, sleeve length, accessories and footwear vary. Four cast samples have independent identities and proportions; the player uses a stable hero ID and controller-compatible fixed height.

Occupation/context, language and background use a separate stream from appearance. Complexion or facial dimensions do not encode occupation, language, region, caste, religion, class or behavior. Metadata is fictional, not a demographic simulation. Broad cultural representation requires research and authentic authored garments; the current shirt/kurta/jacket and accessory grammar is a limited start. Age influences hair color but has no anatomical aging model. No child bodies are generated.

## Rig and deformation

51 named bones: root, pelvis, spine/chest/neck/head, jaw, paired eyes, clavicles, arms/forearms/hands, arm/wrist twists, ten fingers with two joints each, thigh/twist/shin/ankle/toe chains. SkinIndex/SkinWeight attributes carry two nonzero normalized influences in a four-slot format. Three linear blend skinning executes the GPU deformation. Each limb samples nearby joint heights for weights; this is not artist-painted production skinning.

Relative morphs: blink, smile and an elbow-driven radial upper-arm correction. Pose updates advance procedural swing from measured player displacement or citizen path speed, flex knees, counter-swing arms, rotate twist joints, curl fingers, breathe, gaze and blink. A jaw bone carries mouth/teeth components. Muscle correction, smile and eyelids are **EXPERIMENTAL** and can show seams or volume artifacts. No volumetric muscle model, pose-space corrective library, motion matching, mocap, authored locomotion clips, terrain IK, planted feet, ragdoll, facial speech or physical animation is implied.

The meshes are merged parametric overlapping surfaces, not watertight scan-quality anatomy. Topology is valid for their bind/morph arrays, but disjoint parts, garment intersections, joint seams and stylized faces remain. Skin pores are normal shading; skin uses opaque PBR, not subsurface scattering. Hair is shaped mesh with anisotropic shading, not strands or simulation. Clothes follow skin weights with no cloth dynamics. Teeth are simple visible geometry; anatomical tongue simulation is absent.

Skin state accepts bounded wet/dirt/dust/bruise controls and changes actual material color/roughness/clearcoat; wetness follows PHOTON rain. These are uniform material approximations, not spatial damage masks, wounds, accumulation or persistent injuries. State validation rejects nonfinite inputs. A single source height does not certify production collision fidelity.

## Crowd tiers

| Tier | Implemented representation                                                                                                        | Remaining work                                                                                      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 0    | Always-detailed playable rig plus four cast samples, full generated geometry, gaze/face controls. Player retains Rapier movement. | Final hero/story art, full interaction, physical animation and dialogue.                            |
| 1    | Nearby skinned citizens, denser generated mesh, pose each eligible frame; standalone capsule contact blocks/deflects the player.  | Local decision-making, avoidance, dynamic reactions, negotiated contacts and animation transitions. |
| 2    | Reduced tessellation, same skeleton, pose updates at up to 12 Hz.                                                                 | Reduced bone palette, cheaper materials and robust pose interpolation.                              |
| 3    | One instanced resting human template with per-citizen height/girth/tint.                                                          | Animated impostors and silhouette variety beyond affine shape.                                      |
| 4    | Resident citizen data only, analytical path reconstructs state at current time.                                                   | Persistent off-region schedules, events and city simulation.                                        |

Initial thresholds: 32 m /65 m /180 m, frustum-based offscreen tier and hysteresis. At most 12 streamed skinned citizens are active in addition to hero/cast. At most one new weighted geometry is built per rendered frame; pending citizens retain the far representation. Tier changes replace geometry with explicit disposal. Caps are data in the owner, not adaptation to the local FPS. Full hero geometry is retained across PHOTON quality settings.

Citizen paths reverse continuously over a sidewalk interval instead of teleporting at a loop boundary. They still do not observe obstacles, traffic, other pedestrians or player intent. Tier 1 contact uses a moved standalone Rapier capsule, adds no rigid body, and is removed with its actor. Its broad-phase update and render-driven placement can lag one physics step. It is not a per-limb collider or physical reaction model. Other tiers do not provide collision.

## Validation and budgets

`validateHuman` checks finite vertices, normalized/in-range weights, metre-scale height, feet pivot, triangle count and morph vertex correspondence. Unit regressions exercise deterministic identity, path continuity, tier hysteresis, decreasing tessellation, actual deformed vertex positions, facial/corrective controls, material state, contact separation and explicit disposal. These checks do not certify watertight topology, UV quality, production facial likeness, cloth clearance or imported-asset licenses.

The playable generated source has about 35,304 triangles and 51 bones. A source rig can have different counts depending on grammar. Geometry tiers use decreasing sphere tessellation and preserve identity rather than being arbitrary screen labels. Six material groups cost up to six submissions per character per scene pass. PHOTON probes, shadows, transmission and planar captures multiply that cost. CPU procedural creation and skinning must be profiled independently on the target GPU. Current geometry capacity is 18 human geometries: hero +4 cast +12 nearby +1 far template; renderer allocation counts also include the inherited world and PHOTON.

The inherited geometry regression allows at most twelve additional human allocations after traversal because the visible crowd set can differ; exact disposal is separately tested. Do not interpret this allowance as proof of an unlimited soak. Capture the actual before/after values.

## Next asset integration contract

Import a license-verified original human in metre units, +Y up and +Z forward; retain identity metadata independently of the mesh. Map its joints into the named rig contract, validate inverse bind matrices, normalized weights, morph topology, bounds and foot pivot, then test walk/jump/collision in the actual world. Supply authored LODs, material maps, facial deformations and clothing clearances. Keep provenance/license/source version in the asset manifest. Do not call generated output production-ready or replace the working procedural fallback without executable validation.

Sources: installed Three.js 0.180 source and official [SkinnedMesh documentation](https://threejs.org/docs/pages/SkinnedMesh.html), [BufferGeometry documentation](https://threejs.org/docs/pages/BufferGeometry.html). These support the skin/morph buffer contract; no competitor technology is claimed.

The rendering validation's short target-cleanup phase temporarily freezes HUMAN updates to hold character allocations constant, then restores the prior flag in finally. All four measured rendering conditions run with live characters; the separate HUMAN and streaming regressions verify animation and representation changes.

## Operation 05 visual revision

Near/hero meshes now use continuous tapered profile surfaces for torso and limbs, plus garment collars/plackets/pockets/cuffs and hems. Three shared textures are owned by HumanSurfaces: the retained pore texture plus128² cloth normal and roughness maps. Hero tier0 is19,413 vertices/32,268 triangles; near tier1 is13,396 triangles;far tier2 remains2,648. The51-bone,three-morph,six-material contract is preserved. See GRAPHICS_PROGRESS.md for before/after inspection and exact remaining art limitations. Previous mesh/texture counts elsewhere in this document describe the Operation03 starting milestone.

## Operation 06 facial and secondary extension

The original three morph channels retain indices 0–2. Five real relative shape buffers add browRaise, browFrown, lipWide, lipRound and cheekRaise; the mesh now has eight morph channels and still 51 bones. Source vertex/triangle counts are unchanged by these shapes. A smaller static scalp supports separately simulated strips. Per-character secondary resource owners are capped and independently disposed; see SECONDARY_LIFE_SPEC. Garment panels supplement existing clothing, and visual anatomy remains procedural.
