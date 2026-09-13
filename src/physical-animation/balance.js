// Experimental control policy; this module does not apply forces or move a rig.
// SI units: metres, seconds, kilograms, impulses in N*s, angular impulse in N*m*s.
// Capture-point model: Pratt et al. (2006), constant-height linear inverted pendulum.
// https://www.cs.cmu.edu/~cga/legs/Pratt_Goswami_Humanoids2006.pdf
// State thresholds, stance gains and response timings below are DESIGN CHOICES,
// not biomechanically calibrated human limits or a general proof of capturability.

const EPS = 1e-9;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const number = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
const vector = (v = {}) => ({
  x: number(v?.x),
  y: number(v?.y),
  z: number(v?.z),
});
const length = (v) => Math.hypot(v.x, v.y, v.z);
const horizontal = (v) => Math.hypot(v.x, v.z);
const cross2 = (a, b, c) =>
  (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
const mix = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));

export const BALANCE_POLICY = Object.freeze({
  correctingImpulse: 0.035,
  steppingImpulse: 0.22,
  fallingImpulse: 0.85,
  correctionDistance: 0.018,
  steppingDistance: 0.09,
  fallingDistance: 0.42,
  releaseDistance: 0.012,
  stableVelocity: 0.45,
  stableAngularSpeed: 0.9,
  airborneGrace: 0.14,
  minimumFallTime: 0.45,
  settledTime: 0.35,
  recoveryTime: 0.85,
});

const STANCES = Object.freeze({
  narrow: 0.72,
  neutral: 1,
  wide: 1.2,
  crouched: 1.25,
  seated: 1.3,
});

/** Convex hull on the horizontal XZ plane, counterclockwise, without duplicates. */
export function supportHull(points = []) {
  const valid = points.filter(
    (p) => p && [p.x, p.y, p.z].every(Number.isFinite),
  );
  const sorted = [
    ...new Map(valid.map((p) => [`${p.x},${p.z}`, { ...p }])).values(),
  ].sort((a, b) => a.x - b.x || a.z - b.z);
  if (sorted.length < 3) return sorted;
  const half = (list) => {
    const hull = [];
    for (const p of list) {
      while (hull.length > 1 && cross2(hull.at(-2), hull.at(-1), p) <= EPS)
        hull.pop();
      hull.push(p);
    }
    return hull;
  };
  const low = half(sorted),
    high = half([...sorted].reverse());
  return [...low.slice(0, -1), ...high.slice(0, -1)];
}

function segmentProjection(point, a, b) {
  const x = b.x - a.x,
    z = b.z - a.z;
  const t = clamp(
    ((point.x - a.x) * x + (point.z - a.z) * z) / Math.max(EPS, x * x + z * z),
    0,
    1,
  );
  return { x: a.x + x * t, y: a.y + (b.y - a.y) * t, z: a.z + z * t };
}

/** Signed distance: positive outside, negative inside; zero at the boundary.
 * A single point or line segment has no interior area. No support returns null.
 */
export function supportDistance(point, hull) {
  if (!hull.length)
    return { signed: null, distance: null, closest: null, inside: false };
  let closest = hull[0],
    best = Infinity;
  const count = Math.max(1, hull.length === 2 ? 1 : hull.length);
  for (let i = 0; i < count; i++) {
    const p = segmentProjection(point, hull[i], hull[(i + 1) % hull.length]);
    const d = Math.hypot(p.x - point.x, p.z - point.z);
    if (d < best) {
      best = d;
      closest = p;
    }
  }
  const inside =
    hull.length > 2 &&
    hull.every((p, i) => cross2(p, hull[(i + 1) % hull.length], point) >= -EPS);
  return {
    signed: inside ? -best : best,
    distance: inside ? 0 : best,
    closest: { ...closest },
    inside,
  };
}

/**
 * Standing/contact-recovery decision model, not a dynamic walking stabilizer.
 * Feed real COM, velocity and foot/contact polygon from physics. During normal
 * running a stop capture point outside today's support is not itself an injury.
 * The caller owns articulation, root motion, step execution and recovery poses.
 */
export class BalanceController {
  constructor({ mass = 75, height = 1.74, gravity = 18, friction = 0.7 } = {}) {
    this.mass = clamp(number(mass, 75), 1, 1000);
    this.height = clamp(number(height, 1.74), 0.3, 3);
    this.gravity = clamp(Math.abs(number(gravity, 18)), 0.1, 50);
    this.friction = clamp(number(friction, 0.7), 0.02, 2);
    this.reset();
  }
  reset() {
    this.state = "balanced";
    this.age = 0;
    this.transitions = 0;
    this.elapsed = 0;
    this.stableTime = 0;
    this.airTime = 0;
    this.recoveryProgress = 0;
    this.impactStrength = 0;
    this.impactAge = Infinity;
    this.stance = "neutral";
    this.estimatedVelocity = vector();
    this.com = { x: 0, y: this.height * 0.54, z: 0 };
    this.lean = { x: 0, z: 0 };
    this.brace = 0;
    this.lastImpact = null;
    this.lastReport = null;
  }
  transition(next) {
    if (this.state === next) return;
    this.state = next;
    this.age = 0;
    this.stableTime = 0;
    this.transitions++;
    if (next === "falling") this.recoveryProgress = 0;
  }
  /** velocity, when supplied here, is the PRE-impact physical COM velocity.
   * update.velocity is POST-impact measured velocity; it replaces the estimate
   * and is never added to impulse a second time. Source labels are metadata only.
   */
  impact({ impulse, point, velocity, source = "contact", stance } = {}) {
    const j = vector(impulse);
    // Finite numerical guard only; normal test impulses are far below this.
    const cap = this.mass * 100,
      magnitude = length(j);
    if (magnitude > cap) {
      const scale = cap / magnitude;
      j.x *= scale;
      j.y *= scale;
      j.z *= scale;
    }
    if (STANCES[stance]) this.stance = stance;
    const deltaVelocity = {
      x: j.x / this.mass,
      y: j.y / this.mass,
      z: j.z / this.mass,
    };
    const before = velocity ? vector(velocity) : this.estimatedVelocity;
    const after = {
      x: before.x + deltaVelocity.x,
      y: before.y + deltaVelocity.y,
      z: before.z + deltaVelocity.z,
    };
    this.estimatedVelocity = after;
    const hit = point ? vector(point) : { ...this.com };
    const r = {
      x: hit.x - this.com.x,
      y: hit.y - this.com.y,
      z: hit.z - this.com.z,
    };
    const angularImpulse = {
      x: r.y * j.z - r.z * j.y,
      y: r.z * j.x - r.x * j.z,
      z: r.x * j.y - r.y * j.x,
    };
    // Uniform vertical rod approximation for assessing angular disturbance only.
    const inertia = (this.mass * this.height * this.height) / 12;
    const deltaAngularVelocity = {
      x: angularImpulse.x / inertia,
      y: angularImpulse.y / inertia,
      z: angularImpulse.z / inertia,
    };
    const characteristicSpeed = Math.sqrt(this.gravity * this.height * 0.54);
    const severity =
      magnitude > 0
        ? (horizontal(deltaVelocity) +
            Math.abs(deltaVelocity.y) * 0.2 +
            horizontal(deltaAngularVelocity) * this.height * 0.07 +
            horizontal(after) * 0.15) /
          characteristicSpeed
        : 0;
    this.impactStrength = Math.max(this.impactStrength, severity);
    this.impactAge = 0;
    const thresholdScale =
      STANCES[this.stance] * Math.sqrt(this.friction / 0.7);
    const response =
      severity >= BALANCE_POLICY.fallingImpulse * thresholdScale
        ? "falling"
        : severity >= BALANCE_POLICY.steppingImpulse * thresholdScale
          ? "stepping"
          : severity >= BALANCE_POLICY.correctingImpulse
            ? "correcting"
            : "balanced";
    if (response === "falling") this.transition(response);
    else if (
      !["falling", "recovering"].includes(this.state) &&
      response !== "balanced"
    )
      this.transition(response);
    this.lastImpact = {
      source: String(source),
      impulse: { ...j },
      magnitude: length(j),
      point: hit,
      deltaVelocity,
      preVelocity: { ...before },
      postVelocity: { ...after },
      momentum: {
        x: this.mass * after.x,
        y: this.mass * after.y,
        z: this.mass * after.z,
      },
      angularImpulse,
      deltaAngularVelocity,
      inertia,
      severity,
      response,
    };
    return this.lastImpact;
  }
  update(
    dt,
    {
      com,
      velocity,
      supportPoints = [],
      grounded = false,
      angularSpeed = 0,
      stance,
    } = {},
  ) {
    dt = clamp(number(dt), 0, 0.1);
    this.elapsed += dt;
    this.age += dt;
    this.impactAge += dt;
    if (STANCES[stance]) this.stance = stance;
    this.com = com ? vector(com) : this.com;
    const v = velocity ? vector(velocity) : { ...this.estimatedVelocity };
    this.estimatedVelocity = { ...v };
    const hull = supportHull(supportPoints);
    const supportY = hull.length
      ? hull.reduce((s, p) => s + p.y, 0) / hull.length
      : this.com.y - this.height * 0.54;
    const comHeight = clamp(
      this.com.y - supportY,
      this.height * 0.2,
      this.height * 0.8,
    );
    const omega = Math.sqrt(this.gravity / comHeight);
    const capturePoint = {
      x: this.com.x + v.x / omega,
      y: supportY,
      z: this.com.z + v.z / omega,
    };
    const support = supportDistance(capturePoint, hull);
    const supported = !!grounded && hull.length > 0;
    this.airTime = supported ? 0 : this.airTime + dt;
    const outside = support.distance ?? this.height;
    const traction = clamp(this.friction, 0.02, 2);
    const scale = STANCES[this.stance] * Math.sqrt(traction / 0.7);
    const speed = horizontal(v),
      angular = Math.abs(number(angularSpeed));
    const stoppingDistance = (speed * speed) / (2 * traction * this.gravity);
    const stepLimit = this.height * BALANCE_POLICY.steppingDistance * scale;
    const fallLimit = this.height * BALANCE_POLICY.fallingDistance * scale;
    const pending = this.impactStrength * Math.exp(-this.impactAge / 0.42);
    const severe =
      pending >= BALANCE_POLICY.fallingImpulse * scale ||
      this.airTime > BALANCE_POLICY.airborneGrace ||
      (supported &&
        (outside > fallLimit ||
          stoppingDistance > this.height * 0.8 ||
          angular > 5));
    const needsStep =
      supported &&
      (outside > stepLimit ||
        stoppingDistance > this.height * 0.14 * scale ||
        pending > BALANCE_POLICY.steppingImpulse * scale);
    const needsCorrection =
      supported &&
      (outside > this.height * BALANCE_POLICY.correctionDistance ||
        pending > BALANCE_POLICY.correctingImpulse ||
        angular > 0.25);
    const stable =
      supported &&
      outside < this.height * BALANCE_POLICY.releaseDistance &&
      speed < BALANCE_POLICY.stableVelocity &&
      angular < BALANCE_POLICY.stableAngularSpeed &&
      pending < BALANCE_POLICY.correctingImpulse;

    if (severe) this.transition("falling");
    else if (this.state === "falling") {
      this.stableTime = stable ? this.stableTime + dt : 0;
      if (
        this.age >= BALANCE_POLICY.minimumFallTime &&
        this.stableTime >= BALANCE_POLICY.settledTime
      )
        this.transition("recovering");
    } else if (this.state === "recovering") {
      if (stable)
        this.recoveryProgress = Math.min(
          1,
          this.recoveryProgress + dt / BALANCE_POLICY.recoveryTime,
        );
      if (this.recoveryProgress >= 1 && stable) {
        this.transition("balanced");
        this.impactStrength = 0;
      }
    } else if (needsStep) this.transition("stepping");
    else if (needsCorrection) {
      if (this.state !== "stepping" || this.age >= 0.22)
        this.transition("correcting");
    } else if (stable && this.age >= 0.18) this.transition("balanced");

    const center = hull.length
      ? hull.reduce(
          (a, p) => ({
            x: a.x + p.x / hull.length,
            y: supportY,
            z: a.z + p.z / hull.length,
          }),
          { x: 0, y: supportY, z: 0 },
        )
      : { x: this.com.x, y: supportY, z: this.com.z };
    const offset = {
      x: capturePoint.x - center.x,
      y: 0,
      z: capturePoint.z - center.z,
    };
    const distance = horizontal(offset),
      maxStep = this.height * 0.45;
    const stepDirection =
      distance > EPS
        ? { x: offset.x / distance, y: 0, z: offset.z / distance }
        : vector();
    const stepDistance = Math.min(distance, maxStep);
    const stepTarget = {
      x: center.x + stepDirection.x * stepDistance,
      y: supportY,
      z: center.z + stepDirection.z * stepDistance,
    };
    this.lean.x = mix(
      this.lean.x,
      clamp((-offset.z / comHeight) * 0.45, -0.35, 0.35),
      12,
      dt,
    );
    this.lean.z = mix(
      this.lean.z,
      clamp((offset.x / comHeight) * 0.45, -0.35, 0.35),
      12,
      dt,
    );
    const braceTarget =
      this.state === "falling"
        ? 1
        : clamp(pending * 1.6 + outside / Math.max(EPS, fallLimit), 0, 0.85);
    this.brace = mix(this.brace, braceTarget, 14, dt);
    const driveStrength =
      this.state === "falling"
        ? 0.18
        : this.state === "recovering"
          ? 0.25 + this.recoveryProgress * 0.75
          : this.state === "stepping"
            ? 0.68
            : this.state === "correcting"
              ? 0.85
              : 1;
    // Used only if the caller omits measured velocity: bounded friction-limited
    // estimate, not an applied physical force or an override of observed momentum.
    if (!velocity && supported) {
      const slow = Math.max(0, speed - traction * this.gravity * dt);
      this.estimatedVelocity.x *= speed > EPS ? slow / speed : 0;
      this.estimatedVelocity.z *= speed > EPS ? slow / speed : 0;
    }
    this.lastReport = {
      state: this.state,
      age: this.age,
      transitions: this.transitions,
      grounded: supported,
      mass: this.mass,
      com: { ...this.com },
      velocity: { ...v },
      comHeight,
      omega,
      capturePoint,
      supportHull: hull,
      supportCenter: center,
      signedSupportDistance: support.signed,
      supportDistance: support.distance,
      stoppingDistance,
      friction: traction,
      stance: this.stance,
      stepDirection,
      stepDistance,
      stepTarget,
      stepReachable: distance <= maxStep,
      lean: { ...this.lean },
      brace: this.brace,
      driveStrength,
      damping: this.state === "falling" ? 0.85 : 1.1,
      recoveryProgress: this.recoveryProgress,
      stable,
      lastImpact: this.lastImpact,
    };
    return this.lastReport;
  }
}
