import * as T from "three";
import { RAPIER } from "../physics/world.js";

const FLOOR = 6;
const STANDING = FLOOR + 0.9;
const v = (x, y, z) => new T.Vector3(x, y, z);

/** Owned, removable contact fixtures inside the existing streamed map volume. */
export class MotionLab {
  constructor(runtime) {
    this.runtime = runtime;
    this.active = false;
    this.fixtures = [];
    this.targets = [];
    this.group = new T.Group();
    this.group.name = "PROMETHEUS contact laboratory";
    this.stations = [
      ["flat", "Flat ground", 0, 44, 0, -1],
      ["stairs", "Stairs · 18 cm rises", -6, 34.5, 0, -1],
      ["curb", "Curb · 18 cm", -6, 40.5, 0, -1],
      ["slope", "Slope · 14 degrees", -2, 34, 0, -1],
      ["uneven", "Uneven paving", 3, 40.5, 0, -1],
      ["doorway", "Narrow doorway · 1.2 m", 6, 33.5, 0, -1],
      ["wall", "Wall approach", 0, 28, 0, -1],
      ["chair", "Chair contact", 7, 41.7, 0, 1],
      ["car-door", "Car door alignment", 5, 36.5, 1, 0],
      ["scooter", "Scooter seat and grips", -7, 42.2, 0, 1],
      ["rickshaw", "Rickshaw seat and grips", -3, 42.2, 0, 1],
      ["box", "Movable box", 2.7, 42, 0, 1],
      ["puddle", "Shallow puddle", 0, 34, 0, 1],
    ].map(([id, label, x, z, dx, dz]) => ({
      id,
      label,
      spawn: { x, y: STANDING, z },
      direction: { x: dx, z: dz },
    }));
  }

  enter() {
    if (this.active) return;
    const r = this.runtime;
    if (r.depot?.inside) r.depot.exit(r.player);
    this.outside = { ...r.player.body.translation() };
    this.outsideYaw = r.input?.yaw ?? 0;
    this.geometry = new T.BoxGeometry(1, 1, 1);
    this.materials = {
      floor: new T.MeshStandardMaterial({ color: "#75817a", roughness: 0.9 }),
      obstacle: new T.MeshStandardMaterial({
        color: "#c1a77d",
        roughness: 0.8,
      }),
      metal: new T.MeshStandardMaterial({
        color: "#395e65",
        roughness: 0.4,
        metalness: 0.4,
      }),
      box: new T.MeshStandardMaterial({ color: "#985733", roughness: 0.9 }),
      water: new T.MeshPhysicalMaterial({
        color: "#405b66",
        roughness: 0.12,
        clearcoat: 1,
        transparent: true,
        opacity: 0.75,
      }),
    };
    this.active = true;
    r.scene.add(this.group);
    this.add("platform", 0, FLOOR - 0.3, 35, 20, 0.6, 24, "floor");
    // Open south edge allows ordinary walk-off/fall testing; no invisible walls.
    for (let i = 0; i < 8; i++) {
      const height = 0.18 * (i + 1);
      this.add(
        `stair-${i}`,
        -6,
        FLOOR + height / 2,
        31.8 - i * 0.4,
        2.2,
        height,
        0.4,
      );
    }
    this.add("curb", -6, FLOOR + 0.09, 38.4, 2.2, 0.18, 0.7);
    const angle = Math.atan(0.25);
    this.add(
      "slope",
      -2,
      FLOOR + 0.6 + 0.11 / Math.cos(angle),
      30,
      2.2,
      0.22,
      4.95,
      "obstacle",
      { rotation: new T.Quaternion().setFromAxisAngle(v(1, 0, 0), angle) },
    );
    [0.08, 0.16, 0.1, 0.22].forEach((height, i) => {
      this.add(
        `paving-${i}`,
        3,
        FLOOR + height / 2,
        38.5 - i * 0.5,
        2,
        height,
        0.5,
      );
    });
    this.add("door-left", 5.25, FLOOR + 1, 31, 0.3, 2, 0.5, "metal");
    this.add("door-right", 6.75, FLOOR + 1, 31, 0.3, 2, 0.5, "metal");
    this.add("door-lintel", 6, FLOOR + 2.15, 31, 1.8, 0.3, 0.5, "metal");
    this.add("wall", 0, FLOOR + 1.2, 24.8, 4, 2.4, 0.4);

    this.seat("chair", 7, 44, 0.46, 0.62, 0.6);
    this.add("chair-back", 7, FLOOR + 0.84, 44.28, 0.62, 0.74, 0.08, "metal");
    this.target(
      "chair",
      "Chair seat",
      "seat",
      v(7, FLOOR + 0.46, 44),
      v(7, FLOOR, 43.1),
      0,
      { seatHeight: 0.46 },
    );

    // These are dimensioned alignment rigs, not decorative vehicle models.
    this.add("car-door-panel", 7.3, FLOOR + 0.7, 36.5, 0.12, 1.4, 1.7, "metal");
    this.add(
      "car-door-handle",
      7.16,
      FLOOR + 1,
      36.1,
      0.18,
      0.08,
      0.25,
      "metal",
    );
    this.target(
      "car-door",
      "Car door handle",
      "door",
      v(7.06, FLOOR + 1, 36.1),
      v(6.25, FLOOR, 36.1),
      Math.PI / 2,
    );

    this.seat("scooter", -7, 44.5, 0.72, 0.48, 0.82);
    this.add("scooter-stem", -7, FLOOR + 0.65, 43.6, 0.1, 1.3, 0.1, "metal");
    this.add("scooter-bar", -7, FLOOR + 1.05, 43.6, 0.75, 0.08, 0.08, "metal");
    this.target(
      "scooter-seat",
      "Scooter seat",
      "seat",
      v(-7, FLOOR + 0.72, 44.5),
      v(-7.8, FLOOR, 44.5),
      Math.PI,
      { seatHeight: 0.72, vehicle: "scooter" },
    );
    this.target(
      "scooter-handles",
      "Scooter grips",
      "handle",
      v(-7, FLOOR + 1.05, 43.6),
      v(-7, FLOOR, 44.5),
      Math.PI,
      {
        left: v(-7.33, FLOOR + 1.05, 43.6),
        right: v(-6.67, FLOOR + 1.05, 43.6),
      },
    );

    this.seat("rickshaw", -3, 44.5, 0.62, 1.05, 0.65);
    this.add(
      "rickshaw-stem",
      -3,
      FLOOR + 0.57,
      43.55,
      0.12,
      1.14,
      0.12,
      "metal",
    );
    this.add(
      "rickshaw-bar",
      -3,
      FLOOR + 0.98,
      43.55,
      0.82,
      0.08,
      0.08,
      "metal",
    );
    this.target(
      "rickshaw-seat",
      "Rickshaw seat",
      "seat",
      v(-3, FLOOR + 0.62, 44.5),
      v(-3.9, FLOOR, 44.5),
      Math.PI,
      { seatHeight: 0.62, vehicle: "rickshaw" },
    );
    this.target(
      "rickshaw-handles",
      "Rickshaw grips",
      "handle",
      v(-3, FLOOR + 0.98, 43.55),
      v(-3, FLOOR, 44.5),
      Math.PI,
      {
        left: v(-3.37, FLOOR + 0.98, 43.55),
        right: v(-2.63, FLOOR + 0.98, 43.55),
      },
    );

    this.box = this.add(
      "movable-box",
      2.7,
      FLOOR + 0.45,
      44,
      0.9,
      0.9,
      0.9,
      "box",
      { dynamic: true },
    );
    this.target(
      "box",
      "Movable box contact",
      "box",
      v(2.7, FLOOR + 0.65, 43.55),
      v(2.7, FLOOR, 42.9),
      0,
    );
    this.add("puddle", 0, FLOOR + 0.006, 36, 2.4, 0.012, 1.8, "water", {
      sensor: true,
    });
    r.player.teleport(this.stations[0].spawn);
    if (r.input) r.input.yaw = 0;
  }

  add(id, x, y, z, width, height, depth, surface = "obstacle", options = {}) {
    const mesh = new T.Mesh(this.geometry, this.materials[surface]);
    mesh.name = id;
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = !options.sensor;
    mesh.receiveShadow = true;
    if (options.rotation) mesh.quaternion.copy(options.rotation);
    this.group.add(mesh);
    const descriptor = options.dynamic
      ? RAPIER.RigidBodyDesc.dynamic().setCcdEnabled(true)
      : RAPIER.RigidBodyDesc.fixed();
    descriptor.setTranslation(x, y, z).setRotation(mesh.quaternion);
    const body = this.runtime.world.createRigidBody(descriptor);
    const collider = this.runtime.world.createCollider(
      RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
        .setFriction(0.8)
        .setDensity(options.dynamic ? 8 : 1)
        .setRestitution(0)
        .setSensor(!!options.sensor),
      body,
    );
    const fixture = {
      id,
      mesh,
      body,
      collider,
      dynamic: !!options.dynamic,
      sensor: !!options.sensor,
    };
    this.fixtures.push(fixture);
    return fixture;
  }

  seat(id, x, z, height, width, depth) {
    this.add(
      `${id}-seat`,
      x,
      FLOOR + height - 0.06,
      z,
      width,
      0.12,
      depth,
      "metal",
    );
    this.add(
      `${id}-support`,
      x,
      FLOOR + (height - 0.12) / 2,
      z,
      0.2,
      height - 0.12,
      0.2,
      "metal",
    );
  }

  target(id, label, kind, position, stand, yaw, extra = {}) {
    this.targets.push({ id, label, kind, position, stand, yaw, ...extra });
  }

  update() {
    if (!this.active) return;
    for (const fixture of this.fixtures) {
      if (!fixture.dynamic) continue;
      fixture.mesh.position.copy(fixture.body.translation());
      fixture.mesh.quaternion.copy(fixture.body.rotation());
    }
    const box = this.targets.find((target) => target.id === "box");
    if (box) {
      const p = this.box.mesh.position;
      box.position.copy(p).add(v(0, 0.2, -0.45));
      box.stand.set(p.x, FLOOR, p.z - 1.1);
    }
  }

  /** Only lab terrain participates; nearby citizens and sensors cannot become ground. */
  sampleSurface(x, z, ceiling = 12) {
    if (!this.active || ![x, z, ceiling].every(Number.isFinite)) return null;
    const ray = new RAPIER.Ray({ x, y: ceiling, z }, { x: 0, y: -1, z: 0 });
    let closest = null;
    for (const fixture of this.fixtures) {
      if (fixture.sensor) continue;
      const hit = fixture.collider.castRayAndGetNormal(ray, 30, false);
      if (!hit || (closest && hit.timeOfImpact >= closest.distance)) continue;
      closest = {
        height: ceiling - hit.timeOfImpact,
        normal: { ...hit.normal },
        fixtureId: fixture.id,
        distance: hit.timeOfImpact,
      };
    }
    return closest;
  }

  stats() {
    return {
      active: this.active,
      fixtures: this.fixtures.length,
      bodies: this.fixtures.length,
      colliders: this.fixtures.length,
      dynamicBodies: this.active ? 1 : 0,
      targets: this.targets.length,
      geometries: this.active ? 1 : 0,
      materials: this.active ? Object.keys(this.materials).length : 0,
      bounds: { minX: -10, maxX: 10, minZ: 23, maxZ: 47, floor: FLOOR },
    };
  }

  exit() {
    if (!this.active) return;
    this.release();
    this.runtime.player.teleport(this.outside);
    if (this.runtime.input) this.runtime.input.yaw = this.outsideYaw;
  }

  release() {
    this.runtime.scene.remove(this.group);
    for (const fixture of this.fixtures)
      this.runtime.world.removeRigidBody(fixture.body);
    this.fixtures.length = 0;
    this.targets.length = 0;
    this.group.clear();
    this.geometry?.dispose();
    Object.values(this.materials ?? {}).forEach((material) =>
      material.dispose(),
    );
    this.geometry = null;
    this.materials = null;
    this.box = null;
    this.active = false;
  }

  dispose() {
    if (this.active) this.release();
  }
}
