import "./style.css";
import { Runtime } from "./core/runtime.js";
import { diagnostics } from "./debug/diagnostics.js";
import { validateMotion } from "./debug/motion-validation.js";
import { validateHumans } from "./debug/human-validation.js";
import { compareRendering } from "./debug/photon-validation.js";
import { notice } from "./ui/hud.js";
try {
  const runtime = await new Runtime().init();
  document.querySelector("#play").onclick = () => {
    runtime.inspectLab = false;
    runtime.inspectHuman = false;
    document.querySelector("#human-camera").textContent = "Inspect character";
    document.querySelector("#lab-camera").textContent = "Inspect materials";
    runtime.input.enabled = true;
    document.querySelector("#panel").hidden = true;
    runtime.renderer.domElement.focus();
    notice(
      "Explore with WASD · Arrow keys rotate the camera · E enters the depot",
    );
  };
  document.querySelector("#close-report").onclick = () => {
    document.querySelector("#diagnostics")?.remove();
    document.querySelector("#close-report").hidden = true;
    runtime.input.enabled = true;
  };
  document.querySelector("#quality").onchange = (e) =>
    runtime.photon.setQuality(e.target.value);
  document.querySelector("#condition").onchange = (e) =>
    runtime.photon.setCondition(e.target.value);
  document.querySelector("#planar").onchange = (e) =>
    runtime.photon.reflections.setEnabled(e.target.checked);
  document.querySelector("#exposure").onchange = (e) =>
    (runtime.photon.post.autoExposure = e.target.checked);
  document.querySelector("#adaptive").onchange = (e) =>
    (runtime.photon.adaptive = e.target.checked);
  document.querySelector("#lab-camera").onclick = (e) => {
    runtime.inspectHuman = false;
    document.querySelector("#human-camera").textContent = "Inspect character";
    runtime.inspectLab = !runtime.inspectLab;
    if (runtime.inspectLab) runtime.reset();
    document.querySelector("#panel").hidden = true;
    runtime.input.enabled = true;
    e.target.textContent = runtime.inspectLab
      ? "Follow player"
      : "Inspect materials";
  };
  document.querySelector("#human-camera").onclick = (e) => {
    runtime.inspectHuman = !runtime.inspectHuman;
    runtime.inspectLab = false;
    document.querySelector("#lab-camera").textContent = "Inspect materials";
    document.querySelector("#panel").hidden = true;
    runtime.input.enabled = true;
    if (runtime.inspectHuman) {
      runtime.reset();
      runtime.humans.heroYaw = 0;
    }
    e.target.textContent = runtime.inspectHuman
      ? "Follow character"
      : "Inspect character";
  };
  document.querySelector("#hud-toggle").onclick = (e) => {
    const hud = document.querySelector("#hud");
    hud.hidden = !hud.hidden;
    e.target.textContent = hud.hidden ? "Show HUD" : "Hide HUD";
  };
  document.querySelector("#probe").onclick = () =>
    (runtime.photon.reflections.dirty = true);
  const runValidation = async (validate) => {
    const inspectHuman = runtime.inspectHuman;
    runtime.inspectHuman = false;
    const controls = [...document.querySelectorAll("button, select, input")];
    const disabled = controls.map((c) => c.disabled);
    controls.forEach((c) => {
      c.disabled = true;
    });
    document.querySelector("#panel").hidden = true;
    try {
      await validate(runtime);
    } finally {
      runtime.inspectHuman = inspectHuman;
      controls.forEach((c, i) => {
        c.disabled = disabled[i];
      });
      document.querySelector("#close-report").hidden = false;
      syncMotionUI();
    }
  };

  const fillMotionTargets = () => {
    document.querySelector("#motion-station").innerHTML =
      runtime.motion.lab.stations
        .map((s) => `<option value="${s.id}">${s.label}</option>`)
        .join("");
    document.querySelector("#motion-target").innerHTML =
      runtime.motion.lab.targets
        .map((t) => `<option value="${t.id}">${t.label}</option>`)
        .join("");
  };
  fillMotionTargets();
  document.querySelector("#motion-enter").onclick = (e) => {
    if (runtime.motion.lab.active) {
      runtime.motion.exit();
      e.target.textContent = "Enter motion lab";
    } else {
      runtime.motion.enter();
      fillMotionTargets();
      e.target.textContent = "Leave motion lab";
    }
    document.querySelector("#panel").hidden = true;
    runtime.input.enabled = true;
    notice(
      "Motion lab · Choose a course, walk with WASD, or align to a contact",
    );
  };
  document.querySelector("#motion-go").onclick = () => {
    runtime.motion.selectStation(
      document.querySelector("#motion-station").value,
    );
    fillTargetsOnly();
    document.querySelector("#panel").hidden = true;
    runtime.input.enabled = true;
  };
  const fillTargetsOnly = () => {
    if (!document.querySelector("#motion-target").options.length)
      document.querySelector("#motion-target").innerHTML =
        runtime.motion.lab.targets
          .map((t) => `<option value="${t.id}">${t.label}</option>`)
          .join("");
    document.querySelector("#motion-enter").textContent = "Leave motion lab";
  };
  document.querySelector("#motion-reach").onclick = () => {
    runtime.motion.reach(
      document.querySelector("#motion-target").value || "car-door",
    );
    notice("Contact pose · Release to resume movement");
  };
  document.querySelector("#motion-bodies").onclick = () => {
    runtime.motion.compareBodies();
    notice("Two body sizes retarget the same physical handle");
  };
  document.querySelector("#motion-release").onclick = () => {
    runtime.motion.interaction = null;
    if (runtime.motion.comparison) runtime.motion.restoreCast();
    notice("Contact released");
  };
  document.querySelector("#motion-style").onchange = (e) => {
    const value = e.target.value;
    runtime.motion.context = {
      surface: ["wet", "mud", "sand", "water"].includes(value) ? value : "road",
      injury: value === "injury" ? 0.7 : 0,
      fatigue: value === "fatigue" ? 0.8 : 0,
      carry: value === "carry",
      urgency: value === "urgency" ? 1 : 0,
    };
  };
  document.querySelector("#motion-test").onclick = () =>
    runValidation(validateMotion);

  document.querySelector("#human-test").onclick = () =>
    runValidation(validateHumans);
  document.querySelector("#photon-test").onclick = () =>
    runValidation(compareRendering);
  document.querySelector("#save").onclick = () => runtime.save();
  document.querySelector("#load").onclick = () => {
    runtime.inspectLab = false;
    runtime.inspectHuman = false;
    document.querySelector("#human-camera").textContent = "Inspect character";
    document.querySelector("#lab-camera").textContent = "Inspect materials";
    runtime.load();
  };
  document.querySelector("#reset").onclick = () => runtime.reset();
  document.querySelector("#test").onclick = async () => {
    await runValidation(diagnostics);
    notice("Diagnostics complete · Export metrics saves the full report");
  };
  document.querySelector("#report").onclick = () => {
    const data = runtime.lastReport ?? {
      metrics: runtime.metrics.report(runtime),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "prometheus-runtime-report.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  function syncMotionUI() {
    document.querySelector("#motion-enter").textContent = runtime.motion.lab
      .active
      ? "Leave motion lab"
      : "Enter motion lab";
    const select = document.querySelector("#motion-target"),
      previous = select.value;
    select.innerHTML = runtime.motion.lab.targets
      .map((t) => `<option value="${t.id}">${t.label}</option>`)
      .join("");
    if ([...select.options].some((o) => o.value === previous))
      select.value = previous;
    if (runtime.motion.lab.active) {
      document.querySelector("#panel").hidden = true;
      runtime.input.enabled = true;
    }
    document.querySelector("#human-camera").textContent = runtime.inspectHuman
      ? "Follow character"
      : "Inspect character";
    document.querySelector("#lab-camera").textContent = runtime.inspectLab
      ? "Follow player"
      : "Inspect materials";
  }
  for (const id of [
    "play",
    "load",
    "reset",
    "human-camera",
    "lab-camera",
    "motion-enter",
    "motion-go",
    "motion-reach",
    "motion-bodies",
  ])
    document.querySelector("#" + id).addEventListener("click", syncMotionUI);
  addEventListener("pagehide", () => runtime.dispose(), { once: true });
} catch (error) {
  notice(`Startup failed: ${error.message}`);
  document.querySelector("#panel p").textContent =
    "The 3D runtime could not start. " + error.message;
  console.error(error);
}
