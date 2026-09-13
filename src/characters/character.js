import * as T from "three";
import { createRig } from "./rig.js";
import { buildHumanGeometry } from "./mesh.js";
export class HumanCharacter {
  constructor(identity, surfaces, tier = 0) {
    this.identity = identity;
    this.tier = tier;
    this.group = new T.Group();
    this.group.name = identity.id;
    this.rig = createRig(identity);
    this.geometry = buildHumanGeometry(identity, this.rig, tier);
    this.materials = surfaces.materials(identity);
    this.mesh = new T.SkinnedMesh(this.geometry, this.materials);
    this.mesh.name = identity.id;
    this.mesh.add(this.rig.named.root);
    this.mesh.bind(this.rig.skeleton);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    // Conservative animation bounds avoid per-vertex CPU bounds scans on every frame.
    this.mesh.boundingSphere = new T.Sphere(
      new T.Vector3(0, identity.height * 0.5, 0),
      identity.height * 0.85,
    );
    this.group.add(this.mesh);
    this.phase = identity.phase;
    this.poseUpdates = 0;
    this.expression = 0;
    this.disposed = false;
    this.surfaceState = { wet: 0, dirt: 0, dust: 0, bruise: 0 };
  }
  pose(time, dt, speed = 0, grounded = true, gaze = 0) {
    const d = this.identity,
      n = this.rig.named;
    this.phase += (Math.min(dt, 0.15) * Math.min(speed, 8) * 2.4) / d.stride;
    const amplitude = grounded ? Math.min(speed / 2, 0.65) : 0.18,
      walk = Math.sin(this.phase);
    for (const bone of this.rig.bones) bone.rotation.set(0, 0, 0);
    n.spine.rotation.x = d.posture + Math.min(speed, 8) * 0.012;
    n.chest.rotation.y = walk * amplitude * 0.09;
    n.head.rotation.y = T.MathUtils.clamp(gaze, -0.65, 0.65);
    n.head.rotation.x = -d.posture * 0.5;
    n.chest.scale.set(1, 1 + Math.sin(time * 1.8 + d.phase) * 0.007, 1);
    for (const [side, s] of [
      ["L", 1],
      ["R", -1],
    ]) {
      const swing = walk * s * amplitude;
      n["thigh" + side].rotation.x = swing;
      n["shin" + side].rotation.x = -Math.max(0, -swing) * 1.5;
      n["ankle" + side].rotation.x = -swing * 0.4;
      n["upperArm" + side].rotation.x = -swing * 0.75;
      n["upperArm" + side].rotation.z = s * 0.06;
      n["forearm" + side].rotation.x = -0.18 - Math.abs(swing) * 0.25;
      n["armTwist" + side].rotation.y = Math.sin(time * 0.6) * 0.08;
      n["wristTwist" + side].rotation.y = Math.sin(time * 0.6) * 0.12;
      n["thighTwist" + side].rotation.y = swing * 0.08;
      for (let i = 0; i < 5; i++) {
        n[`finger${i}${side}`].rotation.x = 0.1;
        n[`fingerTip${i}${side}`].rotation.x = 0.13;
      }
      n["eye" + side].rotation.y = n.head.rotation.y * 0.25;
    }
    const blinkPhase = (time + d.phase) % 4.1;
    this.mesh.morphTargetInfluences[0] =
      blinkPhase < 0.18 ? Math.sin((blinkPhase / 0.18) * Math.PI) : 0;
    this.mesh.morphTargetInfluences[1] = this.expression;
    this.mesh.morphTargetInfluences[2] = Math.min(
      1,
      Math.max(
        Math.abs(n.forearmL.rotation.x),
        Math.abs(n.forearmR.rotation.x),
      ) / 1.4,
    );
    n.jaw.rotation.x = this.expression * 0.09;
    this.group.updateMatrixWorld(true);
    this.rig.skeleton.update();
    this.poseUpdates++;
  }
  setSurfaceState(next) {
    for (const key of Object.keys(this.surfaceState))
      if (Number.isFinite(next[key]))
        this.surfaceState[key] = T.MathUtils.clamp(next[key], 0, 1);
    const { wet, dirt, dust, bruise } = this.surfaceState,
      skin = this.materials[0];
    skin.color
      .set(this.identity.complexion)
      .lerp(new T.Color("#544432"), dirt * 0.4)
      .lerp(new T.Color("#b7a28a"), dust * 0.35)
      .lerp(new T.Color("#573848"), bruise * 0.28);
    skin.roughness = T.MathUtils.clamp(0.58 - wet * 0.21 + dust * 0.18, 0, 1);
    skin.clearcoat = 0.04 + wet * 0.3;
    this.materials[1].roughness = 0.9 - wet * 0.14;
    this.materials[1].color
      .set(this.identity.top)
      .lerp(new T.Color("#625545"), dirt * 0.3)
      .lerp(new T.Color("#b7a28a"), dust * 0.25);
  }
  weather(wetness) {
    this.setSurfaceState({ wet: wetness });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.group.removeFromParent();
    this.geometry.dispose();
    this.materials.forEach((m) => m.dispose());
    this.rig.skeleton.dispose();
    this.group.clear();
  }
}
