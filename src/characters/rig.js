import * as T from "three";
export function createRig(d) {
  const bones = [],
    named = {},
    bind = {},
    parentNames = {};
  const add = (name, parent, x, y, z) => {
    const b = new T.Bone();
    b.name = name;
    const world = new T.Vector3(x, y, z);
    b.position.copy(world);
    if (parent) {
      b.position.sub(bind[parent]);
      named[parent].add(b);
    }
    named[name] = b;
    bind[name] = world;
    parentNames[name] = parent;
    bones.push(b);
    return b;
  };
  const h = d.height,
    hip = h * 0.52,
    shoulder = h * 0.81,
    elbow = h * 0.63,
    wrist = h * 0.46;
  add("root", null, 0, 0, 0);
  add("pelvis", "root", 0, hip, 0);
  add("spine", "pelvis", 0, h * 0.62, 0);
  add("chest", "spine", 0, h * 0.75, 0);
  add("neck", "chest", 0, h * 0.86, 0);
  add("head", "neck", 0, h * 0.925, 0);
  add("jaw", "head", 0, h * 0.905, 0.065);
  add("eyeL", "head", -0.04, h * 0.942, 0.088);
  add("eyeR", "head", 0.04, h * 0.942, 0.088);
  for (const [side, s] of [
    ["L", -1],
    ["R", 1],
  ]) {
    add("clavicle" + side, "chest", s * d.shoulders * 0.65, shoulder, 0);
    add("upperArm" + side, "clavicle" + side, s * d.shoulders, shoulder, 0);
    add(
      "armTwist" + side,
      "upperArm" + side,
      s * (d.shoulders + 0.014),
      (shoulder + elbow) / 2,
      0,
    );
    add(
      "forearm" + side,
      "upperArm" + side,
      s * (d.shoulders + 0.025),
      elbow,
      0,
    );
    add(
      "wristTwist" + side,
      "forearm" + side,
      s * (d.shoulders + 0.03),
      (elbow + wrist) / 2,
      0,
    );
    add("hand" + side, "forearm" + side, s * (d.shoulders + 0.035), wrist, 0);
    for (let i = 0; i < 5; i++) {
      const x = s * (d.shoulders + 0.01 + i * 0.014),
        y = wrist - 0.035;
      add(`finger${i}${side}`, "hand" + side, x, y, i === 0 ? 0.035 : 0);
      add(
        `fingerTip${i}${side}`,
        `finger${i}${side}`,
        x,
        y - 0.045,
        i === 0 ? 0.035 : 0,
      );
    }
    add("thigh" + side, "pelvis", s * d.hips * 0.55, hip, 0);
    add("thighTwist" + side, "thigh" + side, s * d.hips * 0.55, hip * 0.75, 0);
    add("shin" + side, "thigh" + side, s * d.hips * 0.55, h * 0.285, 0);
    add("ankle" + side, "shin" + side, s * d.hips * 0.55, h * 0.06, 0);
    add("toe" + side, "ankle" + side, s * d.hips * 0.55, h * 0.035, 0.105);
  }
  named.root.updateMatrixWorld(true);
  const skeleton = new T.Skeleton(bones);
  skeleton.calculateInverses();
  return {
    bones,
    named,
    bind,
    skeleton,
    index: Object.fromEntries(bones.map((b, i) => [b.name, i])),
    parentNames,
  };
}
