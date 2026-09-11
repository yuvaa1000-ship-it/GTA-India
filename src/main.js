import "./style.css";
import { Runtime } from "./core/runtime.js";
import { diagnostics } from "./debug/diagnostics.js";
import { notice } from "./ui/hud.js";
try {
  const runtime = await new Runtime().init();
  document.querySelector("#play").onclick = () => {
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
  document.querySelector("#save").onclick = () => runtime.save();
  document.querySelector("#load").onclick = () => runtime.load();
  document.querySelector("#reset").onclick = () => runtime.reset();
  document.querySelector("#test").onclick = async (e) => {
    e.target.disabled = true;
    document.querySelector("#panel").hidden = true;
    await diagnostics(runtime);
    document.querySelector("#close-report").hidden = false;
    e.target.disabled = false;
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
    a.download = "genesis-runtime-report.json";
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
