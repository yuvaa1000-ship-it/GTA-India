import { desiredCells } from "../world/generate.js";
import { Cell } from "../world/cell.js";
export class Streaming {
  constructor(scene, world, assets, store) {
    Object.assign(this, { scene, world, assets, store });
    this.cells = new Map();
    this.pending = new Map();
    this.ready = [];
    this.pool = [];
    this.serial = 0;
    this.created = 0;
    this.evicted = 0;
    this.failures = [];
    this.wanted = new Map();
    this.worker = new Worker(new URL("./cell.worker.js", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = ({ data }) => {
      const key = this.pending.get(data.id);
      this.pending.delete(data.id);
      if (data.error) {
        this.failures.push(data.error);
        return;
      }
      if (this.wanted.has(key)) this.ready.push(data.cell);
    };
    this.worker.onerror = (e) => this.failures.push(e.message);
  }
  update(position, time) {
    const wanted = desiredCells(position.x, position.z);
    this.wanted = new Map(wanted.map((c) => [c.key, c]));
    for (const [key, cell] of this.cells)
      if (!this.wanted.has(key)) {
        cell.dispose(this.scene);
        this.cells.delete(key);
        this.evicted++;
      }
    this.ready = this.ready.filter((c) => this.wanted.has(c.key));
    this.ready.sort(
      (a, b) =>
        this.wanted.get(a.key).priority - this.wanted.get(b.key).priority,
    );
    const next = this.ready.shift();
    if (next && !this.cells.has(next.key)) {
      this.cells.set(
        next.key,
        new Cell(
          next,
          this.scene,
          this.world,
          this.assets,
          this.store,
          this.pool,
        ),
      );
      this.created++;
    }
    const queued = new Set([
      ...this.pending.values(),
      ...this.ready.map((c) => c.key),
    ]);
    for (const c of wanted) {
      if (this.pending.size >= 2) break;
      if (!this.cells.has(c.key) && !queued.has(c.key)) {
        const id = ++this.serial;
        this.pending.set(id, c.key);
        this.worker.postMessage({ id, x: c.x, z: c.z });
      }
    }
    const aiStart = performance.now();
    for (const cell of this.cells.values())
      cell.update(
        time,
        Math.hypot(
          position.x - cell.data.x * 64,
          position.z - cell.data.z * 64,
        ),
      );
    this.lastAI = performance.now() - aiStart;
  }
  isReady(p) {
    return this.cells.has(desiredCells(p.x, p.z, 64, 0)[0].key);
  }
  persist() {
    for (const cell of this.cells.values()) cell.persist();
  }
  clear() {
    for (const cell of this.cells.values()) cell.dispose(this.scene);
    this.cells.clear();
    this.ready = [];
  }
  dispose() {
    this.worker.terminate();
    this.clear();
    this.pool.length = 0;
  }
}
