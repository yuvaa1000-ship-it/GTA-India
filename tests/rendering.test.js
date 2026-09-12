import test from "node:test";
import assert from "node:assert/strict";
import {
  QUALITY,
  adaptScale,
  exposureTarget,
  adaptExposure,
} from "../src/rendering/quality.js";
import { applyBoxProbe } from "../src/rendering/reflections.js";
import * as T from "three";
test("Resolution feedback respects cooldown, bounds and target interval", () => {
  assert.equal(adaptScale(0.7, 70, 1), 0.7);
  assert.equal(adaptScale(0.5, 90, 3), 0.5);
  assert.equal(adaptScale(1, 20, 3), 1);
  assert.equal(adaptScale(0.7, 32, 3), 0.7);
  assert.ok(adaptScale(0.8, 60, 3) < 0.8);
  assert.ok(QUALITY.reference.reflection > QUALITY.performance.reflection);
});
test("Exposure metering adapts to a brighter image without overshoot", () => {
  assert.ok(exposureTarget(3) < exposureTarget(-3));
  let current = 1,
    target = exposureTarget(4);
  for (let i = 0; i < 60; i++) {
    current = adaptExposure(current, target, 1 / 60);
    assert.ok(current >= target && current <= 1);
  }
  assert.ok(current < 0.2);
  assert.ok(exposureTarget(-100) <= 2.5);
});
test("Probe shader inserts bounded correction at actual engine include boundary", () => {
  const material = new T.MeshPhysicalMaterial();
  applyBoxProbe(
    material,
    new T.Vector3(),
    new T.Vector3(-10, -10, -10),
    new T.Vector3(10, 10, 10),
  );
  const shader = {
    uniforms: {},
    vertexShader: T.ShaderLib.physical.vertexShader,
    fragmentShader: T.ShaderLib.physical.fragmentShader,
  };
  material.onBeforeCompile(shader);
  assert.ok(shader.fragmentShader.includes("if(inside)reflectVec"));
  assert.ok(
    !shader.fragmentShader.includes("#include <envmap_physical_pars_fragment>"),
  );
  assert.ok(shader.vertexShader.includes("vPhotonWorld=(modelMatrix"));
  material.dispose();
});

test("Every static main UI binding resolves to an element in the HTML shell", async () => {
  const { readFile } = await import("node:fs/promises");
  const main = await readFile(
    new URL("../src/main.js", import.meta.url),
    "utf8",
  );
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  for (const [, id] of main.matchAll(
    /document\.querySelector\("#([\w-]+)"\)\.(?:onclick|onchange)/g,
  ))
    assert.ok(html.includes(`id="${id}"`), `Missing control ${id}`);
});
