import * as T from "three";
import { RAPIER } from "../physics/world.js";

const vector = (v) => new T.Vector3(v.x, v.y, v.z);
const rotation = (q) => new T.Quaternion(q.x, q.y, q.z, q.w);
const finite = (v) => [v.x, v.y, v.z].every(Number.isFinite);
const GROUPS = (2 << 16) | 1;
const clamp = T.MathUtils.clamp;

function inertiaTimes(body, omega) {
  const m = body.effectiveAngularInertia();
  return new T.Vector3(
    m.m11 * omega.x + m.m12 * omega.y + m.m13 * omega.z,
    m.m21 * omega.x + m.m22 * omega.y + m.m23 * omega.z,
    m.m31 * omega.x + m.m32 * omega.y + m.m33 * omega.z,
  );
}

/** A 13-link approximation, not a proprietary Euphoria implementation.
 * Rotational drives are bounded equal/opposite internal impulses. Pelvis
 * anchoring is an explicit kinematic boundary for partial physical animation;
 * releasing it leaves all links dynamic and requires an external balance or
 * recovery controller. All joints constrain translation; knees/elbows also
 * have hard hinge limits relative to the activation pose. */
export class Articulation {
  constructor(
    world,
    character,
    { mass = 75, friction = 0.7, excludeCollider, anchored = false } = {},
  ) {
    if (
      !Number.isFinite(mass) ||
      mass <= 0 ||
      !Number.isFinite(friction) ||
      friction < 0
    )
      throw new Error(
        "Articulation mass and friction must be finite physical values",
      );
    if (
      !character?.rig?.named?.pelvis ||
      !Number.isFinite(character.identity?.height) ||
      character.identity.height <= 0
    )
      throw new Error(
        "Articulation requires a HUMAN rig with a positive metre height",
      );
    character.group.updateMatrixWorld(true);
    for (const bone of character.rig.bones) {
      const scale = bone.getWorldScale(new T.Vector3());
      if (
        !bone.matrixWorld.elements.every(Number.isFinite) ||
        scale.toArray().some((s) => Math.abs(s - 1) > 1e-4)
      )
        throw new Error(
          "Physical HUMAN bones require finite unit-scale world transforms",
        );
    }
    this.world = world;
    this.character = character;
    this.mass = mass;
    this.links = new Map();
    this.joints = [];
    this.disposed = false;
    this.anchored = false;
    this.lastDrive = { maximumTorque: 0, strength: 0 };
    this.rigidRest = {
      chest: character.rig.named.chest.quaternion.clone(),
      head: character.rig.named.head.quaternion.clone(),
    };
    this.excludeCollider = excludeCollider;
    this.originalGroups = excludeCollider?.collisionGroups();
    if (excludeCollider) {
      this.excludedGroups =
        (this.originalGroups & 0xffff0000) |
        (this.originalGroups & 0xffff & ~2);
      excludeCollider.setCollisionGroups(this.excludedGroups >>> 0);
    }
    const n = character.rig.named,
      h = character.identity.height;
    character.group.updateMatrixWorld(true);
    const reference = character.group.getWorldQuaternion(new T.Quaternion());
    const p = (name) => n[name].getWorldPosition(new T.Vector3());
    const offset = (name, x, y, z) =>
      n[name].localToWorld(new T.Vector3(x, y, z));
    try {
      this.addLink(
        "pelvis",
        "pelvis",
        null,
        offset("pelvis", -h * 0.11, 0, 0),
        offset("pelvis", h * 0.11, 0, 0),
        h * 0.066,
        0.18,
        reference,
        friction,
      );
      this.addLink(
        "chest",
        "spine",
        "pelvis",
        p("spine"),
        p("neck"),
        h * 0.092,
        0.32,
        reference,
        friction,
      );
      this.addLink(
        "head",
        "neck",
        "chest",
        p("neck"),
        offset("head", 0, h * 0.045, 0),
        h * 0.072,
        0.08,
        reference,
        friction,
      );
      for (const side of ["L", "R"]) {
        this.addLink(
          "upperArm" + side,
          "upperArm" + side,
          "chest",
          p("upperArm" + side),
          p("forearm" + side),
          h * 0.032,
          0.035,
          reference,
          friction,
        );
        this.addLink(
          "forearm" + side,
          "forearm" + side,
          "upperArm" + side,
          p("forearm" + side),
          p("hand" + side),
          h * 0.027,
          0.025,
          reference,
          friction,
        );
        this.addLink(
          "thigh" + side,
          "thigh" + side,
          "pelvis",
          p("thigh" + side),
          p("shin" + side),
          h * 0.047,
          0.1,
          reference,
          friction,
        );
        this.addLink(
          "shin" + side,
          "shin" + side,
          "thigh" + side,
          p("shin" + side),
          p("ankle" + side),
          h * 0.032,
          0.035,
          reference,
          friction,
        );
        this.addLink(
          "foot" + side,
          "ankle" + side,
          "shin" + side,
          p("ankle" + side),
          offset("toe" + side, 0, 0, h * 0.04),
          h * 0.025,
          0.015,
          reference,
          friction,
        );
      }
      for (const link of this.links.values()) {
        if (!link.parent) continue;
        const parent = this.links.get(link.parent),
          point = p(link.bone.name);
        const local = (body) =>
          point
            .clone()
            .sub(vector(body.translation()))
            .applyQuaternion(rotation(body.rotation()).invert());
        const a = local(parent.body),
          b = local(link.body);
        const hinge = /^(forearm|shin)/.test(link.name);
        const data = hinge
          ? RAPIER.JointData.revolute(a, b, { x: 1, y: 0, z: 0 })
          : RAPIER.JointData.spherical(a, b);
        const joint = world.createImpulseJoint(
          data,
          parent.body,
          link.body,
          true,
        );
        joint.setContactsEnabled(false);
        const limits = hinge
          ? link.name.startsWith("shin")
            ? [-2.55, 0.16]
            : [-2.6, 0.25]
          : null;
        if (limits) joint.setLimits(...limits);
        this.joints.push({
          name: link.name,
          joint,
          parent,
          child: link,
          limits,
        });
      }
      this.pelvis = this.links.get("pelvis").body;
      this.captureTargets();
      this.setAnchored(anchored);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  addLink(
    name,
    boneName,
    parent,
    start,
    end,
    radius,
    fraction,
    orientation,
    friction,
  ) {
    const bone = this.character.rig.named[boneName];
    const center = start.clone().add(end).multiplyScalar(0.5);
    const direction = end.clone().sub(start),
      length = direction.length();
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(center.x, center.y, center.z)
        .setRotation(orientation)
        .setLinearDamping(0.12)
        .setAngularDamping(0.3)
        .setCanSleep(true)
        .setCcdEnabled(true)
        .setAdditionalSolverIterations(4),
    );
    const shapeRotation = orientation
      .clone()
      .invert()
      .multiply(
        new T.Quaternion().setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          direction.normalize(),
        ),
      );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(Math.max(0.002, length / 2 - radius), radius)
        .setRotation(shapeRotation)
        .setMass(this.mass * fraction)
        .setFriction(friction)
        .setRestitution(0.02)
        .setCollisionGroups(GROUPS),
      body,
    );
    body.recomputeMassPropertiesFromColliders();
    const boneQ = bone.getWorldQuaternion(new T.Quaternion());
    const bonePoint = bone.getWorldPosition(new T.Vector3());
    this.links.set(name, {
      name,
      body,
      collider,
      bone,
      parent,
      length,
      radius,
      fraction,
      boneToBody: boneQ.clone().invert().multiply(orientation),
      bodyToBone: orientation.clone().invert().multiply(boneQ),
      centerFromBone: center
        .clone()
        .sub(bonePoint)
        .applyQuaternion(boneQ.clone().invert()),
      boneFromCenter: bonePoint
        .clone()
        .sub(center)
        .applyQuaternion(orientation.clone().invert()),
      targetPosition: center.clone(),
      targetRotation: orientation.clone(),
    });
  }

  captureTargets() {
    if (this.disposed) return;
    this.character.group.updateMatrixWorld(true);
    for (const link of this.links.values()) {
      const q = link.bone.getWorldQuaternion(new T.Quaternion());
      link.targetRotation.copy(q).multiply(link.boneToBody).normalize();
      link.targetPosition
        .copy(link.bone.getWorldPosition(new T.Vector3()))
        .add(link.centerFromBone.clone().applyQuaternion(q));
    }
  }

  setAnchored(value) {
    if (this.disposed || this.anchored === !!value) return;
    this.anchored = !!value;
    this.pelvis.setBodyType(
      value
        ? RAPIER.RigidBodyType.KinematicPositionBased
        : RAPIER.RigidBodyType.Dynamic,
      true,
    );
  }

  drive(dt, strength = 1) {
    if (this.disposed) return;
    if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(strength))
      throw new Error("Drive timestep and strength must be finite");
    dt = Math.min(dt, 1 / 30);
    strength = clamp(strength, 0, 1);
    if (this.anchored) {
      const root = this.links.get("pelvis");
      this.pelvis.setNextKinematicTranslation(root.targetPosition);
      this.pelvis.setNextKinematicRotation(root.targetRotation);
    }
    let maximumTorque = 0;
    for (const link of this.links.values()) {
      if (!link.parent || !strength) continue;
      const parent = this.links.get(link.parent);
      const parentQ = rotation(parent.body.rotation()),
        q = rotation(link.body.rotation());
      const relativeTarget = parent.targetRotation
        .clone()
        .invert()
        .multiply(link.targetRotation);
      const error = parentQ
        .multiply(relativeTarget)
        .multiply(q.clone().invert())
        .normalize();
      if (error.w < 0) error.set(-error.x, -error.y, -error.z, -error.w);
      const s = Math.hypot(error.x, error.y, error.z);
      const axis =
        s > 1e-7
          ? new T.Vector3(error.x, error.y, error.z).multiplyScalar(
              (2 * Math.atan2(s, clamp(error.w, -1, 1))) / s,
            )
          : new T.Vector3();
      const omega = vector(link.body.angvel()).sub(
        vector(parent.body.angvel()),
      );
      const inertia = link.body.principalInertia();
      const scalarI = Math.max(0.002, (inertia.x + inertia.y + inertia.z) / 3);
      const stiffness = scalarI * 100 * strength;
      const damping = 1.7 * Math.sqrt(stiffness * scalarI);
      const torque = axis
        .multiplyScalar(stiffness)
        .addScaledVector(omega, -damping);
      const limit = this.mass * link.fraction * 7 * strength;
      if (torque.length() > limit) torque.setLength(limit);
      maximumTorque = Math.max(maximumTorque, torque.length());
      const impulse = torque.multiplyScalar(dt);
      link.body.applyTorqueImpulse(impulse, true);
      if (parent.body.isDynamic())
        parent.body.applyTorqueImpulse(impulse.clone().negate(), true);
    }
    this.lastDrive = { maximumTorque, strength };
  }

  impulse(value, bodyName = "chest") {
    if (this.disposed) return false;
    if (!finite(value))
      throw new Error("Physical impulse must be a finite vector");
    const link = this.links.get(bodyName);
    if (!link) throw new Error(`Unknown physical segment: ${bodyName}`);
    if (!link.body.isDynamic()) return false;
    link.body.applyImpulse(value, true);
    return true;
  }

  sync(weight = 1) {
    if (this.disposed) return;
    if (!Number.isFinite(weight)) throw new Error("Pose weight must be finite");
    weight = clamp(weight, 0, 1);
    const c = this.character;
    c.group.updateMatrixWorld(true);
    for (const link of this.links.values()) {
      const q = rotation(link.body.rotation());
      if (link.name === "pelvis" && !this.anchored) {
        const point = vector(link.body.translation()).add(
          link.boneFromCenter.clone().applyQuaternion(q),
        );
        link.bone.position.lerp(link.bone.parent.worldToLocal(point), weight);
      }
      const desired = q.multiply(link.bodyToBone);
      const parentQ = link.bone.parent
        .getWorldQuaternion(new T.Quaternion())
        .invert();
      link.bone.quaternion.slerp(parentQ.multiply(desired), weight);
      link.bone.updateWorldMatrix(true, true);
      // Spine and neck own the torso/head links; the intervening visual bones
      // become rigid parts of those links at full weight, retaining face motion.
      const rigidChild =
        link.name === "chest"
          ? c.rig.named.chest
          : link.name === "head"
            ? c.rig.named.head
            : null;
      if (rigidChild) {
        rigidChild.quaternion.slerp(this.rigidRest[rigidChild.name], weight);
        rigidChild.updateWorldMatrix(true, true);
      }
    }
    c.group.updateMatrixWorld(true);
    c.rig.skeleton.update();
  }

  stats() {
    if (this.disposed)
      return { bodies: 0, joints: 0, finite: true, disposed: true };
    let mass = 0,
      kineticEnergy = 0;
    const com = new T.Vector3(),
      momentum = new T.Vector3(),
      angularMomentum = new T.Vector3();
    let isFinite = true;
    for (const link of this.links.values()) {
      const m = link.body.mass(),
        p = vector(link.body.worldCom()),
        v = vector(link.body.linvel()),
        w = vector(link.body.angvel());
      isFinite &&= [
        m,
        ...p.toArray(),
        ...v.toArray(),
        ...w.toArray(),
        ...rotation(link.body.rotation()).toArray(),
      ].every(Number.isFinite);
      mass += m;
      com.addScaledVector(p, m);
      momentum.addScaledVector(v, m);
      kineticEnergy +=
        0.5 * m * v.lengthSq() + 0.5 * w.dot(inertiaTimes(link.body, w));
    }
    com.multiplyScalar(1 / mass);
    const contactPoints = [];
    for (const link of this.links.values()) {
      const r = vector(link.body.worldCom()).sub(com),
        p = vector(link.body.linvel()).multiplyScalar(link.body.mass());
      angularMomentum
        .add(r.cross(p))
        .add(inertiaTimes(link.body, vector(link.body.angvel())));
      this.world.contactPairsWith(link.collider, (other) => {
        this.world.contactPair(link.collider, other, (manifold, flipped) => {
          const normal = vector(manifold.normal()).multiplyScalar(
            flipped ? 1 : -1,
          );
          for (let i = 0; i < manifold.numSolverContacts(); i++)
            contactPoints.push({
              body: link.name,
              point: { ...manifold.solverContactPoint(i) },
              normal: { ...normal },
              distance: manifold.solverContactDist(i),
              collider: other.handle,
            });
        });
      });
    }
    const jointErrors = this.joints.map(
      ({ name, joint, parent, child, limits }) => {
        const a = vector(joint.anchor1())
          .applyQuaternion(rotation(parent.body.rotation()))
          .add(vector(parent.body.translation()));
        const b = vector(joint.anchor2())
          .applyQuaternion(rotation(child.body.rotation()))
          .add(vector(child.body.translation()));
        const relative = rotation(parent.body.rotation())
          .invert()
          .multiply(rotation(child.body.rotation()));
        const angle = Math.atan2(
          Math.sin(2 * Math.atan2(relative.x, relative.w)),
          Math.cos(2 * Math.atan2(relative.x, relative.w)),
        );
        return {
          name,
          error: a.distanceTo(b),
          angle: limits ? angle : null,
          limits,
        };
      },
    );
    const potentialEnergy = -mass * vector(this.world.gravity).dot(com);
    return {
      bodies: this.links.size,
      joints: this.joints.length,
      mass,
      com: { ...com },
      momentum: { ...momentum },
      angularMomentum: { ...angularMomentum },
      kineticEnergy,
      potentialEnergy,
      energy: kineticEnergy + potentialEnergy,
      finite: isFinite && Number.isFinite(kineticEnergy),
      contacts: contactPoints.length,
      contactPoints,
      jointErrors,
      maxJointError: Math.max(...jointErrors.map((j) => j.error)),
      anchored: this.anchored,
      ...this.lastDrive,
    };
  }

  dispose() {
    if (this.disposed) return;
    for (const { joint } of this.joints)
      if (joint.isValid()) this.world.removeImpulseJoint(joint, true);
    for (const link of this.links.values())
      if (link.body.isValid()) this.world.removeRigidBody(link.body);
    this.joints.length = 0;
    this.links.clear();
    if (
      this.excludeCollider?.isValid() &&
      this.excludeCollider.collisionGroups() === this.excludedGroups >>> 0
    )
      this.excludeCollider.setCollisionGroups(this.originalGroups);
    this.disposed = true;
  }
}
