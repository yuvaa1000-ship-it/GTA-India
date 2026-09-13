import * as T from "three";
// Garment-specific panel proxies, not complete sewn garments. Dimensions are metres.
export const FABRICS = {
  shirt: {
    length: 0.18,
    width: 0.32,
    bend: 2e-5,
    damping: 6,
    tether: 14,
    mass: 0.035,
  },
  jacket: {
    length: 0.3,
    width: 0.38,
    bend: 5e-5,
    damping: 5,
    tether: 7,
    mass: 0.065,
  },
  kurta: {
    length: 0.67,
    width: 0.43,
    bend: 3e-4,
    damping: 2.8,
    tether: 2,
    mass: 0.035,
  },
  dupatta: {
    length: 0.86,
    width: 0.3,
    bend: 9e-4,
    damping: 1.8,
    tether: 0.8,
    mass: 0.016,
  },
  saree: {
    length: 0.78,
    width: 0.43,
    bend: 5e-4,
    damping: 2.6,
    tether: 1.1,
    mass: 0.026,
  },
  veshti: {
    length: 0.67,
    width: 0.47,
    bend: 2e-4,
    damping: 3.2,
    tether: 2,
    mass: 0.04,
  },
  dhoti: {
    length: 0.56,
    width: 0.39,
    bend: 3e-4,
    damping: 3.4,
    tether: 2.5,
    mass: 0.035,
  },
  shawl: {
    length: 0.62,
    width: 0.56,
    bend: 8e-5,
    damping: 4.2,
    tether: 1.5,
    mass: 0.07,
  },
  raincoat: {
    length: 0.73,
    width: 0.48,
    bend: 6e-5,
    damping: 4.5,
    tether: 2.3,
    mass: 0.06,
  },
  uniform: {
    length: 0.22,
    width: 0.34,
    bend: 1e-5,
    damping: 7,
    tether: 18,
    mass: 0.045,
  },
};
export function clothPattern(kind = "jacket", height = 1.74, detail = true) {
  const fabric = FABRICS[kind] ?? FABRICS.jacket,
    cols = detail ? 10 : 5,
    rows = detail ? 12 : 6;
  const points = [],
    edges = [],
    pins = [],
    triangles = [],
    uv = [];
  const scale = height / 1.74;
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x <= cols; x++) {
      const u = x / cols,
        v = y / rows;
      points.push(
        new T.Vector3(
          (u - 0.5) * fabric.width * scale,
          -v * fabric.length * scale,
          -0.155 - 0.035 * Math.sin(u * Math.PI * 6) * v,
        ),
      );
      uv.push(u, v);
      const i = y * (cols + 1) + x;
      if (y === 0) pins.push(i);
      if (x) edges.push([i - 1, i]);
      if (y) edges.push([i - cols - 1, i]);
      if (x && y) {
        edges.push([i - cols - 2, i], [i - cols - 1, i - 1]);
        triangles.push(i - cols - 2, i - 1, i, i - cols - 2, i, i - cols - 1);
      }
      if (x > 1) edges.push([i - 2, i, true]);
      if (y > 1) edges.push([i - 2 * (cols + 1), i, true]);
    }
  return {
    points,
    edges,
    pins,
    triangles,
    uv,
    settings: { ...fabric, compliance: 2e-7 },
    cols,
    rows,
    kind,
  };
}
export function hairPattern(style = "short", height = 1.74, detail = true) {
  const long = style === "long",
    strands = detail ? 18 : 9,
    segments = long ? 10 : 5,
    points = [],
    edges = [],
    pins = [];
  const length = (long ? 0.46 : 0.085) * (height / 1.74);
  for (let s = 0; s < strands; s++) {
    const angle = long
        ? Math.PI + (s / (strands - 1)) * Math.PI
        : (s / strands) * Math.PI * 2,
      root = new T.Vector3(
        Math.cos(angle) * 0.073,
        0.095 + Math.sin(s * 2.4) * 0.012,
        Math.sin(angle) * 0.06,
      );
    for (let j = 0; j <= segments; j++) {
      const t = j / segments,
        i = points.length;
      points.push(
        root
          .clone()
          .add(
            new T.Vector3(
              Math.cos(angle) * (long ? 0.018 : 0.04) * t,
              -length * t,
              Math.sin(angle) * (long ? 0.018 : 0.04) * t -
                (long ? 0.055 : 0) * t * t,
            ),
          ),
      );
      if (j === 0) pins.push(i);
      if (j) edges.push([i - 1, i]);
      if (j > 1) edges.push([i - 2, i, true]);
    }
  }
  return {
    points,
    edges,
    pins,
    strands,
    segments,
    settings: {
      compliance: 1e-8,
      bend: long ? 4e-5 : 1e-7,
      damping: long ? 2.2 : 6,
      mass: 0.004,
      tether: long ? 1.4 : 22,
    },
    style,
  };
}
