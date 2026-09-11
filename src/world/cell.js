import * as T from "three";
import { fixedBox, dynamicBox } from "../physics/world.js";
export class Cell {
  constructor(data, scene, world, assets, store, pool) {
    this.data = data;
    this.world = world;
    this.store = store;
    this.pool = pool;
    this.group = new T.Group();
    this.bodies = [];
    this.props = [];
    this.age = -1;
    this.cameraBoxes = [];
    this.staticBatches = [];
    const statics = new Map();
    const { x, z } = data;
    const wx = x * 64,
      wz = z * 64;
    const add = (mat, x, y, z, w, h, d) => {
      if (!statics.has(mat)) statics.set(mat, []);
      statics.get(mat).push([x, y, z, w, h, d]);
    };
    add("ground", wx, -0.23, wz, 64, 0.4, 64);
    this.bodies.push(fixedBox(world, wx, -0.25, wz, 64, 0.5, 64));
    add("road", wx, 0.01, wz, 15, 0.04, 64);
    add("road", wx, 0.015, wz, 64, 0.04, 15);
    for (const s of [-1, 1]) {
      add("curb", wx + s * 8, 0.09, wz, 1, 0.18, 64);
      add("curb", wx, 0.09, wz + s * 8, 64, 0.18, 1);
    }
    for (let i = -28; i <= 28; i += 8) {
      add("trim", wx, 0.04, wz + i, 0.13, 0.03, 3);
      add("trim", wx + i, 0.04, wz, 3, 0.03, 0.13);
    }
    const windows = [];
    for (const b of data.buildings) {
      this.cameraBoxes.push(
        new T.Box3(
          new T.Vector3(b.x - b.w / 2, 0, b.z - b.d / 2),
          new T.Vector3(b.x + b.w / 2, b.h, b.z + b.d / 2),
        ),
      );
      add(String(b.color), b.x, b.h / 2, b.z, b.w, b.h, b.d);
      add("trim", b.x, b.h + 0.1, b.z, b.w + 0.4, 0.25, b.d + 0.4);
      this.bodies.push(fixedBox(world, b.x, b.h / 2, b.z, b.w, b.h, b.d));
      for (let y = 2; y < b.h - 1; y += 3)
        for (let offset = -5; offset <= 5; offset += 3) {
          windows.push([
            b.x + offset,
            y,
            b.z - b.d / 2 - 0.025,
            1.4,
            1.6,
            0.06,
          ]);
          windows.push([
            b.x - b.w / 2 - 0.025,
            y,
            b.z + offset,
            0.06,
            1.6,
            1.4,
          ]);
        }
      add("teal", b.x, 2.2, b.z - b.d / 2 - 1, b.w * 0.8, 0.2, 2);
    }
    for (const [mat, transforms] of statics) {
      const inst = new T.InstancedMesh(
        assets.box,
        assets.materials[mat],
        transforms.length,
      );
      const tmp = new T.Object3D();
      transforms.forEach((v, i) => {
        tmp.position.set(...v.slice(0, 3));
        tmp.scale.set(...v.slice(3));
        tmp.updateMatrix();
        inst.setMatrixAt(i, tmp.matrix);
      });
      inst.castShadow = !["road", "ground", "curb"].includes(mat);
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      this.group.add(inst);
      this.staticBatches.push(inst);
    }
    const batch = new T.InstancedMesh(
      assets.box,
      assets.materials.window,
      windows.length,
    );
    const m = new T.Object3D();
    windows.forEach((v, i) => {
      m.position.set(...v.slice(0, 3));
      m.scale.set(...v.slice(3));
      m.updateMatrix();
      batch.setMatrixAt(i, m.matrix);
    });
    batch.computeBoundingSphere();
    this.group.add(batch);
    this.windowBatch = batch;
    for (const p of data.props) {
      const body = dynamicBox(world, p.x, p.y, p.z);
      const saved = store.props[p.id];
      if (saved) {
        body.setTranslation(
          { x: saved.p[0], y: saved.p[1], z: saved.p[2] },
          true,
        );
        body.setRotation(
          { x: saved.q[0], y: saved.q[1], z: saved.q[2], w: saved.q[3] },
          true,
        );
      }
      const mesh = pool.pop() || assets.mesh("crate", 0, 0, 0, 0.9, 0.9, 0.9);
      this.group.add(mesh);
      this.bodies.push(body);
      this.props.push({ id: p.id, body, mesh });
    }
    this.people = new T.InstancedMesh(assets.box, assets.materials.teal, 4);
    this.vehicles = new T.InstancedMesh(assets.box, assets.materials.trim, 2);
    this.people.castShadow = true;
    this.vehicles.castShadow = true;
    this.group.add(this.people, this.vehicles);
    this.dummy = new T.Object3D();
    scene.add(this.group);
    this.update(0, 0);
  }
  update(time, distance) {
    for (const p of this.props) {
      p.mesh.position.copy(p.body.translation());
      p.mesh.quaternion.copy(p.body.rotation());
    }
    const tick = distance > 90 ? Math.floor(time) : time;
    if (tick === this.age) return;
    this.age = tick;
    const x = this.data.x * 64,
      z = this.data.z * 64,
      m = this.dummy;
    for (let i = 0; i < 4; i++) {
      m.position.set(
        x + (i % 2 ? 9 : -9),
        0.9,
        z + ((tick * 0.8 + i * 14) % 52) - 26,
      );
      m.scale.set(0.45, 1.8, 0.4);
      m.updateMatrix();
      this.people.setMatrixAt(i, m.matrix);
    }
    for (let i = 0; i < 2; i++) {
      m.position.set(
        x + (i ? 3.6 : -3.6),
        0.65,
        z + ((((tick * (i ? 5 : -5) + i * 31) % 64) + 64) % 64) - 32,
      );
      m.scale.set(1.8, 1.3, 3.4);
      m.updateMatrix();
      this.vehicles.setMatrixAt(i, m.matrix);
    }
    this.people.instanceMatrix.needsUpdate = true;
    this.vehicles.instanceMatrix.needsUpdate = true;
    this.people.computeBoundingSphere();
    this.vehicles.computeBoundingSphere();
  }
  persist() {
    for (const p of this.props) this.store.remember(p.id, p.body);
  }
  dispose(scene) {
    this.persist();
    scene.remove(this.group);
    for (const p of this.props) {
      this.group.remove(p.mesh);
      if (this.pool.length < 100) this.pool.push(p.mesh);
    }
    for (const b of this.bodies) this.world.removeRigidBody(b);
    for (const batch of this.staticBatches) batch.dispose();
    this.windowBatch.dispose();
    this.people.dispose();
    this.vehicles.dispose();
    this.group.clear();
  }
}
