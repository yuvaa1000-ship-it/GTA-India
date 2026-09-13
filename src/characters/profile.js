import * as T from "three";

/** Elliptical loft in bind space; nonzero joint sections replace intersecting limb bulbs. */
export function profileGeometry(
  points,
  { radial = 24, subdivisions = 3, roundness = 1, folds = 0 } = {},
) {
  if (
    points.length < 2 ||
    points.some(
      (p) =>
        ![p.y, p.rx, p.rz, p.x ?? 0, p.z ?? 0].every(Number.isFinite) ||
        p.rx <= 0 ||
        p.rz <= 0,
    )
  )
    throw new Error("A profile requires finite positive cross sections");
  const rows = [];
  for (let j = 0; j < points.length - 1; j++) {
    const a = points[j],
      b = points[j + 1];
    if (b.y <= a.y)
      throw new Error("Profile sections must ascend in bind-space Y");
    for (let k = 0; k < subdivisions; k++) {
      const t = k / subdivisions,
        smooth = t * t * (3 - 2 * t),
        row = {};
      for (const key of ["x", "z", "rx", "rz"])
        row[key] = T.MathUtils.lerp(a[key] ?? 0, b[key] ?? 0, smooth);
      row.y = T.MathUtils.lerp(a.y, b.y, t);
      rows.push(row);
    }
  }
  rows.push(points.at(-1));
  const positions = [],
    uv = [],
    indices = [];
  const bottom = points[0].y,
    height = points.at(-1).y - bottom;
  for (const p of rows) {
    for (let i = 0; i <= radial; i++) {
      const angle = (i / radial) * Math.PI * 2;
      const signed = (n) => Math.sign(n) * Math.abs(n) ** roundness;
      const fold =
        1 +
        folds *
          Math.sin(angle * 6 + p.y * 9) *
          Math.sin(((p.y - bottom) / height) * Math.PI);
      positions.push(
        (p.x ?? 0) + signed(Math.cos(angle)) * p.rx * fold,
        p.y,
        (p.z ?? 0) + signed(Math.sin(angle)) * p.rz * fold,
      );
      uv.push(i / radial, (p.y - bottom) / height);
    }
  }
  for (let row = 0; row < rows.length - 1; row++)
    for (let i = 0; i < radial; i++) {
      const a = row * (radial + 1) + i,
        b = a + radial + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  // Separate cap vertices preserve flat cap normals and leave the mantle continuous.
  for (const [rowIndex, flip] of [
    [0, false],
    [rows.length - 1, true],
  ]) {
    const p = rows[rowIndex],
      center = positions.length / 3;
    positions.push(p.x ?? 0, p.y, p.z ?? 0);
    uv.push(0.5, 0.5);
    for (let i = 0; i <= radial; i++) {
      const source = (rowIndex * (radial + 1) + i) * 3;
      positions.push(...positions.slice(source, source + 3));
      uv.push(
        0.5 + Math.cos((i / radial) * Math.PI * 2) * 0.5,
        0.5 + Math.sin((i / radial) * Math.PI * 2) * 0.5,
      );
      if (i < radial) {
        const a = center + 1 + i,
          b = a + 1;
        indices.push(...(flip ? [center, b, a] : [center, a, b]));
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  for (let row = 0; row < rows.length; row++) {
    const first = row * (radial + 1),
      last = first + radial;
    const n = new T.Vector3()
      .fromBufferAttribute(normals, first)
      .add(new T.Vector3().fromBufferAttribute(normals, last))
      .normalize();
    normals.setXYZ(first, n.x, n.y, n.z);
    normals.setXYZ(last, n.x, n.y, n.z);
  }
  geometry.userData.profileRows = rows.length;
  geometry.userData.profileRadial = radial;
  return geometry;
}
