const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn, timeout = 30000) {
  const end = performance.now() + timeout;
  while (!fn()) {
    if (performance.now() > end) throw Error("Rendering validation timed out");
    await wait(50);
  }
}
export async function compareRendering(r) {
  let box = document.querySelector("#diagnostics");
  if (!box) {
    box = document.createElement("pre");
    box.id = "diagnostics";
    document.body.append(box);
  }
  const tests = [],
    runs = [];
  const check = (name, passed, detail) => tests.push({ name, passed, detail });
  const report = () => {
    box.textContent =
      "PHOTON — executable render comparison\n" +
      tests
        .map((t) => `${t.passed ? "PASS" : "FAIL"} ${t.name}: ${t.detail}`)
        .join("\n") +
      "\n\n" +
      JSON.stringify(runs, null, 2);
  };
  const original = {
    quality: r.photon.quality,
    condition: r.photon.atmosphere.name,
    planar: r.photon.reflections.enabled,
    adaptive: r.photon.adaptive,
    input: r.input.enabled,
    inspectLab: r.inspectLab,
    exposure: r.photon.post.autoExposure,
    humansFrozen: r.humans?.validationFrozen,
  };
  r.inspectLab = true;
  r.input.enabled = false;
  r.overrideInput = { x: 0, z: 0, jump: false, sprint: false };
  r.photon.adaptive = false;
  r.photon.post.autoExposure = true;
  try {
    r.reset();
    await until(
      () => r.streaming.cells.size === 25 && r.streaming.pending.size === 0,
    );
    await until(() => !r.photon.reflections.dirty);
    await wait(1000);
    const baseBodies = r.world.bodies.len();
    check(
      "HDR framebuffer",
      r.photon.hdr,
      "Framebuffer completeness was queried",
    );
    check(
      "Material hierarchy",
      r.photon.library.materials.asphalt.metalness === 0 &&
        r.photon.library.materials.chrome.metalness === 1 &&
        r.photon.library.materials.glass.metalness === 0,
      "Dielectric road/glass, conductor chrome, clearcoat paint",
    );
    report();
    for (const [name, quality, condition, planar] of [
      ["balanced-no-planar", "balanced", "sunset", false],
      ["balanced-planar", "balanced", "sunset", true],
      ["rain-performance", "performance", "rain", true],
      ["night-reference", "reference", "night", true],
    ]) {
      box.textContent = "Measuring " + name + "…";
      r.photon.setQuality(quality);
      r.photon.setCondition(condition);
      r.photon.reflections.setEnabled(planar);
      await until(() => !r.photon.reflections.dirty);
      await wait(1200);
      r.metrics.samples = [];
      r.photon.profiler.reset();
      await wait(6000);
      runs.push({ name, ...r.metrics.report(r) });
      report();
    }
    check(
      "Planar capture advances",
      r.photon.reflections.planarUpdates > 0,
      `${r.photon.reflections.planarUpdates} completed captures`,
    );
    check(
      "Environment probe refresh",
      r.photon.reflections.probeVersion >= 4,
      `${r.photon.reflections.probeVersion} captures filtered`,
    );
    check(
      "Image metering",
      !r.photon.post.readback.error &&
        r.photon.post.meterCount > 2 &&
        Number.isFinite(r.photon.post.logLuminance),
      `${r.photon.post.meterCount} rendered-image luminance samples; async error: ${r.photon.post.readback.error ?? "none"}`,
    );
    check(
      "Physics preserved",
      r.world.bodies.len() === baseBodies,
      `${baseBodies} before / ${r.world.bodies.len()} after`,
    );
    check(
      "Window LOD active",
      r.photon.detailCells < r.streaming.cells.size,
      `${r.photon.detailCells} detailed cells / ${r.streaming.cells.size} resident`,
    );
    r.photon.setQuality("balanced");
    r.photon.setCondition("sunset");
    await until(() => !r.photon.reflections.dirty);
    await wait(1200);
    // Hold character ownership constant while isolating render-target cleanup.
    if (r.humans) r.humans.validationFrozen = true;
    await wait(1200);
    const memory = { ...r.renderer.info.memory };
    for (let i = 0; i < 3; i++) {
      r.photon.setQuality("performance");
      await wait(120);
      r.photon.setQuality("balanced");
      await until(() => !r.photon.reflections.dirty);
      await wait(120);
    }
    await wait(800);
    check(
      "Target lifecycle",
      r.renderer.info.memory.textures <= memory.textures &&
        r.renderer.info.memory.geometries <= memory.geometries,
      `textures ${memory.textures} → ${r.renderer.info.memory.textures}; geometries ${memory.geometries} → ${r.renderer.info.memory.geometries}`,
    );
    r.lastReport = {
      operation: "PHOTON",
      timestamp: new Date().toISOString(),
      tests,
      runs,
    };
    report();
  } catch (error) {
    check("Harness", false, error.message);
    r.lastReport = { operation: "PHOTON", tests, runs, error: error.message };
    report();
  } finally {
    if (r.humans) r.humans.validationFrozen = original.humansFrozen;
    r.photon.setQuality(original.quality);
    r.photon.setCondition(original.condition);
    r.photon.reflections.setEnabled(original.planar);
    r.photon.adaptive = original.adaptive;
    r.photon.post.autoExposure = original.exposure;
    r.input.enabled = original.input;
    r.inspectLab = original.inspectLab;
    r.overrideInput = null;
    for (const [id, value] of [
      ["quality", original.quality],
      ["condition", original.condition],
    ])
      document.querySelector("#" + id).value = value;
    document.querySelector("#planar").checked = original.planar;
    document.querySelector("#adaptive").checked = original.adaptive;
  }
  return r.lastReport;
}
