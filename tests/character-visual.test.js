import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { profileGeometry } from "../src/characters/profile.js";
import { HumanCharacter } from "../src/characters/character.js";
import { HumanSurfaces } from "../src/characters/surface.js";
import { citizenIdentity } from "../src/characters/identity.js";
import { validateHuman } from "../src/characters/validate.js";

const positionKey = (p) =>
  [p.x, p.y, p.z].map((n) => Math.round(n * 1e6)).join(",");

test("Tapered profile has a closed mantle/caps with finite outward normals", () => {
  const geometry = profileGeometry([
    { y: 0, rx: 0.035, rz: 0.04 },
    { y: 0.3, rx: 0.065, rz: 0.07 },
    { y: 0.6, rx: 0.05, rz: 0.055 },
  ]);
  const p = geometry.attributes.position,
    n = geometry.attributes.normal;
  const names = Array.from({ length: p.count }, (_, i) =>
    positionKey(new T.Vector3().fromBufferAttribute(p, i)),
  );
  const edges = new Map();
  for (let i = 0; i < geometry.index.count; i += 3) {
    const tri = [0, 1, 2].map((j) => geometry.index.getX(i + j));
    for (let j = 0; j < 3; j++) {
      const key = [names[tri[j]], names[tri[(j + 1) % 3]]].sort().join("|");
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  assert.ok(
    [...edges.values()].every((count) => count === 2),
    "Welded loft has an open or nonmanifold edge",
  );
  for (let i = 0; i < p.count; i++) {
    const normal = new T.Vector3().fromBufferAttribute(n, i);
    assert.ok(Number.isFinite(normal.lengthSq()));
    assert.ok(Math.abs(normal.length() - 1) < 1e-5);
    if (p.getY(i) > 0.001 && p.getY(i) < 0.599)
      assert.ok(
        normal.x * p.getX(i) + normal.z * p.getZ(i) > 0,
        "Mantle normal points inward",
      );
  }
  geometry.dispose();
  assert.throws(() =>
    profileGeometry([
      { y: 0, rx: 0.1, rz: 0.1 },
      { y: 0, rx: 0.1, rz: 0.1 },
    ]),
  );
});

test("Garment revisions retain valid weighted characters across body sizes and lower LODs", () => {
  const surfaces = new HumanSurfaces();
  for (const [garment, height, build] of [
    ["shirt", 1.54, 0.8],
    ["kurta", 1.74, 1],
    ["jacket", 1.92, 1.28],
  ]) {
    let lastTriangles = Infinity;
    for (const tier of [0, 1, 2]) {
      const c = new HumanCharacter(
        { ...citizenIdentity(garment), garment, height, build },
        surfaces,
        tier,
      );
      const report = validateHuman(c);
      assert.ok(report.passed, JSON.stringify(report));
      assert.ok(report.triangles < lastTriangles);
      lastTriangles = report.triangles;
      assert.equal(c.rig.bones.length, 51);
      assert.equal(c.geometry.morphAttributes.position.length, 3);
      assert.equal(c.materials.length, 6);
      assert.ok(
        c.geometry.groups.every(
          (group) =>
            group.materialIndex >= 0 &&
            group.materialIndex < c.materials.length,
        ),
      );
      assert.ok([...c.geometry.attributes.normal.array].every(Number.isFinite));
      c.dispose();
    }
  }
  surfaces.dispose();
});

test("Duplicated surface seams remain coincident after elbow and knee deformation", () => {
  const surfaces = new HumanSurfaces();
  const c = new HumanCharacter(citizenIdentity("visual-seams"), surfaces);
  c.rig.named.forearmL.rotation.x = -1.1;
  c.rig.named.shinR.rotation.x = -0.9;
  c.group.updateMatrixWorld(true);
  c.rig.skeleton.update();
  const a = c.geometry.attributes,
    seams = new Map();
  let checked = 0;
  for (let i = 0; i < a.position.count; i++) {
    const p = new T.Vector3().fromBufferAttribute(a.position, i);
    const key =
      positionKey(p) +
      ":" +
      [0, 1, 2, 3]
        .map(
          (slot) =>
            `${a.skinIndex.array[i * 4 + slot]},${a.skinWeight.array[i * 4 + slot].toFixed(6)}`,
        )
        .join(";");
    const deformed = c.mesh.applyBoneTransform(i, p);
    if (seams.has(key)) {
      assert.ok(seams.get(key).distanceTo(deformed) < 2e-6);
      checked++;
    } else seams.set(key, deformed);
  }
  assert.ok(checked > 100);
  c.dispose();
  surfaces.dispose();
});

test("Woven PBR textures are original, shared and disposed once by their owner", () => {
  const surfaces = new HumanSurfaces();
  const a = new HumanCharacter(citizenIdentity("cloth-a"), surfaces);
  const b = new HumanCharacter(citizenIdentity("cloth-b"), surfaces);
  assert.equal(a.materials[1].normalMap, b.materials[1].normalMap);
  assert.equal(a.materials[1].roughnessMap, a.materials[2].roughnessMap);
  assert.notEqual(a.materials[0].normalMap, a.materials[1].normalMap);
  const data = surfaces.weaveRoughness.image.data;
  assert.ok(new Set(data.filter((_, i) => i % 4 === 1)).size > 1);
  let disposed = 0;
  for (const map of [
    surfaces.normal,
    surfaces.weaveNormal,
    surfaces.weaveRoughness,
  ])
    map.addEventListener("dispose", () => disposed++);
  a.dispose();
  b.dispose();
  assert.equal(disposed, 0);
  surfaces.dispose();
  surfaces.dispose();
  assert.equal(disposed, 3);
});
