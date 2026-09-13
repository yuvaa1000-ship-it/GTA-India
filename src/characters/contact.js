import { RAPIER } from "../physics/world.js";
// Broad capsule contact only. This is not per-limb physical animation or crowd avoidance.
export class HumanContact {
  constructor(world, height) {
    this.world = world;
    this.height = height;
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(
        Math.max(0.2, height * 0.5 - 0.24),
        0.24,
      ).setTranslation(0, -1000, 0),
    );
  }
  move(p) {
    this.collider.setTranslation({
      x: p.x,
      y: p.y + this.height * 0.5,
      z: p.z,
    });
  }
  dispose() {
    if (this.collider) {
      this.world.removeCollider(this.collider, true);
      this.collider = null;
    }
  }
}
