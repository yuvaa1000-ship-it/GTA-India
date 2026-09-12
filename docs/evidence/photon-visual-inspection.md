# PHOTON production visual inspection — 2026-09-12

Build asset: `index-Bel1X-er.js`. Actual in-app WebGL2 rendering, not generated imagery. These observations supplement the executable diagnostics; they are not gameplay proof by themselves.

- Reference / Night: emissive storefront sign and vehicle headlamps were visible; three differently shaded spheres and lit interior could be seen through the glass. Chrome highlights, darker painted car body, cloth/skin/hair coupons and masked puddle response were visible.
- Reference / Rain: short falling line segments, stronger height fog, broad wet-asphalt specular response, car paint clearcoat and a sharper, geometrically projected puddle reflection were visible. Rain wrap no longer produced full-height segments in the inspected frame.
- The scene remains an obvious procedural material laboratory. Static cars/rickshaw, abstract bust, coarse buildings, limited vegetation, alpha/physical-glass artifacts, rough reflection filtering and distant cuboid population are visible limitations. It is not final game art or photorealism.
- Puddle reflections include actual nearby vehicle/headlight/scene geometry. Their cadence and blur can smear moving proxies, and existing traffic crosses the render-only laboratory because it has no traffic-aware exclusion.
- The Hide HUD control exposes the material view; Show HUD restores measured counters. Inspect materials returns to the plaza and anchors the player while camera orbit remains available; Follow player restores exploration.
- Manual follow-camera test on the final build: three W presses changed the HUD position from z=8.0 to z=7.6. Save displayed Saved locally. Return to plaza then Load displayed Save restored. The subsequent HUD showed z=7.6, 25 resident cells and 226 rigid bodies.
- No captured JavaScript/shader errors after the rendering and gameplay harnesses. The known nonfatal Rapier initialization deprecation warning remains.
