import * as T from "three";
import { MotionLab } from "./lab.js";
import { groundSampler } from "./ground.js";
import { motionContext } from "./grammar.js";
export class MotionDirector {
  constructor(runtime) {
    this.r = runtime;
    this.lab = new MotionLab(runtime);
    this.sample = groundSampler(runtime);
    this.context = motionContext();
    this.interaction = null;
    this.station = null;
    this.castPlaces = runtime.humans.cast.map((c) => c.group.position.clone());
    this.castRotations = runtime.humans.cast.map((c) =>
      c.group.quaternion.clone(),
    );
    this.comparison = false;
  }
  enter() {
    this.r.inspectLab = false;
    this.r.inspectHuman = false;
    if (this.r.depot.inside) this.r.depot.exit(this.r.player);
    this.lab.enter();
    this.r.humans.heroMotion.reset();
  }
  exit() {
    this.interaction = null;
    this.context = motionContext();
    this.restoreCast();
    this.lab.exit();
    this.r.humans.heroMotion.reset();
  }
  restoreCast() {
    this.comparison = false;
    this.r.humans.cast.forEach((c, i) => {
      c.group.position.copy(this.castPlaces[i]);
      c.group.quaternion.copy(this.castRotations[i]);
      c.motion.interaction = null;
      c.motion.reset();
    });
  }
  selectStation(id) {
    if (!this.lab.active) this.enter();
    const station = this.lab.stations.find((s) => s.id === id);
    if (!station) return false;
    if (this.comparison) this.restoreCast();
    this.interaction = null;
    this.station = id;
    this.r.player.teleport(station.spawn);
    this.r.humans.heroYaw = Math.atan2(
      station.direction.x,
      station.direction.z,
    );
    this.r.humans.heroMotion.reset();
    this.context = motionContext({
      ...this.context,
      surface: id === "puddle" ? "water" : "road",
    });
    return true;
  }
  reach(id) {
    if (!this.lab.active) this.enter();
    const target = this.lab.targets.find((t) => t.id === id);
    if (!target) return false;
    if (this.comparison) this.restoreCast();
    const forward = new T.Vector3(
        Math.sin(target.yaw),
        0,
        Math.cos(target.yaw),
      ),
      right = new T.Vector3(Math.cos(target.yaw), 0, -Math.sin(target.yaw));
    const stand =
      target.kind === "seat"
        ? target.stand.clone()
        : target.position
            .clone()
            .addScaledVector(forward, -0.45)
            .addScaledVector(
              right,
              -(this.r.humans.hero.identity.shoulders + 0.035),
            );
    this.r.player.teleport({ x: stand.x, y: target.stand.y + 0.9, z: stand.z });
    this.r.humans.heroYaw = target.yaw;
    this.r.humans.heroMotion.reset();
    this.interaction = target;
    return true;
  }
  compareBodies() {
    if (!this.lab.active) this.enter();
    this.reach("car-door");
    this.comparison = true;
    const t = this.interaction;
    this.r.humans.cast.slice(0, 2).forEach((c, i) => {
      const right = new T.Vector3(Math.cos(t.yaw), 0, -Math.sin(t.yaw));
      const forward = new T.Vector3(Math.sin(t.yaw), 0, Math.cos(t.yaw));
      c.group.position
        .copy(t.position)
        .addScaledVector(forward, -0.43)
        .addScaledVector(right, (i ? -1 : 1) * (c.identity.shoulders + 0.035));
      c.group.position.y = t.stand.y;
      c.group.rotation.y = t.yaw;
      c.motion.reset();
      c.motion.interaction = { ...t, side: i ? "R" : "L" };
    });
    this.r.player.teleport({ x: 4.8, y: 6.9, z: 38.5 });
    this.interaction = null;
  }
  update() {
    this.lab.update();
    this.r.player.motionContext = this.context;
    if (this.interaction?.kind === "box") {
      const fixture = this.lab.fixtures.find((f) => f.dynamic);
      if (fixture)
        this.interaction.position
          .copy(fixture.mesh.position)
          .add(new T.Vector3(0, 0.15, -0.45));
    }
  }
  stats() {
    return {
      lab: this.lab.stats(),
      context: this.context,
      interaction: this.interaction?.id ?? null,
      ...this.r.humans.heroMotion.metrics,
    };
  }
  dispose() {
    this.lab.dispose();
  }
}
