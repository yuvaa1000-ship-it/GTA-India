import * as T from "three";
import { hashIdentity } from "../characters/identity.js";
const clamp = T.MathUtils.clamp;
export const VISEMES = {
  sil: [0, 0, 0],
  AA: [0.8, 0.12, 0],
  E: [0.36, 0.75, 0],
  I: [0.25, 0.65, 0],
  O: [0.6, 0, 0.8],
  U: [0.3, 0, 1],
  MBP: [0, 0, 0.12],
  FV: [0.16, 0.3, 0],
  L: [0.28, 0.4, 0],
  S: [0.13, 0.52, 0],
};
export const PHONEMES = {
  a: "AA",
  aa: "AA",
  ah: "AA",
  e: "E",
  eh: "E",
  i: "I",
  iy: "I",
  o: "O",
  oh: "O",
  u: "U",
  uw: "U",
  m: "MBP",
  b: "MBP",
  p: "MBP",
  f: "FV",
  v: "FV",
  l: "L",
  t: "L",
  d: "L",
  s: "S",
  z: "S",
  sh: "S",
};
export const DEMO_SPEECH = [
  { at: 0, duration: 0.16, phoneme: "m" },
  { at: 0.16, duration: 0.28, phoneme: "e" },
  { at: 0.48, duration: 0.24, phoneme: "l" },
  { at: 0.72, duration: 0.32, phoneme: "o" },
  { at: 1.3, duration: 0.16, phoneme: "p" },
  { at: 1.46, duration: 0.25, phoneme: "a" },
  { at: 1.71, duration: 0.18, phoneme: "s" },
  { at: 1.89, duration: 0.32, phoneme: "u" },
];
export function sampleSpeech(cues, time) {
  const result = [0, 0, 0];
  let sum = 0,
    label = "sil";
  for (const cue of cues) {
    const start = cue.at - 0.075,
      end = cue.at + cue.duration + 0.1;
    if (time < start || time > end) continue;
    const weight = Math.min(1, (time - start) / 0.075, (end - time) / 0.1),
      key = PHONEMES[cue.phoneme.toLowerCase()] ?? "sil",
      pose = VISEMES[key];
    for (let k = 0; k < 3; k++) result[k] += pose[k] * weight;
    sum += weight;
    if (weight > 0.3) label = key;
  }
  if (sum > 1) for (let k = 0; k < 3; k++) result[k] /= sum;
  return { jaw: result[0], wide: result[1], round: result[2], label };
}
export class FacialPerformance {
  constructor(character) {
    this.c = character;
    this.seed = hashIdentity(character.identity.id);
    this.time = 0;
    this.nextBlink = 1 + (this.seed % 320) / 100;
    this.blinkStart = -9;
    this.blinks = 0;
    this.target = null;
    this.targetAge = 0;
    this.emotion = "neutral";
    this.cues = [];
    this.speechStart = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.saved = null;
    this.value = {};
  }
  speak(cues = DEMO_SPEECH) {
    this.cues = cues.map((c) => ({ ...c }));
    this.speechStart = this.time;
  }
  attend(position, source = "person") {
    this.target = position.clone();
    this.targetAge = 0;
    this.source = source;
  }
  restore() {
    if (this.saved) {
      for (const [name, q] of Object.entries(this.saved))
        this.c.rig.named[name].quaternion.copy(q);
      this.saved = null;
    }
  }
  update(dt, { allowHead = true, emotion = this.emotion } = {}) {
    this.time += dt;
    this.targetAge += dt;
    const c = this.c,
      n = c.rig.named;
    this.saved = {
      head: n.head.quaternion.clone(),
      eyeL: n.eyeL.quaternion.clone(),
      eyeR: n.eyeR.quaternion.clone(),
      jaw: n.jaw.quaternion.clone(),
    };
    if (this.time >= this.nextBlink) {
      this.blinkStart = this.time;
      this.blinks++;
      this.nextBlink =
        this.time + 2.2 + ((this.seed + this.blinks * 1777) % 270) / 100;
    }
    const blinkAge = this.time - this.blinkStart,
      blink = blinkAge < 0.18 ? Math.sin((Math.PI * blinkAge) / 0.18) : 0;
    const speech = sampleSpeech(this.cues, this.time - this.speechStart);
    if (
      this.cues.length &&
      this.time - this.speechStart >
        this.cues.at(-1).at + this.cues.at(-1).duration + 0.15
    )
      this.cues = [];
    const look = new T.Vector3(0, 0, 1);
    if (this.target && this.targetAge < 4) {
      n.head.parent.updateWorldMatrix(true, false);
      const p = this.target.clone();
      n.head.parent.worldToLocal(p);
      look.copy(p.sub(n.head.position)).normalize();
    } else
      look
        .set(
          Math.sin(this.time * 0.41 + this.seed) * 0.25,
          0.025 * Math.sin(this.time * 0.7),
          1,
        )
        .normalize();
    const desiredYaw = clamp(Math.atan2(look.x, look.z), -0.9, 0.9),
      desiredPitch = clamp(
        -Math.atan2(look.y, Math.hypot(look.x, look.z)),
        -0.3,
        0.3,
      );
    const gain = 1 - Math.exp(-dt * 7);
    this.yaw = T.MathUtils.lerp(this.yaw, desiredYaw, gain);
    this.pitch = T.MathUtils.lerp(this.pitch, desiredPitch, gain);
    const saccade =
      Math.sin(Math.floor(this.time * 3.8 + this.seed) * 14.31) * 0.04;
    if (allowHead) {
      n.head.rotation.y += this.yaw * 0.45;
      n.head.rotation.x += this.pitch * 0.4;
    }
    for (const side of ["L", "R"]) {
      n["eye" + side].rotation.y = clamp(this.yaw * 0.55 + saccade, -0.4, 0.4);
      n["eye" + side].rotation.x = this.pitch * 0.6;
    }
    n.jaw.rotation.x += speech.jaw * 0.22;
    const emotionWeight =
      emotion === "happy"
        ? 0.65
        : emotion === "concerned"
          ? 0.6
          : emotion === "surprised"
            ? 0.8
            : 0;
    const micro =
      0.03 * (0.5 + 0.5 * Math.sin(this.time * 1.1 + (this.seed % 100)));
    const values = {
      blink,
      smile: emotion === "happy" ? emotionWeight : micro,
      browRaise: emotion === "surprised" ? emotionWeight : micro,
      browFrown: emotion === "concerned" ? emotionWeight : 0,
      lipWide: speech.wide,
      lipRound: speech.round,
      cheekRaise: emotion === "happy" ? emotionWeight * 0.6 : 0,
    };
    for (const [name, v] of Object.entries(values)) {
      const i = c.mesh.morphTargetDictionary[name];
      if (i !== undefined) c.mesh.morphTargetInfluences[i] = v;
    }
    c.group.updateMatrixWorld(true);
    c.rig.skeleton.update();
    this.value = {
      ...values,
      viseme: speech.label,
      jaw: speech.jaw,
      gazeYaw: this.yaw,
      gazePitch: this.pitch,
      blinks: this.blinks,
      source: this.targetAge < 4 ? this.source : "averted",
      speaking: !!this.cues.length,
    };
  }
  stats() {
    return { ...this.value };
  }
}
