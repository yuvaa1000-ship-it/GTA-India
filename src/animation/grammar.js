import { MathUtils } from "three";
export const SURFACES = Object.freeze({
  road: { traction: 1, speed: 1, lift: 0.09 },
  wet: { traction: 0.65, speed: 0.92, lift: 0.1 },
  mud: { traction: 0.5, speed: 0.66, lift: 0.17 },
  sand: { traction: 0.7, speed: 0.8, lift: 0.13 },
  water: { traction: 0.55, speed: 0.6, lift: 0.2 },
});
export function motionContext(input = {}) {
  const bounded = (k) =>
    Number.isFinite(input[k]) ? MathUtils.clamp(input[k], 0, 1) : 0;
  return {
    surface: SURFACES[input.surface] ? input.surface : "road",
    injury: bounded("injury"),
    fatigue: bounded("fatigue"),
    urgency: bounded("urgency"),
    carry: !!input.carry,
    aim: !!input.aim,
    conversation: !!input.conversation,
  };
}
export function motionStyle(input) {
  const c = motionContext(input),
    s = SURFACES[c.surface];
  return {
    ...c,
    traction: s.traction,
    speedScale:
      s.speed *
      (1 - c.injury * 0.45) *
      (1 - c.fatigue * 0.2) *
      (c.carry ? 0.8 : 1) *
      (1 + c.urgency * 0.1),
    lift: s.lift + c.injury * 0.035,
    strideScale: 1 - c.injury * 0.25 - c.fatigue * 0.12,
    armScale: c.carry ? 0.15 : 1 - c.fatigue * 0.25,
  };
}
export class MotionState {
  state = "idle";
  age = 0;
  changes = 0;
  wasGrounded = true;
  update(dt, speed, grounded, vertical, turning = 0, interaction = null) {
    this.age += dt;
    let next = interaction
      ? interaction.kind === "seat"
        ? "seated"
        : "reach"
      : !grounded
        ? vertical > 0.1
          ? "rising"
          : "falling"
        : !this.wasGrounded || (this.state === "landing" && this.age < 0.16)
          ? "landing"
          : speed > 4.1
            ? "run"
            : speed > 0.12
              ? "walk"
              : Math.abs(turning) > 0.35
                ? "turn"
                : "idle";
    this.wasGrounded = grounded;
    if (next !== this.state) {
      this.state = next;
      this.age = 0;
      this.changes++;
    }
    return this.state;
  }
}
export const damp = (a, b, rate, dt) =>
  MathUtils.lerp(a, b, 1 - Math.exp(-rate * Math.max(0, dt)));
export const angleDelta = (a, b) =>
  Math.atan2(Math.sin(b - a), Math.cos(b - a));
