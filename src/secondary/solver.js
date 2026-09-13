import * as T from "three";
const clamp = T.MathUtils.clamp;
// XPBD distance constraints; bend uses second-neighbour distances, not shell bending energy.
export class ParticleSurface {
  constructor(
    points,
    edges,
    pins,
    {
      compliance = 1e-6,
      bend = 1e-4,
      damping = 3,
      mass = 0.03,
      tether = 0,
    } = {},
  ) {
    this.rest = points.map((p) => p.clone());
    this.p = points.map((p) => p.clone());
    this.old = points.map((p) => p.clone());
    this.pins = new Set(pins);
    this.mass = mass;
    this.damping = damping;
    this.tether = tether;
    this.edges = edges.map(([a, b, isBend = false]) => ({
      a,
      b,
      rest: points[a].distanceTo(points[b]),
      compliance: isBend ? bend : compliance,
      lambda: 0,
    }));
    this.initialized = false;
    this.steps = 0;
    this.resets = 0;
    this.collisions = 0;
    this.maxStretch = 0;
    this.previousMatrix = new T.Matrix4();
    this.delta = new T.Vector3();
  }
  reset(matrix) {
    this.p.forEach((p, i) => {
      p.copy(this.rest[i]).applyMatrix4(matrix);
      this.old[i].copy(p);
    });
    this.previousMatrix.copy(matrix);
    this.initialized = true;
    this.resets++;
  }
  advance(
    dt,
    matrix,
    { wind = new T.Vector3(), wet = 0, capsules = [], floor = -Infinity } = {},
  ) {
    if (!Number.isFinite(dt) || dt < 0)
      throw Error("Invalid secondary timestep");
    const origin = new T.Vector3().setFromMatrixPosition(matrix),
      previousOrigin = new T.Vector3().setFromMatrixPosition(
        this.previousMatrix,
      );
    if (
      !this.initialized ||
      origin.distanceTo(previousOrigin) > 1.5 ||
      dt > 0.3
    )
      this.reset(matrix);
    if (dt === 0) return;
    const count = Math.max(1, Math.ceil(Math.min(dt, 0.1) / (1 / 120))),
      h = Math.min(dt, 0.1) / count;
    const from = this.previousMatrix.clone();
    const q0 = new T.Quaternion(),
      q1 = new T.Quaternion(),
      s0 = new T.Vector3(),
      s1 = new T.Vector3(),
      a0 = new T.Vector3(),
      a1 = new T.Vector3();
    from.decompose(a0, q0, s0);
    matrix.decompose(a1, q1, s1);
    const frame = new T.Matrix4(),
      q = new T.Quaternion(),
      a = new T.Vector3(),
      scale = new T.Vector3();
    this.collisions = 0;
    const colliders = capsules.map((c) => {
      const radius = c.radius + 0.004;
      return {
        ...c,
        ax: c.b.x - c.a.x,
        ay: c.b.y - c.a.y,
        az: c.b.z - c.a.z,
        radius,
        minX: Math.min(c.a.x, c.b.x) - radius,
        maxX: Math.max(c.a.x, c.b.x) + radius,
        minY: Math.min(c.a.y, c.b.y) - radius,
        maxY: Math.max(c.a.y, c.b.y) + radius,
        minZ: Math.min(c.a.z, c.b.z) - radius,
        maxZ: Math.max(c.a.z, c.b.z) + radius,
      };
    });
    for (let k = 1; k <= count; k++) {
      const t = k / count;
      frame.compose(
        a.lerpVectors(a0, a1, t),
        q.slerpQuaternions(q0, q1, t),
        scale.lerpVectors(s0, s1, t),
      );
      const targets = this.rest.map((p) => p.clone().applyMatrix4(frame));
      const invMass = 1 / (this.mass * (1 + wet * 0.8)),
        drag = Math.exp(-(this.damping + wet * 5) * h);
      for (let i = 0; i < this.p.length; i++) {
        const p = this.p[i],
          old = this.old[i];
        if (this.pins.has(i)) {
          p.copy(targets[i]);
          old.copy(p);
          continue;
        }
        const vel = p
          .clone()
          .sub(old)
          .multiplyScalar(drag)
          .clampLength(0, 0.09);
        old.copy(p);
        p.add(vel)
          .addScaledVector(wind, h * h * (1 - wet * 0.45))
          .add(new T.Vector3(0, -9.81 * h * h, 0));
        if (this.tether) p.lerp(targets[i], 1 - Math.exp(-this.tether * h));
      }
      this.edges.forEach((e) => (e.lambda = 0));
      for (let iteration = 0; iteration < 7; iteration++) {
        for (const e of this.edges) {
          const u = this.p[e.a],
            v = this.p[e.b],
            n = this.delta.subVectors(u, v),
            length = n.length();
          if (length < 1e-9) continue;
          const wa = this.pins.has(e.a) ? 0 : invMass,
            wb = this.pins.has(e.b) ? 0 : invMass;
          if (wa + wb === 0) continue;
          const alpha = e.compliance / (h * h),
            dl = (-(length - e.rest) - alpha * e.lambda) / (wa + wb + alpha);
          e.lambda += dl;
          n.multiplyScalar(1 / length);
          u.addScaledVector(n, wa * dl);
          v.addScaledVector(n, -wb * dl);
        }
        for (let i = 0; i < this.p.length; i++) {
          if (this.pins.has(i)) continue;
          const p = this.p[i];
          if (p.y < floor + 0.006) {
            p.y = floor + 0.006;
            this.collisions++;
          }
          for (const c of colliders) {
            if (
              p.x < c.minX ||
              p.x > c.maxX ||
              p.y < c.minY ||
              p.y > c.maxY ||
              p.z < c.minZ ||
              p.z > c.maxZ
            )
              continue;
            const ax = c.ax,
              ay = c.ay,
              az = c.az,
              len = ax * ax + ay * ay + az * az;
            const t = len
              ? clamp(
                  ((p.x - c.a.x) * ax +
                    (p.y - c.a.y) * ay +
                    (p.z - c.a.z) * az) /
                    len,
                  0,
                  1,
                )
              : 0;
            const nx = c.a.x + ax * t,
              ny = c.a.y + ay * t,
              nz = c.a.z + az * t,
              dx = p.x - nx,
              dy = p.y - ny,
              dz = p.z - nz,
              distanceSq = dx * dx + dy * dy + dz * dz;
            if (distanceSq < c.radius * c.radius) {
              const d = Math.sqrt(distanceSq);
              const scale = c.radius / Math.max(d, 1e-8);
              p.set(
                nx + dx * scale,
                ny + dy * scale,
                nz + (d < 1e-8 ? -c.radius : dz * scale),
              );
              this.collisions++;
            }
          }
        }
      }
      this.steps++;
    }
    this.previousMatrix.copy(matrix);
    this.maxStretch = Math.max(
      0,
      ...this.edges
        .filter((e) => !this.pins.has(e.a) || !this.pins.has(e.b))
        .map(
          (e) =>
            Math.abs(this.p[e.a].distanceTo(this.p[e.b]) - e.rest) /
            Math.max(0.001, e.rest),
        ),
    );
  }
  stats() {
    return {
      particles: this.p.length,
      constraints: this.edges.length,
      steps: this.steps,
      resets: this.resets,
      collisions: this.collisions,
      maxStretch: this.maxStretch,
      finite: this.p.every((p) => p.toArray().every(Number.isFinite)),
    };
  }
}
