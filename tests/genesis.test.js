import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { generateCell, desiredCells } from "../src/world/generate.js";
import { FixedClock } from "../src/core/clock.js";
import { validateSave, SaveStore } from "../src/save/store.js";
import { createPhysics, fixedBox, dynamicBox } from "../src/physics/world.js";
import { Player } from "../src/player/player.js";
import { Assets } from "../src/rendering/scene.js";
import { Cell } from "../src/world/cell.js";
import { Depot } from "../src/world/depot.js";
test("Generation is deterministic, bounded and prioritizes the current cell", () => {
  assert.deepEqual(generateCell(-3, 7), generateCell(-3, 7));
  assert.notDeepEqual(generateCell(-3, 7), generateCell(7, -3));
  for (const p of [-500, -32.1, -32, 0, 31.9, 32, 500]) {
    const cells = desiredCells(p, p);
    assert.equal(cells.length, 25);
    assert.equal(new Set(cells.map((c) => c.key)).size, 25);
    assert.equal(cells[0].priority, 0);
    assert.equal(cells[0].x, Math.floor((p + 32) / 64));
  }
});
test("Fixed clock bounds stalls and produces frame-rate independent steps", () => {
  const a = new FixedClock(),
    b = new FixedClock();
  let na = 0,
    nb = 0;
  for (let i = 0; i < 60; i++) a.advance(1 / 60, () => na++);
  for (let i = 0; i < 120; i++) b.advance(1 / 120, () => nb++);
  assert.equal(na, nb);
  assert.ok(Math.abs(a.elapsed - na / 60) < 1e-9);
  assert.ok(Math.abs(a.elapsed - b.elapsed) < 1e-9);
  assert.equal(
    a.advance(5, () => {}),
    5,
  );
  assert.ok(a.dropped > 0);
});
test("Save rejects malformed and incompatible input", () => {
  for (const value of [
    null,
    {},
    { version: 2, position: [0, 0, 0] },
    { version: 1, position: [0, NaN, 0] },
    { version: 1, position: [99999, 0, 0] },
    { version: 1, position: [0, 1, 0], props: { x: { p: [1], q: [] } } },
  ])
    assert.throws(() => validateSave(value));
  assert.equal(validateSave({ version: 1, position: [0, 1, 0] }).version, 1);
});
test("Rapier player grounds, walks, jumps, collides and pushes dynamic bodies", async () => {
  const w = await createPhysics(),
    s = new T.Scene();
  fixedBox(w, 0, -0.5, 0, 100, 1, 100);
  fixedBox(w, 4, 2, 0, 1, 4, 10);
  const player = new Player(w, s);
  const input = { x: 0, z: 0, jump: false, sprint: false };
  const step = (n, v = input) => {
    for (let i = 0; i < n; i++) {
      player.step(1 / 60, v);
      w.step();
      player.sync();
    }
  };
  w.step();
  step(180);
  assert.ok(player.grounded);
  assert.ok(Math.abs(player.body.translation().y - 0.885) < 0.06);
  const groundedY = player.body.translation().y;
  step(1, { ...input, jump: true });
  step(15);
  assert.ok(player.body.translation().y > groundedY + 0.5);
  step(150);
  player.teleport({ x: 0, y: 1, z: 0 });
  w.step();
  step(180, { ...input, x: 1 });
  assert.ok(player.body.translation().x < 3.2);
  assert.ok(player.body.translation().x > 2);
  player.teleport({ x: -5, y: 1, z: 0 });
  const crate = dynamicBox(w, -3, 0.6, 0);
  w.step();
  step(60, { ...input, x: 1 });
  assert.ok(crate.translation().x > -2.8, `crate at ${crate.translation().x}`);
  player.dispose(s);
  w.free();
});
test("Repeated cell lifetimes release rigid bodies and reuse pooled meshes", async () => {
  const w = await createPhysics(),
    s = new T.Scene(),
    assets = new Assets(),
    store = new SaveStore(),
    pool = [];
  for (let i = 0; i < 80; i++) {
    const cell = new Cell(generateCell(i, 0), s, w, assets, store, pool);
    assert.equal(w.bodies.len(), 9);
    w.step();
    cell.update(i, 100);
    cell.dispose(s);
    assert.equal(w.bodies.len(), 0);
    assert.equal(s.children.length, 0);
    assert.equal(pool.length, 4);
  }
  assert.ok(Object.keys(store.props).length <= 2048);
  assets.dispose();
  w.free();
});
test("Depot transition restores position and releases all room colliders", async () => {
  const w = await createPhysics(),
    s = new T.Scene(),
    a = new Assets(),
    p = new Player(w, s),
    depot = new Depot(s, w, a);
  const start = { ...p.body.translation() };
  depot.enter(p);
  assert.equal(w.bodies.len(), 6);
  depot.exit(p);
  assert.equal(w.bodies.len(), 1);
  assert.deepEqual({ ...p.body.translation() }, start);
  depot.dispose();
  p.dispose(s);
  a.dispose();
  w.free();
});
