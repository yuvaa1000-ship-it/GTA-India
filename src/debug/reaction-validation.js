import * as T from "three";
import { impactTransfer } from "../physical-animation/scenarios.js";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function validateReactions(r) {
  let box = document.querySelector("#diagnostics");
  if (!box) {
    box = document.createElement("pre");
    box.id = "diagnostics";
    document.body.append(box);
  }
  const tests = [],
    runs = [];
  const report = () => {
    box.textContent =
      tests
        .map(
          (t) =>
            `${t.passed ? "PASS" : "FAIL"} ${t.name}: ${JSON.stringify(t.detail)}`,
        )
        .join("\n") +
      "\n\n" +
      JSON.stringify({ runs, metrics: r.metrics.report(r) }, null, 2);
  };
  const check = (name, passed, detail) => {
    tests.push({ name, passed: !!passed, detail });
    report();
  };
  const until = async (predicate) => {
    const end = performance.now() + 80000;
    while (!predicate()) {
      if (performance.now() > end) throw Error("Physical validation timed out");
      await wait(40);
    }
  };
  const simulate = async (seconds, sample) => {
    const end = r.clock.elapsed + seconds;
    await until(() => {
      sample?.();
      return r.clock.elapsed >= end;
    });
  };
  const old = { enabled: r.input.enabled, validation: r.validation };
  r.validation = true;
  r.input.enabled = false;
  r.overrideInput = { x: 0, z: 0, jump: false, sprint: false };
  try {
    r.reset();
    await simulate(0.4);
    await until(
      () =>
        r.streaming.cells.size === 25 &&
        !r.streaming.pending.size &&
        !r.streaming.ready.length,
    );
    const base = r.world.bodies.len();
    r.motion.enter();
    await simulate(0.4);
    r.metrics.samples = [];
    for (const [name, impulse, station] of [
      ["bump", 20, "flat"],
      ["push", 100, "flat"],
      ["fall", 350, "flat"],
      ["stairs", 280, "stairs"],
    ]) {
      r.motion.selectStation(station);
      await simulate(0.3);
      if (name === "stairs") {
        // Spawn above the upper risers inside the existing physical test staircase.
        r.player.teleport({ x: -6, y: 8.35, z: 29.8 });
        await simulate(0.35);
      }
      const start = { ...r.player.body.translation() },
        before = r.world.bodies.len();
      const direction =
        name === "stairs"
          ? { x: 0, y: 0, z: impulse }
          : { x: impulse, y: 0, z: 0 };
      r.reactions.impact({
        impulse: direction,
        source: name,
        forceFall: impulse >= 280,
      });
      const initial = r.reactions.art.stats();
      check(
        name + " articulated ownership",
        r.world.bodies.len() === before + 13 &&
          initial.joints === 12 &&
          Math.abs(initial.mass - 75) < 0.01,
        { bodies: initial.bodies, joints: initial.joints, mass: initial.mass },
      );
      let finite = true,
        maxJoint = 0,
        maxPhysicalFootError = 0,
        contacts = 0,
        full = false,
        steps = r.humans.heroMotion.steps,
        states = new Set();
      const sample = () => {
        if (!r.reactions.active) return;
        const s = r.reactions.art.stats();
        finite &&= s.finite;
        maxJoint = Math.max(maxJoint, s.maxJointError);
        maxPhysicalFootError = Math.max(
          maxPhysicalFootError,
          r.reactions.physicalFootError ?? 0,
        );
        contacts = Math.max(contacts, s.contacts);
        full ||= r.reactions.fullPhysical;
        states.add(r.reactions.state);
      };
      await simulate(name === "stairs" ? 5 : 3, sample);
      await until(() => {
        sample();
        return !r.reactions.active;
      });
      const end = { ...r.player.body.translation() };
      const distance = Math.hypot(end.x - start.x, end.z - start.z);
      const run = {
        name,
        start,
        end,
        distance,
        finite,
        maxJoint,
        maxPhysicalFootError,
        contacts,
        full,
        steps: r.humans.heroMotion.steps - steps,
        states: [...states],
        last: r.reactions.last,
      };
      runs.push(run);
      check(
        name + " physical behavior",
        finite &&
          maxJoint < 0.16 &&
          (name === "bump"
            ? !full && !states.has("falling")
            : name === "push"
              ? distance > 0.08 && run.steps > 0
              : full && contacts > 0),
        {
          distance,
          finite,
          maxJoint,
          maxPhysicalFootError,
          contacts,
          full,
          steps: run.steps,
          states: run.states,
        },
      );
      check(
        name + " recovery",
        !r.reactions.active &&
          r.player.collider.isEnabled() &&
          Array.from(r.humans.hero.rig.skeleton.boneMatrices).every(
            Number.isFinite,
          ),
        { state: r.reactions.state, collider: r.player.collider.isEnabled() },
      );
    }
    const motorcycle = impactTransfer(75, 160, 4),
      car = impactTransfer(75, 1200, 4);
    check("Mass-derived vehicle event impulses", car > motorcycle, {
      motorcycle,
      car,
      closingSpeed: 4,
      characterMass: 75,
      limitation: "collision-event model; no vehicle dynamics",
    });
    r.motion.exit();
    await simulate(0.3);
    await until(
      () =>
        r.streaming.cells.size === 25 &&
        !r.streaming.pending.size &&
        !r.streaming.ready.length,
    );
    check(
      "World resource restoration",
      r.world.bodies.len() === base && r.world.impulseJoints.len() === 0,
      {
        before: base,
        after: r.world.bodies.len(),
        joints: r.world.impulseJoints.len(),
      },
    );
    r.lastReport = {
      operation: "EUPHORIA INDIA",
      timestamp: new Date().toISOString(),
      tests,
      runs,
      metrics: r.metrics.report(r),
    };
    report();
  } catch (e) {
    check("Harness", false, e.message);
    r.lastReport = {
      operation: "EUPHORIA INDIA",
      tests,
      runs,
      error: e.message,
    };
  } finally {
    r.reactions.clear();
    if (r.motion.lab.active) r.motion.exit();
    r.overrideInput = null;
    r.input.enabled = old.enabled;
    r.validation = old.validation;
  }
  return r.lastReport;
}
