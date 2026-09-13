import * as T from "three";
import { RAPIER } from "../physics/world.js";

const finite = (v) => !!v && [v.x, v.y, v.z].every(Number.isFinite);
const vec = (v) => new T.Vector3(v.x, v.y, v.z);
const quat = (q) => new T.Quaternion(q.x, q.y, q.z, q.w);
const MAX_CATCH_DISTANCE = 0.12;
const MAX_ERROR = 0.25;
const MAX_HOLD_SECONDS = 0.6;

/** Short wall constraint at a forearm endpoint proxy; not a hand collider or anatomical grasp. */
export class WallBrace {
  constructor(world, articulation) {
    this.world = world;
    this.articulation = articulation;
    this.joint = null;
    this.armed = true;
    this.age = 0;
    this.catches = 0;
    this.releases = 0;
    this.error = 0;
    this.reason = "ready";
    this.disposed = false;
  }

  endpoint(side = "R") {
    const link = this.articulation.links.get("forearm" + side);
    if (!link?.body.isValid()) return null;
    const position = link.body.translation(),
      rotation = link.body.rotation();
    if (
      !finite(position) ||
      ![rotation.x, rotation.y, rotation.z, rotation.w].every(Number.isFinite)
    )
      return null;
    // Links are centered between the elbow and hand; boneFromCenter points back to the elbow.
    return vec(position).sub(
      link.boneFromCenter.clone().applyQuaternion(quat(rotation)),
    );
  }

  tryCatch(point, collider, side = "R") {
    if (
      this.disposed ||
      this.joint ||
      !this.armed ||
      !finite(point) ||
      !["L", "R"].includes(side)
    )
      return false;
    const endpoint = this.endpoint(side);
    if (!endpoint || !collider?.isValid() || collider.isSensor()) return false;
    const body = collider.parent();
    if (!body?.isValid() || !body.isFixed()) return false;
    const requested = vec(point),
      distance = endpoint.distanceTo(requested);
    if (distance > MAX_CATCH_DISTANCE) return false;
    const projection = collider.projectPoint(requested, false);
    if (
      !projection ||
      !finite(projection.point) ||
      vec(projection.point).distanceTo(requested) > 0.002
    )
      return false;
    let direction = requested.clone().sub(endpoint);
    if (direction.lengthSq() < 1e-8)
      direction = vec(collider.translation()).sub(endpoint);
    if (!finite(direction) || direction.lengthSq() < 1e-8) return false;
    direction.normalize();
    const origin = endpoint.clone().addScaledVector(direction, -0.003);
    const hit = collider.castRayAndGetNormal(
      new RAPIER.Ray(origin, direction),
      MAX_CATCH_DISTANCE + 0.003,
      false,
    );
    if (!hit || !finite(hit.normal) || Math.abs(hit.normal.y) > 0.55)
      return false;
    const contact = origin.addScaledVector(direction, hit.timeOfImpact);
    if (
      contact.distanceTo(endpoint) > MAX_CATCH_DISTANCE ||
      contact.distanceTo(requested) > 0.004
    )
      return false;
    const link = this.articulation.links.get("forearm" + side);
    const local = (value, target) =>
      value
        .clone()
        .sub(vec(target.translation()))
        .applyQuaternion(quat(target.rotation()).invert());
    const limbAnchor = local(endpoint, link.body),
      wallAnchor = local(contact, body);
    this.joint = this.world.createImpulseJoint(
      RAPIER.JointData.spherical(limbAnchor, wallAnchor),
      link.body,
      body,
      true,
    );
    this.joint.setContactsEnabled(true);
    this.wall = body;
    this.collider = collider;
    this.link = link;
    this.limbAnchor = limbAnchor;
    this.wallAnchor = wallAnchor;
    this.side = side;
    this.age = 0;
    this.error = distance;
    this.armed = false;
    this.reason = "caught-near-wall";
    this.catches++;
    return true;
  }

  update(dt, { enabled = false, direction, side = "R" } = {}) {
    if (this.disposed) return this.stats();
    if (!Number.isFinite(dt) || dt < 0) {
      this.release("invalid-timestep");
      this.armed = false;
      return this.stats();
    }
    if (!enabled) {
      this.release("disabled");
      this.armed = true;
      return this.stats();
    }
    if (this.articulation.disposed) {
      this.release("articulation-removed");
      this.armed = false;
      return this.stats();
    }
    if (this.joint) {
      this.age += dt;
      if (
        !this.joint.isValid() ||
        !this.wall.isValid() ||
        !this.link.body.isValid() ||
        !this.collider.isValid()
      ) {
        this.release("support-removed");
      } else {
        const a = this.limbAnchor
          .clone()
          .applyQuaternion(quat(this.link.body.rotation()))
          .add(vec(this.link.body.translation()));
        const b = this.wallAnchor
          .clone()
          .applyQuaternion(quat(this.wall.rotation()))
          .add(vec(this.wall.translation()));
        this.error = a.distanceTo(b);
        if (!Number.isFinite(this.error) || this.error > MAX_ERROR)
          this.release("contact-error");
        else if (this.age >= MAX_HOLD_SECONDS - 1e-9) this.release("expired");
      }
    } else if (this.armed && finite(direction)) {
      const endpoint = this.endpoint(side),
        axis = vec(direction);
      if (endpoint && axis.lengthSq() > 1e-8) {
        axis.normalize();
        const origin = endpoint.clone().addScaledVector(axis, -0.003);
        const hit = this.world.castRayAndGetNormal(
          new RAPIER.Ray(origin, axis),
          MAX_CATCH_DISTANCE + 0.003,
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          (collider) => !collider.isSensor() && collider.parent()?.isFixed(),
        );
        if (hit)
          this.tryCatch(
            origin.addScaledVector(axis, hit.timeOfImpact),
            hit.collider,
            side,
          );
      }
    }
    return this.stats();
  }

  release(reason = "released") {
    if (this.joint) {
      if (this.joint.isValid()) this.world.removeImpulseJoint(this.joint, true);
      this.joint = null;
      this.releases++;
    }
    this.wall = this.collider = this.link = null;
    this.reason = reason;
  }

  stats() {
    return {
      active: !!this.joint,
      armed: this.armed,
      side: this.side ?? null,
      age: this.age,
      error: this.error,
      catches: this.catches,
      releases: this.releases,
      reason: this.reason,
      maxCatchDistance: MAX_CATCH_DISTANCE,
      maxError: MAX_ERROR,
      maxHoldSeconds: MAX_HOLD_SECONDS,
    };
  }

  dispose() {
    if (this.disposed) return;
    this.release("disposed");
    this.armed = false;
    this.disposed = true;
  }
}
