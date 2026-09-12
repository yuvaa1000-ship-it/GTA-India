import * as T from "three";
export function verifyHDR(renderer) {
  const gl = renderer.getContext();
  if (!gl.getExtension("EXT_color_buffer_float")) return false;
  const target = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType });
  const prev = renderer.getRenderTarget();
  let complete = false;
  try {
    renderer.setRenderTarget(target);
    complete =
      gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  } finally {
    renderer.setRenderTarget(prev);
    target.dispose();
  }
  return complete;
}
export async function inspectWebGPU() {
  if (!navigator.gpu) return { available: false, reason: "WebGPU API absent" };
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter)
      return { available: false, reason: "requestAdapter returned null" };
    return {
      available: true,
      info: adapter.info
        ? {
            architecture: adapter.info.architecture,
            device: adapter.info.device,
            description: adapter.info.description,
            isFallbackAdapter: adapter.info.isFallbackAdapter,
          }
        : null,
      features: [...adapter.features],
      rendererUsed: false,
    };
  } catch (e) {
    return { available: false, reason: e.message };
  }
}
