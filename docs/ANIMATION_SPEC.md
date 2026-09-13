# HUMAN animation contract

The rendered player now has a real 51-bone weighted rig over the preserved Rapier capsule controller. Runtime physics still owns movement; measured displacement/grounded state drive the visual pose. Teleport displacement is rejected from gait-speed estimation. Four cast rigs and bounded streamed citizen rigs share the same named skeleton convention and independent pose state.

IMPLEMENTED BUT LIMITED: linear blend skinning, procedural swing/breathing, jaw/eye bones, finger joints, twist joints, gaze, per-citizen phase/stride/posture, simplified distance pose rates. EXPERIMENTAL: relative blink/smile and elbow-volume morphs, joint-height weights, mesh hair and layered skinned clothes. Character surfaces and collision use separate ownership.

PLANNED: authored animation clips, retargeting adapter, locomotion transitions, contact-aware feet/hands, terrain IK, pose interpolation, mocap/motion matching, detailed physical reactions, facial speech, actual cloth/hair simulation. Do not mistake swing equations for production locomotion. The HUD reports active rigs and actual HUMAN CPU cost; it no longer reports zero animation agents.

The next operation should accept velocity, grounded/contact information and intent, then produce a stable pose with measurable foot sliding/contact error. Preserve all physics, lifetime, identity and skin-deformation tests. See HUMAN_SPEC.md.
