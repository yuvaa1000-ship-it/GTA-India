import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { HumanCharacter } from "../src/characters/character.js";
import { HumanSurfaces } from "../src/characters/surface.js";
import { citizenIdentity } from "../src/characters/identity.js";
import { MotionController } from "../src/animation/controller.js";
import { MotionState, motionStyle, damp } from "../src/animation/grammar.js";

const flat = () => ({ y: 0, normal: new T.Vector3(0, 1, 0) });
function fixture(height = 1.74) {
  const surfaces = new HumanSurfaces();
  const character = new HumanCharacter(
    { ...citizenIdentity("motion-regression"), height },
    surfaces,
    2,
  );
  const motion = new MotionController(character);
  let time = 0;
  return {
    character,
    motion,
    tick(input = {}, dt = 1 / 60) {
      time += dt;
      return motion.update(time, dt, {
        grounded: true,
        speed: 0,
        sampleGround: flat,
        ...input,
      });
    },
    dispose() {
      character.dispose();
      surfaces.dispose();
    },
  };
}
const worldPoint = (bone) => bone.getWorldPosition(new T.Vector3());
function finitePose(character) {
  character.group.updateMatrixWorld(true);
  assert.ok(
    character.rig.bones.every((b) =>
      b.matrixWorld.elements.every(Number.isFinite),
    ),
  );
}

test("Actual idle ankle positions remain at supported world anchors across body heights", () => {
  for (const height of [1.54, 1.74, 1.92]) {
    const f = fixture(height);
    try {
      f.character.group.position.set(3, 0, -2);
      f.character.group.rotation.y = 0.7;
      for (let i = 0; i < 120; i++) {
        const stats = f.tick();
        assert.equal(stats.contacts, 2);
        for (const foot of f.motion.feet) {
          const actual = worldPoint(f.character.rig.named["ankle" + foot.side]);
          const target = foot.point
            .clone()
            .addScaledVector(foot.normal, height * 0.06);
          assert.ok(
            actual.distanceTo(target) < 0.02,
            `Idle ${height} m: ${actual.distanceTo(target)} m`,
          );
        }
        finitePose(f.character);
      }
    } finally {
      f.dispose();
    }
  }
});

test("Slow translation preserves actual planted ankles, not just stationary target values", () => {
  for (const height of [1.54, 1.74, 1.92]) {
    const f = fixture(height),
      anchors = new Map();
    try {
      for (let i = 0; i < 120; i++) f.tick();
      for (let i = 0; i < 360; i++) {
        f.character.group.position.z += 0.8 / 60;
        f.tick({ speed: 0.8 });
        for (const foot of f.motion.feet) {
          if (!foot.locked) {
            anchors.delete(foot.side);
            continue;
          }
          const actual = worldPoint(f.character.rig.named["ankle" + foot.side]);
          const target = foot.point
            .clone()
            .addScaledVector(foot.normal, height * 0.06);
          const error = actual.distanceTo(target);
          assert.ok(
            error < 0.02,
            `At ${i / 60}s, ${height} m ${foot.side} ankle misses its target by ${error} m`,
          );
          const previous = anchors.get(foot.side);
          if (previous) {
            const drift = Math.hypot(
              actual.x - previous.x,
              actual.z - previous.z,
            );
            assert.ok(
              drift < 0.02,
              `Planted ${height} m ${foot.side} ankle accumulated ${drift} m drift`,
            );
          } else anchors.set(foot.side, actual);
        }
      }
      assert.ok(f.motion.steps > 3);
    } finally {
      f.dispose();
    }
  }
});

test("Fast grounded travel preserves solved foot contacts at 60 Hz and coarse 10 Hz render cadence", () => {
  for (const height of [1.54, 1.92])
    for (const dt of [1 / 60, 0.1])
      for (const speed of [2.5, 5.5, 8]) {
        const f = fixture(height),
          lockedAnchors = new Map();
        let observedSteps = 0;
        // Observe every solver substep as well as rendered samples: a final-frame
        // metric must not hide contact errors earlier in a coarse render interval.
        const step = f.motion.step.bind(f.motion);
        f.motion.step = (...args) => {
          const stats = step(...args);
          observedSteps++;
          for (const foot of f.motion.feet) {
            if (!foot.locked) {
              lockedAnchors.delete(foot.side);
              continue;
            }
            const actual = worldPoint(
              f.character.rig.named["ankle" + foot.side],
            );
            const target = foot.point
              .clone()
              .addScaledVector(foot.normal, height * 0.06);
            const label = `${height} m, ${speed} m/s, render dt ${dt}`;
            assert.ok(
              actual.distanceTo(target) < 0.02,
              `${label}: actual ankle missed its retained target`,
            );
            const anchor = lockedAnchors.get(foot.side);
            if (anchor)
              assert.ok(
                Math.hypot(actual.x - anchor.x, actual.z - anchor.z) < 0.02,
                `${label}: planted ankle drifted`,
              );
            else lockedAnchors.set(foot.side, actual);
          }
          // Engineering envelope, not a biomechanically calibrated gait criterion.
          assert.ok(
            stats.pelvisOffset > -height * 0.2,
            "Contact solving required excessive pelvis depression",
          );
          finitePose(f.character);
          return stats;
        };
        try {
          for (let i = 0; i < 30; i++) f.tick();
          for (let i = 0; i < 4 / dt; i++) {
            f.character.group.position.z += speed * dt;
            f.tick({ speed }, dt);
          }
          assert.ok(f.motion.steps >= 5);
          assert.ok(
            observedSteps >= 240,
            "Coarse frame intervals must retain bounded simulation substeps",
          );
        } finally {
          f.dispose();
        }
      }
});

test("Jump releases foot contacts and supported landing reacquires them while stationary", () => {
  const f = fixture();
  try {
    for (let i = 0; i < 60; i++) f.tick();
    assert.equal(f.motion.metrics.contacts, 2);
    for (let i = 0; i < 30; i++) {
      f.character.group.position.y = Math.sin((i / 30) * Math.PI) * 0.5;
      const stats = f.tick({ grounded: false, vertical: i < 15 ? 2 : -2 });
      assert.equal(stats.contacts, 0);
      assert.ok(f.motion.feet.every((foot) => !foot.locked));
      finitePose(f.character);
    }
    f.character.group.position.y = 0;
    for (let i = 0; i < 60; i++) f.tick();
    assert.equal(
      f.motion.metrics.contacts,
      2,
      "Stationary supported landing must reacquire both contacts",
    );
    assert.equal(f.motion.metrics.state, "idle");
    assert.ok(f.motion.metrics.footError < 0.02);
  } finally {
    f.dispose();
  }
});

test("Teleport clears previous foot anchors and produces a finite supported pose", () => {
  const f = fixture();
  try {
    for (let i = 0; i < 60; i++) f.tick();
    const resets = f.motion.resetCount;
    f.character.group.position.set(20, 0, -30);
    f.character.group.rotation.y = Math.PI;
    const stats = f.tick();
    assert.ok(stats.resetCount > resets);
    assert.equal(stats.contacts, 2);
    assert.ok(
      f.motion.feet.every(
        (foot) => Math.hypot(foot.point.x - 20, foot.point.z + 30) < 0.2,
      ),
    );
    finitePose(f.character);
  } finally {
    f.dispose();
  }
});

test("Short and tall bodies reach the same physical handle and disclose unreachable targets without stretching", () => {
  const target = new T.Vector3(0.35, 1.2, 0.3),
    elbows = [];
  for (const height of [1.54, 1.92]) {
    const f = fixture(height);
    try {
      const n = f.character.rig.named;
      f.motion.interaction = { kind: "reach", position: target };
      for (let i = 0; i < 120; i++) f.tick();
      const actual = worldPoint(n.handR);
      assert.ok(actual.distanceTo(target) < 0.03);
      assert.ok(
        Math.abs(f.motion.metrics.reachError - actual.distanceTo(target)) <
          1e-7,
      );
      assert.equal(f.motion.metrics.reachable, true);
      elbows.push(worldPoint(n.forearmR));
      const lengths = [
        worldPoint(n.upperArmR).distanceTo(worldPoint(n.forearmR)),
        worldPoint(n.forearmR).distanceTo(actual),
      ];
      const unreachable = new T.Vector3(3, 1.2, 3);
      f.motion.interaction = { kind: "reach", position: unreachable };
      for (let i = 0; i < 120; i++) f.tick();
      assert.equal(f.motion.metrics.reachable, false);
      assert.ok(f.motion.metrics.reachError > 2);
      assert.ok(
        Math.abs(
          worldPoint(n.upperArmR).distanceTo(worldPoint(n.forearmR)) -
            lengths[0],
        ) < 1e-6,
      );
      assert.ok(
        Math.abs(
          worldPoint(n.forearmR).distanceTo(worldPoint(n.handR)) - lengths[1],
        ) < 1e-6,
      );
      finitePose(f.character);
    } finally {
      f.dispose();
    }
  }
  assert.ok(
    elbows[0].distanceTo(elbows[1]) > 0.08,
    "Body-height adaptation must alter elbow placement",
  );
});

test("A stationary half-turn steps both feet while each supported ankle holds world position and orientation", () => {
  const f = fixture(),
    anchors = new Map(),
    swung = new Set();
  try {
    for (let i = 0; i < 120; i++) f.tick();
    const initialSteps = f.motion.steps;
    for (let i = 0; i < 240; i++) {
      f.character.group.rotation.y = Math.min(1, i / 180) * Math.PI;
      const stats = f.tick();
      assert.ok(stats.contacts >= 1, "A pivot must retain a supporting foot");
      for (const foot of f.motion.feet) {
        if (!foot.locked) {
          swung.add(foot.side);
          anchors.delete(foot.side);
          continue;
        }
        const ankle = f.character.rig.named["ankle" + foot.side];
        const point = worldPoint(ankle),
          rotation = ankle.getWorldQuaternion(new T.Quaternion());
        const previous = anchors.get(foot.side);
        if (previous) {
          assert.ok(
            point.distanceTo(previous.point) < 0.02,
            "Supported pivot ankle slid",
          );
          assert.ok(
            rotation.angleTo(previous.rotation) < 1e-5,
            "Supported pivot foot rotated against the ground",
          );
        } else anchors.set(foot.side, { point, rotation });
      }
      finitePose(f.character);
    }
    assert.ok(
      f.motion.steps - initialSteps >= 4,
      "A half-turn must contain actual stepping",
    );
    assert.deepEqual([...swung].sort(), ["L", "R"]);
    assert.equal(f.motion.metrics.state, "idle");
  } finally {
    f.dispose();
  }
});

test("Releasing a hand contact blends the actual hand back without a single-frame snap", () => {
  for (const height of [1.54, 1.92]) {
    const f = fixture(height);
    try {
      const target = new T.Vector3(0.35, 1.2, 0.3);
      f.motion.interaction = { kind: "reach", position: target };
      for (let i = 0; i < 120; i++) f.tick();
      const hand = f.character.rig.named.handR;
      let previous = worldPoint(hand),
        maximumFrameDisplacement = 0;
      assert.ok(previous.distanceTo(target) < 0.03);
      f.motion.interaction = null;
      for (let i = 0; i < 120; i++) {
        f.tick();
        const actual = worldPoint(hand);
        maximumFrameDisplacement = Math.max(
          maximumFrameDisplacement,
          previous.distanceTo(actual),
        );
        previous = actual;
        finitePose(f.character);
      }
      // Engineering continuity bound at 60 Hz, not a claim of authored motion quality.
      assert.ok(
        maximumFrameDisplacement < 0.15,
        `Hand release snapped ${maximumFrameDisplacement} m in one frame`,
      );
      assert.ok(
        previous.distanceTo(target) > 0.3,
        "Released hand remained attached to the handle",
      );
      assert.ok(f.motion.reachWeight < 0.001);
      assert.equal(f.motion.metrics.state, "idle");
    } finally {
      f.dispose();
    }
  }
});

test("Context controls and damping remain finite, and collision stops use achieved motion", async () => {
  const dirty = motionStyle({
    surface: "unknown",
    injury: Infinity,
    fatigue: NaN,
    urgency: -5,
  });
  assert.equal(dirty.surface, "road");
  assert.ok(
    [dirty.speedScale, dirty.traction, dirty.lift].every(Number.isFinite),
  );
  assert.ok(
    motionStyle({ surface: "mud" }).speedScale <
      motionStyle({ surface: "road" }).speedScale,
  );
  const once = damp(0, 1, 10, 1 / 30),
    twice = damp(damp(0, 1, 10, 1 / 60), 1, 10, 1 / 60);
  assert.ok(Math.abs(once - twice) < 1e-12);
  const machine = new MotionState();
  assert.equal(machine.update(1 / 60, 2, true, 0), "walk");
  assert.equal(machine.update(1 / 60, 0, true, 0), "idle");

  const { createPhysics, fixedBox } = await import("../src/physics/world.js");
  const { Player } = await import("../src/player/player.js");
  const world = await createPhysics(),
    scene = new T.Scene(),
    f = fixture();
  const player = new Player(world, scene);
  try {
    fixedBox(world, 0, -0.25, 0, 20, 0.5, 20);
    fixedBox(world, 0, 1.5, 0, 10, 3, 0.3);
    player.teleport({ x: 0, y: 0.9, z: 3 });
    let stats;
    for (let i = 0; i < 300; i++) {
      player.step(1 / 60, { x: 0, z: -1, sprint: false, jump: false });
      world.step();
      player.sync();
      f.character.group.position.copy(player.mesh.position).y -= 0.87;
      const speed = Math.hypot(
        player.achievedVelocity.x,
        player.achievedVelocity.z,
      );
      stats = f.tick({
        grounded: player.grounded,
        speed,
        velocity: player.achievedVelocity,
      });
    }
    assert.ok(player.body.translation().z > 0.45, "Player penetrated wall");
    assert.ok(
      Math.hypot(player.achievedVelocity.x, player.achievedVelocity.z) < 0.03,
    );
    assert.equal(stats.state, "idle");
    finitePose(f.character);
    player.motionContext = { surface: "mud", injury: 0.4, fatigue: 0.5 };
    for (let i = 0; i < 120; i++) {
      player.step(1 / 60, { x: 0, z: 0, sprint: false, jump: false });
      world.step();
    }
    assert.ok(player.velocity.length() < 1e-6);
  } finally {
    f.dispose();
    player.dispose(scene);
    world.free();
  }
});
