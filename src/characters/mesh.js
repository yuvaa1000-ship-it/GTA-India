import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
// Parametric source geometry with real four-slot bone weights and relative morph deltas.
export function buildHumanGeometry(d, rig, tier = 0) {
  const parts = Array.from({ length: 6 }, () => []),
    radial = tier === 0 ? 24 : tier === 1 ? 16 : 8,
    rings = tier === 0 ? 16 : tier === 1 ? 10 : 6;
  function add(
    mat,
    center,
    scale,
    bone,
    chain = null,
    feature = null,
    thetaLength = Math.PI,
  ) {
    const g = new T.SphereGeometry(
      1,
      radial,
      rings,
      0,
      Math.PI * 2,
      0,
      thetaLength,
    );
    g.scale(...scale);
    g.translate(...center);
    const p = g.attributes.position,
      indices = [],
      weights = [],
      blink = [],
      smile = [],
      flex = [];
    for (let i = 0; i < p.count; i++) {
      const v = new T.Vector3().fromBufferAttribute(p, i);
      let a = rig.index[bone],
        b = a,
        w = 0;
      if (chain) {
        const candidates = chain
          .map((name) => ({ name, dist: Math.abs(v.y - rig.bind[name].y) }))
          .sort((a, b) => a.dist - b.dist);
        a = rig.index[candidates[0].name];
        b = rig.index[candidates[1].name];
        const sum = candidates[0].dist + candidates[1].dist;
        w = sum ? candidates[0].dist / sum : 0;
      }
      indices.push(a, b, 0, 0);
      weights.push(1 - w, w, 0, 0);
      blink.push(
        0,
        feature === "lid" ? -0.017 * (1 + (v.y - center[1]) / scale[1]) : 0,
        0,
      );
      smile.push(
        feature === "mouth" ? Math.sign(v.x) * 0.006 : 0,
        feature === "mouth" ? Math.abs(v.x) * 0.18 : 0,
        0,
      );
      flex.push(
        feature === "arm" ? (v.x - center[0]) * 0.14 : 0,
        0,
        feature === "arm" ? (v.z - center[2]) * 0.14 : 0,
      );
    }
    g.setAttribute("skinIndex", new T.Uint16BufferAttribute(indices, 4));
    g.setAttribute("skinWeight", new T.Float32BufferAttribute(weights, 4));
    g.morphTargetsRelative = true;
    g.morphAttributes.position = [blink, smile, flex].map((a, i) => {
      const b = new T.Float32BufferAttribute(a, 3);
      b.name = ["blink", "smile", "elbowCorrective"][i];
      return b;
    });
    parts[mat].push(g);
  }
  const h = d.height,
    b = d.build;
  add(2, [0, h * 0.52, 0], [d.hips * b, h * 0.09, 0.115 * b], "pelvis");
  add(1, [0, h * 0.69, 0], [d.shoulders * b, h * 0.16, 0.115 * b], "spine", [
    "pelvis",
    "spine",
    "chest",
  ]);
  if (d.garment === "kurta")
    add(
      1,
      [0, h * 0.5, 0],
      [d.hips * b * 1.18, h * 0.17, 0.135 * b],
      "pelvis",
      ["pelvis", "spine"],
    );
  if (d.garment === "jacket")
    add(
      5,
      [0, h * 0.71, -0.014],
      [d.shoulders * b * 1.04, h * 0.13, 0.12 * b],
      "chest",
      ["spine", "chest"],
    );
  add(0, [0, h * 0.855, 0], [0.047, h * 0.055, 0.048], "neck", [
    "neck",
    "chest",
  ]);
  add(0, [0, h * 0.925, 0], [d.faceWidth, h * 0.075, 0.088], "head");
  add(
    0,
    [0, h * 0.9, 0.035],
    [d.faceWidth * d.jaw * 0.82, 0.046, 0.071],
    "jaw",
  );
  add(0, [0, h * 0.932, 0.091], [d.noseWidth * 0.55, 0.029, 0.027], "head");
  add(0, [0, h * 0.92, 0.105], [d.noseWidth * 0.7, 0.013, 0.018], "head");
  add(5, [0, h * 0.896, 0.101], [0.034, 0.006, 0.004], "jaw", null, "mouth");
  if (tier < 2) {
    add(4, [0, h * 0.896, 0.103], [0.025, 0.003, 0.003], "jaw");
    add(0, [0, h * 0.883, 0.099], [0.024, 0.006, 0.007], "jaw");
  }
  for (const [side, s] of [
    ["L", -1],
    ["R", 1],
  ]) {
    add(0, [s * d.faceWidth, h * 0.925, 0], [0.018, 0.034, 0.017], "head");
    add(4, [s * 0.039, h * 0.942, 0.081], [0.024, 0.016, 0.022], "eye" + side);
    add(5, [s * 0.039, h * 0.942, 0.102], [0.011, 0.011, 0.005], "eye" + side);
    if (tier < 2) {
      add(
        0,
        [s * 0.039, h * 0.952, 0.087],
        [0.027, 0.008, 0.022],
        "head",
        null,
        "lid",
      );
      add(3, [s * 0.04, h * 0.965, 0.081], [0.031, 0.005, 0.014], "head");
    }
    const sx = s * (d.shoulders + 0.02);
    add(
      1,
      [sx, h * 0.765, 0],
      [0.067 * b, h * (d.sleeves === "long" ? 0.075 : 0.05), 0.068 * b],
      "upperArm" + side,
      ["upperArm" + side, "armTwist" + side],
    );
    add(
      d.sleeves === "long" ? 1 : 0,
      [sx, h * 0.695, 0],
      [0.053 * b, h * 0.109, 0.055 * b],
      "upperArm" + side,
      ["upperArm" + side, "armTwist" + side, "forearm" + side],
      "arm",
    );
    add(
      d.sleeves === "long" ? 1 : 0,
      [s * (d.shoulders + 0.03), h * 0.545, 0],
      [0.042 * b, h * 0.1, 0.043 * b],
      "forearm" + side,
      ["forearm" + side, "wristTwist" + side, "hand" + side],
    );
    add(
      0,
      [s * (d.shoulders + 0.035), h * 0.435, 0.002],
      [0.037, h * 0.035, 0.022],
      "hand" + side,
    );
    if (tier < 2)
      for (let i = 0; i < 5; i++) {
        const name = `finger${i}${side}`,
          v = rig.bind[name];
        add(0, [v.x, v.y - 0.025, v.z], [0.008, 0.032, 0.008], name, [
          name,
          `fingerTip${i}${side}`,
        ]);
      }
    add(
      2,
      [s * d.hips * 0.55, h * 0.4, 0],
      [0.076 * b, h * 0.14, 0.087 * b],
      "thigh" + side,
      ["thigh" + side, "thighTwist" + side, "shin" + side],
    );
    add(
      2,
      [s * d.hips * 0.55, h * 0.17, 0],
      [0.054 * b, h * 0.13, 0.062 * b],
      "shin" + side,
      ["shin" + side, "ankle" + side],
    );
    add(
      d.footwear === "sandal" ? 0 : 5,
      [s * d.hips * 0.55, h * 0.04, 0.05],
      [0.058, 0.045, 0.12],
      "ankle" + side,
      ["ankle" + side, "toe" + side],
    );
    add(
      5,
      [s * d.hips * 0.55, h * 0.018, 0.05],
      [0.061, 0.018, 0.123],
      "ankle" + side,
    );
  }
  if (d.hair !== "bald")
    add(
      3,
      [0, h * 0.928, -0.008],
      [d.faceWidth * 1.06, h * 0.08, 0.09],
      "head",
      null,
      null,
      Math.PI * 0.4,
    );
  if (d.hair === "bun")
    add(3, [0, h * 0.966, -0.089], [0.047, 0.04, 0.045], "head");
  if (d.hair === "waves")
    for (let i = 0; i < 5; i++)
      add(
        3,
        [(i - 2) * 0.033, h * 0.985, -0.008],
        [0.03, 0.027, 0.058],
        "head",
      );
  if (d.hair === "parted")
    add(3, [-0.035, h * 0.985, -0.008], [0.065, 0.023, 0.08], "head");
  if (d.beard)
    add(3, [0, h * 0.884, 0.06], [d.faceWidth * 0.75, 0.022, 0.047], "jaw");
  if (d.accessory === "bag") {
    add(5, [0.1, h * 0.7, -0.155], [0.1, 0.15, 0.055], "chest");
    add(5, [d.shoulders * 0.65, h * 0.74, -0.02], [0.014, 0.15, 0.13], "chest");
  }
  if (d.accessory === "scarf")
    add(1, [-0.09, h * 0.7, 0.13], [0.037, 0.18, 0.014], "chest", [
      "spine",
      "chest",
    ]);
  if (d.accessory === "glasses") {
    for (const s of [-1, 1])
      add(5, [s * 0.04, h * 0.948, 0.106], [0.03, 0.019, 0.003], "head");
    add(5, [0, h * 0.95, 0.108], [0.018, 0.003, 0.003], "head");
  }
  const batches = parts.map((list) =>
      list.length ? mergeGeometries(list) : null,
    ),
    used = batches.filter(Boolean),
    geometry = mergeGeometries(used, true);
  let n = 0;
  for (let i = 0; i < batches.length; i++)
    if (batches[i]) geometry.groups[n++].materialIndex = i;
  for (const list of parts) for (const g of list) g.dispose();
  for (const g of used) g.dispose();
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position.forEach(
    (a, i) => (a.name = ["blink", "smile", "elbowCorrective"][i]),
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = `HUMAN/${d.id}/tier${tier}`;
  geometry.userData = {
    provenance: "Original parametric source; no external assets",
    units: "metres",
    up: "+Y",
    forward: "+Z",
    tier,
  };
  return geometry;
}
