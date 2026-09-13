import * as T from "three";
import { solveTwoBone } from "./ik.js";

export const HUMAN_CHAINS = Object.freeze({
  armL: Object.freeze(["upperArmL", "forearmL", "handL"]),
  armR: Object.freeze(["upperArmR", "forearmR", "handR"]),
  legL: Object.freeze(["thighL", "shinL", "ankleL"]),
  legR: Object.freeze(["thighR", "shinR", "ankleR"]),
});

/** Capture before animation, in the common +Y-up/+Z-forward avatar frame. */
export function captureRetargetPose(rig) {
  if (!rig?.named?.root?.isBone)
    throw new Error("Retarget rig requires a named root bone");
  rig.named.root.updateWorldMatrix(true, true);
  const reference = rig.named.root.parent
    ? rig.named.root.parent.getWorldQuaternion(new T.Quaternion()).invert()
    : new T.Quaternion();
  return Object.fromEntries(
    Object.entries(rig.named).map(([name, bone]) => [
      name,
      {
        quaternion: bone.quaternion.clone(),
        position: bone.position.clone(),
        orientation: reference
          .clone()
          .multiply(bone.getWorldQuaternion(new T.Quaternion())),
      },
    ]),
  );
}

/** Apply contacts after the base pose; object-relative points must first be
 * converted with object.localToWorld(). Identical door handles have identical
 * world targets, while different bodies solve different joint rotations. */
export function solveRetargetContacts(
  rig,
  contacts = {},
  chains = HUMAN_CHAINS,
) {
  const results = {};
  for (const [name, contact] of Object.entries(contacts)) {
    const chain = chains[name];
    if (!chain) throw new Error(`Unknown retarget contact chain: ${name}`);
    results[name] = solveTwoBone(
      ...chain.map((bone) => rig.named[bone]),
      contact.target,
      contact.pole,
    );
  }
  return results;
}

function humanHeight(rig) {
  // The HUMAN rig places its head joint at 92.5% of the descriptor height.
  return rig.bind?.head?.y / 0.925;
}

/**
 * Rest-relative quaternion retargeting with bone-axis correction, proportional
 * root translation and a final world-contact IK pass. map is sourceName ->
 * targetName. Rest poses MUST be captured before either rig starts animation.
 * Imported skeletons supply measured sourceHeight/targetHeight and explicit
 * maps; hierarchy/topology conversion and anatomical limits are not inferred.
 */
export function createRetargeter(source, target, options = {}) {
  const sourceRest = captureRetargetPose(source);
  const targetRest = captureRetargetPose(target);
  const sourceHeight = options.sourceHeight ?? humanHeight(source);
  const targetHeight = options.targetHeight ?? humanHeight(target);
  if (![sourceHeight, targetHeight].every((h) => Number.isFinite(h) && h > 0))
    throw new Error(
      "Retargeting requires positive measured source and target heights",
    );
  const map =
    options.map ??
    Object.fromEntries(
      Object.keys(source.named)
        .filter((name) => target.named[name])
        .map((name) => [name, name]),
    );
  const names = Object.entries(map);
  if (!names.length || new Set(Object.values(map)).size !== names.length)
    throw new Error("Retarget mapping must be nonempty and one-to-one");
  const mappings = names.map(([from, to]) => {
    if (!sourceRest[from] || !targetRest[to])
      throw new Error(`Missing mapped bone: ${from} -> ${to}`);
    return {
      from,
      to,
      // Carries a delta expressed in source rest-joint axes into target axes.
      correction: targetRest[to].orientation
        .clone()
        .invert()
        .multiply(sourceRest[from].orientation),
    };
  });
  // Mapped parent relationships must agree. Unmapped helper/twist bones may
  // exist, but this adapter does not silently treat an arm as a leg chain.
  for (const { from, to } of mappings) {
    const parent = source.named[from].parent;
    if (
      parent?.isBone &&
      map[parent.name] &&
      target.named[to].parent !== target.named[map[parent.name]]
    )
      throw new Error(`Mapped bone hierarchy differs at ${from} -> ${to}`);
  }
  const rootScale = targetHeight / sourceHeight;
  const contactChains = Object.fromEntries(
    Object.entries(HUMAN_CHAINS).map(([name, chain]) => [
      name,
      chain.map((bone) => map[bone] ?? bone),
    ]),
  );
  return {
    rootScale,
    mappedBones: mappings.length,
    apply({ rootMotion, contacts } = {}) {
      const translation =
        rootMotion ??
        source.named.root.position.clone().sub(sourceRest.root.position);
      if (![translation.x, translation.y, translation.z].every(Number.isFinite))
        throw new Error(
          "Root motion must be a finite avatar-local translation",
        );
      for (const { from } of mappings) {
        const q = source.named[from].quaternion;
        if (!q.toArray().every(Number.isFinite) || q.lengthSq() < 1e-12)
          throw new Error(`Invalid source quaternion at ${from}`);
      }
      for (const { from, to, correction } of mappings) {
        const delta = sourceRest[from].quaternion
          .clone()
          .invert()
          .multiply(source.named[from].quaternion);
        const corrected = correction
          .clone()
          .multiply(delta)
          .multiply(correction.clone().invert());
        target.named[to].quaternion
          .copy(targetRest[to].quaternion)
          .multiply(corrected)
          .normalize();
      }
      target.named.root.position
        .copy(targetRest.root.position)
        .addScaledVector(translation, rootScale);
      target.named.root.updateWorldMatrix(true, true);
      return {
        mappedBones: mappings.length,
        rootScale,
        contacts: solveRetargetContacts(target, contacts, contactChains),
      };
    },
  };
}
