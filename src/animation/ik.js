import * as T from "three";

const EPS = 1e-7;
const finiteVector = (v) => v && [v.x, v.y, v.z].every(Number.isFinite);

// Rotations cannot preserve world-space lengths under a sheared/nonuniform
// ancestor transform. Report that unsupported case before modifying the pose.
function uniformFrame(bone) {
  const e = bone.matrixWorld.elements;
  const x = new T.Vector3(e[0], e[1], e[2]);
  const y = new T.Vector3(e[4], e[5], e[6]);
  const z = new T.Vector3(e[8], e[9], e[10]);
  const lengths = [x.length(), y.length(), z.length()];
  const largest = Math.max(...lengths);
  if (!Number.isFinite(largest) || largest < EPS) return false;
  return (
    Math.max(...lengths) - Math.min(...lengths) < largest * 1e-5 &&
    Math.abs(x.dot(y)) < largest * largest * 1e-5 &&
    Math.abs(x.dot(z)) < largest * largest * 1e-5 &&
    Math.abs(y.dot(z)) < largest * largest * 1e-5 &&
    bone.matrixWorld.determinant() > 0
  );
}

function rotateWorldSegment(bone, current, desired) {
  const delta = new T.Quaternion().setFromUnitVectors(
    current.normalize(),
    desired.normalize(),
  );
  const world = bone.getWorldQuaternion(new T.Quaternion());
  const parent = bone.parent
    ? bone.parent.getWorldQuaternion(new T.Quaternion())
    : new T.Quaternion();
  bone.quaternion
    .copy(parent.invert().multiply(delta).multiply(world))
    .normalize();
  bone.updateWorldMatrix(true, true);
}

/**
 * Analytic two-bone IK for a direct root -> mid -> end chain. Both target and
 * pole are WORLD positions. Changes only root/mid rotations, never translations
 * or scales. The pole chooses the elbow/knee half-plane; collinear poles receive
 * a deterministic fallback. Reach clamps preserve measured segment lengths.
 * Error is measured from the final bone matrices to the ORIGINAL target.
 */
export function solveTwoBone(root, mid, end, targetWorld, poleWorld) {
  const invalid = (reason) => ({
    solved: false,
    reachable: false,
    clamped: false,
    error: null,
    reason,
  });
  if (
    !root?.isBone ||
    !mid?.isBone ||
    !end?.isBone ||
    mid.parent !== root ||
    end.parent !== mid
  )
    return invalid("Expected a direct root -> mid -> end bone chain");
  if (!finiteVector(targetWorld) || !finiteVector(poleWorld))
    return invalid("Target and pole must be finite world positions");

  root.updateWorldMatrix(true, true);
  if (![root, mid, end].every(uniformFrame))
    return invalid(
      "Nonuniform, mirrored or degenerate transforms are unsupported",
    );
  const start = root.getWorldPosition(new T.Vector3());
  const middle = mid.getWorldPosition(new T.Vector3());
  const finish = end.getWorldPosition(new T.Vector3());
  const firstLength = start.distanceTo(middle);
  const secondLength = middle.distanceTo(finish);
  if (Math.min(firstLength, secondLength) < EPS)
    return invalid("Both limb segments must have positive length");

  const direction = new T.Vector3().subVectors(targetWorld, start);
  const requested = direction.length();
  const minReach = Math.abs(firstLength - secondLength);
  const maxReach = firstLength + secondLength;
  const reachable = requested >= minReach - EPS && requested <= maxReach + EPS;
  if (requested < EPS) {
    direction.subVectors(finish, start);
    if (direction.lengthSq() < EPS * EPS) direction.set(0, -1, 0);
  }
  direction.normalize();
  // At an equal-length exact fold, an epsilon radius avoids division by zero.
  const distance = T.MathUtils.clamp(
    requested,
    Math.max(minReach, EPS),
    maxReach,
  );
  const clampedTarget = start.clone().addScaledVector(direction, distance);
  const bend = new T.Vector3().subVectors(poleWorld, start);
  bend.addScaledVector(direction, -bend.dot(direction));
  const degeneratePole = bend.lengthSq() < EPS * EPS;
  if (degeneratePole) {
    bend
      .subVectors(middle, start)
      .addScaledVector(
        direction,
        -new T.Vector3().subVectors(middle, start).dot(direction),
      );
    if (bend.lengthSq() < EPS * EPS) {
      // Choose the basis with the least alignment to the requested direction.
      const absolute = [
        Math.abs(direction.x),
        Math.abs(direction.y),
        Math.abs(direction.z),
      ];
      bend
        .set(0, 0, 0)
        .setComponent(absolute.indexOf(Math.min(...absolute)), 1);
      bend.addScaledVector(direction, -bend.dot(direction));
    }
  }
  bend.normalize();
  const along = T.MathUtils.clamp(
    (distance * distance +
      firstLength * firstLength -
      secondLength * secondLength) /
      (2 * distance),
    -firstLength,
    firstLength,
  );
  const perpendicular = Math.sqrt(
    Math.max(0, firstLength * firstLength - along * along),
  );
  const desiredMid = start
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(bend, perpendicular);
  rotateWorldSegment(
    root,
    middle.clone().sub(start),
    desiredMid.clone().sub(start),
  );
  const newMid = mid.getWorldPosition(new T.Vector3());
  const newEnd = end.getWorldPosition(new T.Vector3());
  rotateWorldSegment(
    mid,
    newEnd.sub(newMid),
    clampedTarget.clone().sub(newMid),
  );
  const achieved = end.getWorldPosition(new T.Vector3());
  return {
    solved: true,
    reachable,
    clamped: Math.abs(distance - requested) > EPS * 0.1,
    error: achieved.distanceTo(targetWorld),
    requestedDistance: requested,
    minReach,
    maxReach,
    segmentLengths: [firstLength, secondLength],
    achieved,
    clampedTarget,
    degeneratePole,
  };
}
