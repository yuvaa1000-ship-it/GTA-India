const fmt = (v) => (v === null ? "N/A" : v.toFixed(2));
export function updateHUD(m) {
  document.querySelector("#hud").innerHTML =
    `<div class="hud-title"><i></i> RUNTIME TELEMETRY <span>WEBGL2</span></div><div class="fps">${Math.round(m.fps)}<small> FPS</small><span>${fmt(m.frameMs)} ms</span></div><dl>${Object.entries(
      {
        "Frame p95": fmt(m.p95FrameMs) + " ms",
        "CPU submission": fmt(m.cpuMs) + " ms",
        GPU: fmt(m.gpuMs) + " ms",
        Physics: fmt(m.physicsMs) + " ms",
        "Population / stream": fmt(m.aiMs) + " / " + fmt(m.streamingMs) + " ms",
        "Draws / triangles": m.drawCalls + " / " + m.triangles.toLocaleString(),
        "NPC / vehicle proxies": m.npcs + " / " + m.vehicles,
        "Rigid / animation bodies": m.rigidBodies + " / " + m.animationAgents,
        "JS heap": fmt(m.heapMB) + " MB",
        "Resident / queued cells": m.cells + " / " + (m.pending + m.ready),
        "Geometry / textures": m.geometries + " / " + m.textures,
      },
    )
      .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
      .join(
        "",
      )}</dl><div class="coordinates">${m.position.x.toFixed(1)} E · ${m.position.z.toFixed(1)} N <span>GENESIS 0.1</span></div>`;
}
export const notice = (text) => {
  document.querySelector("#notice").textContent = text;
};
