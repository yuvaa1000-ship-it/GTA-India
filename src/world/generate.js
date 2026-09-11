export function seedRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const keyOf = (x, z) => `${x},${z}`;
export function desiredCells(x, z, size = 64, radius = 2) {
  const cx = Math.floor((x + size / 2) / size),
    cz = Math.floor((z + size / 2) / size);
  const cells = [];
  for (let dx = -radius; dx <= radius; dx++)
    for (let dz = -radius; dz <= radius; dz++)
      cells.push({
        x: cx + dx,
        z: cz + dz,
        key: keyOf(cx + dx, cz + dz),
        priority: dx * dx + dz * dz,
      });
  return cells.sort((a, b) => a.priority - b.priority);
}
export function generateCell(x, z) {
  const r = seedRandom((x * 73856093) ^ (z * 19349663) ^ 893);
  const buildings = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const h = 6 + r() * 14;
      buildings.push({
        x: x * 64 + sx * 21,
        z: z * 64 + sz * 21,
        w: 17 + r() * 5,
        d: 17 + r() * 5,
        h,
        color: Math.floor(r() * 5),
      });
    }
  const props = Array.from({ length: 4 }, (_, i) => ({
    id: `${x},${z}:${i}`,
    x: x * 64 - 5 + i * 1.1,
    y: 1 + i * 0.1,
    z: z * 64 + 12,
  }));
  return { x, z, key: keyOf(x, z), buildings, props };
}
