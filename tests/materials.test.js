import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createMaterialLibrary } from "../src/rendering/materials.js";
import { ValidationLab } from "../src/rendering/validation-lab.js";

test("PHOTON material hierarchy separates metal, dielectric water, paint and glass", () => {
  const library = createMaterialLibrary();
  const m = library.materials;
  assert.equal(m.chrome.metalness, 1);
  assert.equal(m.puddle.metalness, 0);
  assert.ok(m.asphalt.roughness > m.carPaint.roughness);
  assert.ok(m.carPaint.roughness > m.puddle.roughness);
  assert.ok(m.carPaint.clearcoat > m.asphalt.clearcoat);
  assert.equal(m.glass.transmission, 0);
  assert.ok(m.glass.opacity < 0.3);
  library.setGlassTransmission(true);
  assert.ok(m.glass.transmission > 0.9);
  assert.equal(m.glass.opacity, 1);
  library.setGlassTransmission(false);
  assert.equal(m.glass.transmission, 0);
  for (const map of Object.values(library.textures)) {
    assert.equal(map.colorSpace, T.NoColorSpace);
    assert.equal(map.image.data.length, 128 * 128 * 4);
    assert.ok(new Set(map.image.data).size > 5);
  }
  library.dispose();
});

test("PHOTON validation lifecycle owns geometry and borrows material resources", () => {
  const library = createMaterialLibrary();
  const scene = new T.Scene();
  for (let iteration = 0; iteration < 5; iteration++) {
    const lab = new ValidationLab(scene, library);
    assert.equal(scene.children.length, 1);
    assert.equal(lab.puddleSurfaces.length, 2);
    assert.ok(lab.group.children.filter((child) => child.isMesh).length <= 22);
    for (const geometry of lab.geometries) {
      assert.ok(geometry.getAttribute("position").count > 0);
      for (const value of geometry.getAttribute("position").array)
        assert.ok(Number.isFinite(value));
    }
    lab.update(0, { rain: 0, night: 0 });
    const dry = library.materials.asphalt.roughness;
    lab.update(1, { rain: 1, night: 1 });
    assert.ok(library.materials.asphalt.roughness < dry);
    assert.ok(
      library.materials.asphalt.roughness > library.materials.puddle.roughness,
    );
    assert.ok(lab.lights.every((light) => light.intensity > 0));
    let disposedGeometry = 0;
    let disposedMaterial = 0;
    const countMaterial = () => disposedMaterial++;
    library.materials.chrome.addEventListener("dispose", countMaterial);
    lab.geometries.forEach((geometry) =>
      geometry.addEventListener("dispose", () => disposedGeometry++),
    );
    const expected = lab.geometries.length;
    lab.setVisible(false);
    assert.equal(lab.group.visible, false);
    lab.dispose();
    lab.dispose();
    assert.equal(disposedGeometry, expected);
    assert.equal(disposedMaterial, 0);
    assert.equal(scene.children.length, 0);
    library.materials.chrome.removeEventListener("dispose", countMaterial);
  }
  let disposedMaterials = 0;
  let disposedTextures = 0;
  Object.values(library.materials).forEach((material) =>
    material.addEventListener("dispose", () => disposedMaterials++),
  );
  Object.values(library.textures).forEach((map) =>
    map.addEventListener("dispose", () => disposedTextures++),
  );
  library.dispose();
  library.dispose();
  assert.equal(disposedMaterials, Object.keys(library.materials).length);
  assert.equal(disposedTextures, Object.keys(library.textures).length);
});
