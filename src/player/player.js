import * as T from "three";
import { RAPIER } from "../physics/world.js";
import { CONFIG } from "../config/settings.js";
export class Player {
  constructor(world, scene) {
    this.world = world;
    this.velocityY = 0;
    this.grounded = false;
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 2, 8),
    );
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(CONFIG.playerHalfHeight, CONFIG.playerRadius),
      this.body,
    );
    this.controller = world.createCharacterController(0.015);
    this.controller.enableAutostep(0.3, 0.2, true);
    this.controller.enableSnapToGround(0.25);
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.controller.setCharacterMass(75);
    this.geometry = new T.CapsuleGeometry(0.32, 1.1, 5, 10);
    this.material = new T.MeshStandardMaterial({
      color: "#e4b86d",
      roughness: 0.8,
    });
    this.mesh = new T.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.sync();
  }
  step(dt, input) {
    this.velocityY = this.grounded
      ? Math.max(this.velocityY, 0)
      : this.velocityY;
    if (input.jump && this.grounded) this.velocityY = 7;
    this.velocityY += CONFIG.gravity * dt;
    const speed = input.sprint ? CONFIG.runSpeed : CONFIG.walkSpeed;
    this.controller.computeColliderMovement(this.collider, {
      x: input.x * speed * dt,
      y: this.velocityY * dt,
      z: input.z * speed * dt,
    });
    const delta = this.controller.computedMovement(),
      p = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: Math.max(-2048, Math.min(2048, p.x + delta.x)),
      y: p.y + delta.y,
      z: Math.max(-2048, Math.min(2048, p.z + delta.z)),
    });
    this.grounded = this.controller.computedGrounded();
    if (this.grounded && this.velocityY < 0) this.velocityY = 0;
  }
  teleport(p) {
    this.body.setTranslation(p, true);
    this.body.setNextKinematicTranslation(p);
    this.velocityY = 0;
    this.grounded = false;
    this.sync();
  }
  sync() {
    this.mesh.position.copy(this.body.translation());
  }
  dispose(scene) {
    scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
    this.world.removeCharacterController(this.controller);
    this.world.removeRigidBody(this.body);
  }
}
