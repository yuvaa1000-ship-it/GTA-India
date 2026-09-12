import * as T from "three";
import { createRenderer, Assets } from "../rendering/scene.js";
import { createPhysics } from "../physics/world.js";
import { Player } from "../player/player.js";
import { Input } from "../player/input.js";
import { Streaming } from "../streaming/manager.js";
import { SaveStore } from "../save/store.js";
import { FixedClock } from "./clock.js";
import { Metrics } from "../debug/metrics.js";
import { updateHUD, notice } from "../ui/hud.js";
import { Depot } from "../world/depot.js";
import { Photon } from "../rendering/photon.js";
export class Runtime {
  async init() {
    Object.assign(this, createRenderer(document.querySelector("#game")));
    this.assets = new Assets();
    this.world = await createPhysics();
    this.store = new SaveStore();
    this.streaming = new Streaming(
      this.scene,
      this.world,
      this.assets,
      this.store,
    );
    this.player = new Player(this.world, this.scene);
    this.depot = new Depot(this.scene, this.world, this.assets);
    this.input = new Input(this.renderer.domElement);
    this.clock = new FixedClock();
    this.metrics = new Metrics(this.renderer);
    this.photon = new Photon(this);
    this.time = 0;
    this.previous = performance.now();
    this.running = true;
    this.lastHUD = 0;
    this.camera.position.set(12, 9, 22);
    this.cameraTarget = new T.Vector3();
    this.raycaster = new T.Raycaster();
    this.frame = this.frame.bind(this);
    this.hide = () => {
      this.previous = performance.now();
      this.clock.accumulator = 0;
      this.input.blur();
    };
    document.addEventListener("visibilitychange", this.hide);
    this.contextLost = (e) => {
      e.preventDefault();
      this.running = false;
      notice(
        "Graphics context lost. Reload to recover; saved progress is preserved.",
      );
    };
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    requestAnimationFrame(this.frame);
    notice("Ready · Enter the district to begin");
    return this;
  }
  frame(now) {
    if (!this.running) return;
    const rawDt = (now - this.previous) / 1000;
    const dt = Math.min(rawDt, 0.1);
    this.previous = now;
    if (document.hidden) {
      requestAnimationFrame(this.frame);
      return;
    }
    this.time += dt;
    const cpuStart = performance.now(),
      streamStart = performance.now();
    const p = this.player.body.translation();
    this.streaming.update(
      this.depot.inside ? this.depot.outside : p,
      this.time,
    );
    const streamMs = performance.now() - streamStart;
    let physicsMs = 0;
    this.clock.advance(dt, (step) => {
      const start = performance.now();
      if (
        this.depot.inside ||
        this.streaming.isReady(this.player.body.translation())
      ) {
        const input = this.overrideInput ?? this.input.sample(step);
        if (this.inspectLab && !this.overrideInput)
          Object.assign(input, { x: 0, z: 0, jump: false, sprint: false });
        this.player.step(step, input);
        this.world.step();
      }
      physicsMs += performance.now() - start;
    });
    this.player.sync();
    if (this.player.body.translation().y < -10) this.reset();
    if (this.input.enabled && !this.inspectLab && this.input.consume("KeyE"))
      notice(this.depot.interact(this.player));
    const pos = this.player.mesh.position;
    this.cameraTarget.copy(pos).add(new T.Vector3(0, 0.7, 0));
    const desired = new T.Vector3(
      Math.sin(this.input.yaw) * 10,
      5,
      Math.cos(this.input.yaw) * 10,
    ).add(this.cameraTarget);
    const dir = desired.clone().sub(this.cameraTarget);
    this.raycaster.set(this.cameraTarget, dir.clone().normalize());
    this.raycaster.far = dir.length();
    let collisionDistance = dir.length();
    if (this.depot.inside) {
      const hit = this.raycaster.intersectObject(this.depot.room, true)[0];
      if (hit) collisionDistance = hit.distance;
    } else {
      const point = new T.Vector3();
      for (const cell of this.streaming.cells.values())
        for (const box of cell.cameraBoxes) {
          const hit = this.raycaster.ray.intersectBox(box, point);
          if (hit)
            collisionDistance = Math.min(
              collisionDistance,
              point.distanceTo(this.cameraTarget),
            );
        }
    }
    if (collisionDistance < dir.length())
      desired
        .copy(this.cameraTarget)
        .addScaledVector(
          dir.normalize(),
          Math.max(0.8, collisionDistance - 0.3),
        );
    this.camera.position.lerp(desired, 1 - Math.exp(-8 * dt));
    this.camera.lookAt(this.cameraTarget);
    if (this.inspectLab) {
      this.camera.position.set(
        11 * Math.sin(this.input.yaw + 0.65),
        5.8,
        -6 + 13 * Math.cos(this.input.yaw + 0.65),
      );
      this.camera.lookAt(0, 1.15, -6);
    }

    this.photon.render(this.time, dt, rawDt);
    this.metrics.record(
      rawDt,
      performance.now() - cpuStart,
      physicsMs,
      this.streaming.lastAI ?? 0,
      Math.max(0, streamMs - (this.streaming.lastAI ?? 0)),
    );
    if (now - this.lastHUD > 350) {
      updateHUD(this.metrics.report(this));
      this.lastHUD = now;
    }
    requestAnimationFrame(this.frame);
  }
  reset() {
    if (this.depot.inside) this.depot.exit(this.player);
    this.player.teleport({ x: 0, y: 2, z: 8 });
    this.input.yaw = 0;
    notice("Returned to plaza");
  }
  save() {
    this.streaming.persist();
    notice(
      this.store.save(
        this.depot.inside ? this.depot.outside : this.player.body.translation(),
      ),
    );
  }
  load() {
    try {
      const raw = this.store.load();
      const loaded = structuredClone(this.store.props);
      if (this.depot.inside) this.depot.exit(this.player);
      this.streaming.clear();
      this.store.props = loaded;
      this.player.teleport({ x: raw[0], y: raw[1] + 0.05, z: raw[2] });
      notice("Save restored");
    } catch (error) {
      notice(error.message);
    }
  }
  dispose() {
    this.running = false;
    document.removeEventListener("visibilitychange", this.hide);
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.input.dispose();
    this.depot.dispose();
    this.player.dispose(this.scene);
    this.streaming.dispose();
    this.photon.dispose();
    this.assets.dispose();
    this.metrics.dispose();
    this.world.free();
    this.disposeRenderer();
  }
}
