# Animation

Player capsule movement: IMPLEMENTED BUT LIMITED. Kinematic movement and ground contact are real; rendered capsule has no skeleton, feet, gait, facial rig or physical animation. Animation-agent HUD count is zero.

NPC/vehicle proxies: IMPLEMENTED BUT LIMITED deterministic transforms of instanced boxes. No motion capture, blend tree, IK, ragdoll, behavior-driven posing or collision avoidance. No claim that these proxies represent HUMAN or EUPHORIA completion.

Next character contract: fixed-step velocity + grounded state -> animation controller -> rig pose -> optional IK correction -> visual interpolation. Keep ownership separate from Rapier controller and preserve capsule collision regression tests. Imported assets require explicit provenance.
