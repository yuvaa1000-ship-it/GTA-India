export class Metrics {
  constructor(renderer) {
    this.renderer = renderer;
    this.samples = [];
    this.last = 0;
    const gl = renderer.getContext();
    this.gl = gl;
    this.ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    this.query = null;
    this.gpuMs = null;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    this.capabilities = {
      webgl2: renderer.capabilities.isWebGL2,
      renderer: dbg
        ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      webgpuAPI: "gpu" in navigator,
      worker: typeof Worker !== "undefined",
      sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
      crossOriginIsolated,
      offscreenCanvas: typeof OffscreenCanvas !== "undefined",
      audioWorklet: typeof AudioWorkletNode !== "undefined",
      gpuTimer: !!this.ext,
    };
  }
  beginGPU() {
    if (!this.ext) return;
    const g = this.gl;
    if (this.query) {
      if (g.getQueryParameter(this.query, g.QUERY_RESULT_AVAILABLE)) {
        if (!g.getParameter(this.ext.GPU_DISJOINT_EXT))
          this.gpuMs = g.getQueryParameter(this.query, g.QUERY_RESULT) / 1e6;
        else this.gpuMs = null;
        g.deleteQuery(this.query);
        this.query = null;
      } else return;
    }
    this.query = g.createQuery();
    g.beginQuery(this.ext.TIME_ELAPSED_EXT, this.query);
    this.active = true;
  }
  endGPU() {
    if (this.active) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.active = false;
    }
  }
  record(dt, cpu, physics, ai, streaming) {
    this.samples.push({ frame: dt * 1000, cpu, physics, ai, streaming });
    if (this.samples.length > 600) this.samples.shift();
  }
  report(runtime) {
    const values = (k) => this.samples.map((s) => s[k]).sort((a, b) => a - b);
    const avg = (k) =>
      this.samples.reduce((a, s) => a + s[k], 0) / (this.samples.length || 1);
    const p95 =
      values("frame")[Math.floor((this.samples.length - 1) * 0.95)] ?? 0;
    const r = this.renderer.info;
    return {
      samples: this.samples.length,
      fps: 1000 / (avg("frame") || 1),
      frameMs: avg("frame"),
      p95FrameMs: p95,
      cpuMs: avg("cpu"),
      physicsMs: avg("physics"),
      aiMs: avg("ai"),
      streamingMs: avg("streaming"),
      gpuMs: runtime.photon?.profiler.values.scene ?? this.gpuMs,
      photon: runtime.photon?.stats() ?? null,
      drawCalls: r.render.calls,
      triangles: r.render.triangles,
      geometries: r.memory.geometries,
      textures: r.memory.textures,
      heapMB: performance.memory
        ? performance.memory.usedJSHeapSize / 1048576
        : null,
      cells: runtime.streaming.cells.size,
      pending: runtime.streaming.pending.size,
      ready: runtime.streaming.ready.length,
      npcs: runtime.streaming.cells.size * 4,
      vehicles: runtime.streaming.cells.size * 2,
      rigidBodies: runtime.world.bodies.len(),
      animationAgents: runtime.humans?.stats().activeRigs ?? 0,
      humans: runtime.humans?.stats() ?? null,
      motion: runtime.motion?.stats() ?? null,
      reactions: runtime.reactions?.stats() ?? null,
      secondary: runtime.secondary?.stats() ?? null,
      pool: runtime.streaming.pool.length,
      created: runtime.streaming.created,
      evicted: runtime.streaming.evicted,
      position: { ...runtime.player.body.translation() },
      capabilities: this.capabilities,
      resolution: [
        this.renderer.domElement.width,
        this.renderer.domElement.height,
      ],
    };
  }
  dispose() {
    if (this.query) this.gl.deleteQuery(this.query);
  }
}
