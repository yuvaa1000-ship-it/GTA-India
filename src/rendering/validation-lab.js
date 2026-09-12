import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Original stationary test coupons. Borrowed materials belong to the library.
// No vehicle, character, traffic, cloth or collision behavior is implied.
export class ValidationLab {
  constructor(scene, library) {
    this.scene = scene;
    this.library = library;
    this.group = new T.Group();
    this.group.name = "PHOTON validation lab";
    this.probePosition = new T.Vector3(0, 2.4, -6);
    this.reflectiveMaterials = [
      "asphalt",
      "puddle",
      "chrome",
      "brushedMetal",
      "glass",
      "carPaint",
      "rickshawPaint",
      "eyeWhite",
      "iris",
      "hair",
    ].map((key) => library.materials[key]);
    this.puddleSurfaces = [];
    this.geometries = [];
    this.lights = [];
    this.disposed = false;
    const batches = new Map();
    const transform = new T.Object3D();
    const add = (
      geometry,
      material,
      position,
      scale = [1, 1, 1],
      rotation = [0, 0, 0],
    ) => {
      transform.position.set(...position);
      transform.scale.set(...scale);
      transform.rotation.set(...rotation);
      transform.updateMatrix();
      geometry.applyMatrix4(transform.matrix);
      if (!batches.has(material)) batches.set(material, []);
      batches.get(material).push(geometry);
    };
    const box = (material, position, scale, rotation) =>
      add(new T.BoxGeometry(), material, position, scale, rotation);
    const sphere = (material, position, scale) =>
      add(new T.SphereGeometry(1, 24, 16), material, position, scale);
    const wheel = (position, radius = 0.42) => {
      add(
        new T.CylinderGeometry(1, 1, 1, 20),
        "rubber",
        position,
        [radius, 0.27, radius],
        [0, 0, Math.PI / 2],
      );
      sphere("chrome", position, [0.16, radius * 0.5, radius * 0.5]);
    };

    // The pedestrian route at x=0 stays unobstructed; overlays have no bodies.
    box("asphalt", [0, 0.056, -6.4], [14, 0.008, 12]);
    for (const [x, z, w, d] of [
      [-1.8, -5.8, 2.8, 4.2],
      [2, -8.2, 2.5, 3],
    ]) {
      const geometry = new T.PlaneGeometry(w, d);
      geometry.rotateX(-Math.PI / 2);
      const mesh = new T.Mesh(geometry, library.materials.puddle);
      mesh.position.set(x, 0.076, z);
      mesh.name = "Puddle reflection coupon";
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.geometries.push(geometry);
      this.puddleSurfaces.push({
        mesh,
        position: mesh.position.clone(),
        size: new T.Vector2(w, d),
      });
    }

    // Simplified, unbranded painted car display; no drivable vehicle claim.
    box("concrete", [-5, 0.13, -8], [3.4, 0.16, 5]);
    sphere("carPaint", [-5, 0.87, -8], [1.3, 0.51, 2.12]);
    box("carPaint", [-5, 0.91, -8], [2.55, 0.42, 3.6]);
    box("darkTrim", [-5, 1.44, -8.3], [1.9, 0.78, 1.8], [-0.04, 0, 0]);
    box("carPaint", [-5, 1.85, -8.4], [1.9, 0.13, 1.8]);
    box("glass", [-5, 1.51, -7.365], [1.75, 0.63, 0.035], [0.2, 0, 0]);
    for (const x of [-6.24, -3.76])
      for (const z of [-9.27, -6.75]) wheel([x, 0.6, z]);
    for (const x of [-5.8, -4.2]) {
      box("headlamp", [x, 0.93, -5.98], [0.43, 0.18, 0.07]);
      const light = new T.SpotLight("#ffe1ae", 0, 18, 0.34, 0.5, 2);
      light.position.set(x, 0.94, -5.85);
      light.target.position.set(x, 0.08, 2.4);
      light.castShadow = false;
      this.group.add(light, light.target);
      this.lights.push(light);
    }
    box("chrome", [-5, 0.64, -5.9], [2.05, 0.12, 0.09]);

    // Three visible wheels and open sides distinguish this static body coupon.
    box("concrete", [5, 0.13, -3], [2.9, 0.16, 3.7]);
    box("rickshawPaint", [5, 0.86, -3.25], [1.95, 0.7, 2.45]);
    box("rickshawPaint", [5, 1.08, -1.72], [1.55, 0.72, 0.24]);
    box("darkTrim", [5, 2.08, -3], [2.05, 0.18, 2.85]);
    for (const x of [4.14, 5.86]) {
      box("chrome", [x, 1.57, -1.79], [0.045, 1.02, 0.045]);
      box("darkTrim", [x, 1.56, -4.14], [0.1, 1.0, 0.1]);
    }
    box("glass", [5, 1.7, -1.83], [1.68, 0.66, 0.035]);
    box("cloth", [5, 1.25, -3.7], [1.6, 0.18, 0.68]);
    wheel([5, 0.58, -1.7], 0.35);
    wheel([4.02, 0.58, -3.93], 0.35);
    wheel([5.98, 0.58, -3.93], 0.35);
    sphere("headlamp", [5, 1.04, -1.55], [0.16, 0.13, 0.06]);

    // Storefront is a separate shallow validation room, not a streamed interior.
    box("concrete", [5.4, 0.15, -10.3], [4.5, 0.22, 2.65]);
    box("concrete", [5.4, 3.45, -10.3], [4.5, 0.16, 2.65]);
    box("interior", [5.4, 1.75, -11.6], [4.5, 3.2, 0.1]);
    for (const x of [3.18, 7.62])
      box("concrete", [x, 1.75, -10.3], [0.12, 3.2, 2.6]);
    box("glass", [5.4, 1.78, -8.95], [4.15, 2.96, 0.025]);
    for (const x of [3.3, 5.4, 7.5])
      box("chrome", [x, 1.78, -8.9], [0.045, 3.0, 0.045]);
    box("interior", [5.4, 0.92, -10.65], [3.5, 0.12, 0.72]);
    for (let i = 0; i < 3; i++)
      sphere(
        ["chrome", "carPaint", "cloth"][i],
        [4.35 + i * 1.05, 1.42, -10.65],
        [0.38, 0.38, 0.38],
      );
    box("headlamp", [5.4, 3.25, -10.3], [2.6, 0.04, 0.5]);
    const interiorLight = new T.PointLight("#ffd7a0", 18, 7, 2);
    interiorLight.position.set(5.4, 2.9, -10.1);
    this.group.add(interiorLight);
    this.interiorLight = interiorLight;
    box("darkTrim", [5.4, 3.8, -8.9], [4.35, 0.65, 0.14]);
    for (const y of [3.62, 3.8, 3.98])
      box("sign", [5.4, y, -8.8], [3.9, 0.04, 0.045]);

    // Skin/eye/hair/cloth are material proxies on a clearly abstract bust.
    box("concrete", [-5.3, 0.45, -2.8], [1.8, 0.75, 1.5]);
    sphere("cloth", [-5.3, 1.25, -2.8], [0.66, 0.48, 0.4]);
    sphere("skin", [-5.3, 2.05, -2.8], [0.42, 0.54, 0.4]);
    add(
      new T.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.48),
      "hair",
      [-5.3, 2.09, -2.8],
      [0.43, 0.55, 0.41],
    );
    for (const x of [-5.46, -5.14]) {
      sphere("eyeWhite", [x, 2.14, -2.456], [0.103, 0.065, 0.073]);
      sphere("iris", [x, 2.14, -2.391], [0.045, 0.044, 0.014]);
    }
    sphere("skin", [-5.3, 2.01, -2.39], [0.065, 0.11, 0.105]);
    // Drape vertices are static sine folds: a shading coupon, not simulation.
    const drape = new T.PlaneGeometry(1.3, 1.5, 20, 12);
    const positions = drape.getAttribute("position");
    for (let i = 0; i < positions.count; i++)
      positions.setZ(i, Math.sin(positions.getX(i) * 16) * 0.07);
    drape.computeVertexNormals();
    add(drape, "cloth", [-7, 1.15, -4.7]);
    box("chrome", [-7, 1.94, -4.7], [1.4, 0.04, 0.04]);

    // Roughness response comparisons under exactly the same lighting.
    for (const [i, name] of ["chrome", "brushedMetal", "concrete"].entries()) {
      const x = -6.4 + i * 1.25;
      box("concrete", [x, 0.36, -0.15], [1, 0.62, 1]);
      sphere(name, [x, 1.11, -0.15], [0.44, 0.44, 0.44]);
    }
    box("concrete", [7.35, 0.38, -6.8], [1.2, 0.64, 1.25]);
    for (let i = 0; i < 12; i++) {
      const angle = i * 2.4;
      const height = 0.92 + i * 0.12;
      add(
        new T.SphereGeometry(1, 8, 5),
        "foliage",
        [7.35 + Math.sin(angle) * 0.38, height, -6.8 + Math.cos(angle) * 0.32],
        [0.4, 0.035, 0.18],
        [0.4, angle, 0.3],
      );
    }
    box("interior", [7.35, 1.2, -6.8], [0.06, 1.7, 0.06]);

    for (const [name, geometries] of batches) {
      const merged = mergeGeometries(geometries, false);
      geometries.forEach((geometry) => geometry.dispose());
      if (!merged)
        throw new Error(`Failed to merge PHOTON material batch ${name}`);
      merged.computeBoundingSphere();
      const mesh = new T.Mesh(merged, library.materials[name]);
      mesh.name = `PHOTON batch: ${name}`;
      mesh.castShadow = !["asphalt", "glass", "sign", "headlamp"].includes(
        name,
      );
      mesh.receiveShadow = !["glass", "sign", "headlamp"].includes(name);
      this.geometries.push(merged);
      this.group.add(mesh);
    }
    scene.add(this.group);
    this.lastRain = NaN;
    this.update(0, { rain: 0.6, night: 0 });
  }

  update(time, { rain = 0, night = 0 } = {}) {
    const wet = T.MathUtils.clamp(Number(rain) || 0, 0, 1);
    const dark = T.MathUtils.clamp(Number(night) || 0, 0, 1);
    const materials = this.library.materials;
    if (wet !== this.lastRain) {
      this.lastRain = wet;
      materials.asphalt.roughness = T.MathUtils.lerp(0.92, 0.36, wet);
      materials.asphalt.clearcoat = T.MathUtils.lerp(0.01, 0.65, wet);
      materials.asphalt.normalScale.setScalar(T.MathUtils.lerp(0.6, 0.24, wet));
      materials.asphalt.color.setRGB(
        T.MathUtils.lerp(0.047, 0.018, wet),
        T.MathUtils.lerp(0.058, 0.026, wet),
        T.MathUtils.lerp(0.064, 0.031, wet),
      );
      materials.puddle.roughness = T.MathUtils.lerp(0.045, 0.11, wet);
    }
    materials.sign.emissiveIntensity = 1.5 + dark * 4;
    materials.headlamp.emissiveIntensity = 0.6 + dark * 5;
    this.lights.forEach((light) => {
      light.intensity = dark * 90;
    });
    this.interiorLight.intensity = 18 + dark * 12;
    // Time is accepted for a stable rendering-service interface; no fake simulation.
    this.time = time;
  }

  setVisible(visible) {
    this.group.visible = Boolean(visible);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.group);
    this.geometries.forEach((geometry) => geometry.dispose());
    this.lights.forEach((light) => light.dispose());
    this.interiorLight.dispose();
    this.group.clear();
    this.geometries.length = 0;
    this.lights.length = 0;
    this.puddleSurfaces.length = 0;
  }
}
