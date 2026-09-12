const MAX_DIMENSION = 16;
const TIMEOUT_MS = 8000;

/** One bounded RGBA8 meter transfer; never changes the framebuffer binding. */
export class PixelReadback {
  constructor(gl, now = () => performance.now()) {
    this.gl = gl;
    this.now = now;
    this.error = null;
    this.job = null;
    this.disposed = false;
  }

  get pending() {
    return this.job !== null;
  }

  // Call with the RGBA8 meter framebuffer already bound for reading.
  submit(width, height) {
    if (this.disposed) {
      this.error = "Pixel readback is disposed";
      return false;
    }
    if (this.pending) return false;
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > MAX_DIMENSION ||
      height > MAX_DIMENSION
    ) {
      this.error = "Meter dimensions must be integers from 1 to 16";
      return false;
    }

    const gl = this.gl;
    const job = { buffer: null, sync: null, bytes: width * height * 4 };
    let binding;
    let bindingKnown = false;
    const pack = [];
    let failure = null;
    try {
      binding = gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING);
      bindingKnown = true;
      // External users may have left a padded/subrect pack layout active.
      for (const [parameter, value] of [
        [gl.PACK_ALIGNMENT, 4],
        [gl.PACK_ROW_LENGTH, 0],
        [gl.PACK_SKIP_PIXELS, 0],
        [gl.PACK_SKIP_ROWS, 0],
      ]) {
        pack.push([parameter, gl.getParameter(parameter)]);
        gl.pixelStorei(parameter, value);
      }
      job.buffer = gl.createBuffer();
      if (!job.buffer) throw new Error("Could not allocate pixel pack buffer");
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, job.buffer);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, job.bytes, gl.STREAM_READ);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, 0);
      const error = gl.getError();
      if (error !== gl.NO_ERROR)
        throw new Error(`Meter readPixels failed with GL error ${error}`);
      job.sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!job.sync) throw new Error("Could not create meter fence");
      gl.flush();
      job.startedAt = this.now();
    } catch (error) {
      failure = error;
    } finally {
      for (const [parameter, value] of pack) {
        try {
          gl.pixelStorei(parameter, value);
        } catch (error) {
          failure ??= error;
        }
      }
      if (bindingKnown) {
        try {
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, binding);
        } catch (error) {
          failure ??= error;
        }
      }
    }
    if (failure) {
      this.fail(failure, job);
      return false;
    }
    this.job = job;
    return true;
  }

  poll() {
    const job = this.job;
    if (!job) return null;
    if (this.now() - job.startedAt >= TIMEOUT_MS) {
      this.fail(new Error("Meter readback timed out after 8000ms"), job);
      return null;
    }
    const gl = this.gl;
    let pixels = null;
    let failure = null;
    let binding;
    let bindingKnown = false;
    try {
      // No wait and no implicit flush; submit has already flushed the fence.
      const status = gl.clientWaitSync(job.sync, 0, 0);
      if (status === gl.TIMEOUT_EXPIRED) return null;
      if (status === gl.WAIT_FAILED) throw new Error("Meter fence wait failed");
      if (status !== gl.ALREADY_SIGNALED && status !== gl.CONDITION_SATISFIED)
        throw new Error(`Unexpected meter fence status ${status}`);
      binding = gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING);
      bindingKnown = true;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, job.buffer);
      pixels = new Uint8Array(job.bytes);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, pixels);
      const error = gl.getError();
      if (error !== gl.NO_ERROR)
        throw new Error(`Meter buffer copy failed with GL error ${error}`);
    } catch (error) {
      failure = error;
    } finally {
      if (bindingKnown) {
        try {
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, binding);
        } catch (error) {
          failure ??= error;
        }
      }
    }
    if (failure) {
      this.fail(failure, job);
      return null;
    }
    this.job = null;
    this.error = null;
    this.release(job);
    return pixels;
  }

  fail(error, job) {
    this.error = error instanceof Error ? error.message : String(error);
    if (this.job === job) this.job = null;
    this.release(job);
  }

  release(job) {
    // A failed delete must not prevent attempting to free the other resource.
    for (const [key, remove] of [
      ["sync", (value) => this.gl.deleteSync(value)],
      ["buffer", (value) => this.gl.deleteBuffer(value)],
    ]) {
      if (!job[key]) continue;
      try {
        remove(job[key]);
      } catch (error) {
        this.error ??= error instanceof Error ? error.message : String(error);
      }
      job[key] = null;
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.job) this.release(this.job);
    this.job = null;
  }
}
