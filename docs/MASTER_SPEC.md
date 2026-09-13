# GTA INDIA — master specification

Original Indian open-world crime/action project. Operation 01 GENESIS is an executable engineering blockout, not a finished game or visual quality claim. Canonical repository: https://github.com/yuvaa1000-ship-it/GTA-India.

## Continuity rules

Read SYSTEM_STATUS.md, NEXT_TASK.md, ARCHITECTURE.md and the subsystem spec before edits. Preserve verified behavior. Build, run, inspect, profile, repair, regression-test, update documentation and commit each stable milestone. Execute operations in order; no automatic launch of a later operation. Use IMPLEMENTED AND VERIFIED / IMPLEMENTED BUT LIMITED / EXPERIMENTAL / PLANNED / NOT POSSIBLE IN CURRENT ENVIRONMENT labels. Never treat imagery or prose as gameplay evidence.

## Scope

Quality order: stability, player feel, interaction, animation, physical reactions, vehicles, AI, lighting, materials, weather, density, narrative, expansion. Future ambition includes mass-aware characters, articulated vehicles, grounded crowds, reactive police and persistent consequences. None is implied by module names or this foundation.

## Definition of GENESIS

Runnable WebGL2 scene, capsule control, collidable world and dynamic props, camera, sun/shadows, streaming ownership, performance instrumentation, recovery documentation and canonical commit. Production art, vehicle handling, police, missions, dialogue and sophisticated animation are later operations.

## Originality

Navapur and Old Port are original working place names. Geometry is procedurally authored from original code, including the weighted HUMAN meshes; no competitor assets or claims about competitor internals. Project title is the user's working title, not a Rockstar affiliation. Asset imports must carry provenance and license records.

## HUMAN milestone

The reusable character contract now lives in HUMAN_SPEC.md: original procedural weighted humans, deterministic identity, bounded representation tiers and explicit asset ownership. SYSTEM_STATUS.md is authoritative for verified versus limited behavior. Final art and animation must advance toward the user's high-end Indian open-world quality target; the local compatibility machine does not set the project's visual ceiling.

## PROMETHEUS integration

Operation 04 extends the existing 51-bone HUMAN rigs with procedural motion states/context, achieved-movement animation, physical ground queries, foot/hand IK, rest-relative retargeting and a temporary contact laboratory inside existing world bounds. Runtime owns the laboratory/director; HumanSystem owns character motion controllers. The capsule remains authoritative over player translation. Preserve existing rendering, streaming and character ownership.

The laboratory makes terrain traversal, shared-object contacts, body-size retargeting and resource recovery measurable. Its box has real physics; seats and vehicle handles are dimensioned contact fixtures. Gait/contact adaptation and seated poses remain experimental. Production motion assets, motion matching, root-motion warping, complete seated/vehicle transitions, ragdoll blending and physical secondary motion remain planned. See PROMETHEUS_SPEC.md for technique classifications and SYSTEM_STATUS.md for run-specific evidence.

The target remains modern 60+ CU-class, RT-capable GPUs and GTA VI/RDR2-level visual ambition in an original Indian setting. The current WebGL2 prototype has no hardware RT; local compatibility results do not certify target-GPU performance or final graphics. Operation count does not establish completion of the production art and animation workload.
