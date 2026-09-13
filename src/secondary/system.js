import * as T from "three";
import { SecondaryMaterials, SecondaryVisual } from "./visual.js";
import { FacialPerformance } from "../facial/performance.js";
export class SecondarySystem {
  constructor(runtime) {
    this.r = runtime;
    this.shared = new SecondaryMaterials();
    this.actors = new Map();
    this.wind = 1.5;
    this.wet = 0;
    this.wetOverride = null;
    this.emotion = "neutral";
    this.fabric = "jacket";
    this.hairStyle = "short";
    this.cpuMs = 0;
    this.conversation = false;
    this.turn = -1;
    this.enabled = true;
    this.generations = 0;
    this.disposals = 0;
  }
  restore() {
    for (const a of this.actors.values()) a.face.restore();
  }
  configure({ fabric = this.fabric, hair = this.hairStyle } = {}) {
    this.fabric = fabric;
    this.hairStyle = hair;
    const hero = this.r.humans.hero;
    const old = this.actors.get(hero);
    if (old) {
      old.face.restore();
      old.visual.dispose();
      this.actors.delete(hero);
      this.disposals++;
    }
  }
  update(time, dt) {
    const start = performance.now(),
      r = this.r;
    const candidates = [
      r.humans.hero,
      ...r.humans.cast.filter((c) => c.group.visible),
      ...[...r.humans.actors.values()].filter((c) => c.tier === 1),
    ].slice(0, 9);
    const wanted = new Set(this.enabled ? candidates : []);
    for (const [c, a] of this.actors)
      if (c.disposed || !wanted.has(c)) {
        a.face.restore();
        a.visual.dispose();
        this.actors.delete(c);
        this.disposals++;
      }
    for (const c of wanted)
      if (!this.actors.has(c)) {
        const castIndex = r.humans.cast.indexOf(c),
          isHero = c === r.humans.hero;
        const fabric = isHero
          ? this.fabric
          : castIndex >= 0
            ? ["dupatta", "kurta", "shawl", "raincoat"][castIndex]
            : c.identity.garment;
        const hair = isHero
          ? this.hairStyle
          : castIndex % 2 === 0
            ? "long"
            : "short";
        this.actors.set(c, {
          visual: new SecondaryVisual(c, r.humans.surfaces, this.shared, {
            fabric,
            hair,
            detail: c.tier === 0,
          }),
          face: new FacialPerformance(c),
        });
        this.generations++;
      }
    const targetWet =
      this.wetOverride ?? Number(r.photon.atmosphere.condition.rain);
    this.wet = T.MathUtils.lerp(
      this.wet,
      targetWet,
      1 - Math.exp(-dt * (targetWet > this.wet ? 1.5 : 0.25)),
    );
    const wind = new T.Vector3(
      this.wind * (1 + 0.35 * Math.sin(time * 1.7)),
      0.2 * Math.sin(time),
      this.wind * 0.35 * Math.cos(time * 0.61),
    );
    if (this.conversation) {
      const turn = Math.floor(time / 3.2);
      if (turn !== this.turn) {
        this.turn = turn;
        const pair = [
            r.humans.hero,
            ...r.humans.cast.filter((c) => c.group.visible),
          ].slice(0, 2),
          speaker = pair[turn % pair.length],
          listener = pair[(turn + 1) % pair.length];
        this.actors.get(speaker)?.face.speak();
        for (const c of pair) {
          const other = c === speaker ? listener : speaker;
          this.actors
            .get(c)
            ?.face.attend(
              other.rig.named.head.getWorldPosition(new T.Vector3()),
              "conversation",
            );
        }
      }
    }
    for (const [c, a] of this.actors) {
      const full = c === r.humans.hero && r.reactions.fullPhysical;
      a.face.update(dt, {
        allowHead: !full && !r.motion.interaction,
        emotion: full ? "surprised" : this.emotion,
      });
      // Ground height is queried where each actor stands, not inferred from root height during a fall.
      const p = c.group.position,
        ground = r.motion.sample(p.x, p.z, p.y);
      a.visual.update(dt, {
        wind,
        wet: this.wet,
        floor: ground?.y ?? -Infinity,
      });
    }
    this.cpuMs = performance.now() - start;
  }
  soundCue() {
    const r = this.r,
      p = r.player.body.translation(),
      target = new T.Vector3(p.x - 3, p.y + 1, p.z);
    for (const a of this.actors.values()) a.face.attend(target, "sound cue");
    // User-triggered original tone is an attention event; it is not speech audio.
    if (typeof AudioContext !== "undefined") {
      this.audio ??= new AudioContext();
      this.audio.resume();
      const oscillator = this.audio.createOscillator(),
        gain = this.audio.createGain(),
        pan = this.audio.createStereoPanner();
      oscillator.frequency.value = 520;
      gain.gain.setValueAtTime(0.035, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        this.audio.currentTime + 0.25,
      );
      pan.pan.value = -0.65;
      oscillator.connect(gain).connect(pan).connect(this.audio.destination);
      oscillator.start();
      oscillator.stop(this.audio.currentTime + 0.27);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        pan.disconnect();
      };
    }
  }
  stats() {
    const values = [...this.actors.values()];
    return {
      enabled: this.enabled,
      actors: values.length,
      wet: this.wet,
      wind: this.wind,
      conversation: this.conversation,
      cpuMs: this.cpuMs,
      generations: this.generations,
      disposals: this.disposals,
      particles: values.reduce(
        (n, a) =>
          n +
          a.visual.cloth.p.length +
          (a.visual.hairMesh.visible ? a.visual.hair.p.length : 0),
        0,
      ),
      constraints: values.reduce(
        (n, a) => n + a.visual.cloth.edges.length + a.visual.hair.edges.length,
        0,
      ),
      finite: values.every(
        (a) => a.visual.cloth.stats().finite && a.visual.hair.stats().finite,
      ),
      hero: this.actors.get(this.r.humans.hero)?.visual.stats() ?? null,
      faces: values.map((a) => a.face.stats()),
    };
  }
  dispose() {
    for (const a of this.actors.values()) {
      a.face.restore();
      a.visual.dispose();
    }
    this.actors.clear();
    this.shared.dispose();
    this.audio?.close();
  }
}
