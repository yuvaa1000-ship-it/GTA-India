import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  citizenIdentity,
  citizenAt,
  crowdTier,
} from "../src/characters/identity.js";
import { HumanCharacter } from "../src/characters/character.js";
import { HumanSurfaces } from "../src/characters/surface.js";
import { validateHuman } from "../src/characters/validate.js";
test("Citizen identity reconstructs independently of streaming order and varies physical structure", () => {
  const a = citizenIdentity("citizen:2,3:1");
  for (let i = 0; i < 100; i++) citizenIdentity("other" + i);
  assert.deepEqual(citizenIdentity(a.id), a);
  const all = Array.from({ length: 100 }, (_, i) =>
    citizenIdentity("resident" + i),
  );
  assert.equal(new Set(all.map((a) => a.height)).size, 100);
  assert.ok(new Set(all.map((a) => a.garment)).size === 3);
  assert.ok(new Set(all.map((a) => a.hair)).size === 5);
  assert.ok(all.every((a) => a.age >= 20 && a.age <= 74));
});
test("Citizen paths are continuous at their turnaround and preserve seed", () => {
  const a = citizenAt(0, 0, 0, 64.999),
    b = citizenAt(0, 0, 0, 65.001);
  assert.ok(Math.abs(a.z - b.z) < 0.01);
  assert.equal(a.identity.seed, b.identity.seed);
  assert.equal(crowdTier(34, true, 1), 1);
  assert.equal(crowdTier(37, true, 1), 2);
  assert.equal(crowdTier(40, false, 1), 4);
});
test("Human assets have valid weights, source scale, topology and decreasing LOD geometry", () => {
  const surfaces = new HumanSurfaces(),
    d = citizenIdentity("asset-check");
  let prior = Infinity;
  for (const tier of [0, 1, 2]) {
    const c = new HumanCharacter(d, surfaces, tier);
    const report = validateHuman(c);
    assert.ok(report.passed, JSON.stringify(report));
    assert.equal(report.bones, 51);
    assert.ok(report.triangles < prior);
    prior = report.triangles;
    assert.equal(report.morphs.length, 8);
    c.dispose();
  }
  surfaces.dispose();
});
test("Skeleton actually deforms vertices and facial/corrective weights advance", () => {
  const s = new HumanSurfaces(),
    c = new HumanCharacter(citizenIdentity("deform"), s);
  let index = 0;
  const a = c.geometry.attributes;
  for (let i = 0; i < a.position.count; i++)
    if (a.skinIndex.getX(i) === c.rig.index.shinL) {
      index = i;
      break;
    }
  const rest = new T.Vector3().fromBufferAttribute(a.position, index);
  const before = c.mesh.applyBoneTransform(index, rest.clone());
  c.phase = 0.8;
  c.pose(1, 0.1, 4, true);
  const after = c.mesh.applyBoneTransform(index, rest.clone());
  assert.ok(before.distanceTo(after) > 0.005);
  assert.ok(c.mesh.morphTargetInfluences[2] > 0);
  c.expression = 0.8;
  c.pose(2, 0.1, 0, true, 0.4);
  assert.equal(c.mesh.morphTargetInfluences[1], 0.8);
  assert.ok(c.rig.named.head.rotation.y > 0.3);
  c.dispose();
  s.dispose();
});
test("Character disposal releases geometry, materials and skeleton exactly once", () => {
  const s = new HumanSurfaces(),
    c = new HumanCharacter(citizenIdentity("lifetime"), s);
  let geometries = 0,
    materials = 0,
    skeletons = 0;
  c.geometry.addEventListener("dispose", () => geometries++);
  c.materials.forEach((m) => m.addEventListener("dispose", () => materials++));
  const dispose = c.rig.skeleton.dispose.bind(c.rig.skeleton);
  c.rig.skeleton.dispose = () => {
    skeletons++;
    dispose();
  };
  c.dispose();
  c.dispose();
  assert.deepEqual([geometries, materials, skeletons], [1, 6, 1]);
  s.dispose();
});

test("Surface states are bounded and change real material response", () => {
  const s = new HumanSurfaces(),
    c = new HumanCharacter(citizenIdentity("surface"), s);
  const before = c.materials[0].color.clone();
  c.setSurfaceState({ wet: 4, dirt: 0.6, dust: 0.2, bruise: 0.3 });
  assert.equal(c.surfaceState.wet, 1);
  assert.ok(!c.materials[0].color.equals(before));
  assert.ok(c.materials[0].roughness < 0.58);
  c.setSurfaceState({ wet: NaN });
  assert.equal(c.surfaceState.wet, 1);
  c.dispose();
  s.dispose();
});

test("Nearby citizen contact blocks a capsule and releases its collider", async () => {
  const { createPhysics } = await import("../src/physics/world.js");
  const { HumanContact } = await import("../src/characters/contact.js");
  const { Player } = await import("../src/player/player.js");
  const { fixedBox } = await import("../src/physics/world.js");
  const w = await createPhysics(),
    scene = new T.Scene();
  fixedBox(w, 0, -0.25, 0, 20, 0.5, 20);
  const p = new Player(w, scene);
  p.teleport({ x: 0, y: 0.9, z: 3 });
  const before = w.colliders.len(),
    c = new HumanContact(w, 1.8);
  c.move({ x: 0, y: 0, z: 0 });
  let closest = Infinity;
  for (let i = 0; i < 180; i++) {
    p.step(1 / 60, { x: 0, z: -1, sprint: false, jump: false });
    w.step();
    const pos = p.body.translation();
    closest = Math.min(closest, Math.hypot(pos.x, pos.z));
  }
  assert.ok(closest >= 0.5, `Capsules overlapped: ${closest}`);
  assert.ok(
    Math.abs(p.body.translation().x) > 0.45 || p.body.translation().z > 0.5,
  );
  c.dispose();
  assert.equal(w.colliders.len(), before);
  p.dispose(scene);
  w.free();
});
