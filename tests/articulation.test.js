import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPhysics, fixedBox, RAPIER } from "../src/physics/world.js";
import { createRig } from "../src/characters/rig.js";
import { Articulation } from "../src/physical-animation/articulation.js";

async function setup({
  height = 1.74,
  floor = false,
  anchored = false,
  gravity = -18,
  position = { x: 0, y: 0, z: 0 },
} = {}) {
  const world = await createPhysics();
  world.gravity = { x: 0, y: gravity, z: 0 };
  if (floor) fixedBox(world, 0, -0.25, 0, 30, 0.5, 30);
  const rig = createRig({ height, shoulders: 0.21, hips: 0.16 }),
    group = new T.Group();
  group.add(rig.named.root);
  group.position.copy(position);
  const character = { rig, group, identity: { height } };
  const articulation = new Articulation(world, character, { anchored });
  return {
    world,
    character,
    articulation,
    dispose() {
      articulation.dispose();
      rig.skeleton.dispose();
      world.free();
    },
  };
}
const q = (body) => new T.Quaternion().copy(body.rotation());
const v = (value) => new T.Vector3().copy(value);
const near = (a, b, tolerance = 1e-5) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);

test("Articulation has 13 dynamic mass-bearing links, 12 constraints and finite shape-derived inertia", async () => {
  const f = await setup();
  try {
    const a = f.articulation,
      s = a.stats();
    assert.equal(s.bodies, 13);
    assert.equal(s.joints, 12);
    near(s.mass, 75);
    assert.equal(s.finite, true);
    assert.ok(s.maxJointError < 1e-6);
    let hingeCount = 0;
    for (const link of a.links.values()) {
      assert.ok(link.body.isDynamic());
      near(link.body.mass(), 75 * link.fraction);
      const inertia = link.body.principalInertia();
      assert.ok(
        [inertia.x, inertia.y, inertia.z].every(
          (n) => Number.isFinite(n) && n > 0,
        ),
      );
      assert.ok(
        link.body.angularDamping() > 0 && link.body.linearDamping() > 0,
      );
      assert.ok(link.body.isCcdEnabled());
      assert.equal(link.collider.collisionGroups(), (2 << 16) | 1);
    }
    for (const j of a.joints) {
      assert.equal(j.joint.contactsEnabled(), false);
      if (j.limits) {
        hingeCount++;
        assert.ok(j.joint.limitsEnabled());
        near(j.joint.limitsMin(), j.limits[0]);
        near(j.joint.limitsMax(), j.limits[1]);
      }
    }
    assert.equal(hingeCount, 4);
  } finally {
    f.dispose();
  }
});

test("Chest impulse creates measured momentum and equal/opposite muscle impulses preserve total angular momentum", async () => {
  const f = await setup({ gravity: 0 });
  try {
    const a = f.articulation;
    assert.equal(a.impulse({ x: 25, y: 3, z: -2 }), true);
    const before = a.stats();
    near(before.momentum.x, 25);
    near(before.momentum.y, 3);
    near(before.momentum.z, -2);
    assert.ok(before.kineticEnergy > 0);
    f.character.rig.named.forearmR.rotation.x = -0.75;
    a.captureTargets();
    const positions = [...a.links.values()].map((l) => v(l.body.translation()));
    a.drive(1 / 60, 1);
    const after = a.stats();
    assert.ok(a.links.get("forearmR").body.angvel().x < -0.1);
    near(v(after.momentum).distanceTo(v(before.momentum)), 0);
    near(
      v(after.angularMomentum).distanceTo(v(before.angularMomentum)),
      0,
      1e-4,
    );
    [...a.links.values()].forEach((l, i) =>
      assert.ok(
        v(l.body.translation()).equals(positions[i]),
        "A drive must not teleport a dynamic link",
      ),
    );
    assert.ok(after.maximumTorque > 0 && after.maximumTorque < 75 * 0.32 * 7);
  } finally {
    f.dispose();
  }
});

test("Anchored partial animation tracks a limb with damped torques and releasing the pelvis enables real falling", async () => {
  const f = await setup({ gravity: 0, anchored: true });
  try {
    const a = f.articulation,
      limb = a.links.get("forearmR");
    assert.ok(a.pelvis.isKinematic());
    assert.ok(
      [...a.links.values()].filter((l) => l.body.isDynamic()).length === 12,
    );
    f.character.rig.named.forearmR.rotation.x = -0.75;
    a.captureTargets();
    const initial = q(limb.body).angleTo(limb.targetRotation);
    for (let i = 0; i < 360; i++) {
      a.drive(1 / 60, 1);
      f.world.step();
    }
    assert.ok(q(limb.body).angleTo(limb.targetRotation) < initial * 0.15);
    assert.ok(a.stats().maxJointError < 0.005);
    f.character.group.position.x = 0.1;
    a.captureTargets();
    a.drive(1 / 60, 1);
    f.world.step();
    near(a.pelvis.translation().x, 0.1, 0.0001);
    a.setAnchored(false);
    assert.ok(a.pelvis.isDynamic());
    f.world.gravity = { x: 0, y: -18, z: 0 };
    const y = a.pelvis.translation().y;
    for (let i = 0; i < 30; i++) {
      a.drive(1 / 60, 0);
      f.world.step();
    }
    assert.ok(a.pelvis.translation().y < y - 1);
    assert.ok(a.stats().finite);
  } finally {
    f.dispose();
  }
});

test("Falls and stair impacts keep joints bounded, create actual contacts and preserve skinned-rig segment lengths", async () => {
  for (const height of [1.54, 1.92]) {
    const f = await setup({ height, floor: true });
    try {
      const stairs = new Set();
      for (let i = 0; i < 4; i++)
        stairs.add(
          fixedBox(
            f.world,
            0,
            0.1 * (i + 1),
            -1 - i * 0.45,
            3,
            0.2 * (i + 1),
            0.45,
          ).collider(0).handle,
        );
      const a = f.articulation;
      const lengths = Object.fromEntries(
        f.character.rig.bones.map((b) => [b.name, b.position.length()]),
      );
      a.impulse({ x: 4, y: 12, z: -45 });
      let maximumError = 0,
        sawContact = false,
        sawStairContact = false;
      for (let i = 0; i < 360; i++) {
        a.drive(1 / 60, 0.15);
        f.world.step();
        const s = a.stats();
        assert.ok(s.finite);
        assert.ok(s.kineticEnergy >= 0 && s.kineticEnergy < 10000);
        maximumError = Math.max(maximumError, s.maxJointError);
        sawContact ||= s.contacts > 0;
        sawStairContact ||= s.contactPoints.some((c) => stairs.has(c.collider));
        assert.ok(
          s.contactPoints.every(
            (c) =>
              ![...a.links.values()].some(
                (l) => l.collider.handle === c.collider,
              ),
          ),
          "Self-collision must remain filtered",
        );
        for (const j of s.jointErrors)
          if (j.limits)
            assert.ok(
              j.angle >= j.limits[0] - 0.12 && j.angle <= j.limits[1] + 0.12,
              JSON.stringify(j),
            );
      }
      assert.ok(sawContact);
      assert.ok(
        sawStairContact,
        "The fall must actually contact a stair collider",
      );
      assert.ok(
        maximumError < 0.04,
        `${height} m maximum separation ${maximumError}`,
      );
      a.sync();
      for (const bone of f.character.rig.bones) {
        if (bone.name !== "pelvis")
          near(bone.position.length(), lengths[bone.name]);
        assert.ok(bone.matrixWorld.elements.every(Number.isFinite));
      }
      for (const l of a.links.values()) {
        const actual = l.bone.getWorldPosition(new T.Vector3());
        const simulated = v(l.body.translation()).add(
          l.boneFromCenter.clone().applyQuaternion(q(l.body)),
        );
        assert.ok(
          actual.distanceTo(simulated) < 0.015,
          `${l.name} render/physics discrepancy ${actual.distanceTo(simulated)}`,
        );
      }
      assert.ok(a.stats().contactPoints.some((c) => c.normal.y > 0.5));
    } finally {
      f.dispose();
    }
  }
});

test("Disposal exactly restores world resources and the optional player filter across repeated activation", async () => {
  const f = await setup();
  f.articulation.dispose();
  const player = f.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const collider = f.world.createCollider(
    RAPIER.ColliderDesc.capsule(0.55, 0.32),
    player,
  );
  const groups = collider.collisionGroups();
  const baseline = [
    f.world.bodies.len(),
    f.world.colliders.len(),
    f.world.impulseJoints.len(),
  ];
  try {
    for (let repeat = 0; repeat < 3; repeat++) {
      const a = new Articulation(f.world, f.character, {
        excludeCollider: collider,
        anchored: true,
      });
      assert.equal(collider.collisionGroups() & 2, 0);
      assert.equal(f.world.bodies.len(), baseline[0] + 13);
      for (let i = 0; i < 5; i++) {
        a.drive(1 / 60, 0.4);
        f.world.step();
      }
      a.dispose();
      a.dispose();
      assert.deepEqual(
        [
          f.world.bodies.len(),
          f.world.colliders.len(),
          f.world.impulseJoints.len(),
        ],
        baseline,
      );
      assert.equal(collider.collisionGroups(), groups);
      assert.equal(a.stats().bodies, 0);
    }
    assert.throws(
      () => new Articulation(f.world, f.character, { mass: NaN }),
      /finite/,
    );
    f.character.group.scale.y = 2;
    assert.throws(() => new Articulation(f.world, f.character), /unit-scale/);
    assert.deepEqual(
      [
        f.world.bodies.len(),
        f.world.colliders.len(),
        f.world.impulseJoints.len(),
      ],
      baseline,
    );
  } finally {
    f.dispose();
  }
});

test("A physical tumble down eight risers contacts multiple stair colliders and releases exactly its own resources", async () => {
  const f = await setup({ floor: true, position: { x: 0, y: 1.5, z: -3.15 } });
  try {
    const a = f.articulation,
      stairs = new Set();
    for (let i = 0; i < 8; i++)
      stairs.add(
        fixedBox(
          f.world,
          0,
          0.09 * (i + 1),
          -0.45 * i,
          3,
          0.18 * (i + 1),
          0.45,
        ).collider(0).handle,
      );
    const before = [
      f.world.bodies.len() - 13,
      f.world.colliders.len() - 13,
      f.world.impulseJoints.len() - 12,
    ];
    a.impulse({ x: 7, y: 5, z: 85 });
    const contacted = new Set();
    let maximumError = 0;
    for (let i = 0; i < 420; i++) {
      a.drive(1 / 60, 0.05);
      f.world.step();
      const s = a.stats();
      assert.ok(s.finite);
      maximumError = Math.max(maximumError, s.maxJointError);
      for (const p of s.contactPoints)
        if (stairs.has(p.collider)) contacted.add(p.collider);
    }
    assert.ok(
      contacted.size >= 3,
      `Only ${contacted.size} stair colliders contacted`,
    );
    assert.ok(maximumError < 0.06, `Joint anchors separated ${maximumError} m`);
    a.sync();
    assert.ok(
      f.character.rig.bones.every((b) =>
        b.matrixWorld.elements.every(Number.isFinite),
      ),
    );
    a.dispose();
    assert.deepEqual(
      [
        f.world.bodies.len(),
        f.world.colliders.len(),
        f.world.impulseJoints.len(),
      ],
      before,
    );
  } finally {
    f.dispose();
  }
});

test("Activation from a turned and bent pose retains physical-to-render joint placement without rest-pose popping", async () => {
  const f = await setup({ floor: true });
  f.articulation.dispose();
  try {
    const c = f.character,
      n = c.rig.named;
    c.group.rotation.y = 0.7;
    n.spine.rotation.set(0.12, 0, 0.04);
    n.chest.rotation.y = 0.15;
    n.head.rotation.y = -0.2;
    n.upperArmL.rotation.set(-0.45, 0, -0.12);
    n.forearmL.rotation.x = -0.7;
    n.thighR.rotation.x = 0.25;
    n.shinR.rotation.x = -0.5;
    c.group.updateMatrixWorld(true);
    const a = new Articulation(f.world, c);
    f.articulation = a;
    const before = new Map(
      [...a.links.values()].map((l) => [
        l.name,
        l.bone.getWorldPosition(new T.Vector3()),
      ]),
    );
    a.sync();
    for (const l of a.links.values())
      assert.ok(
        l.bone
          .getWorldPosition(new T.Vector3())
          .distanceTo(before.get(l.name)) < 1e-5,
        `${l.name} popped at activation`,
      );
    a.impulse({ x: 20, y: 4, z: 12 });
    for (let i = 0; i < 240; i++) {
      a.drive(1 / 60, 0.1);
      f.world.step();
    }
    n.chest.quaternion.identity();
    n.head.quaternion.identity();
    a.sync();
    for (const l of a.links.values()) {
      const simulated = v(l.body.translation()).add(
        l.boneFromCenter.clone().applyQuaternion(q(l.body)),
      );
      assert.ok(
        l.bone.getWorldPosition(new T.Vector3()).distanceTo(simulated) < 0.02,
        `${l.name} detached after posed activation`,
      );
    }
    a.dispose();
  } finally {
    f.dispose();
  }
});
