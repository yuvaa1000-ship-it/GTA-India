import * as T from "three";
import { profileGeometry } from "./profile.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export const HUMAN_MORPHS = [
  "blink",
  "smile",
  "elbowCorrective",
  "browRaise",
  "browFrown",
  "lipWide",
  "lipRound",
  "cheekRaise",
];
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
    finish(g, mat, center, scale, bone, chain, feature);
  }
  function finish(g, mat, center, scale, bone, chain = null, feature = null) {
    const p = g.attributes.position,
      indices = [],
      weights = [],
      blink = [],
      smile = [],
      flex = [],
      extra = Array.from({ length: 5 }, () => []);
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
      blink.push(0, feature === "lid" ? -0.012 + (v.y - center[1]) : 0, 0);
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
      const cheek =
        feature === "face"
          ? Math.max(0, 1 - Math.abs(v.y - d.height * 0.927) / 0.035) *
            Math.max(0, 1 - Math.abs(Math.abs(v.x) - 0.045) / 0.04) *
            Math.max(0, v.z / 0.088)
          : 0;
      extra[0].push(0, feature === "brow" ? 0.013 : 0, 0);
      extra[1].push(
        feature === "brow" ? -Math.sign(v.x) * 0.007 : 0,
        feature === "brow" ? -0.008 : 0,
        0,
      );
      extra[2].push(feature === "mouth" ? v.x * 0.3 : 0, 0, 0);
      extra[3].push(
        feature === "mouth" ? -v.x * 0.35 : 0,
        feature === "mouth" ? (v.y - center[1]) * 1.4 : 0,
        feature === "mouth" ? 0.009 : 0,
      );
      extra[4].push(0, cheek * 0.009, cheek * 0.004);
    }
    g.setAttribute("skinIndex", new T.Uint16BufferAttribute(indices, 4));
    g.setAttribute("skinWeight", new T.Float32BufferAttribute(weights, 4));
    g.morphTargetsRelative = true;
    g.morphAttributes.position = [blink, smile, flex, ...extra].map((a, i) => {
      const b = new T.Float32BufferAttribute(a, 3);
      b.name = HUMAN_MORPHS[i];
      return b;
    });
    parts[mat].push(g);
  }
  const h = d.height,
    b = d.build;
  let profileCount = 0;
  const loft = (
    mat,
    points,
    bone,
    chain = null,
    feature = null,
    roundness = 1,
    folds = 0,
  ) => {
    const center = [
      points.reduce((sum, p) => sum + (p.x ?? 0), 0) / points.length,
      (points[0].y + points.at(-1).y) / 2,
      0,
    ];
    const g = profileGeometry(points, {
      radial,
      subdivisions: tier === 0 ? 3 : 2,
      roundness,
      folds,
    });
    finish(g, mat, center, [1, 1, 1], bone, chain, feature);
    profileCount++;
  };
  const detail = (mat, center, scale, bone, chain = null, angle = 0) => {
    const g = new T.BoxGeometry(...scale);
    g.rotateZ(angle);
    g.translate(...center);
    finish(g, mat, center, scale, bone, chain);
  };
  if (tier < 2) {
    loft(
      2,
      [
        { y: h * 0.46, rx: d.hips * b * 0.84, rz: 0.092 * b },
        { y: h * 0.505, rx: d.hips * b * 1.05, rz: 0.113 * b },
        { y: h * 0.55, rx: d.hips * b * 0.98, rz: 0.11 * b },
      ],
      "pelvis",
      ["pelvis", "spine"],
      null,
      0.84,
    );
    loft(
      1,
      [
        { y: h * 0.53, rx: d.hips * b * 1.04, rz: 0.12 * b },
        { y: h * 0.59, rx: d.hips * b * 0.99, rz: 0.112 * b },
        { y: h * 0.66, rx: d.shoulders * b * 0.78, rz: 0.114 * b },
        { y: h * 0.735, rx: d.shoulders * b * 0.94, rz: 0.126 * b },
        { y: h * 0.79, rx: d.shoulders * b * 0.96, rz: 0.109 * b },
        { y: h * 0.823, rx: 0.052, rz: 0.052 },
      ],
      "spine",
      ["pelvis", "spine", "chest"],
      null,
      0.84,
      0.012,
    );
    if (d.garment === "kurta")
      loft(
        1,
        [
          { y: h * 0.355, rx: d.hips * b * 1.26, rz: 0.137 * b },
          { y: h * 0.44, rx: d.hips * b * 1.2, rz: 0.135 * b },
          { y: h * 0.53, rx: d.hips * b * 1.05, rz: 0.121 * b },
        ],
        "pelvis",
        ["pelvis", "spine"],
        null,
        0.9,
        0.018,
      );
    // Flat collar panels, a placket and stitched pocket/hem edges replace a bulbous outer shell.
    for (const side of [-1, 1]) {
      detail(
        1,
        [side * 0.043, h * 0.801, 0.07],
        [0.056, 0.07, 0.012],
        "chest",
        null,
        side * 0.42,
      );
      if (d.garment !== "kurta") {
        detail(
          5,
          [side * 0.089 * b, h * 0.706, 0.13 * b],
          [0.057, 0.003, 0.006],
          "chest",
          ["spine", "chest"],
        );
        detail(
          1,
          [side * 0.089 * b, h * 0.73, 0.133 * b],
          [0.062, 0.045, 0.008],
          "chest",
          ["spine", "chest"],
        );
      }
    }
    detail(5, [0, h * 0.687, 0.132 * b], [0.007, h * 0.205, 0.006], "spine", [
      "spine",
      "chest",
    ]);
    for (let i = 0; i < 4; i++)
      detail(
        d.garment === "jacket" ? 5 : 4,
        [0, h * (0.62 + i * 0.044), 0.139 * b],
        [0.008, 0.008, 0.006],
        "spine",
        ["spine", "chest"],
      );
  } else {
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
  }
  add(0, [0, h * 0.855, 0], [0.047, h * 0.055, 0.048], "neck", [
    "neck",
    "chest",
  ]);
  add(
    0,
    [0, h * 0.925, 0],
    [d.faceWidth, h * 0.075, 0.088],
    "head",
    null,
    "face",
  );
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
    add(
      4,
      [s * 0.039, h * 0.942, tier < 2 ? 0.082 : 0.081],
      tier < 2 ? [0.022, 0.01, 0.014] : [0.024, 0.016, 0.022],
      "eye" + side,
    );
    add(
      5,
      [s * 0.039, h * 0.942, tier < 2 ? 0.0955 : 0.102],
      tier < 2 ? [0.0085, 0.008, 0.003] : [0.011, 0.011, 0.005],
      "eye" + side,
    );
    if (tier < 2) {
      add(
        0,
        [s * 0.039, h * 0.948, 0.086],
        [0.025, 0.006, 0.015],
        "head",
        null,
        "lid",
      );
      add(
        3,
        [s * 0.04, h * 0.965, 0.081],
        [0.031, 0.005, 0.014],
        "head",
        null,
        "brow",
      );
    }
    const sx = s * (d.shoulders + 0.02);
    if (tier < 2) {
      const arm = [
        {
          y: h * 0.455,
          x: s * (d.shoulders + 0.035),
          rx: 0.029 * b,
          rz: 0.028 * b,
        },
        {
          y: h * 0.5,
          x: s * (d.shoulders + 0.032),
          rx: 0.035 * b,
          rz: 0.036 * b,
        },
        {
          y: h * 0.565,
          x: s * (d.shoulders + 0.03),
          rx: 0.044 * b,
          rz: 0.045 * b,
        },
        {
          y: h * 0.63,
          x: s * (d.shoulders + 0.025),
          rx: 0.042 * b,
          rz: 0.043 * b,
        },
        {
          y: h * 0.69,
          x: s * (d.shoulders + 0.02),
          rx: 0.052 * b,
          rz: 0.052 * b,
        },
        {
          y: h * 0.76,
          x: s * (d.shoulders + 0.009),
          rx: 0.058 * b,
          rz: 0.059 * b,
        },
        { y: h * 0.815, x: s * d.shoulders, rx: 0.048 * b, rz: 0.05 * b },
      ];
      loft(
        d.sleeves === "long" ? 1 : 0,
        arm,
        "upperArm" + side,
        [
          "upperArm" + side,
          "armTwist" + side,
          "forearm" + side,
          "wristTwist" + side,
          "hand" + side,
        ],
        "arm",
        1,
        d.sleeves === "long" ? 0.016 : 0,
      );
      if (d.sleeves !== "long")
        loft(
          1,
          [
            { y: h * 0.7, x: sx, rx: 0.055 * b, rz: 0.056 * b },
            {
              y: h * 0.76,
              x: s * (d.shoulders + 0.009),
              rx: 0.064 * b,
              rz: 0.064 * b,
            },
            { y: h * 0.817, x: s * d.shoulders, rx: 0.051 * b, rz: 0.052 * b },
          ],
          "upperArm" + side,
          ["upperArm" + side, "armTwist" + side],
          null,
          1,
          0.012,
        );
      const cuffY = d.sleeves === "long" ? h * 0.465 : h * 0.705;
      const cuffX = d.sleeves === "long" ? s * (d.shoulders + 0.035) : sx;
      const cuffRadius = (d.sleeves === "long" ? 0.031 : 0.056) * b;
      loft(
        5,
        [
          { y: cuffY - 0.006, x: cuffX, rx: cuffRadius, rz: cuffRadius },
          { y: cuffY + 0.006, x: cuffX, rx: cuffRadius, rz: cuffRadius },
        ],
        d.sleeves === "long" ? "hand" + side : "upperArm" + side,
      );
    } else {
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
    }
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
    if (tier < 2) {
      const x = s * d.hips * 0.55;
      loft(
        2,
        [
          { y: h * 0.055, x, rx: 0.044 * b, rz: 0.047 * b },
          { y: h * 0.11, x, rx: 0.047 * b, rz: 0.052 * b },
          { y: h * 0.2, x, rx: 0.059 * b, rz: 0.066 * b },
          { y: h * 0.285, x, rx: 0.058 * b, rz: 0.064 * b },
          { y: h * 0.365, x, rx: 0.069 * b, rz: 0.079 * b },
          { y: h * 0.45, x, rx: 0.078 * b, rz: 0.085 * b },
          { y: h * 0.53, x, rx: 0.078 * b, rz: 0.085 * b },
        ],
        "thigh" + side,
        ["thigh" + side, "thighTwist" + side, "shin" + side, "ankle" + side],
        null,
        0.94,
        0.009,
      );
      loft(
        5,
        [
          { y: h * 0.06, x, rx: 0.045 * b, rz: 0.048 * b },
          { y: h * 0.07, x, rx: 0.046 * b, rz: 0.049 * b },
        ],
        "ankle" + side,
      );
    } else {
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
    }
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
      [0, h * 0.925, 0],
      [d.faceWidth * 1.015, h * 0.0765, 0.0893],
      "head",
      null,
      null,
      Math.PI * 0.47,
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
    (a, i) => (a.name = HUMAN_MORPHS[i]),
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
    visualRevision: tier < 2 ? 2 : 1,
    continuousProfiles: profileCount,
    limitations:
      "Original procedural garment and limb profiles; not production anatomy or cloth simulation",
  };
  return geometry;
}
