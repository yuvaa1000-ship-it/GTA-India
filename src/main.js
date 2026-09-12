import "./style.css";
import { Runtime } from "./core/runtime.js";
import { diagnostics } from "./debug/diagnostics.js";
import { compareRendering } from "./debug/photon-validation.js";
import { notice } from "./ui/hud.js";
try {
  const runtime = await new Runtime().init();
  document.querySelector("#play").onclick = () => {
    runtime.inspectLab = false;
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
    runtime.inspectLab = !runtime.inspectLab;
    if (runtime.inspectLab) runtime.reset();
    document.querySelector("#panel").hidden = true;
    runtime.input.enabled = true;
    e.target.textContent = runtime.inspectLab
      ? "Follow player"
      : "Inspect materials";
  };
  document.querySelector("#hud-toggle").onclick = (e) => {
    const hud = document.querySelector("#hud");
    hud.hidden = !hud.hidden;
    e.target.textContent = hud.hidden ? "Show HUD" : "Hide HUD";
  };
  document.querySelector("#probe").onclick = () =>
    (runtime.photon.reflections.dirty = true);
  const runValidation = async (validate) => {
    const controls = [...document.querySelectorAll("button, select, input")];
    const disabled = controls.map((c) => c.disabled);
    controls.forEach((c) => {
      c.disabled = true;
    });
    document.querySelector("#panel").hidden = true;
    try {
      await validate(runtime);
    } finally {
      controls.forEach((c, i) => {
        c.disabled = disabled[i];
      });
      document.querySelector("#close-report").hidden = false;
    }
  };
  document.querySelector("#photon-test").onclick = () =>
    runValidation(compareRendering);
  document.querySelector("#save").onclick = () => runtime.save();
  document.querySelector("#load").onclick = () => {
    runtime.inspectLab = false;
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
    a.download = "photon-runtime-report.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  addEventListener("pagehide", () => runtime.dispose(), { once: true });
} catch (error) {
  notice(`Startup failed: ${error.message}`);
  document.querySelector("#panel p").textContent =
    "The 3D runtime could not start. " + error.message;
  console.error(error);
}
