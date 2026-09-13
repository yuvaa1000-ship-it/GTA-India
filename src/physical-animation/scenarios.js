import * as T from "three";

// Collision-event approximations for impact experiments, not delivered vehicle dynamics.
export function impactTransfer(
  characterMass,
  obstacleMass,
  closingSpeed,
  restitution = 0.05,
) {
  if (
    ![characterMass, obstacleMass, closingSpeed, restitution].every(
      Number.isFinite,
    ) ||
    characterMass <= 0 ||
    obstacleMass <= 0 ||
    closingSpeed < 0
  )
    throw Error("Invalid impact parameters");
  return (
    ((1 + Math.min(1, Math.max(0, restitution))) * closingSpeed) /
    (1 / characterMass + 1 / obstacleMass)
  );
}
export const REACTION_SCENARIOS = [
  { id: "bump", label: "Small shoulder bump", impulse: 20, link: "chest" },
  {
    id: "push",
    label: "Hard push / recovery steps",
    impulse: 100,
    link: "chest",
  },
  {
    id: "fall",
    label: "Heavy impact / collapse",
    impulse: 350,
    link: "chest",
    forceFall: true,
  },
  {
    id: "motorcycle",
    label: "Motorcycle impact event",
    obstacleMass: 160,
    speed: 4,
    link: "thighL",
  },
  {
    id: "car",
    label: "Car impact event",
    obstacleMass: 1200,
    speed: 4,
    link: "pelvis",
    forceFall: true,
  },
  {
    id: "brake",
    label: "Occupant deceleration / brace",
    impulse: 70,
    link: "chest",
    stance: "seated",
  },
];
export function runReactionScenario(
  r,
  id,
  { direction = "back", mass = 75, friction = 0.7, stance = "neutral" } = {},
) {
  const s = REACTION_SCENARIOS.find((s) => s.id === id);
  if (!s) throw Error("Unknown reaction scenario");
  r.reactions.configure({ mass, friction, stance: s.stance ?? stance });
  r.inspectLab = false;
  r.inspectHuman = false;
  r.motion.interaction = null;
  const yaw = r.humans.heroYaw;
  const angles = {
    back: Math.PI,
    front: 0,
    left: -Math.PI / 2,
    right: Math.PI / 2,
  };
  const dir = new T.Vector3(
    Math.sin(yaw + (angles[direction] ?? Math.PI)),
    0,
    Math.cos(yaw + (angles[direction] ?? Math.PI)),
  );
  const impulse = s.obstacleMass
    ? impactTransfer(mass, s.obstacleMass, s.speed)
    : s.impulse;
  // A pelvis impulse must be applied after it becomes dynamic.
  if (s.link === "pelvis") {
    r.reactions.start();
    r.reactions.releaseRoot();
  }
  return r.reactions.impact({
    impulse: dir.multiplyScalar(impulse),
    source: s.id,
    link: s.link,
    forceFall: s.forceFall,
  });
}
