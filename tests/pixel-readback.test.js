import test from "node:test";
import assert from "node:assert/strict";
import { PixelReadback } from "../src/rendering/pixel-readback.js";

class FakeGL {
  constructor() {
    Object.assign(this, {
      PIXEL_PACK_BUFFER: 35051,
      PIXEL_PACK_BUFFER_BINDING: 35053,
      PACK_ALIGNMENT: 3333,
      PACK_ROW_LENGTH: 3330,
      PACK_SKIP_PIXELS: 3332,
      PACK_SKIP_ROWS: 3331,
      STREAM_READ: 35041,
      RGBA: 6408,
      UNSIGNED_BYTE: 5121,
      SYNC_GPU_COMMANDS_COMPLETE: 37143,
      TIMEOUT_EXPIRED: 37147,
      WAIT_FAILED: 37149,
      ALREADY_SIGNALED: 37146,
      CONDITION_SATISFIED: 37148,
      NO_ERROR: 0,
    });
    this.external = { external: true };
    this.binding = this.external;
    this.pack = new Map([
      [this.PACK_ALIGNMENT, 8],
      [this.PACK_ROW_LENGTH, 24],
      [this.PACK_SKIP_PIXELS, 3],
      [this.PACK_SKIP_ROWS, 2],
    ]);
    this.initialPack = new Map(this.pack);
    this.buffers = new Set();
    this.syncs = new Set();
    this.deletedBuffers = 0;
    this.deletedSyncs = 0;
    this.reads = 0;
    this.copies = 0;
    this.flushes = 0;
    this.waits = [];
    this.status = this.TIMEOUT_EXPIRED;
    this.failAt = null;
    this.glError = this.NO_ERROR;
  }
  trip(name) {
    if (this.failAt === name) throw new Error(`${name} failed`);
  }
  getParameter(parameter) {
    if (parameter === this.PIXEL_PACK_BUFFER_BINDING) return this.binding;
    assert.ok(this.pack.has(parameter));
    return this.pack.get(parameter);
  }
  pixelStorei(parameter, value) {
    this.pack.set(parameter, value);
  }
  createBuffer() {
    if (this.failAt === "allocation") return null;
    const buffer = {};
    this.buffers.add(buffer);
    return buffer;
  }
  bindBuffer(target, buffer) {
    assert.equal(target, this.PIXEL_PACK_BUFFER);
    this.binding = buffer;
  }
  bufferData(target, size, usage) {
    assert.equal(target, this.PIXEL_PACK_BUFFER);
    assert.equal(usage, this.STREAM_READ);
    assert.ok(size <= 1024);
    this.trip("bufferData");
    this.binding.bytes = new Uint8Array(size);
  }
  readPixels(x, y, width, height, format, type, offset) {
    this.trip("readPixels");
    assert.deepEqual(
      [x, y, format, type, offset],
      [0, 0, this.RGBA, this.UNSIGNED_BYTE, 0],
    );
    assert.deepEqual([...this.pack.values()], [4, 0, 0, 0]);
    assert.equal(this.binding.bytes.length, width * height * 4);
    this.binding.bytes.forEach((_, i, bytes) => {
      bytes[i] = i % 251;
    });
    this.reads++;
  }
  fenceSync(condition, flags) {
    assert.deepEqual([condition, flags], [this.SYNC_GPU_COMMANDS_COMPLETE, 0]);
    if (this.failAt === "fence") return null;
    const sync = {};
    this.syncs.add(sync);
    return sync;
  }
  flush() {
    this.trip("flush");
    this.flushes++;
  }
  clientWaitSync(sync, flags, timeout) {
    this.trip("clientWaitSync");
    assert.ok(this.syncs.has(sync));
    assert.equal(flags, 0);
    assert.equal(timeout, 0);
    this.waits.push([flags, timeout]);
    return this.status;
  }
  getBufferSubData(target, offset, pixels) {
    this.trip("getBufferSubData");
    assert.deepEqual([target, offset], [this.PIXEL_PACK_BUFFER, 0]);
    assert.ok(
      this.status === this.ALREADY_SIGNALED ||
        this.status === this.CONDITION_SATISFIED,
    );
    pixels.set(this.binding.bytes);
    this.copies++;
  }
  getError() {
    const value = this.glError;
    this.glError = this.NO_ERROR;
    return value;
  }
  deleteBuffer(buffer) {
    assert.ok(this.buffers.delete(buffer));
    this.deletedBuffers++;
  }
  deleteSync(sync) {
    assert.ok(this.syncs.delete(sync));
    this.deletedSyncs++;
  }
  assertRestored() {
    assert.equal(this.binding, this.external);
    assert.deepEqual(this.pack, this.initialPack);
  }
  assertReleased() {
    assert.equal(this.buffers.size, 0);
    assert.equal(this.syncs.size, 0);
    this.assertRestored();
  }
}

test("PBO meter defers CPU copy until ready, rejects overlap, and restores external GL state", () => {
  const gl = new FakeGL();
  const reader = new PixelReadback(gl, () => 0);
  assert.equal(reader.pending, false);
  assert.equal(reader.submit(16, 16), true);
  gl.assertRestored();
  assert.equal(reader.pending, true);
  assert.equal(reader.submit(16, 16), false);
  assert.equal(gl.reads, 1);
  assert.equal(gl.flushes, 1);
  assert.equal(reader.poll(), null);
  assert.equal(gl.copies, 0);
  assert.equal(reader.pending, true);
  gl.status = gl.CONDITION_SATISFIED;
  const pixels = reader.poll();
  assert.ok(pixels instanceof Uint8Array);
  assert.equal(pixels.length, 1024);
  assert.deepEqual(
    Array.from(pixels),
    Array.from({ length: 1024 }, (_, i) => i % 251),
  );
  assert.equal(reader.pending, false);
  assert.equal(reader.error, null);
  assert.equal(reader.poll(), null);
  gl.assertReleased();
  assert.equal(gl.deletedBuffers, 1);
  assert.equal(gl.deletedSyncs, 1);
  assert.deepEqual(gl.waits, [
    [0, 0],
    [0, 0],
  ]);
});

test("Meter timeout bounds a stalled transfer and allows a subsequent successful request", () => {
  const gl = new FakeGL();
  let now = 0;
  const reader = new PixelReadback(gl, () => now);
  reader.submit(16, 16);
  now = 7999;
  assert.equal(reader.poll(), null);
  assert.equal(reader.pending, true);
  now = 8000;
  assert.equal(reader.poll(), null);
  assert.equal(reader.pending, false);
  assert.match(reader.error, /timed out/);
  assert.equal(gl.waits.length, 1);
  gl.assertReleased();
  assert.equal(reader.submit(1, 2), true);
  gl.status = gl.ALREADY_SIGNALED;
  assert.equal(reader.poll().length, 8);
  assert.equal(reader.error, null);
  gl.assertReleased();
});

test("Meter submission failures release partial PBO/fence allocations and restore pack state", () => {
  for (const stage of [
    "allocation",
    "bufferData",
    "readPixels",
    "fence",
    "flush",
  ]) {
    const gl = new FakeGL();
    gl.failAt = stage;
    const reader = new PixelReadback(gl);
    assert.equal(reader.submit(16, 16), false, stage);
    assert.equal(reader.pending, false, stage);
    assert.ok(reader.error, stage);
    gl.assertReleased();
  }
  const gl = new FakeGL();
  gl.glError = 1282;
  const reader = new PixelReadback(gl);
  assert.equal(reader.submit(16, 16), false);
  assert.match(reader.error, /1282/);
  gl.assertReleased();
});

test("Failed fence waits and failed CPU copies release both GPU handles", () => {
  for (const stage of [
    "wait-status",
    "clientWaitSync",
    "getBufferSubData",
    "copy-gl-error",
  ]) {
    const gl = new FakeGL();
    const reader = new PixelReadback(gl);
    assert.equal(reader.submit(16, 16), true);
    gl.status = stage === "wait-status" ? gl.WAIT_FAILED : gl.ALREADY_SIGNALED;
    gl.failAt = stage;
    if (stage === "copy-gl-error") gl.glError = 1282;
    assert.equal(reader.poll(), null, stage);
    assert.equal(reader.pending, false, stage);
    assert.ok(reader.error, stage);
    gl.assertReleased();
  }
});

test("Meter dispose cancels pending work once and size checks prevent unbounded allocations", () => {
  const gl = new FakeGL();
  const reader = new PixelReadback(gl);
  for (const [width, height] of [
    [0, 16],
    [16, 0],
    [17, 16],
    [16, 17],
    [1.5, 2],
    [Infinity, 1],
  ])
    assert.equal(reader.submit(width, height), false);
  assert.equal(gl.reads, 0);
  assert.equal(reader.submit(16, 16), true);
  reader.dispose();
  reader.dispose();
  assert.equal(reader.pending, false);
  assert.equal(reader.poll(), null);
  assert.equal(reader.submit(16, 16), false);
  assert.match(reader.error, /disposed/);
  gl.assertReleased();
  assert.equal(gl.deletedBuffers, 1);
  assert.equal(gl.deletedSyncs, 1);
});
