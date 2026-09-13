import * as T from "three";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function validateMotion(r) {
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
    const end = performance.now() + 45000;
    while (!predicate()) {
      if (performance.now() > end) throw Error("Motion validation timed out");
      await wait(50);
    }
  };
  const simulate = async (seconds, sample) => {
    const end = r.clock.elapsed + seconds;
    await until(() => {
      sample?.();
      return r.clock.elapsed >= end;
    });
  };
  const old = {
    enabled: r.input.enabled,
    inspect: r.inspectHuman,
    lab: r.inspectLab,
  };
  r.input.enabled = false;
  r.inspectHuman = false;
  r.inspectLab = false;
  const stop = () => {
    r.overrideInput = { x: 0, z: 0, jump: false, sprint: false };
  };
  try {
    r.reset();
    stop();
    await until(
      () => r.streaming.cells.size === 25 && !r.streaming.pending.size,
    );
    await simulate(0.4);
    const bodies = r.world.bodies.len();
    r.motion.enter();
    await simulate(0.5);
    check(
      "Physical motion fixtures",
      r.motion.lab.fixtures.length >= 30 &&
        r.world.bodies.len() === bodies + 34,
      r.motion.lab.stats(),
    );
    check(
      "Supported idle",
      r.player.grounded && r.humans.heroMotion.metrics.contacts === 2,
      r.humans.heroMotion.metrics,
    );
    let maxError = 0,
      maxDrift = 0,
      steps = r.humans.heroMotion.steps;
    const begin = r.player.body.translation();
    r.overrideInput = { x: 0, z: -0.18, jump: false, sprint: false };
    await simulate(2.2, () => {
      const m = r.humans.heroMotion.metrics;
      maxError = Math.max(maxError, m.footError ?? 0);
      maxDrift = Math.max(maxDrift, m.footActualSlide ?? 0);
    });
    stop();
    await simulate(0.3);
    const distance = begin.z - r.player.body.translation().z;
    check(
      "Measured walk and planted feet",
      distance > 1 && maxError < 0.025 && r.humans.heroMotion.steps > steps,
      {
        distance,
        maxError,
        maxDrift,
        steps: r.humans.heroMotion.steps - steps,
      },
    );
    const feetBefore = r.humans.heroMotion.metrics.contacts;
    r.overrideInput.jump = true;
    await simulate(0.1);
    r.overrideInput.jump = false;
    check(
      "Jump releases contacts",
      !r.player.grounded && r.humans.heroMotion.metrics.contacts === 0,
      {
        before: feetBefore,
        after: r.humans.heroMotion.metrics.contacts,
        state: r.humans.heroMotion.metrics.state,
      },
    );
    await simulate(1.1);
    check(
      "Landing restores support",
      r.player.grounded && r.humans.heroMotion.metrics.contacts === 2,
      r.humans.heroMotion.metrics,
    );
    for (const id of ["stairs", "curb", "slope", "uneven", "doorway", "wall"]) {
      r.motion.selectStation(id);
      stop();
      await simulate(0.25);
      const station = r.motion.lab.stations.find((s) => s.id === id),
        start = { ...r.player.body.translation() };
      let peak = start.y;
      r.overrideInput = { ...station.direction, jump: false, sprint: false };
      await simulate(id === "wall" ? 1.6 : 1.2, () => {
        peak = Math.max(peak, r.player.body.translation().y);
      });
      stop();
      const p = { ...r.player.body.translation() };
      const ok =
        id === "wall"
          ? p.z >= 25.31 && p.z < 25.5
          : id === "doorway"
            ? p.z < 31
            : id === "curb"
              ? peak > 7.01
              : id === "uneven"
                ? peak > 7.0
                : peak > 7.4;
      runs.push({
        id,
        start,
        end: p,
        peak,
        motion: { ...r.humans.heroMotion.metrics },
      });
      check("Course " + id, ok, { position: p, peak });
    }
    r.motion.reach("car-door");
    stop();
    await simulate(1.3);
    const m = r.humans.heroMotion.metrics;
    check(
      "Object-relative hand reach",
      m.reachError !== null && m.reachError < 0.03,
      { error: m.reachError, reachable: m.reachable },
    );
    r.motion.compareBodies();
    stop();
    await simulate(0.8);
    const pair = r.humans.cast
      .slice(0, 2)
      .map((c, i) => ({
        height: c.identity.height,
        error: c.rig.named["hand" + (i ? "R" : "L")]
          .getWorldPosition(new T.Vector3())
          .distanceTo(c.motion.interaction.position),
        mapping: c.retargetResult?.mappedBones,
        rootScale: c.retargetResult?.rootScale,
      }));
    check(
      "Runtime retargeting across body sizes",
      pair.every((p) => p.error < 0.03 && p.mapping === 51) &&
        Math.abs(pair[0].height - pair[1].height) > 0.2,
      pair,
    );
    check(
      "Finite pose matrices",
      r.humans.cast
        .slice(0, 2)
        .every((c) =>
          Array.from(c.rig.skeleton.boneMatrices).every(Number.isFinite),
        ),
      true,
    );
    r.motion.exit();
    stop();
    // Let streaming observe the restored player position before checking its queue.
    await simulate(0.3);
    await until(
      () =>
        r.streaming.cells.size === 25 &&
        !r.streaming.pending.size &&
        !r.streaming.ready.length,
    );
    check(
      "Lab resource recovery",
      r.world.bodies.len() === bodies && r.motion.lab.fixtures.length === 0,
      {
        before: bodies,
        after: r.world.bodies.len(),
        lab: r.motion.lab.stats(),
      },
    );
    r.lastReport = {
      operation: "PROMETHEUS",
      timestamp: new Date().toISOString(),
      tests,
      runs,
      metrics: r.metrics.report(r),
    };
    report();
  } catch (e) {
    check("Harness", false, e.message);
    r.lastReport = { operation: "PROMETHEUS", tests, runs, error: e.message };
  } finally {
    if (r.motion.lab.active) r.motion.exit();
    r.overrideInput = null;
    r.input.enabled = old.enabled;
    r.inspectHuman = old.inspect;
    r.inspectLab = old.lab;
  }
  return r.lastReport;
}
