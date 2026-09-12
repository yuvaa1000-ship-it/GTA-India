# PHOTON rendering specification

Operation 02 builds on GENESIS commit `43114ceaaaf0eb5e82df5749fba5beb93f4c8dcd`. The executable backend remains Three.js 0.180 WebGL2. No story or map expansion was performed. The plaza now contains a compact original procedural material laboratory; character and vehicle shapes are stationary shading coupons, not new gameplay systems.

## Owned render graph

`Runtime -> Photon -> atmosphere / material library / validation lab / reflection manager / postprocess / GPU profiler`.

- Capability check verifies a complete half-float framebuffer, not just an exposed API.
- Dirty local probe: six CubeCamera views at 128², then PMREM roughness filtering into a reused output. Only captures with the probe cell resident and lab visible. Authored sky/direct light supply the first bounce; stale previous IBL is removed during recapture.
- One horizontal planar capture shares the two puddle masks. Budgeted target resolution, update interval, distance and frustum gating; fallback physical water remains when the capture is not used. The virtual camera uses reflected geometry and an oblique clipping plane.
- Main scene renders linear color and depth to an offscreen target. ACES and output color conversion happen once in the final screen pass.
- A 16×16 log-luminance meter samples the rendered image every 1.5 simulation seconds. One bounded WebGL2 pixel-pack buffer and a nonblocking fence collect quantized samples in later frames for time-smoothed exposure. Completion, timeout, failure and disposal free the transfer. Submission cost is separately reported; completed exposure holds while pending.
- Combined screen pass performs optional depth-derived AO, analytic height fog, optional limited bloom gather and edge softening. These are documented approximations, not GTAO/FXAA/volumetric GI claims.

## Reflection hierarchy

Chrome uses smooth conductor response. Car paint combines colored metalness/roughness and a separate smooth clearcoat with flake micro-normals. Auto-rickshaw paint is rougher and less metallic. Glass is dielectric and uses low-cost alpha transmission by default; Reference selects Three physical transmission. Wet asphalt keeps aggregate roughness, with rain-driven dielectric coating and PMREM response. Puddles receive the additional projected geometry capture, water-like Schlick angle response, limited roughness blur and animated ripple distortion.

Selected lab materials apply an experimental AABB-projected specular lookup around one local probe. This improves box-like localization but is not ray traced geometry or reflection occlusion. PMREM snapshots are stale for moving objects until refreshed. Diffuse environment illumination is a single-probe GI approximation; the whole streamed world is not solved for indirect light.

## Lighting and surface scope

Three analytic Sky supplies Rayleigh/Mie-shaped daylight and authored night/rain variants. Directional/hemisphere light values are artist-tuned working values, not measured illuminance calibration. Local headlights/storefront lights use inverse-square attenuation but do not establish a calibrated camera/photometric pipeline. One sun-following PCF soft shadow map is inherited. Cloud modulation and local rain streaks are visual approximations; no volumetric shadow integration or simulated water is claimed.

Material library includes original grain, roughness, flake and weave DataTextures with mipmaps and capped anisotropic filtering. Skin, eyes, hair and cloth demonstrate surface shading only. Real SSS, anatomical eye refraction, strand scattering and simulation are PLANNED.

## Detail and performance

All requested asset classes have authored screen-space geometry ceilings and projected-error/hysteresis rules in GEOMETRY_BUDGET.md. Runtime currently applies them to facade-window detail visibility. Instancing and material-based static batching remain active. Hero mesh simplification/HLOD/impostors and full category LOD assets are PLANNED.

Explicit Performance, Balanced and Reference settings control scale, shadows, reflection resolution/rate, AO, bloom and glass. Optional adaptive resolution is EXPERIMENTAL. `Compare rendering` measures multiple fixed-camera configurations and tests target reuse; `Run diagnostics` retains GENESIS gameplay checks. Actual evidence and caveats are recorded in SYSTEM_STATUS.md and docs/evidence.

## Limits and fallback

Missing float renderability selects unsigned-byte scene/planar targets and skips PMREM; this branch is not automatically a hardware verification claim. Exposed WebGPU is independently probed for an adapter but is not used for rendering. SSR, SSGI, cascades, PCSS, shadowed volumetrics, motion vectors/TAA, DOF and motion blur remain PLANNED. See PHOTON_TECHNIQUES.md for the complete technique truth table and artifacts.

## Primary technical references

Implementation was checked against installed Three source, including `Reflector`, `Sky`, `PMREMGenerator`, physical material shader chunks and WebGLRenderer's offscreen tone-mapping path. Public primary references: [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html), [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html), [Reflector](https://threejs.org/docs/pages/Reflector.html). These are API references, not evidence of this build's measured behavior.
