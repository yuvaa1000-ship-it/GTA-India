import * as T from "three";
import { RAPIER } from "../physics/world.js";
import { Articulation } from "./articulation.js";
import { BalanceController } from "./balance.js";
import { WallBrace } from "./brace.js";
import { solveTwoBone } from "../animation/ik.js";
const v3 = (v) => new T.Vector3(v.x, v.y, v.z);
const clamp = T.MathUtils.clamp;

// Transient hero reactions. Normal movement and all other actors retain PROMETHEUS.
export class PhysicalReactions {
  constructor(runtime) {
    this.r = runtime;
    this.settings = { mass: 75, friction: 0.7, stance: "standing" };
    this.external = new T.Vector3();
    this.cooldown = 0;
    this.history = [];
    this.completed = 0;
    this.last = null;
    this.state = "balanced";
    this.cpuMs = 0;
  }
  get active() {
    return !!this.art;
  }
  get fullPhysical() {
    return this.active && !this.art.anchored;
  }
  ownsCollider(collider) {
    return this.members?.has(collider.handle) ?? false;
  }
  configure(settings) {
    this.clear();
    this.settings.mass = clamp(
      Number(settings.mass ?? this.settings.mass),
      45,
      120,
    );
    this.settings.friction = clamp(
      Number(settings.friction ?? this.settings.friction),
      0.12,
      1,
    );
    this.settings.stance = settings.stance ?? this.settings.stance;
  }
  start() {
    if (this.active) return;
    const c = this.r.humans.hero;
    this.r.motion.interaction = null;
    if (this.r.motion.comparison) this.r.motion.restoreCast();
    this.art = new Articulation(this.r.world, c, {
      ...this.settings,
      anchored: true,
      excludeCollider: this.r.player.collider,
    });
    this.art.setAnchored(true);
    this.brace = new WallBrace(this.r.world, this.art);
    this.capturedPelvis = this.art.links.get("pelvis").targetPosition.clone();
    this.members = new Set(
      [...this.art.links.values()].map((l) => l.collider.handle),
    );
    this.balance = new BalanceController({
      ...this.settings,
      height: c.identity.height,
      gravity: 18,
    });
    this.balance.update(0, {
      com: this.art.stats().com,
      velocity: { x: 0, y: 0, z: 0 },
      supportPoints: [],
      grounded: this.r.player.grounded,
    });
    this.age = 0;
    this.recoverAge = null;
    this.settleAge = 0;
    this.maxEnergy = 0;
    this.peakDisplacement = 0;
    this.origin = v3(this.r.player.body.translation());
    this.originalCulling = c.mesh.frustumCulled;
    c.mesh.frustumCulled = false;
    this.state = "correcting";
  }
  impact({
    impulse,
    source = "push",
    link = "chest",
    velocity,
    forceFall = false,
  }) {
    if (![impulse.x, impulse.y, impulse.z].every(Number.isFinite))
      throw Error("Non-finite impact");
    this.start();
    if (!this.art.anchored) {
      this.recoverAge = null;
      this.recoveryTarget = null;
      this.settleAge = 0;
    }
    const j = v3(impulse).clampLength(0, 800);
    const point = this.r.humans.hero.rig.named[
      link === "pelvis" ? "pelvis" : "chest"
    ].getWorldPosition(new T.Vector3());
    const incoming = velocity ?? this.r.player.achievedVelocity;
    this.balance.impact({
      impulse: j,
      point,
      velocity: incoming,
      source,
      stance: this.settings.stance,
    });
    this.art.impulse(j, link);
    this.external.addScaledVector(j, 0.7 / this.settings.mass).setY(0);
    this.episode = {
      source,
      impulse: j.toArray(),
      magnitude: j.length(),
      mass: this.settings.mass,
      friction: this.settings.friction,
      incoming: { ...incoming },
    };
    this.history.push(this.episode);
    if (this.history.length > 24) this.history.shift();
    this.age = 0;
    this.cooldown = 1.2;
    this.recoveryStepRequested = false;
    if (forceFall || j.length() / this.settings.mass > 2.8) this.releaseRoot();
    return this.episode;
  }
  releaseRoot() {
    if (!this.active || !this.art.anchored) return;
    this.art.setAnchored(false);
    this.r.player.collider.setEnabled(false);
    this.r.player.externalVelocity = null;
    this.state = "falling";
    this.r.player.grounded = false;
    this.r.humans.heroMotion.reset();
    // Carry the pre-impact travel velocity into the articulated fall.
    const travel = this.r.player.achievedVelocity;
    for (const { body } of this.art.links.values()) {
      const current = body.linvel();
      body.setLinvel(
        { x: current.x + travel.x, y: current.y, z: current.z + travel.z },
        true,
      );
    }
  }
  beforePhysics(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.active) return true;
    const start = performance.now();
    this.age += dt;
    this.external.multiplyScalar(
      Math.exp(-dt * (1.8 + this.settings.friction * 4)),
    );
    if (this.art.anchored) this.r.player.externalVelocity = this.external;
    if (this.art.anchored) {
      // Translate the captured pelvis target with each fixed controller step, even at low render cadence.
      const root = this.art.links.get("pelvis");
      const p = this.r.player.body.translation();
      const visual = this.r.humans.hero.group.position;
      const offset = new T.Vector3(
        p.x - visual.x,
        p.y - 0.87 - visual.y,
        p.z - visual.z,
      );
      root.targetPosition
        .copy(this.capturedPelvis ?? root.targetPosition)
        .add(offset);
    }
    this.art.drive(dt, this.art.anchored ? 0.8 : 0.06);
    const yaw = this.r.humans.hero.group.rotation.y;
    this.brace.update(dt, {
      enabled: (this.feedback?.brace ?? 0) > 0.2 && this.age < 1.2,
      direction: { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) },
      side: "R",
    });
    this.cpuMs = performance.now() - start;
    return this.art.anchored;
  }
  afterPhysics(dt) {
    if (!this.active) {
      // Collision response is fed by a measured blocked horizontal velocity, once per encounter.
      const hit = this.r.player.lastImpact;
      if (hit && !this.r.validation && !this.cooldown && hit.speed > 3.2) {
        this.impact({
          impulse: v3(hit.direction).multiplyScalar(
            this.settings.mass * hit.speed * 0.45,
          ),
          source: "running obstacle",
        });
      }
      return;
    }
    const start = performance.now();
    const stats = this.art.stats();
    this.physical = stats;
    const com = stats.com ?? stats.centerOfMass;
    const speed = this.art.pelvis.linvel();
    this.maxEnergy = Math.max(
      this.maxEnergy,
      stats.energy ?? stats.kineticEnergy ?? 0,
    );
    this.peakDisplacement = Math.max(
      this.peakDisplacement,
      Math.hypot(com.x - this.origin.x, com.z - this.origin.z),
    );
    const feet = this.r.humans.heroMotion.feet;
    const supportPoints = [];
    for (const f of feet)
      if (f.locked) {
        for (const [x, z] of [
          [-0.065, -0.09],
          [0.065, -0.09],
          [0.065, 0.16],
          [-0.065, 0.16],
        ])
          supportPoints.push({
            x: f.point.x + x,
            y: f.point.y,
            z: f.point.z + z,
          });
      }
    this.feedback = this.balance.update(dt, {
      com,
      velocity: this.art.anchored ? this.external : speed,
      supportPoints,
      grounded: this.art.anchored
        ? this.r.player.grounded
        : (stats.contacts ?? 0) > 0,
      angularSpeed: v3(this.art.pelvis.angvel()).length(),
    });
    if (this.art.anchored) {
      // Prediction and executed response are different: partial mode has not collapsed.
      this.state =
        this.age > 1.8
          ? "recovering"
          : this.feedback.state === "stepping" || this.external.length() > 0.22
            ? "stepping"
            : "correcting";
      // The partial simulation uses a controller-owned pelvis; a loss of capturability releases it.
      if (
        this.feedback.state === "falling" &&
        this.age > 0.15 &&
        this.external.length() > 1.1
      )
        this.releaseRoot();
      if (this.age > 2.4 && this.external.length() < 0.08) this.finish();
    } else {
      this.state = this.recoverAge === null ? "falling" : "recovering";
      const p = this.art.pelvis.translation();
      if (this.recoverAge === null) {
        // The disabled capsule is a camera/streaming proxy; it exerts no force on the articulated body.
        this.r.player.body.setTranslation({ x: p.x, y: p.y, z: p.z }, true);
        this.r.player.body.setNextKinematicTranslation({
          x: p.x,
          y: p.y,
          z: p.z,
        });
        const slow =
          v3(speed).length() < 0.9 &&
          v3(this.art.pelvis.angvel()).length() < 2.5;
        this.settleAge = slow ? this.settleAge + dt : 0;
        if (this.age > 1.4 && this.settleAge > 0.4) this.beginRecovery();
      } else {
        this.recoverAge += dt;
        if (this.recoverAge >= 1.4) {
          const target = this.recoveryPosition();
          if (!target) {
            this.recoverAge = null;
            this.recoveryTarget = null;
            this.recoveryBlocked = true;
          } else {
            this.finish();
            this.r.player.teleport(target);
          }
        }
      }
      if (p.y < -8) {
        this.clear();
        this.r.reset();
      }
    }
    this.cpuMs += performance.now() - start;
  }
  recoveryPosition() {
    const p = this.art.pelvis.translation();
    const world = this.r.world;
    const members = new Set(
      [...this.art.links.values()].map((l) => l.collider.handle),
    );
    const filter = (c) =>
      !members.has(c.handle) &&
      !c.isSensor() &&
      c.handle !== this.r.player.collider.handle;
    for (const [dx, dz] of [
      [0, 0],
      [0.5, 0],
      [-0.5, 0],
      [0, 0.5],
      [0, -0.5],
      [0.8, 0.8],
      [-0.8, -0.8],
    ]) {
      const ray = new RAPIER.Ray(
        { x: p.x + dx, y: p.y + 1, z: p.z + dz },
        { x: 0, y: -1, z: 0 },
      );
      const hit = world.castRayAndGetNormal(
        ray,
        4,
        true,
        undefined,
        undefined,
        undefined,
        undefined,
        filter,
      );
      if (!hit || hit.normal.y < 0.65) continue;
      const candidate = {
        x: p.x + dx,
        y: p.y + 1 - hit.timeOfImpact + 0.9,
        z: p.z + dz,
      };
      const overlap = world.intersectionWithShape(
        candidate,
        { x: 0, y: 0, z: 0, w: 1 },
        new RAPIER.Capsule(0.55, 0.32),
        undefined,
        undefined,
        undefined,
        undefined,
        filter,
      );
      if (!overlap) return candidate;
    }
    return null;
  }
  beginRecovery() {
    if (!this.active || this.recoverAge !== null) return false;
    const target = this.recoveryPosition();
    if (!target) {
      this.recoveryBlocked = true;
      return false;
    }
    this.recoveryBlocked = false;
    this.recoveryTarget = target;
    this.recoverAge = 0;
    this.r.player.body.setTranslation(target, true);
    this.r.player.body.setNextKinematicTranslation(target);
    this.r.player.grounded = true;
    this.r.humans.heroMotion.reset();
    return true;
  }
  pose() {
    if (!this.active) return;
    const c = this.r.humans.hero;
    if (this.art.anchored && this.feedback) {
      if (
        !this.recoveryStepRequested &&
        this.r.player.grounded &&
        this.episode.magnitude / this.settings.mass > 0.9 &&
        this.age < 1.8
      ) {
        this.recoveryStepRequested =
          this.r.humans.heroMotion.requestRecoveryStep({
            direction: this.feedback.stepDirection,
            distance: this.feedback.stepDistance,
            sampleGround: this.r.motion.sample,
          });
      }
      const lean = this.feedback.lean ?? { x: 0, z: 0 };
      const yaw = c.group.rotation.y;
      c.rig.named.spine.rotation.x += clamp(
        (lean.x ?? 0) * Math.cos(yaw) - (lean.z ?? 0) * Math.sin(yaw),
        -0.22,
        0.22,
      );
      c.rig.named.spine.rotation.z += clamp(
        (lean.z ?? 0) * Math.cos(yaw) + (lean.x ?? 0) * Math.sin(yaw),
        -0.22,
        0.22,
      );
      const brace = this.feedback.brace ?? 0;
      for (const side of ["L", "R"]) {
        c.rig.named["upperArm" + side].rotation.x -= brace * 0.75;
        c.rig.named["forearm" + side].rotation.x -= brace * 0.4;
      }
      c.group.updateMatrixWorld(true);
    }
    this.art.captureTargets();
    this.capturedPelvis = this.art.links.get("pelvis").targetPosition.clone();
    const fade = this.art.anchored
      ? 1 - T.MathUtils.smoothstep(this.age, 1.8, 2.4)
      : this.recoverAge === null
        ? 1
        : 1 - T.MathUtils.smoothstep(this.recoverAge, 0, 1.4);
    this.art.sync(fade);
    // Partial mode retains animated sole contact/swing authority. Full falls use
    // physical legs exclusively; this correction is not free-biped balance.
    if (this.art.anchored && this.r.player.grounded) {
      const yaw = c.group.rotation.y;
      const up = new T.Vector3(0, 1, 0);
      const forward = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      for (const f of this.r.humans.heroMotion.feet) {
        if (!f.initialized) continue;
        const n = c.rig.named;
        const target = f.point
          .clone()
          .addScaledVector(f.normal, c.identity.height * 0.06);
        const pole = c.group.position
          .clone()
          .addScaledVector(forward, c.identity.height)
          .addScaledVector(right, f.side === "L" ? -0.12 : 0.12)
          .add(new T.Vector3(0, c.identity.height * 0.35, 0));
        solveTwoBone(
          n["thigh" + f.side],
          n["shin" + f.side],
          n["ankle" + f.side],
          target,
          pole,
        );
        const foot = n["ankle" + f.side];
        const parent = foot.parent.getWorldQuaternion(new T.Quaternion());
        const world = new T.Quaternion()
          .setFromUnitVectors(up, f.normal)
          .multiply(
            new T.Quaternion().setFromAxisAngle(
              up,
              f.locked ? (f.yaw ?? yaw) : yaw,
            ),
          );
        foot.quaternion.copy(parent.invert().multiply(world));
      }
      c.group.updateMatrixWorld(true);
      c.rig.skeleton.update();
    }
    this.physicalFootError = 0;
    if (this.art.anchored)
      for (const f of this.r.humans.heroMotion.feet)
        if (f.locked) {
          const target = f.point
            .clone()
            .addScaledVector(f.normal, c.identity.height * 0.06);
          const actual = c.rig.named["ankle" + f.side].getWorldPosition(
            new T.Vector3(),
          );
          this.physicalFootError = Math.max(
            this.physicalFootError,
            actual.distanceTo(target),
          );
        }
  }
  finish() {
    this.last = { ...this.stats(), completed: true };
    this.completed++;
    this.clear();
  }
  clear() {
    if (this.art) {
      this.brace?.dispose();
      this.brace = null;
      if (!this.art.anchored) {
        const standing =
          this.recoveryTarget ?? this.recoveryPosition() ?? this.origin;
        this.r.player.teleport(standing);
      }
      this.art.dispose();
      this.r.humans.hero.mesh.frustumCulled = this.originalCulling;
      this.art = null;
      this.members = null;
      this.capturedPelvis = null;
      this.r.player.collider.setEnabled(true);
      this.r.humans.heroMotion.reset();
    }
    this.external.set(0, 0, 0);
    this.r.player.externalVelocity = null;
    this.state = "balanced";
    this.recoverAge = null;
    this.recoveryTarget = null;
  }
  stats() {
    return {
      active: this.active,
      state: this.state,
      mode: this.active
        ? this.art.anchored
          ? "partial / pelvis controlled"
          : "full physical"
        : "animation",
      settings: { ...this.settings },
      age: this.age ?? 0,
      cpuMs: this.cpuMs,
      physicalFootError:
        this.active && this.art.anchored ? (this.physicalFootError ?? 0) : null,
      completed: this.completed,
      episode: this.episode ?? null,
      balance: this.feedback ?? null,
      brace: this.brace?.stats() ?? null,
      physical: this.active ? (this.physical ?? this.art.stats()) : null,
      maxEnergy: this.maxEnergy ?? 0,
      peakDisplacement: this.peakDisplacement ?? 0,
      recoveryBlocked: !!this.recoveryBlocked,
    };
  }
  dispose() {
    this.clear();
  }
}
