export class GPUProfiler {
  constructor(renderer) {
    this.gl = renderer.getContext();
    this.ext = this.gl.getExtension("EXT_disjoint_timer_query_webgl2");
    this.pending = [];
    this.values = {};
    this.cpu = {};
    this.timestamps = {};
    this.active = null;
  }
  measure(name, fn) {
    const start = performance.now();
    let query = null;
    if (this.ext && !this.active && this.pending.length < 24) {
      query = this.gl.createQuery();
      this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
      this.active = query;
    }
    try {
      return fn();
    } finally {
      this.cpu[name] = performance.now() - start;
      if (query) {
        this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
        this.pending.push({ name, query, at: start });
        this.active = null;
      }
    }
  }
  poll() {
    if (!this.ext) return;
    const gl = this.gl;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    if (disjoint) {
      this.values = {};
      this.timestamps = {};
      for (const item of this.pending) gl.deleteQuery(item.query);
      this.pending = [];
      return;
    }
    this.pending = this.pending.filter((item) => {
      if (!gl.getQueryParameter(item.query, gl.QUERY_RESULT_AVAILABLE))
        return true;
      this.values[item.name] =
        gl.getQueryParameter(item.query, gl.QUERY_RESULT) / 1e6;
      this.timestamps[item.name] = item.at;
      gl.deleteQuery(item.query);
      return false;
    });
  }
  reset() {
    this.dispose();
    this.values = {};
    this.cpu = {};
    this.timestamps = {};
  }
  dispose() {
    for (const p of this.pending) this.gl.deleteQuery(p.query);
    this.pending = [];
  }
}
