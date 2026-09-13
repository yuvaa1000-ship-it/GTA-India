import * as T from "three";
import { solveTwoBone } from "./ik.js";
import { MotionState, motionStyle, damp, angleDelta } from "./grammar.js";
const up = new T.Vector3(0, 1, 0);
const clamp = T.MathUtils.clamp;
// A contact-driven procedural controller, not a captured pose database or motion matching.
export class MotionController {
  constructor(character) {
    this.c = character;
    this.machine = new MotionState();
    this.feet = ["L", "R"].map((side) => ({
      side,
      point: new T.Vector3(),
      from: new T.Vector3(),
      to: new T.Vector3(),
      normal: up.clone(),
      progress: 1,
      locked: true,
      initialized: false,
    }));
    this.previous = null;
    this.yaw = 0;
    this.pelvis = 0;
    this.lean = 0;
    this.bank = 0;
    this.reachWeight = 0;
    this.context = {};
    this.interaction = null;
    this.resetCount = 0;
    this.steps = 0;
    this.previousSpeed = 0;
    this.metrics = {};
  }
  reset() {
    this.lastInteraction = null;
    this.reachWeight = 0;
    this.previous = null;
    this.feet.forEach((f) => {
      f.initialized = false;
      f.locked = true;
      f.progress = 1;
      f.previousLocked = false;
    });
    this.resetCount++;
  }
  update(time, dt, input = {}) {
    dt = clamp(dt, 0, 0.1);
    const destination = this.c.group.position.clone();
    const origin = this.previous?.clone() ?? destination.clone();
    const moving =
      destination.distanceTo(origin) > 0.01 &&
      destination.distanceTo(origin) < 1.5;
    const count = moving ? Math.max(1, Math.ceil(dt / (1 / 60))) : 1;
    let result,
      maxError = 0,
      maxDrift = 0;
    for (let i = 1; i <= count; i++) {
      this.c.group.position.lerpVectors(origin, destination, i / count);
      result = this.step(time - dt + (dt * i) / count, dt / count, input);
      maxError = Math.max(maxError, result.footError);
      maxDrift = Math.max(maxDrift, result.footActualSlide);
    }
    this.c.group.position.copy(destination);
    result.footError = maxError;
    result.footActualSlide = maxDrift;
    return result;
  }
  step(time, dt, input = {}) {
    dt = clamp(dt, 0, 0.1);
    const c = this.c,
      n = c.rig.named,
      h = c.identity.height,
      pos = c.group.position,
      style = motionStyle(this.context);
    const delta = this.previous
      ? pos.clone().sub(this.previous)
      : new T.Vector3();
    if (delta.length() > 1.5 || !this.previous) {
      this.reset();
      delta.set(0, 0, 0);
    }
    this.previous = pos.clone();
    const speed =
        input.speed ?? (dt > 0 ? Math.hypot(delta.x, delta.z) / dt : 0),
      grounded = input.grounded !== false;
    const velocity = input.velocity
      ? new T.Vector3(input.velocity.x, 0, input.velocity.z)
      : delta
          .clone()
          .setY(0)
          .multiplyScalar(dt > 0 ? 1 / dt : 0);
    if (velocity.lengthSq() < 1e-7 && speed > 0.1)
      velocity.set(
        Math.sin(c.group.rotation.y) * speed,
        0,
        Math.cos(c.group.rotation.y) * speed,
      );
    const yaw = c.group.rotation.y,
      turn = dt ? angleDelta(this.yaw, yaw) / dt : 0;
    this.yaw = yaw;
    const state = this.machine.update(
      dt,
      speed,
      grounded,
      input.vertical ?? 0,
      turn,
      this.interaction,
    );
    c.pose(time, dt, speed, grounded, input.gaze ?? 0); // preserved face and finger layer
    n.pelvis.position.copy(c.rig.bind.pelvis);
    n.pelvis.rotation.set(0, 0, 0);
    n.chest.scale.set(1, 1, 1); // avoid nonuniform limb scaling during IK
    const acceleration = clamp(
      (speed - this.previousSpeed) / Math.max(dt, 0.001),
      -12,
      12,
    );
    this.previousSpeed = speed;
    this.lean = damp(
      this.lean,
      clamp(
        acceleration * 0.012 + speed * 0.016 + style.fatigue * 0.08,
        -0.14,
        0.22,
      ),
      10,
      dt,
    );
    this.bank = damp(
      this.bank,
      clamp(-turn * speed * 0.015, -0.16, 0.16),
      9,
      dt,
    );
    n.spine.rotation.x = c.identity.posture + this.lean;
    n.spine.rotation.z = this.bank + style.injury * 0.045;
    n.head.rotation.x = -n.spine.rotation.x * 0.65;
    n.chest.rotation.y *= style.armScale;
    for (const side of ["L", "R"]) {
      n["upperArm" + side].rotation.x *= style.armScale;
      if (style.carry) {
        n["upperArm" + side].rotation.x = -0.5;
        n["forearm" + side].rotation.x = -1;
      }
      if (style.aim) {
        n["upperArm" + side].rotation.x = -1.3;
        n["forearm" + side].rotation.x = -0.2;
      }
    }
    const sample =
      input.sampleGround ?? ((x, z, y) => ({ y: pos.y, normal: up.clone() }));
    c.group.updateMatrixWorld(true);
    let contacts = 0,
      error = 0,
      slide = 0,
      actualSlide = 0,
      misses = 0;
    const forward = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)),
      right = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const bases = this.feet.map((f, i) =>
      pos.clone().addScaledVector(right, (i ? 1 : -1) * c.identity.hips * 0.55),
    );
    const moving = grounded && speed > 0.12 && !this.interaction;
    const stride = clamp(
      h * 0.44 * style.strideScale + speed * 0.035,
      0.38,
      1.12,
    );
    // Only one foot swings at once. Planted targets remain in world space.
    if (grounded && !this.feet.some((f) => f.progress < 1)) {
      const offsets = this.feet.map((f, i) =>
        f.initialized
          ? f.point.clone().sub(bases[i]).dot(velocity.clone().normalize())
          : 0,
      );
      let i = offsets[0] < offsets[1] ? 0 : 1;
      const turnStep = this.feet.some(
        (f, j) =>
          f.initialized &&
          (Math.abs(angleDelta(f.yaw ?? yaw, yaw)) > 0.45 ||
            f.point.distanceTo(bases[j]) > h * 0.16),
      );
      if (turnStep && !moving)
        i =
          Math.abs(angleDelta(this.feet[0].yaw ?? yaw, yaw)) >
          Math.abs(angleDelta(this.feet[1].yaw ?? yaw, yaw))
            ? 0
            : 1;
      if ((moving && offsets[i] < -stride * 0.22) || turnStep) {
        const f = this.feet[i];
        f.from.copy(f.point);
        f.to.copy(bases[i]);
        if (moving)
          f.to.addScaledVector(velocity.clone().normalize(), stride * 0.55);
        const ground = sample(f.to.x, f.to.z, pos.y);
        f.to.y = ground ? ground.y : pos.y;
        f.normal.copy(ground?.normal ?? up);
        f.progress = 0;
        f.locked = false;
        f.landingYaw = yaw;
        f.duration = clamp((stride / Math.max(speed, 1)) * 0.3, 0.035, 0.28);
        this.steps++;
      }
    }
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i],
        base = bases[i];
      if (!f.initialized) {
        const g = sample(base.x, base.z, pos.y);
        f.point.copy(base);
        f.point.y = g?.y ?? pos.y;
        f.normal.copy(g?.normal ?? up);
        f.initialized = true;
        f.locked = !!g;
        f.progress = 1;
        f.yaw = yaw;
        f.previousLocked = false;
      }
      if (!grounded) {
        f.initialized = false;
        f.locked = false;
        f.previousLocked = false;
        continue;
      }
      const old = f.point.clone();
      if (f.progress < 1) {
        f.progress = Math.min(1, f.progress + dt / f.duration);
        const smooth = f.progress * f.progress * (3 - 2 * f.progress);
        f.point.lerpVectors(f.from, f.to, smooth);
        f.point.y +=
          Math.sin(Math.PI * f.progress) *
          (style.lift + Math.max(0, f.to.y - f.from.y) * 0.6);
        if (f.progress === 1) {
          f.locked = true;
          f.yaw = f.landingYaw;
        }
      } else {
        // Re-sample height/normal at the same planted XZ; follow moving support vertically.
        const g = sample(f.point.x, f.point.z, pos.y);
        if (g) {
          f.point.y = g.y;
          f.normal.copy(g.normal);
        } else {
          misses++;
          f.locked = false;
        }
      }
      if (f.locked)
        slide = Math.max(
          slide,
          Math.hypot(f.point.x - old.x, f.point.z - old.z),
        );
      if (f.point.distanceTo(base) > h * 0.85) {
        f.initialized = false;
        f.locked = false;
      }
    }
    let desiredPelvis =
      this.interaction?.kind === "seat"
        ? clamp(
            this.interaction.position.y - pos.y - h * 0.52 + 0.08,
            -h * 0.3,
            0,
          )
        : -h * 0.022 -
          (state === "landing"
            ? 0.075 * Math.sin(Math.PI * clamp(this.machine.age / 0.16, 0, 1))
            : 0);
    let reachLimit = 0;
    if (grounded)
      for (let i = 0; i < 2; i++) {
        const f = this.feet[i],
          horizontal = Math.hypot(
            f.point.x - bases[i].x,
            f.point.z - bases[i].z,
          );
        const reach = h * 0.46 * 0.985;
        const vertical = Math.sqrt(
          Math.max(0.01, reach * reach - horizontal * horizontal),
        );
        reachLimit = Math.min(
          reachLimit,
          f.point.y + h * 0.06 + vertical - (pos.y + h * 0.52),
        );
      }
    if (this.interaction && this.interaction.kind !== "seat") {
      const side = this.interaction.side === "L" ? -1 : 1;
      const shoulder = pos
        .clone()
        .addScaledVector(right, side * c.identity.shoulders);
      const target = this.interaction.position;
      const horizontal = Math.hypot(
          target.x - shoulder.x,
          target.z - shoulder.z,
        ),
        reach = h * 0.35 * 0.97;
      if (horizontal < reach)
        desiredPelvis = Math.min(
          desiredPelvis,
          target.y +
            Math.sqrt(reach * reach - horizontal * horizontal) -
            (pos.y + h * 0.81),
        );
    }
    desiredPelvis = Math.min(desiredPelvis, reachLimit);
    this.pelvis = damp(
      this.pelvis,
      clamp(desiredPelvis, -h * 0.28, 0.06),
      18,
      dt,
    );
    if (grounded)
      this.pelvis = Math.min(this.pelvis, Math.max(-h * 0.28, reachLimit));
    n.pelvis.position.y += this.pelvis;
    c.group.updateMatrixWorld(true);
    if (grounded)
      for (const f of this.feet) {
        const target = f.point.clone().addScaledVector(f.normal, h * 0.06);
        const pole = pos
          .clone()
          .addScaledVector(forward, h)
          .addScaledVector(right, f.side === "L" ? -0.12 : 0.12)
          .add(new T.Vector3(0, h * 0.35, 0));
        const result = solveTwoBone(
          n["thigh" + f.side],
          n["shin" + f.side],
          n["ankle" + f.side],
          target,
          pole,
        );
        const foot = n["ankle" + f.side],
          parentQ = new T.Quaternion();
        foot.parent.getWorldQuaternion(parentQ);
        const worldQ = new T.Quaternion()
          .setFromUnitVectors(up, f.normal)
          .multiply(
            new T.Quaternion().setFromAxisAngle(
              up,
              f.locked ? (f.yaw ?? yaw) : yaw,
            ),
          );
        foot.quaternion.copy(parentQ.invert().multiply(worldQ));
        n["toe" + f.side].rotation.x = f.locked ? -0.035 : 0.1;
        const achieved = foot.getWorldPosition(new T.Vector3());
        if (f.locked) {
          contacts++;
          error = Math.max(error, achieved.distanceTo(target));
          if (f.previousLocked && f.previousSolved)
            actualSlide = Math.max(
              actualSlide,
              Math.hypot(
                achieved.x - f.previousSolved.x,
                achieved.z - f.previousSolved.z,
              ),
            );
        }
        f.previousSolved = achieved;
        f.previousLocked = f.locked;
      }
    this.reachWeight = damp(this.reachWeight, this.interaction ? 1 : 0, 12, dt);
    let reachError = null,
      reachable = null;
    if (this.interaction) this.lastInteraction = this.interaction;
    if (this.lastInteraction && this.reachWeight > 0.001) {
      const it = this.lastInteraction,
        side = it.side ?? "R";
      const target = it.handPosition ?? it.position;
      if (it.kind !== "seat" || it.handPosition) {
        c.group.updateMatrixWorld(true);
        const hand = n["hand" + side].getWorldPosition(new T.Vector3());
        const goal = hand.lerp(target, this.reachWeight);
        const pole = n["upperArm" + side]
          .getWorldPosition(new T.Vector3())
          .addScaledVector(right, side === "L" ? -0.7 : 0.7)
          .addScaledVector(forward, 0.35);
        const r = solveTwoBone(
          n["upperArm" + side],
          n["forearm" + side],
          n["hand" + side],
          goal,
          pole,
        );
        reachError = n["hand" + side]
          .getWorldPosition(new T.Vector3())
          .distanceTo(target);
        reachable = r.reachable;
        n.chest.rotation.y += clamp(
          angleDelta(yaw, Math.atan2(target.x - pos.x, target.z - pos.z)) *
            0.12,
          -0.18,
          0.18,
        );
        // Re-solve after spine aiming so the hand remains object-relative.
        c.group.updateMatrixWorld(true);
        solveTwoBone(
          n["upperArm" + side],
          n["forearm" + side],
          n["hand" + side],
          goal,
          pole,
        );
        reachError = n["hand" + side]
          .getWorldPosition(new T.Vector3())
          .distanceTo(target);
      }
    }
    n.armTwistL.quaternion
      .copy(n.upperArmL.quaternion)
      .slerp(new T.Quaternion(), 0.6);
    n.armTwistR.quaternion
      .copy(n.upperArmR.quaternion)
      .slerp(new T.Quaternion(), 0.6);
    c.group.updateMatrixWorld(true);
    c.rig.skeleton.update();
    this.metrics = {
      state,
      transitions: this.machine.changes,
      steps: this.steps,
      contacts,
      footError: error,
      footTargetSlide: slide,
      footActualSlide: actualSlide,
      misses,
      reachError,
      reachable,
      pelvisOffset: this.pelvis,
      speed,
      trajectory: [pos.x + velocity.x * 0.3, pos.z + velocity.z * 0.3],
      context: style.surface,
      resetCount: this.resetCount,
    };
    return this.metrics;
  }
}
