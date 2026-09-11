# Rendering

IMPLEMENTED BUT LIMITED: Three.js 0.180.0 WebGL2, perspective camera, ACES tone mapping, linear engine lighting with hemisphere ambient and directional sun, rough standard materials, 1024² PCF soft shadow map, distance fog, instanced static street/building, window and population geometry. Procedural geometry only. Camera obstruction queries shorten the chase boom.

No Lumen, Nanite, RAGE, ray tracing, PBR scanned assets, temporal upscaler or physically traced reflections is implemented. WebGPU adapter use and WGSL compute are PLANNED; an exposed `navigator.gpu` API is not adapter verification. WebGL2 was selected for executable support, not a claim of superiority.

GPU elapsed queries use EXT_disjoint_timer_query_webgl2 when available and discard disjoint samples. CPU submission includes JS-side render work; neither is interchangeable with total frame time. Draws/triangles are renderer counters, geometry/texture counts are allocation counts, JS heap is not VRAM. No GPU byte-memory claim.

Future PHOTON: profile the current baseline, evaluate the existing static batches, assess hardware adapters, then integrate a limited reflection technique with objective comparisons and explicit quality/performance controls. glTF/KTX2/mesh compression, texture arrays, OffscreenCanvas rendering and compute are considerations, not current features.

Primary references: https://threejs.org/docs/pages/WebGLRenderer.html and https://threejs.org/docs/pages/Info.html . API behavior was checked against installed source where applicable.
