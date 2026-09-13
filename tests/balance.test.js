import test from "node:test";
import assert from "node:assert/strict";
import {
  BalanceController,
  supportHull,
  supportDistance,
} from "../src/physical-animation/balance.js";

const support = [
  { x: -0.18, y: 0, z: -0.16 },
  { x: 0.18, y: 0, z: -0.16 },
  { x: 0.18, y: 0, z: 0.16 },
  { x: -0.18, y: 0, z: 0.16 },
];
const standing = {
  com: { x: 0, y: 0.94, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  supportPoints: support,
  grounded: true,
};
const impact = (j, extra = {}) => ({
  impulse: { x: j, y: 0, z: 0 },
  point: { x: 0, y: 1.45, z: 0 },
  ...extra,
});
function finiteReport(value) {
  if (typeof value === "number") assert.ok(Number.isFinite(value));
  else if (value && typeof value === "object")
    Object.values(value).forEach(finiteReport);
}

test("Support hull and signed distance handle interior, exterior, duplicates and degenerate contacts", () => {
  const hull = supportHull([
    ...support,
    support[0],
    { x: 0, y: 0, z: 0 },
    { x: NaN, y: 0, z: 0 },
  ]);
  assert.equal(hull.length, 4);
  assert.ok(
    Math.abs(supportDistance({ x: 0, z: 0 }, hull).signed + 0.16) < 1e-9,
  );
  assert.ok(
    Math.abs(supportDistance({ x: 0.3, z: 0 }, hull).distance - 0.12) < 1e-9,
  );
  assert.equal(supportDistance({ x: 0, z: 0 }, []).distance, null);
  assert.equal(
    supportHull([
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
    ]).length,
    2,
  );
  assert.equal(
    supportDistance({ x: 0, z: 1 }, [{ x: 0, y: 0, z: 0 }]).distance,
    1,
  );
});

test("Capture point obeys constant-height pendulum equation and is translation invariant", () => {
  const c = new BalanceController({ gravity: 18 }),
    velocity = { x: 1.2, y: 0, z: -0.6 };
  const a = c.update(1 / 60, { ...standing, velocity });
  const omega = Math.sqrt(18 / 0.94);
  assert.ok(Math.abs(a.capturePoint.x - 1.2 / omega) < 1e-12);
  assert.ok(Math.abs(a.capturePoint.z + 0.6 / omega) < 1e-12);
  const b = c.update(1 / 60, {
    ...standing,
    com: { x: 100, y: 6.94, z: -50 },
    velocity,
    supportPoints: support.map((p) => ({ x: p.x + 100, y: 6, z: p.z - 50 })),
  });
  assert.ok(Math.abs(b.supportDistance - a.supportDistance) < 1e-12);
});

test("Identical impulse yields inverse-mass velocity change and real offset angular impulse", () => {
  const light = new BalanceController({ mass: 50 }),
    heavy = new BalanceController({ mass: 100 });
  const a = light.impact(impact(80)),
    b = heavy.impact(impact(80));
  assert.equal(a.deltaVelocity.x, 1.6);
  assert.equal(b.deltaVelocity.x, 0.8);
  assert.equal(a.momentum.x, b.momentum.x);
  assert.ok(a.severity > b.severity);
  assert.ok(a.angularImpulse.z < 0);
  assert.ok(
    Math.abs(a.deltaAngularVelocity.z / b.deltaAngularVelocity.z - 2) < 1e-12,
  );
  const center = new BalanceController();
  center.update(1 / 60, standing);
  assert.equal(
    center.impact(impact(80, { point: standing.com })).angularImpulse.z,
    0,
  );
});

test("Shoulder bump, hard push and severe impact receive distinct bounded responses", () => {
  const small = new BalanceController(),
    medium = new BalanceController(),
    large = new BalanceController();
  assert.equal(small.impact(impact(20)).response, "correcting");
  assert.equal(medium.impact(impact(100)).response, "stepping");
  assert.equal(large.impact(impact(350)).response, "falling");
  const report = large.update(1 / 60, {
    ...standing,
    velocity: { x: 350 / 75, y: 0, z: 0 },
  });
  assert.equal(report.state, "falling");
  assert.ok(report.driveStrength > 0 && report.driveStrength < 0.3);
  assert.ok(report.stepDistance <= large.height * 0.45);
  finiteReport(report);
});

test("Running momentum, stance and friction affect response without source-name heuristics", () => {
  const stationary = new BalanceController(),
    running = new BalanceController();
  assert.ok(
    running.impact(impact(80, { velocity: { x: 5, y: 0, z: 0 } })).severity >
      stationary.impact(impact(80)).severity,
  );
  const dry = new BalanceController({ friction: 0.9 }),
    slippery = new BalanceController({ friction: 0.08 });
  const a = dry.update(1 / 60, {
      ...standing,
      velocity: { x: 2, y: 0, z: 0 },
    }),
    b = slippery.update(1 / 60, {
      ...standing,
      velocity: { x: 2, y: 0, z: 0 },
    });
  assert.ok(b.stoppingDistance > a.stoppingDistance * 5);
  assert.notEqual(a.state, b.state);
  const narrow = new BalanceController(),
    wide = new BalanceController();
  assert.notEqual(
    narrow.impact(impact(50, { stance: "narrow" })).response,
    wide.impact(impact(50, { stance: "wide" })).response,
  );
  const car = new BalanceController(),
    bike = new BalanceController();
  assert.equal(
    car.impact(impact(100, { source: "car" })).severity,
    bike.impact(impact(100, { source: "motorcycle" })).severity,
  );
});

test("Measured post-impact velocity is not double counted and recovery settles without endless falling", () => {
  const c = new BalanceController();
  c.impact(impact(350));
  const r = c.update(1 / 60, { ...standing, velocity: { x: 2, y: 0, z: 0 } });
  assert.equal(r.velocity.x, 2);
  const states = new Set();
  for (let i = 0; i < 360; i++) states.add(c.update(1 / 60, standing).state);
  assert.ok(
    states.has("falling") && states.has("recovering") && states.has("balanced"),
  );
  assert.equal(c.state, "balanced");
  const before = c.transitions;
  for (let i = 0; i < 120; i++) c.update(1 / 60, standing);
  assert.equal(c.transitions, before);
});

test("Unsupported state cannot recover in midair and reacquires stability only after real support", () => {
  const c = new BalanceController();
  for (let i = 0; i < 60; i++)
    c.update(1 / 60, { ...standing, grounded: false, supportPoints: [] });
  assert.equal(c.state, "falling");
  assert.equal(c.lastReport.supportDistance, null);
  finiteReport(c.lastReport);
  for (let i = 0; i < 240; i++) c.update(1 / 60, standing);
  assert.equal(c.state, "balanced");
});

test("Zero and invalid inputs remain finite, mirrored impulses mirror recovery steps, small bump decays", () => {
  const a = new BalanceController(),
    b = new BalanceController();
  a.impact(impact(100));
  b.impact(impact(-100));
  const left = a.update(1 / 60, {
      ...standing,
      velocity: { x: 1.3, y: 0, z: 0 },
    }),
    right = b.update(1 / 60, {
      ...standing,
      velocity: { x: -1.3, y: 0, z: 0 },
    });
  assert.ok(Math.abs(left.stepDirection.x + right.stepDirection.x) < 1e-12);
  const c = new BalanceController({
    mass: NaN,
    height: Infinity,
    gravity: NaN,
    friction: NaN,
  });
  finiteReport(
    c.update(NaN, {
      com: { x: Infinity, y: NaN, z: 0 },
      velocity: { x: NaN, y: 0, z: 0 },
      supportPoints: [],
      grounded: false,
    }),
  );
  c.reset();
  c.impact(impact(20));
  for (let i = 0; i < 240; i++)
    c.update(1 / 60, { ...standing, velocity: undefined });
  assert.equal(c.state, "balanced");
  assert.ok(c.lastReport.brace < 0.01);
});
