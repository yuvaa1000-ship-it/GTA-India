# EUPHORIA INDIA executable evidence — 2026-09-13

Starting canonical milestone: PROMETHEUS4d0d1f30e8fa4c2e18a013adfc2f12513e2cf13a. Operation03 and04 were preserved. Local runtime ANGLE/Mesa Intel HD Graphics2000,OpenGL3.3/WebGL2. No WebGPU adapter or target-class GPU was available; the production goal remains high-end60+ CU-class RT-capable hardware.

## Reproduced failures and repairs

1. Hardpush produced zero controller displacement even while physical chest velocity changed. Player.step did not yet consume the new external response velocity. The controller now applies it through its ordinary collision sweep.
2. That repair initially moved only1.45cm and then stopped. Actual computedCollision handles identified the hero's own physical limbs. Rapier's character query needed explicit filterGroups; it now uses the capsule's collision groups. Ground rays also exclude owned articulated colliders. The retained hardpush/mass tests now pass without weakened thresholds.
3. Root target placement could accumulate between rendered frames if activation occurred inside a fixed-step loop. A captured pelvis target is now initialized on activation and translated relative to the last visual root.
4. A fresh hit during recovery could finish the old transition; fresh full-body impacts now cancel the recovery target/timer. Cleanup resolves a standing location before re-enabling the controller. Recovery also rechecks clearance.
5. Partial animation ended with a direct switch; it now fades physical influence over0.6s. Full recovery uses a1.4s blend after a supported clear standing position is found. This is still an experimental pose/placement transition, not a physically actuated get-up.
6. The first live run's balance forecast sometimes said falling while the executed mode stayed partial. Runtime state is now derived from the response actually executed; the raw predictor state remains separately visible in balance telemetry. Full fall also releases animation foot support. Final checks include coarse rendering cadence and actual post-physical foot residuals.

## First production execution: index-DZEkX17n.js

All84 Node tests passed and production build completed62modules. Browser reaction checks passed14/14 on this build; the telemetry discrepancy above was then repaired rather than hiding it in the final state report.

| Trial              | Actual controller displacement | Max joint-anchor separation | Max contacts in sampled frame | Physical mode                                |
| ------------------ | -----------------------------: | --------------------------: | ----------------------------: | -------------------------------------------- |
| 20 N·s bump        |                      0.039147m |                    0.3745mm |                             4 | Partial                                      |
| 100 N·s push       |                      0.195413m |                    0.6510mm |                             8 | Partial; six step transitions                |
| 350 N·s impact     |                      1.707555m |                    3.9537mm |                            34 | Full articulated fall and recovery           |
| 280 N·s stair fall |                      3.784054m |                    1.9180mm |                            29 | Full fall with terrain contacts and recovery |

Every trial created13links/12joints at measured74.999999kg and recovered finite skin matrices and the original capsule. Final world restored226→226 bodies andzero impulse joints. At75kg character mass and4m/s closing speed, the documented event model produced214.468N·s for a160kg motorcycle proxy and296.471N·s for a1200kg car proxy. These are collision-event approximations, not delivered vehicle dynamics.

Reaction-inclusive profile:203 sampled frames at1098×814, Balanced sunset scale0.85,planar on,automatic exposure on,adaptation off. Mean187.8476ms /p95499.98ms,5.32346FPS; CPU102.0763ms,physics14.8491ms,population0.5686ms,streaming0.5652ms. Latest GPU scene116.24088ms,planar30.14504ms,post19.22512ms. Latest HUMAN17.48ms; latest reaction controller2.60ms per fixed update (not whole-frame cost). Snapshot328draw submissions/494,636submitted triangles,43geometryresources,31textures,51.145MiB JS heap,100citizens,50vehicleproxies,226bodies,8active rigs,25resident cells/zeroqueued. CPU meter spike621.385ms andprobe552.08ms were included rather than omitted. GPU values are asynchronous latest samples, not synchronized averages. This is old-device compatibility evidence, not production acceptance.

HUMAN regression8/8: live19,413vertex/32,268triangle/51bone hero,three morphs,four distinct cast heights,10pose updates in interval,deterministic identities,100citizens,bounded rigs,226bodies,finite matrices. GENESIS regression11/11:4.04m walk,1.11m jump delta,wallstop11.65at11.99,121created/96evicted/25resident,226→226bodies,43→44geometries within12-rig bound,prop persistence,interior entry/exit andzero worker errors. Automatic wall reactions are isolated during inherited harness runs; a separate realwall physics regression verifies automatic activation without manual impact calls.

Before/after visual inspection used Inspect character under the same Balanced sunset conditions. Continuous profiles and garment construction are visibly different in the actual skinned build; faces, hands and environment remain stylized. See GRAPHICS_PROGRESS for resource deltas and remaining visual defects. Appearance inspection does not substitute for the executable checks.

## Additional regression repairs

7. At 10 Hz and 6 Hz visual updates with 60 Hz physics, the 100 N·s shove moved the capsule 0.195631 m but produced no footstep. Sparse speed samples fell below the locomotion gate just as accumulated travel reached the step threshold. A reaction now requests one bounded, ground-checked swing from the balance direction/distance; the actual swing advances through the existing motion controller.
8. Testing actual ankle positions then exposed the next conflict: physical pose mapping overwrote the lifted foot and allowed 24 cm of planted-foot displacement. Partial grounded mode now reapplies final sole IK after physical mapping. The strengthened integration suite observes unlocked swing progress, over 3 cm actual horizontal ankle travel, over 1.5 cm lift and less than 2.5 cm planted-foot residual at both sparse cadences. Full falls retain entirely physical limb mapping. Partial visible legs can therefore differ from their physical collider poses; this hybrid limitation is explicit.

PHOTON comparison on the first production build passed 8/8 checks: actual HDR framebuffer, material hierarchy, advancing planar capture, probe refresh, rendered-image metering, unchanged 226 bodies, 15/25 detailed cells and exact texture/geometry restoration (41→41 textures, 45→45 geometries). At 1098×814 Balanced sunset, planar-off measured 4.844 FPS / 206.450 ms mean over 31 samples; planar-on 4.444 FPS / 224.998 ms over 28. Performance rain at 904×670 measured 5.801 FPS over 35 samples. Reference night at 1292×958 measured 1.875 FPS over nine samples, with 897 draws and 1,044,866 submitted triangles. Conditions change across presets; these are short local workloads, not controlled high-end comparisons.

## Final verification

Production `index-dXo4dQha.js`: all 89 Node tests passed (85 top-level plus four nested cadence cases), zero failures, 47.165 seconds. Production build completed in 12.96 seconds; application 174.76 kB / 57.96 kB gzip, rendering 496.68 kB / 124.26 kB gzip, Rapier 2,216.11 kB / 830.69 kB gzip. The existing large physics-chunk advisory remains.

Final live reaction harness passed **14/14**, now requiring a real step transition for the push and truthful executed state for the bump:

| Trial          | End displacement | Max joint-anchor separation | Contacts in peak sampled frame | Executed states / steps                           |
| -------------- | ---------------: | --------------------------: | -----------------------------: | ------------------------------------------------- |
| 20 N·s bump    |       0.039281 m |                   0.7983 mm |                              4 | correcting → recovering; 3 transitions            |
| 100 N·s push   |       0.195017 m |                   1.0191 mm |                              6 | correcting → stepping → recovering; 4 transitions |
| 350 N·s fall   |       1.665364 m |                  14.0613 mm |                             31 | falling → recovering; 0 locomotion steps          |
| 280 N·s stairs |       3.711355 m |                  23.5308 mm |                             27 | falling → recovering; 0 locomotion steps          |

Partial post-correction foot target residual peaks were 1.12e-8 m and 2.50e-8 m in these sampled frames. This measures IK endpoint agreement, not pressure-based physical balance or collider/visible-leg agreement. Full-fall foot correction is inactive. The larger full-fall joint errors than the first build are retained honestly after releasing false animation support; the test bound is 0.16 m and the final maximum observed was 0.023531 m. All poses remained finite, all trials recovered, and final cleanup restored 226→226 bodies and zero impulse joints. Per-trial measured mass remained 74.999999 kg.

Final reaction-inclusive compatibility sample: 201 frames, 1098×814 buffer, Balanced sunset scale 0.85, planar and auto exposure on, adaptation off. **5.24579 FPS**, mean **190.62893 ms**, p95 **516.67 ms**; CPU 105.95935 ms, physics 14.99388 ms, population 0.68483 ms, streaming 0.43092 ms. Snapshot 328 draws, 494,460 submitted triangles and 64.1696 MiB JS heap. Target-class throughput remains unmeasured; these values are not production acceptance.

Final inherited PROMETHEUS browser validation passed **15/15**: 34 physical fixtures; supported idle; 1.84243 m walking with eight step transitions and measured planted endpoints; jump release and landing support; stairs, curb, slope, uneven paving, doorway and wall courses; object-relative hand error 2.81e-8 m; short/tall retargeting with 51 mapped bones; finite matrices; and lab teardown restoring 226→226 bodies. Full-fall release no longer falsely counts locomotion steps while airborne. Console inspection found no errors; the existing Rapier initialization deprecation warning remains.

The final character view was inspected with the diagnostics closed, HUD hidden and laboratories folded. Continuous clothing shapes and seams are present; stylized facial proportions, simple materials and coarse surroundings remain visible defects. These images were inspected in the running browser, not generated as substitute gameplay evidence. The source and completed tests, rather than any screenshot, define this milestone.
