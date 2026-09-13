import * as T from "three";
import { createRetargeter } from "../animation/retarget.js";
import { MotionController } from "../animation/controller.js";
import { angleDelta } from "../animation/grammar.js";
import { HumanContact } from "./contact.js";
import { HumanSurfaces } from "./surface.js";
import { HumanCharacter } from "./character.js";
import { citizenIdentity, citizenAt, crowdTier } from "./identity.js";
import { createRig } from "./rig.js";
import { buildHumanGeometry } from "./mesh.js";
export class HumanSystem {
  constructor(runtime) {
    this.r = runtime;
    this.surfaces = new HumanSurfaces();
    this.citizens = new Map();
    this.actors = new Map();
    this.maxAnimated = 12;
    this.lastBuildAt = -1;
    this.poseMs = 0;
    this.generations = 0;
    const hero = {
      ...citizenIdentity("hero:navapur:01"),
      height: 1.74,
      garment: "jacket",
      accessory: "none",
    };
    this.hero = new HumanCharacter(hero, this.surfaces, 0);
    this.heroMotion = new MotionController(this.hero);
    runtime.scene.add(this.hero.group);
    runtime.player.mesh.visible = false;
    this.previous = new T.Vector3().copy(runtime.player.mesh.position);
    this.speed = 0;
    this.heroYaw = 0;
    this.cast = Array.from({ length: 4 }, (_, i) => {
      const c = new HumanCharacter(
        citizenIdentity(`cast:navapur:${i}`),
        this.surfaces,
        0,
      );
      c.group.position.set(-3.5 + i * 2.3, 0.06, 3);
      runtime.scene.add(c.group);
      c.motion = new MotionController(c);
      c.retargeter = createRetargeter(this.hero.rig, c.rig);
      return c;
    });
    const d = citizenIdentity("far-template"),
      rig = createRig(d);
    this.farGeometry = buildHumanGeometry(d, rig, 2);
    this.farGeometry.clearGroups();
    this.farGeometry.morphAttributes = {};
    rig.skeleton.dispose();
    this.farMaterial = new T.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.88,
    });
    this.far = new T.InstancedMesh(this.farGeometry, this.farMaterial, 100);
    this.far.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.far.frustumCulled = false;
    this.far.count = 0;
    runtime.scene.add(this.far);
    this.dummy = new T.Object3D();
    this.frustum = new T.Frustum();
    this.sphere = new T.Sphere(new T.Vector3(), 2);
    this.tiers = [5, 0, 0, 0, 0];
  }
  update(time, dt) {
    if (this.validationFrozen) return;
    const start = performance.now(),
      r = this.r,
      p = r.player.mesh.position;
    const dx = p.x - this.previous.x,
      dz = p.z - this.previous.z,
      displacement = Math.hypot(dx, dz);
    const speed = dt > 0 && displacement < 2 ? displacement / dt : 0;
    this.speed = T.MathUtils.lerp(this.speed, speed, 1 - Math.exp(-dt * 10));
    if (displacement > 0.001 && displacement < 2)
      this.heroYaw += T.MathUtils.clamp(
        angleDelta(this.heroYaw, Math.atan2(dx, dz)),
        -dt * 5,
        dt * 5,
      );
    this.previous.copy(p);
    this.hero.group.position.copy(p).y -= 0.87;
    this.hero.group.rotation.y = this.heroYaw;
    this.heroMotion.context = r.motion?.context ?? {};
    this.heroMotion.interaction = r.motion?.interaction ?? null;
    this.heroMotion.update(time, dt, {
      speed: this.speed,
      grounded: r.player.grounded,
      vertical: r.player.velocityY,
      sampleGround: r.motion?.sample,
    });
    const wet = Number(r.photon.atmosphere.condition.rain);
    this.hero.weather(wet);
    for (let i = 0; i < this.cast.length; i++) {
      const a = this.cast[i];
      a.group.visible = !r.depot.inside && p.distanceTo(a.group.position) < 110;
      a.expression = 0.15 + (Math.sin(time * 0.3 + i) + 1) * 0.15;
      if (a.group.visible) {
        a.weather(wet);
        const compare = r.motion?.comparison && i < 2;
        if (!compare) a.motion.interaction = null;
        a.motion.update(time, dt, {
          speed: 0,
          grounded: true,
          gaze: Math.sin(time * 0.2 + i) * 0.35,
          sampleGround: r.motion?.sample,
        });
        if (compare) {
          const side = i ? "R" : "L",
            target = a.motion.interaction.position;
          const contacts = {};
          contacts["arm" + side] = {
            target,
            pole: a.group.position
              .clone()
              .add(new T.Vector3(0, 1, i ? -0.6 : 0.6)),
          };
          for (const f of a.motion.feet)
            contacts["leg" + f.side] = {
              target: f.point
                .clone()
                .addScaledVector(f.normal, a.identity.height * 0.06),
              pole: a.group.position.clone().add(new T.Vector3(1, 0.5, 0)),
            };
          a.retargetResult = a.retargeter.apply({ contacts });
          a.rig.skeleton.update();
        }
      }
    }
    r.camera.updateMatrixWorld(true);
    this.frustum.setFromProjectionMatrix(
      new T.Matrix4().multiplyMatrices(
        r.camera.projectionMatrix,
        r.camera.matrixWorldInverse,
      ),
    );
    const wanted = new Set(),
      list = [];
    for (const cell of r.streaming.cells.values()) {
      cell.people.visible = false;
      for (let i = 0; i < 4; i++) {
        const point = citizenAt(cell.data.x, cell.data.z, i, time),
          id = point.identity.id;
        wanted.add(id);
        let item = this.citizens.get(id);
        if (!item) {
          item = { identity: point.identity, tier: 4 };
          this.citizens.set(id, item);
        }
        Object.assign(item, point);
        const distance = Math.hypot(
          point.x - r.camera.position.x,
          point.z - r.camera.position.z,
        );
        this.sphere.center.set(point.x, point.y + 1, point.z);
        item.tier = crowdTier(
          distance,
          !r.depot.inside && this.frustum.intersectsSphere(this.sphere),
          item.tier,
        );
        item.distance = distance;
        list.push(item);
      }
    }
    for (const [id] of this.citizens)
      if (!wanted.has(id)) this.citizens.delete(id);
    list.sort(
      (a, b) =>
        a.distance - b.distance || a.identity.id.localeCompare(b.identity.id),
    );
    const selected = list.filter((c) => c.tier <= 2).slice(0, this.maxAnimated),
      selectedIds = new Set(selected.map((c) => c.identity.id));
    for (const [id, a] of this.actors)
      if (
        !selectedIds.has(id) ||
        selected.find((c) => c.identity.id === id)?.tier !== a.tier
      ) {
        a.contact?.dispose();
        a.dispose();
        this.actors.delete(id);
      }
    // At most one CPU geometry construction per frame; far representation covers pending near citizens.
    for (const item of selected)
      if (!this.actors.has(item.identity.id)) {
        const a = new HumanCharacter(item.identity, this.surfaces, item.tier);
        a.motion = new MotionController(a);
        r.scene.add(a.group);
        if (item.tier === 1)
          a.contact = new HumanContact(r.world, item.identity.height);
        this.actors.set(item.identity.id, a);
        this.generations++;
        break;
      }
    this.tiers = [
      1 + this.cast.filter((c) => c.group.visible).length,
      0,
      0,
      0,
      0,
    ];
    let farCount = 0;
    for (const item of list) {
      const actor = this.actors.get(item.identity.id);
      if (actor) {
        actor.group.position.set(item.x, item.y, item.z);
        actor.group.rotation.y = item.yaw;
        actor.contact?.move(actor.group.position);
        actor.weather(wet);
        const hz = item.tier === 1 ? 60 : 12;
        if (time - (actor.lastPose ?? -1) >= 1 / hz) {
          actor.motion.context = { surface: wet ? "wet" : "road" };
          actor.motion.update(
            time,
            Math.min(0.1, time - (actor.lastPose ?? time - dt)),
            {
              speed: item.speed,
              grounded: true,
              sampleGround: r.motion?.sample,
              velocity: {
                x: Math.sin(item.yaw) * item.speed,
                z: Math.cos(item.yaw) * item.speed,
              },
              gaze: Math.sin(time * 0.2 + item.identity.phase) * 0.18,
            },
          );
          actor.lastPose = time;
        }
        this.tiers[item.tier]++;
      } else if (item.tier < 4) {
        this.dummy.position.set(item.x, item.y, item.z);
        this.dummy.rotation.set(0, item.yaw, 0);
        this.dummy.scale.set(
          item.identity.build,
          item.identity.height / 1.74,
          item.identity.build,
        );
        this.dummy.updateMatrix();
        this.far.setMatrixAt(farCount, this.dummy.matrix);
        this.far.setColorAt(farCount, new T.Color(item.identity.top));
        farCount++;
        this.tiers[3]++;
      } else this.tiers[4]++;
    }
    this.far.count = farCount;
    this.far.instanceMatrix.needsUpdate = true;
    if (this.far.instanceColor) this.far.instanceColor.needsUpdate = true;
    this.poseMs = performance.now() - start;
  }
  stats() {
    return {
      citizens: this.citizens.size,
      activeRigs:
        1 + this.cast.filter((c) => c.group.visible).length + this.actors.size,
      contactCapsules: [...this.actors.values()].filter((a) => a.contact)
        .length,
      bonesPerRig: this.hero.rig.bones.length,
      heroTriangles: this.hero.geometry.index.count / 3,
      tiers: [...this.tiers],
      cpuMs: this.poseMs,
      generations: this.generations,
      heroPoseUpdates: this.hero.poseUpdates,
      identityVersion: 1,
      motion: this.heroMotion.metrics,
      geometryBound: 1 + this.cast.length + this.maxAnimated + 1,
    };
  }
  dispose() {
    this.hero.dispose();
    this.cast.forEach((c) => c.dispose());
    this.actors.forEach((c) => {
      c.contact?.dispose();
      c.dispose();
    });
    this.actors.clear();
    this.citizens.clear();
    this.far.removeFromParent();
    this.far.dispose();
    this.farGeometry.dispose();
    this.farMaterial.dispose();
    this.surfaces.dispose();
    this.r.player.mesh.visible = true;
    for (const c of this.r.streaming.cells.values()) c.people.visible = true;
  }
}
