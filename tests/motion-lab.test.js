import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPhysics } from "../src/physics/world.js";
import { Player } from "../src/player/player.js";
import { MotionLab } from "../src/animation/lab.js";

async function setup() {
  const world = await createPhysics();
  const scene = new T.Scene();
  const player = new Player(world, scene);
  const runtime = { world, scene, player, input: { yaw: 0.7 } };
  return { ...runtime, lab: new MotionLab(runtime) };
}

function cleanup(r) {
  r.lab.dispose();
  r.player.dispose(r.scene);
  r.world.free();
}

test("Motion lab terrain has real risers, slope normals, passage and supported route starts", async () => {
  const r = await setup();
  try {
    r.lab.enter();
    r.world.step();
    const ground = r.lab.sampleSurface(0, 44);
    assert.ok(Math.abs(ground.height - 6) < 0.001);
    for (let i = 0; i < 8; i++) {
      const hit = r.lab.sampleSurface(-6, 31.8 - i * 0.4);
      assert.equal(hit.fixtureId, `stair-${i}`);
      assert.ok(Math.abs(hit.height - (6 + 0.18 * (i + 1))) < 0.001);
    }
    const lower = r.lab.sampleSurface(-2, 31.5);
    const upper = r.lab.sampleSurface(-2, 28.5);
    assert.equal(lower.fixtureId, "slope");
    assert.ok(Math.abs((upper.height - lower.height) / 3 - 0.25) < 0.001);
    assert.ok(Math.abs(lower.normal.y - Math.cos(Math.atan(0.25))) < 0.001);
    assert.ok(lower.normal.z > 0.2);
    assert.equal(r.lab.sampleSurface(6, 31, 7.8).fixtureId, "platform");
    assert.equal(r.lab.sampleSurface(5.25, 31).fixtureId, "door-lintel");
    for (const station of r.lab.stations) {
      const hit = r.lab.sampleSurface(station.spawn.x, station.spawn.z);
      assert.ok(hit, station.id);
      assert.ok(
        Math.abs(hit.height - 6) < 0.01,
        `${station.id}: ${hit.height}`,
      );
      assert.ok(station.spawn.y - hit.height >= 0.87);
    }
    assert.equal(r.lab.sampleSurface(100, 100), null);
    assert.equal(r.lab.sampleSurface(NaN, 0), null);
  } finally {
    cleanup(r);
  }
});

test("Motion lab dynamic fixture falls, rests, and updates its contact target", async () => {
  const r = await setup();
  try {
    r.lab.enter();
    r.lab.box.body.setTranslation({ x: 3.2, y: 8, z: 44 }, true);
    for (let i = 0; i < 150; i++) r.world.step();
    r.lab.update();
    const p = r.lab.box.body.translation();
    assert.ok(Math.abs(p.y - 6.45) < 0.03, `${p.y}`);
    assert.ok(
      r.lab.box.mesh.position.distanceTo(new T.Vector3(p.x, p.y, p.z)) < 0.0001,
    );
    const target = r.lab.targets.find((entry) => entry.id === "box");
    assert.ok(Math.abs(target.position.x - p.x) < 0.001);
    assert.ok(Math.abs(target.position.z - (p.z - 0.45)) < 0.001);
    assert.equal(
      r.lab.fixtures.find((entry) => entry.id === "puddle").collider.isSensor(),
      true,
    );
    assert.equal(r.lab.sampleSurface(0, 36).fixtureId, "platform");
  } finally {
    cleanup(r);
  }
});

test("Motion lab repeated entry releases exactly its resources and restores the player", async () => {
  const r = await setup();
  try {
    const baseline = [
      r.world.bodies.len(),
      r.world.colliders.len(),
      r.scene.children.length,
    ];
    const outside = { ...r.player.body.translation() };
    for (let repeat = 0; repeat < 3; repeat++) {
      r.lab.enter();
      const fixtureCount = r.lab.fixtures.length;
      assert.ok(fixtureCount > 30 && fixtureCount < 45);
      assert.equal(r.world.bodies.len(), baseline[0] + fixtureCount);
      assert.equal(r.world.colliders.len(), baseline[1] + fixtureCount);
      assert.equal(r.lab.stats().geometries, 1);
      assert.equal(r.lab.targets.length, 7);
      let geometries = 0;
      let materials = 0;
      r.lab.geometry.addEventListener("dispose", () => geometries++);
      Object.values(r.lab.materials).forEach((material) =>
        material.addEventListener("dispose", () => materials++),
      );
      r.lab.enter();
      assert.equal(r.lab.fixtures.length, fixtureCount);
      r.lab.exit();
      r.lab.exit();
      r.lab.dispose();
      assert.deepEqual([geometries, materials], [1, 5]);
      assert.deepEqual(
        [
          r.world.bodies.len(),
          r.world.colliders.len(),
          r.scene.children.length,
        ],
        baseline,
      );
      assert.deepEqual({ ...r.player.body.translation() }, outside);
      assert.equal(r.input.yaw, 0.7);
      assert.equal(r.lab.targets.length, 0);
      assert.equal(r.lab.sampleSurface(0, 35), null);
    }
  } finally {
    cleanup(r);
  }
});

test("Player traverses lab terrain at 60 Hz and remains blocked by its wall", async () => {
  const r = await setup();
  try {
    r.lab.enter();
    const travel = (id, frames) => {
      const station = r.lab.stations.find((entry) => entry.id === id);
      r.player.teleport(station.spawn);
      r.world.step();
      let peak = -Infinity;
      for (let frame = 0; frame < frames; frame++) {
        r.player.step(1 / 60, {
          ...station.direction,
          jump: false,
          sprint: false,
        });
        r.world.step();
        peak = Math.max(peak, r.player.body.translation().y);
      }
      return { peak, position: { ...r.player.body.translation() } };
    };
    const stairs = travel("stairs", 90);
    assert.ok(stairs.position.z < 29.25, JSON.stringify(stairs));
    assert.ok(stairs.position.y > 8.25, JSON.stringify(stairs));
    const curb = travel("curb", 60);
    assert.ok(curb.peak > 7.03 && curb.peak < 7.13, JSON.stringify(curb));
    assert.ok(curb.position.z < 37, JSON.stringify(curb));
    const slope = travel("slope", 90);
    assert.ok(slope.position.z < 28.65, JSON.stringify(slope));
    assert.ok(slope.position.y > 8.05, JSON.stringify(slope));
    const uneven = travel("uneven", 60);
    assert.ok(uneven.position.z < 37, JSON.stringify(uneven));
    assert.ok(uneven.peak > 7.05, JSON.stringify(uneven));
    const doorway = travel("doorway", 60);
    assert.ok(doorway.position.z < 30, JSON.stringify(doorway));
    assert.ok(Math.abs(doorway.position.y - 6.885) < 0.02);
    const wall = travel("wall", 120);
    assert.ok(
      wall.position.z > 25.32 && wall.position.z < 25.38,
      JSON.stringify(wall),
    );
    assert.ok(Math.abs(wall.position.y - 6.885) < 0.02);
  } finally {
    cleanup(r);
  }
});
