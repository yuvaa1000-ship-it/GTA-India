const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn, timeout = 12000) {
  const end = performance.now() + timeout;
  while (!fn()) {
    if (performance.now() > end)
      throw Error("Timed out waiting for streamed cells");
    await wait(50);
  }
}
export async function diagnostics(r) {
  let box = document.querySelector("#diagnostics");
  if (!box) {
    box = document.createElement("pre");
    box.id = "diagnostics";
    document.body.append(box);
  }
  box.textContent = "Running executable diagnostics…";
  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, passed: !!ok, detail });
    box.textContent = results
      .map((t) => `${t.passed ? "PASS" : "FAIL"} ${t.name}: ${t.detail}`)
      .join("\n");
  };
  const simulate = async (seconds) => {
    const end = r.clock.elapsed + seconds;
    await until(() => r.clock.elapsed >= end, 30000);
  };
  const oldEnabled = r.input.enabled;
  r.input.enabled = false;
  r.overrideInput = { x: 0, z: 0, jump: false, sprint: false };
  try {
    r.reset();
    await until(
      () => r.streaming.cells.size === 25 && r.streaming.pending.size === 0,
    );
    await simulate(1);
    check(
      "Ground contact",
      r.player.grounded &&
        r.player.body.translation().y > 0.8 &&
        r.player.body.translation().y < 1.1,
      JSON.stringify(r.player.body.translation()),
    );
    const start = { ...r.player.body.translation() };
    r.overrideInput = { x: 0, z: -1, jump: false, sprint: false };
    await simulate(1);
    r.overrideInput = { x: 0, z: 0, jump: false, sprint: false };
    check(
      "Locomotion",
      r.player.body.translation().z < start.z - 2,
      `moved ${(start.z - r.player.body.translation().z).toFixed(2)}m`,
    );
    const baseY = r.player.body.translation().y;
    r.overrideInput.jump = true;
    await simulate(0.15);
    r.overrideInput.jump = false;
    check(
      "Jump",
      r.player.body.translation().y > baseY + 0.3,
      `height delta ${(r.player.body.translation().y - baseY).toFixed(2)}m`,
    );
    await simulate(1.1);
    r.player.teleport({ x: 0, y: 1.1, z: 20 });
    await simulate(0.3);
    r.overrideInput = { x: 1, z: 0, jump: false, sprint: true };
    await simulate(2.1);
    r.overrideInput = { x: 0, z: 0, jump: false, sprint: false };
    const wallX = r.player.body.translation().x;
    const building = r.streaming.cells
      .get("0,0")
      .data.buildings.find((b) => b.x > 0 && b.z > 0);
    check(
      "Building collision",
      wallX <= building.x - building.w / 2 - 0.2,
      `stopped x=${wallX.toFixed(2)} at wall ${(building.x - building.w / 2).toFixed(2)}`,
    );
    const baseline = r.world.bodies.len(),
      geometryBaseline = r.renderer.info.memory.geometries;
    const prop = r.streaming.cells.get("0,0").props[0];
    prop.body.setTranslation({ x: -4, y: 1, z: 11 }, true);
    await wait(800);
    r.streaming.persist();
    const saved = JSON.stringify(r.store.props[prop.id]);
    for (const [x, z] of [
      [192, 0],
      [192, 192],
      [-192, 192],
      [0, 0],
    ]) {
      r.player.teleport({ x, y: 2, z });
      await until(
        () =>
          r.streaming.cells.size === 25 &&
          r.streaming.pending.size === 0 &&
          r.streaming.ready.length === 0 &&
          r.streaming.isReady({ x, z }),
      );
      await wait(100);
    }
    check(
      "Streaming eviction",
      r.streaming.evicted >= 75 && r.streaming.cells.size === 25,
      `${r.streaming.created} created / ${r.streaming.evicted} evicted / ${r.streaming.cells.size} resident`,
    );
    check(
      "Rigid-body lifetime",
      r.world.bodies.len() === baseline,
      `${baseline} before / ${r.world.bodies.len()} after`,
    );
    check(
      "Geometry lifetime",
      r.renderer.info.memory.geometries <=
        geometryBaseline + (r.humans?.maxAnimated ?? 0),
      `${geometryBaseline} before / ${r.renderer.info.memory.geometries} after; human allocation allowance ${r.humans?.maxAnimated ?? 0}`,
    );
    check(
      "Persistent prop",
      JSON.stringify(r.store.props[prop.id]) === saved,
      "State retained across unload/reload",
    );
    r.player.teleport({ x: -9, y: 1, z: -10 });
    r.depot.interact(r.player);
    await wait(700);
    check(
      "Interior entry",
      r.depot.inside && r.player.body.translation().y > 49,
      "Separate collidable depot",
    );
    r.depot.interact(r.player);
    check(
      "Interior exit",
      !r.depot.inside && r.world.bodies.len() === baseline,
      "Exterior restored, room bodies released",
    );
    check(
      "Worker errors",
      r.streaming.failures.length === 0,
      JSON.stringify(r.streaming.failures),
    );
    r.reset();
    await wait(2500);
    r.lastReport = {
      timestamp: new Date().toISOString(),
      tests: results,
      metrics: r.metrics.report(r),
    };
    box.textContent += "\n\n" + JSON.stringify(r.lastReport.metrics, null, 2);
    return r.lastReport;
  } catch (error) {
    check("Harness", false, error.message);
    r.lastReport = { tests: results, error: error.message };
    return r.lastReport;
  } finally {
    r.overrideInput = null;
    r.input.enabled = oldEnabled;
  }
}
