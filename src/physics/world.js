import RAPIER from "@dimforge/rapier3d-compat";
export { RAPIER };
export async function createPhysics() {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  world.timestep = 1 / 60;
  return world;
}
export function fixedBox(world, x, y, z, w, h, d) {
  const b = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setFriction(0.8),
    b,
  );
  return b;
}
export function dynamicBox(world, x, y, z) {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setCcdEnabled(true),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.45, 0.45, 0.45)
      .setDensity(8)
      .setFriction(0.7)
      .setRestitution(0.1),
    body,
  );
  return body;
}
