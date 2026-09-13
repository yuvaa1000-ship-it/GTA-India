import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { ParticleSurface } from "../src/secondary/solver.js";
import {
  clothPattern,
  hairPattern,
  FABRICS,
} from "../src/secondary/patterns.js";
import {
  FacialPerformance,
  sampleSpeech,
  DEMO_SPEECH,
} from "../src/facial/performance.js";
import {
  SecondaryMaterials,
  SecondaryVisual,
} from "../src/secondary/visual.js";
import { HumanCharacter } from "../src/characters/character.js";
import { HumanSurfaces } from "../src/characters/surface.js";
import { citizenIdentity } from "../src/characters/identity.js";
function make(pattern) {
  return new ParticleSurface(
    pattern.points,
    pattern.edges,
    pattern.pins,
    pattern.settings,
  );
}
test("Cloth pins follow moving anchors, wind moves free particles, and constraints remain finite", () => {
  const pattern = clothPattern("dupatta"),
    s = make(pattern),
    matrix = new T.Matrix4().makeTranslation(0, 2, 0);
  s.reset(matrix);
  const start = s.p.at(-1).clone();
  for (let i = 0; i < 240; i++)
    s.advance(1 / 120, matrix, { wind: new T.Vector3(7, 0, 0), floor: 0 });
  assert.ok(s.p.at(-1).distanceTo(start) > 0.04);
  assert.ok(s.stats().finite);
  assert.ok(s.stats().maxStretch < 0.15, JSON.stringify(s.stats()));
  matrix.makeTranslation(0.3, 2, 0);
  s.advance(0.1, matrix);
  for (const i of pattern.pins)
    assert.ok(
      s.p[i].distanceTo(pattern.points[i].clone().applyMatrix4(matrix)) < 1e-8,
    );
});
test("Mass, fabric and wet damping produce distinct physical trajectories", () => {
  const ends = [];
  for (const [kind, wet] of [
    ["shirt", 0],
    ["dupatta", 0],
    ["dupatta", 1],
  ]) {
    const s = make(clothPattern(kind)),
      m = new T.Matrix4().makeTranslation(0, 2, 0);
    for (let i = 0; i < 120; i++)
      s.advance(1 / 60, m, { wind: new T.Vector3(8, 0, 0), wet });
    ends.push(s.p.at(-1).x);
  }
  assert.ok(Math.abs(ends[0] - ends[1]) > 0.04, JSON.stringify(ends));
  assert.ok(Math.abs(ends[1] - ends[2]) > 0.01, JSON.stringify(ends));
  assert.equal(Object.keys(FABRICS).length, 10);
});
test("Capsule and floor contacts project free cloth outside obstacles", () => {
  const pattern = clothPattern("shawl"),
    s = make(pattern),
    m = new T.Matrix4().makeTranslation(0, 1, 0),
    c = {
      a: new T.Vector3(0, 0.5, -0.15),
      b: new T.Vector3(0, 0.8, -0.15),
      radius: 0.13,
    };
  for (let i = 0; i < 120; i++)
    s.advance(1 / 60, m, { capsules: [c], floor: 0.3 });
  assert.ok(s.collisions > 0);
  for (let i = 0; i < s.p.length; i++)
    if (!s.pins.has(i)) {
      const p = s.p[i],
        near = new T.Vector3(0, T.MathUtils.clamp(p.y, 0.5, 0.8), -0.15);
      assert.ok(p.distanceTo(near) >= 0.133);
      assert.ok(p.y >= 0.306 - 1e-7);
    }
});
test("Coarse cadence, long/short hair, wetness and teleports remain bounded", () => {
  for (const style of ["short", "long"])
    for (const dt of [1 / 60, 0.1]) {
      const s = make(hairPattern(style)),
        m = new T.Matrix4().makeTranslation(0, 2, 0);
      for (let i = 0; i < 120; i++)
        s.advance(dt, m, { wind: new T.Vector3(7, 0, 2), wet: 0.7 });
      assert.ok(s.stats().finite);
      assert.ok(s.stats().maxStretch < 0.25, JSON.stringify(s.stats()));
      const resets = s.resets;
      m.makeTranslation(40, 2, 0);
      s.advance(dt, m);
      assert.equal(s.resets, resets + 1);
      assert.ok(s.p.every((p) => p.x > 39));
    }
});
test("Speech coarticulation produces distinct continuous poses and returns to silence", () => {
  const a = sampleSpeech(DEMO_SPEECH, 0.28),
    o = sampleSpeech(DEMO_SPEECH, 0.86);
  assert.ok(a.wide > 0.5);
  assert.ok(o.round > 0.5);
  assert.ok(
    Math.abs(
      sampleSpeech(DEMO_SPEECH, 0.159).wide -
        sampleSpeech(DEMO_SPEECH, 0.161).wide,
    ) < 0.03,
  );
  assert.deepEqual(sampleSpeech(DEMO_SPEECH, 5), {
    jaw: 0,
    wide: 0,
    round: 0,
    label: "sil",
  });
});
test("Facial targets deform actual brows/lips and independent characters blink at different times", () => {
  const surfaces = new HumanSurfaces(),
    a = new HumanCharacter(citizenIdentity("face-a"), surfaces),
    b = new HumanCharacter(citizenIdentity("face-b"), surfaces),
    fa = new FacialPerformance(a),
    fb = new FacialPerformance(b);
  const eyelids = [];
  fa.speak();
  fa.attend(new T.Vector3(2, 1.7, 3), "person");
  for (let i = 0; i < 360; i++) {
    fa.restore();
    fb.restore();
    a.pose(i / 60, 1 / 60);
    b.pose(i / 60, 1 / 60);
    fa.update(1 / 60, { emotion: "surprised" });
    fb.update(1 / 60);
    eyelids.push(Math.abs(fa.value.blink - fb.value.blink));
  }
  assert.ok(eyelids.some((x) => x > 0.4));
  assert.ok(fa.blinks > 0 && fb.blinks > 0);
  assert.equal(
    a.mesh.morphTargetInfluences[a.mesh.morphTargetDictionary.browRaise],
    0.8,
  );
  for (const name of [
    "browRaise",
    "browFrown",
    "lipWide",
    "lipRound",
    "cheekRaise",
  ]) {
    const attr =
      a.geometry.morphAttributes.position[a.mesh.morphTargetDictionary[name]];
    assert.ok(
      [...attr.array].some((x) => Math.abs(x) > 0.001),
      name,
    );
  }
  a.dispose();
  b.dispose();
  surfaces.dispose();
});
test("Secondary render geometry follows motion and is disposed once with its owner", () => {
  const surfaces = new HumanSurfaces(),
    shared = new SecondaryMaterials(),
    c = new HumanCharacter(
      { ...citizenIdentity("secondary-hero"), hair: "waves" },
      surfaces,
    ),
    v = new SecondaryVisual(c, surfaces, shared, {
      fabric: "dupatta",
      hair: "long",
    });
  for (let i = 0; i < 80; i++) {
    c.pose(i / 60, 1 / 60, 2);
    c.group.position.x = i * 0.004;
    v.update(1 / 60, { wind: new T.Vector3(4, 0, 1), wet: 0.5, floor: 0 });
  }
  assert.ok(v.stats().cloth.finite && v.stats().hair.finite);
  assert.ok(
    [...v.clothGeometry.attributes.position.array].every(Number.isFinite),
  );
  assert.ok([...v.hairGeometry.attributes.normal.array].every(Number.isFinite));
  let disposals = 0;
  v.clothGeometry.addEventListener("dispose", () => disposals++);
  v.hairGeometry.addEventListener("dispose", () => disposals++);
  v.dispose();
  v.dispose();
  assert.equal(disposals, 2);
  assert.equal(c.group.children.length, 1);
  c.dispose();
  surfaces.dispose();
  shared.dispose();
});
