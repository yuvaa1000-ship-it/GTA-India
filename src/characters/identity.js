import { seedRandom } from "../world/generate.js";
export const GRAMMAR_VERSION = 1;
export function hashIdentity(id) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
// Appearance and social descriptors use independent streams: no complexion/occupation mapping.
export function citizenIdentity(id) {
  const seed = hashIdentity(id),
    r = seedRandom(seed),
    social = seedRandom(seed ^ 0x325718ab);
  const choose = (values, random = r) =>
    values[Math.floor(random() * values.length)];
  return Object.freeze({
    id,
    version: GRAMMAR_VERSION,
    seed,
    height: 1.54 + r() * 0.38,
    build: 0.8 + r() * 0.48,
    shoulders: 0.18 + r() * 0.055,
    hips: 0.13 + r() * 0.055,
    age: 20 + Math.floor(r() * 55),
    complexion: choose([
      "#492d23",
      "#653f2c",
      "#815239",
      "#9e6c49",
      "#b47c56",
      "#c7926a",
    ]),
    faceWidth: 0.085 + r() * 0.026,
    noseWidth: 0.021 + r() * 0.014,
    jaw: 0.77 + r() * 0.3,
    hair: choose(["crop", "parted", "bun", "waves", "bald"]),
    beard: r() > 0.57,
    garment: choose(["shirt", "kurta", "jacket"]),
    sleeves: choose(["short", "long"]),
    top: choose([
      "#294c67",
      "#786347",
      "#b6a18a",
      "#426861",
      "#8c4b41",
      "#45405f",
    ]),
    trousers: choose(["#343842", "#716553", "#374a52", "#4c4240"]),
    accessory: choose(["bag", "glasses", "scarf", "none"]),
    footwear: choose(["shoe", "sandal"]),
    posture: (r() - 0.5) * 0.12,
    stride: 0.82 + r() * 0.36,
    phase: r() * Math.PI * 2,
    context: choose(
      [
        "shop assistant",
        "student",
        "office worker",
        "courier",
        "visitor",
        "repair technician",
      ],
      social,
    ),
    language: choose(
      [
        "Hindi",
        "Marathi",
        "Tamil",
        "Bengali",
        "Kannada",
        "Telugu",
        "Malayalam",
        "Gujarati",
        "Punjabi",
        "Urdu",
      ],
      social,
    ),
    background: choose(
      ["local resident", "recent arrival", "commuter", "visiting family"],
      social,
    ),
  });
}
export function citizenAt(x, z, slot, time) {
  const id = `citizen:${x},${z}:${slot}`,
    identity = citizenIdentity(id);
  const phase = (time * 0.8 + slot * 14) % 104;
  const along = phase < 52 ? phase : 104 - phase;
  return {
    identity,
    x: x * 64 + (slot % 2 ? 9 : -9),
    y: 0.18,
    z: z * 64 + along - 26,
    yaw: phase < 52 ? 0 : Math.PI,
    speed: 0.8,
  };
}
export function crowdTier(distance, visible, previous = 4) {
  if (!visible || distance > 180) return 4;
  // Spatial hysteresis avoids representation churn; hero is independently always Tier0.
  const boundaries = [32, 65, 180];
  if (previous === 1 && distance < 36) return 1;
  if (previous === 2 && distance >= 28 && distance < 71) return 2;
  return distance < boundaries[0] ? 1 : distance < boundaries[1] ? 2 : 3;
}
