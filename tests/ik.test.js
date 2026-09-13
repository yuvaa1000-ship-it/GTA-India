import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { solveTwoBone } from "../src/animation/ik.js";
import {
  createRetargeter,
  solveRetargetContacts,
} from "../src/animation/retarget.js";
import { createRig } from "../src/characters/rig.js";

const position = (bone) => bone.getWorldPosition(new T.Vector3());
const close = (actual, expected, tolerance = 1e-6) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`,
  );
function chain(first = 0.6, second = 0.5) {
  const parent = new T.Group(),
    root = new T.Bone(),
    mid = new T.Bone(),
    end = new T.Bone();
  parent.add(root);
  root.add(mid);
  mid.add(end);
  mid.position.y = -first;
  end.position.y = -second;
  parent.updateMatrixWorld(true);
  return { parent, root, mid, end };
}
function assertLengths(c, before) {
  close(position(c.root).distanceTo(position(c.mid)), before[0]);
  close(position(c.mid).distanceTo(position(c.end)), before[1]);
}

test("Analytic IK reaches a world target through a rotated, uniformly scaled parent without stretching", () => {
  const c = chain();
  c.parent.position.set(3, 2, -4);
  c.parent.rotation.set(0.2, 0.8, -0.15);
  c.parent.scale.setScalar(1.3);
  c.root.rotation.z = 0.3;
  c.mid.rotation.x = -0.4;
  c.parent.updateMatrixWorld(true);
  const lengths = [
    position(c.root).distanceTo(position(c.mid)),
    position(c.mid).distanceTo(position(c.end)),
  ];
  const translations = [c.root, c.mid, c.end].map((b) => b.position.clone());
  const target = new T.Vector3(3.5, 1.4, -3.5),
    pole = new T.Vector3(4, 2, -3);
  const result = solveTwoBone(c.root, c.mid, c.end, target, pole);
  assert.equal(result.solved, true);
  assert.equal(result.reachable, true);
  assert.equal(result.clamped, false);
  close(position(c.end).distanceTo(target), 0);
  close(result.error, position(c.end).distanceTo(target));
  assertLengths(c, lengths);
  [c.root, c.mid, c.end].forEach((b, i) =>
    assert.ok(b.position.equals(translations[i])),
  );
});

test("Unreachable IK targets clamp to actual minimum/maximum reach and report residual error", () => {
  const c = chain(0.7, 0.3);
  for (const [target, expected] of [
    [new T.Vector3(0, -3, 0), 2],
    [new T.Vector3(0, -0.1, 0), 0.3],
  ]) {
    const result = solveTwoBone(
      c.root,
      c.mid,
      c.end,
      target,
      new T.Vector3(0, 0, 1),
    );
    assert.equal(result.solved, true);
    assert.equal(result.reachable, false);
    assert.equal(result.clamped, true);
    close(position(c.end).distanceTo(target), expected);
    close(result.error, expected);
    assertLengths(c, [0.7, 0.3]);
  }
});

test("Pole selection controls the measured bend and collinear/zero targets stay finite", () => {
  const c = chain(0.5, 0.5),
    target = new T.Vector3(0, -0.8, 0);
  solveTwoBone(c.root, c.mid, c.end, target, new T.Vector3(0, 0, 1));
  assert.ok(position(c.mid).z > 0.25);
  solveTwoBone(c.root, c.mid, c.end, target, new T.Vector3(0, 0, -1));
  assert.ok(position(c.mid).z < -0.25);
  const straight = solveTwoBone(
    c.root,
    c.mid,
    c.end,
    new T.Vector3(0, -1, 0),
    new T.Vector3(0, -2, 0),
  );
  assert.equal(straight.degeneratePole, true);
  close(straight.error, 0);
  const folded = solveTwoBone(
    c.root,
    c.mid,
    c.end,
    new T.Vector3(),
    new T.Vector3(),
  );
  assert.equal(folded.solved, true);
  assert.ok(folded.error < 1e-6);
  assert.ok(
    [c.root, c.mid, c.end].every((b) =>
      b.quaternion.toArray().every(Number.isFinite),
    ),
  );
  assertLengths(c, [0.5, 0.5]);
});

test("Malformed chains, zero segments, nonuniform scale and invalid targets leave the pose untouched", () => {
  const c = chain(),
    before = c.root.quaternion.clone();
  assert.equal(
    solveTwoBone(c.mid, c.root, c.end, new T.Vector3(), new T.Vector3()).solved,
    false,
  );
  assert.equal(
    solveTwoBone(
      c.root,
      c.mid,
      c.end,
      new T.Vector3(NaN, 0, 0),
      new T.Vector3(),
    ).solved,
    false,
  );
  c.parent.scale.set(2, 1, 1);
  assert.equal(
    solveTwoBone(c.root, c.mid, c.end, new T.Vector3(), new T.Vector3()).solved,
    false,
  );
  c.parent.scale.setScalar(1);
  c.mid.position.set(0, 0, 0);
  assert.equal(
    solveTwoBone(c.root, c.mid, c.end, new T.Vector3(), new T.Vector3()).solved,
    false,
  );
  assert.ok(c.root.quaternion.equals(before));
});

test("Repeated moving-target solves maintain real segment lengths and contact precision", () => {
  const c = chain();
  for (let i = 0; i < 240; i++) {
    const phase = i / 30;
    const target = new T.Vector3(
      Math.sin(phase) * 0.3,
      -0.65 + Math.cos(phase) * 0.1,
      0.2,
    );
    const result = solveTwoBone(
      c.root,
      c.mid,
      c.end,
      target,
      new T.Vector3(0, 0, 2),
    );
    assert.ok(result.error < 1e-6, JSON.stringify(result));
    assertLengths(c, [0.6, 0.5]);
  }
});

function humanoid(height) {
  return createRig({ height, shoulders: 0.21, hips: 0.16 });
}

test("Short and tall bodies reach the same object in world space with different actual joint poses", () => {
  const short = humanoid(1.55),
    tall = humanoid(1.95);
  const shortParent = new T.Group(),
    tallParent = new T.Group();
  for (const [rig, group] of [
    [short, shortParent],
    [tall, tallParent],
  ]) {
    group.add(rig.named.root);
    group.position.set(5, 0, -2);
    group.rotation.y = 0.4;
    group.updateMatrixWorld(true);
  }
  const retarget = createRetargeter(short, tall);
  short.named.spine.rotation.y = 0.12;
  short.named.upperArmR.rotation.x = -0.4;
  short.named.forearmR.rotation.x = -0.5;
  const target = new T.Vector3(5.16, 1.15, -1.72),
    pole = new T.Vector3(6, 1.1, -1.7);
  const contact = { armR: { target, pole } };
  const shortResult = solveRetargetContacts(short, contact).armR;
  const tallResult = retarget.apply({ contacts: contact }).contacts.armR;
  assert.ok(shortResult.reachable && tallResult.reachable);
  close(position(short.named.handR).distanceTo(target), 0);
  close(position(tall.named.handR).distanceTo(target), 0);
  assert.ok(
    short.named.upperArmR.quaternion.angleTo(tall.named.upperArmR.quaternion) >
      0.1,
  );
  close(
    tallResult.segmentLengths[0] / shortResult.segmentLengths[0],
    Math.hypot(1.95 * 0.18, 0.025) / Math.hypot(1.55 * 0.18, 0.025),
  );
  short.skeleton.dispose();
  tall.skeleton.dispose();
});

test("Retargeting scales root translation by measured height, retaining target bone lengths", () => {
  const short = humanoid(1.6),
    tall = humanoid(2);
  const retarget = createRetargeter(short, tall);
  const thighTranslation = tall.named.shinL.position.clone();
  short.named.root.position.set(0.4, 0.08, -0.6);
  short.named.thighL.rotation.x = 0.6;
  const result = retarget.apply();
  close(result.rootScale, 1.25);
  close(tall.named.root.position.distanceTo(new T.Vector3(0.5, 0.1, -0.75)), 0);
  close(tall.named.thighL.quaternion.angleTo(short.named.thighL.quaternion), 0);
  assert.ok(tall.named.shinL.position.equals(thighTranslation));
  short.skeleton.dispose();
  tall.skeleton.dispose();
});

test("Rest-axis correction retargets a differently oriented joint to the same measured motion", () => {
  const a = chain(),
    b = chain();
  const adapt = (c) => {
    c.root.name = "root";
    c.mid.name = "mid";
    c.end.name = "end";
    return { named: { root: c.root, mid: c.mid, end: c.end } };
  };
  b.root.rotation.z = Math.PI / 2;
  b.mid.position.set(-0.6, 0, 0);
  b.mid.rotation.z = -Math.PI / 2;
  const source = adapt(a),
    target = adapt(b);
  const retarget = createRetargeter(source, target, {
    sourceHeight: 1,
    targetHeight: 1,
  });
  a.root.rotation.x = 0.45;
  a.mid.rotation.x = -0.65;
  a.parent.updateMatrixWorld(true);
  retarget.apply();
  close(position(b.mid).distanceTo(position(a.mid)), 0);
  close(position(b.end).distanceTo(position(a.end)), 0);
});

test("Invalid retarget maps, heights and contact-chain names fail explicitly", () => {
  const source = humanoid(1.7),
    target = humanoid(1.8);
  assert.throws(
    () => createRetargeter(source, target, { sourceHeight: 0 }),
    /positive measured/,
  );
  assert.throws(
    () =>
      createRetargeter(source, target, {
        map: { root: "root", pelvis: "root" },
      }),
    /one-to-one/,
  );
  assert.throws(
    () => createRetargeter(source, target, { map: { absent: "root" } }),
    /Missing mapped/,
  );
  assert.throws(
    () =>
      createRetargeter(source, target, {
        map: { root: "root", pelvis: "head" },
      }),
    /hierarchy/,
  );
  assert.throws(
    () => solveRetargetContacts(target, { unknown: {} }),
    /Unknown retarget/,
  );
  const retarget = createRetargeter(source, target);
  const initial = target.named.thighL.quaternion.clone();
  source.named.thighL.rotation.x = 0.5;
  assert.throws(
    () => retarget.apply({ rootMotion: new T.Vector3(NaN, 0, 0) }),
    /finite/,
  );
  assert.ok(target.named.thighL.quaternion.equals(initial));
  source.named.handR.quaternion.x = NaN;
  assert.throws(() => retarget.apply(), /Invalid source quaternion/);
  assert.ok(target.named.thighL.quaternion.equals(initial));
  source.skeleton.dispose();
  target.skeleton.dispose();
});

test("Explicit skeleton aliases also remap end-effector contact chains", () => {
  const source = humanoid(1.7),
    target = humanoid(1.9);
  const map = {};
  for (const name of Object.keys(target.named)) {
    const alias = name === "root" ? "root" : `destination_${name}`;
    map[name] = alias;
    const bone = target.named[name];
    bone.name = alias;
    if (alias !== name) delete target.named[name];
    target.named[alias] = bone;
  }
  const retarget = createRetargeter(source, target, { map });
  const point = new T.Vector3(0.2, 1.15, 0.3);
  const report = retarget.apply({
    contacts: { armR: { target: point, pole: new T.Vector3(1, 1, 0) } },
  });
  assert.equal(report.contacts.armR.solved, true);
  close(position(target.named.destination_handR).distanceTo(point), 0);
  source.skeleton.dispose();
  target.skeleton.dispose();
});
