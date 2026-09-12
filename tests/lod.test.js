import test from "node:test";
import assert from "node:assert/strict";
import {
  GEOMETRY_POLICIES,
  projectedRadiusPixels,
  projectedGeometricErrorPixels,
  selectLOD,
} from "../src/rendering/lod.js";

const policy = {
  maxErrorPixels: 2,
  tiers: [100, 40, 10, 0].map((minRadiusPixels, i) => ({
    minRadiusPixels,
    maxTriangles: [1000, 400, 100, 20][i],
    geometricErrorRatio: [0, 0.005, 0.02, 0.08][i],
  })),
};
const view = {
  worldRadius: 1,
  distance: 20,
  viewportHeight: 1000,
  fovDegrees: 90,
};
const atPixels = (pixels, options = {}) => ({
  policy,
  ...view,
  distance: 1000 / (2 * Math.tan(Math.PI / 4) * pixels),
  ...options,
});

test("Projected radius responds to distance, resolution, radius and field of view", () => {
  const p = projectedRadiusPixels(view);
  assert.ok(Math.abs(p - 25) < 1e-12);
  assert.equal(projectedRadiusPixels({ ...view, distance: 40 }), p / 2);
  assert.equal(projectedRadiusPixels({ ...view, viewportHeight: 2000 }), p * 2);
  assert.equal(projectedRadiusPixels({ ...view, worldRadius: 2 }), p * 2);
  assert.ok(projectedRadiusPixels({ ...view, fovDegrees: 45 }) > p);
  assert.equal(projectedRadiusPixels({ ...view, distance: 0 }), Infinity);
  assert.equal(projectedRadiusPixels({ ...view, distance: 0.5 }), Infinity);
  assert.equal(
    projectedRadiusPixels({ ...view, worldRadius: 0, distance: 0 }),
    0,
  );
  assert.equal(projectedRadiusPixels({ ...view, viewportHeight: 0 }), 0);
});

test("LOD adapts to screen size with four levels and correct threshold equality", () => {
  for (const [pixels, expected] of [
    [200, 0],
    [100, 0],
    [99, 1],
    [50, 1],
    [39, 2],
    [11, 2],
    [9, 3],
  ])
    assert.equal(selectLOD(atPixels(pixels)), expected, `${pixels}px`);
  const lowResolution = atPixels(60);
  assert.equal(selectLOD(lowResolution), 1);
  assert.equal(selectLOD({ ...lowResolution, viewportHeight: 2000 }), 0);
  assert.equal(
    selectLOD({ ...lowResolution, distance: lowResolution.distance * 10 }),
    3,
  );
  assert.equal(selectLOD({ ...view, policy, distance: 0 }), 0);
  assert.equal(selectLOD({ ...view, policy, viewportHeight: 0 }), 3);
});

test("LOD hysteresis holds near a boundary and crosses outside its dead band", () => {
  assert.equal(
    selectLOD(atPixels(95, { previousLevel: 0, hysteresis: 0.1 })),
    0,
  );
  assert.equal(
    selectLOD(atPixels(89, { previousLevel: 0, hysteresis: 0.1 })),
    1,
  );
  assert.equal(
    selectLOD(atPixels(105, { previousLevel: 1, hysteresis: 0.1 })),
    1,
  );
  assert.equal(
    selectLOD(atPixels(111, { previousLevel: 1, hysteresis: 0.1 })),
    0,
  );
  assert.equal(selectLOD(atPixels(95, { previousLevel: 0, hysteresis: 0 })), 1);
  assert.equal(selectLOD(atPixels(200, { previousLevel: 3 })), 0);
  assert.equal(selectLOD(atPixels(5, { previousLevel: 0 })), 3);
});

test("Projected simplification error is a hard ceiling even inside hysteresis", () => {
  const strict = { ...policy, maxErrorPixels: 0.3 };
  assert.equal(selectLOD(atPixels(80, { policy: strict })), 0);
  assert.equal(
    selectLOD(
      atPixels(61, { policy: strict, previousLevel: 1, hysteresis: 0.25 }),
    ),
    0,
  );
  assert.equal(
    selectLOD(
      atPixels(59, { policy: strict, previousLevel: 1, hysteresis: 0.25 }),
    ),
    1,
  );
  assert.equal(projectedGeometricErrorPixels(80, 0.005), 0.4);
  assert.equal(projectedGeometricErrorPixels(Infinity, 0), 0);
  assert.equal(projectedGeometricErrorPixels(Infinity, 0.01), Infinity);
});

test("All fifteen immutable category policies remain ordered and select valid tiers", () => {
  assert.equal(Object.keys(GEOMETRY_POLICIES).length, 15);
  for (const [key, value] of Object.entries(GEOMETRY_POLICIES)) {
    assert.ok(Object.isFrozen(value));
    assert.ok(Object.isFrozen(value.tiers));
    let previous = 0;
    for (const distance of [0, 2, 4, 8, 16, 32, 64, 128, 256, 1024]) {
      const level = selectLOD({ ...view, distance, policy: key });
      assert.ok(level >= previous && level <= 3, key);
      previous = level;
      const error = projectedGeometricErrorPixels(
        projectedRadiusPixels({ ...view, distance }),
        value.tiers[level].geometricErrorRatio,
      );
      assert.ok(error <= value.maxErrorPixels, key);
    }
    assert.equal(previous, 3);
  }
});

test("LOD rejects invalid camera, history, hysteresis, and policy inputs", () => {
  for (const override of [
    { worldRadius: -1 },
    { distance: -1 },
    { distance: Infinity },
    { viewportHeight: NaN },
    { viewportHeight: -1 },
    { fovDegrees: 0 },
    { fovDegrees: 180 },
    { fovDegrees: Infinity },
    { worldRadius: undefined },
  ])
    assert.throws(() => projectedRadiusPixels({ ...view, ...override }));
  for (const override of [
    { previousLevel: 4 },
    { previousLevel: -1 },
    { previousLevel: 0.5 },
    { hysteresis: 1 },
    { hysteresis: -0.1 },
    { hysteresis: NaN },
    { policy: "missing" },
    { policy: {} },
    { policy: { ...policy, maxErrorPixels: 0 } },
    { policy: { ...policy, tiers: policy.tiers.slice().reverse() } },
  ])
    assert.throws(() => selectLOD({ ...view, ...override }));
  assert.throws(() => projectedGeometricErrorPixels(NaN, 0.01));
  assert.throws(() => projectedGeometricErrorPixels(100, -0.01));
});
