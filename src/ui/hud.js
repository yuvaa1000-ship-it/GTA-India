const fmt = (v) => (v === null ? "N/A" : v.toFixed(2));
export function updateHUD(m) {
  document.querySelector("#hud").innerHTML =
    `<div class="hud-title"><i></i> RUNTIME TELEMETRY <span>WEBGL2</span></div><div class="fps">${Math.round(m.fps)}<small> FPS</small><span>${fmt(m.frameMs)} ms</span></div><dl>${Object.entries(
      {
        "Frame p95": fmt(m.p95FrameMs) + " ms",
        "CPU submission": fmt(m.cpuMs) + " ms",
        "GPU scene (latest)": fmt(m.gpuMs) + " ms",
        "Planar / post GPU":
          fmt(m.photon?.gpuPassMs.planar ?? null) +
          " / " +
          fmt(m.photon?.gpuPassMs.post ?? null) +
          " ms",
        "Exposure / scale":
          fmt(m.photon?.exposure ?? null) +
          " / " +
          fmt(m.photon?.renderScale ?? null),
        "Human pose / rigs":
          fmt(m.humans?.cpuMs ?? null) + " ms / " + m.animationAgents,
        "Reaction / mode":
          (m.reactions?.state ?? "balanced") +
          " / " +
          (m.reactions?.physical?.bodies ?? 0) +
          " links",
        "Physical foot residual":
          m.reactions?.physicalFootError == null
            ? "—"
            : fmt(m.reactions.physicalFootError * 100) + " cm",
        "Secondary CPU / actors":
          fmt(m.secondary?.cpuMs ?? 0) + " ms / " + (m.secondary?.actors ?? 0),
        "Hair / cloth particles": m.secondary?.particles ?? 0,
        "Reaction CPU": fmt(m.reactions?.cpuMs ?? 0) + " ms",
        "COM support / joints":
          fmt(m.reactions?.balance?.signedSupportDistance ?? null) +
          " m / " +
          fmt((m.reactions?.physical?.maxJointError ?? 0) * 100) +
          " cm",
        "Motion state": m.motion?.state ?? "idle",
        "Foot error / drift":
          fmt((m.motion?.footError ?? 0) * 100) +
          " / " +
          fmt((m.motion?.footActualSlide ?? 0) * 100) +
          " cm",
        "Hand error":
          m.motion?.reachError == null
            ? "—"
            : fmt(m.motion.reachError * 100) + " cm",
        Physics: fmt(m.physicsMs) + " ms",
        "Population / stream": fmt(m.aiMs) + " / " + fmt(m.streamingMs) + " ms",
        "Draws / triangles": m.drawCalls + " / " + m.triangles.toLocaleString(),
        "Citizens / vehicle proxies": m.npcs + " / " + m.vehicles,
        "Rigid / animation bodies": m.rigidBodies + " / " + m.animationAgents,
        "JS heap": fmt(m.heapMB) + " MB",
        "Resident / queued cells": m.cells + " / " + (m.pending + m.ready),
        "Geometry / textures": m.geometries + " / " + m.textures,
      },
    )
      .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
      .join(
        "",
      )}</dl><div class="coordinates">${m.position.x.toFixed(1)} E · ${m.position.z.toFixed(1)} N <span>SECONDARY LIFE 0.6</span></div>`;
}
export const notice = (text) => {
  document.querySelector("#notice").textContent = text;
};
