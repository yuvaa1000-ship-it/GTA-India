import { validateHuman } from "../characters/validate.js";
import { citizenIdentity } from "../characters/identity.js";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function validateHumans(r) {
  let box = document.querySelector("#diagnostics");
  if (!box) {
    box = document.createElement("pre");
    box.id = "diagnostics";
    document.body.append(box);
  }
  const checks = [],
    check = (name, passed, detail) => {
      checks.push({ name, passed, detail });
      box.textContent = checks
        .map(
          (x) =>
            `${x.passed ? "PASS" : "FAIL"} ${x.name}: ${JSON.stringify(x.detail)}`,
        )
        .join("\n");
    };
  const enabled = r.input.enabled,
    inspect = r.inspectLab,
    inspectHuman = r.inspectHuman;
  r.input.enabled = false;
  r.overrideInput = { x: 0, z: 0, jump: false, sprint: false };
  r.inspectLab = false;
  r.inspectHuman = false;
  try {
    r.reset();
    const deadline = performance.now() + 30000;
    while (r.streaming.cells.size !== 25 || r.streaming.pending.size) {
      if (performance.now() > deadline)
        throw Error("Human streaming warm-up timed out");
      await wait(100);
    }
    await wait(1500);
    check(
      "Hero weighted asset",
      validateHuman(r.humans.hero).passed,
      validateHuman(r.humans.hero),
    );
    check(
      "Cast diversity",
      new Set(r.humans.cast.map((a) => a.identity.height)).size === 4,
      r.humans.cast.map((a) => ({
        id: a.identity.id,
        height: a.identity.height,
        garment: a.identity.garment,
        hair: a.identity.hair,
      })),
    );
    const before = r.humans.hero.poseUpdates;
    await wait(2000);
    check(
      "Live skeleton updates",
      r.humans.hero.poseUpdates > before,
      r.humans.hero.poseUpdates - before,
    );
    const ids = [...r.humans.citizens.values()]
      .slice(0, 4)
      .map((a) => a.identity);
    check(
      "Deterministic identities",
      ids.every(
        (d) => JSON.stringify(d) === JSON.stringify(citizenIdentity(d.id)),
      ),
      ids.map((d) => d.id),
    );
    check(
      "Citizen capacity",
      r.humans.citizens.size === r.streaming.cells.size * 4,
      r.humans.citizens.size,
    );
    check(
      "Bounded active rigs",
      r.humans.actors.size <= r.humans.maxAnimated,
      r.humans.stats(),
    );
    check(
      "Physics retained",
      r.world.bodies.len() === 226,
      r.world.bodies.len(),
    );
    check(
      "Finite skin pose",
      Array.from(r.humans.hero.rig.skeleton.boneMatrices).every(
        Number.isFinite,
      ),
      "All bone matrix entries finite",
    );
    r.lastReport = {
      operation: "HUMAN",
      timestamp: new Date().toISOString(),
      tests: checks,
      metrics: r.metrics.report(r),
    };
    box.textContent += "\n\n" + JSON.stringify(r.lastReport.metrics, null, 2);
  } catch (e) {
    check("Harness", false, e.message);
  } finally {
    r.overrideInput = null;
    r.input.enabled = enabled;
    r.inspectLab = inspect;
    r.inspectHuman = inspectHuman;
  }
}
