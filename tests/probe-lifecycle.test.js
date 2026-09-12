import test from "node:test";
import assert from "node:assert/strict";
import { Reflections } from "../src/rendering/reflections.js";

function captureFixture({
  autoUpdate = true,
  needsUpdate = false,
  fail = false,
} = {}) {
  const previousEnvironment = { name: "previous environment" };
  const previousMaterialEnvironment = { name: "previous material environment" };
  const material = { envMap: previousMaterialEnvironment };
  const target = { texture: { name: "filtered current environment" } };
  const shadowMap = { autoUpdate, needsUpdate };
  let matricesCurrent = false;
  let shadowRevision = "previous sun";
  let refreshes = 0;
  const observedFaces = [];
  const probe = Object.assign(Object.create(Reflections.prototype), {
    hdr: true,
    renderer: { shadowMap },
    scene: {
      environment: previousEnvironment,
      updateMatrixWorld(force) {
        assert.equal(force, true);
        matricesCurrent = true;
      },
    },
    lab: { reflectiveMaterials: [material] },
    plane: { visible: true },
    cubeTarget: { texture: { name: "cube image" } },
    cube: {
      update(renderer, scene) {
        assert.equal(matricesCurrent, true);
        assert.equal(scene.environment, null);
        assert.equal(material.envMap, null);
        assert.equal(probe.plane.visible, false);
        // Model Three's WebGLShadowMap one-shot needsUpdate contract while
        // CubeCamera renders its six faces. Stale maps must never be observed.
        for (let face = 0; face < 6; face++) {
          if (renderer.shadowMap.autoUpdate || renderer.shadowMap.needsUpdate) {
            refreshes++;
            shadowRevision = "current sun";
            renderer.shadowMap.needsUpdate = false;
          }
          observedFaces.push(shadowRevision);
          if (fail) throw new Error("cube capture failed");
        }
      },
    },
    pmrem: {
      fromCubemap(texture, existingTarget) {
        assert.equal(texture, probe.cubeTarget.texture);
        assert.equal(existingTarget, undefined);
        return target;
      },
    },
    dirty: true,
    local: true,
    probeVersion: 0,
  });
  return {
    probe,
    shadowMap,
    material,
    target,
    previousEnvironment,
    previousMaterialEnvironment,
    observedFaces,
    refreshes: () => refreshes,
  };
}

test("A dirty probe refreshes current shadows once for all six faces", () => {
  const f = captureFixture();
  f.probe.captureProbe();
  assert.equal(f.refreshes(), 1);
  assert.deepEqual(f.observedFaces, Array(6).fill("current sun"));
  assert.deepEqual(f.shadowMap, { autoUpdate: true, needsUpdate: false });
  assert.equal(f.probe.scene.environment, f.target.texture);
  assert.equal(f.material.envMap, f.target.texture);
  assert.equal(f.probe.plane.visible, true);
  assert.equal(f.probe.dirty, false);
  assert.equal(f.probe.probeVersion, 1);
});

test("Failed cube capture restores render state and preserves the dirty probe", () => {
  const f = captureFixture({
    autoUpdate: false,
    needsUpdate: true,
    fail: true,
  });
  assert.throws(() => f.probe.captureProbe(), /cube capture failed/);
  assert.equal(f.refreshes(), 1);
  assert.deepEqual(f.shadowMap, { autoUpdate: false, needsUpdate: true });
  assert.equal(f.probe.scene.environment, f.previousEnvironment);
  assert.equal(f.material.envMap, f.previousMaterialEnvironment);
  assert.equal(f.probe.plane.visible, true);
  assert.equal(f.probe.dirty, true);
  assert.equal(f.probe.probeVersion, 0);
});
