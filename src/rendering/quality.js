export const QUALITY = Object.freeze({
  performance: {
    scale: 0.7,
    shadow: 512,
    reflection: 192,
    reflectionEvery: 3,
    ao: false,
    bloom: false,
    transmission: false,
  },
  balanced: {
    scale: 0.85,
    shadow: 1024,
    reflection: 320,
    reflectionEvery: 2,
    ao: false,
    bloom: true,
    transmission: false,
  },
  reference: {
    scale: 1,
    shadow: 1024,
    reflection: 512,
    reflectionEvery: 1,
    ao: true,
    bloom: true,
    transmission: true,
  },
});
export function adaptScale(scale, frameMs, elapsed, cooldown = 2) {
  if (elapsed < cooldown || !Number.isFinite(frameMs)) return scale;
  if (frameMs > 39)
    return Math.max(0.5, Math.round((scale - 0.05) * 100) / 100);
  if (frameMs < 25)
    return Math.min(1, Math.round((scale + 0.025) * 1000) / 1000);
  return scale;
}
export function exposureTarget(logLuminance) {
  return Math.min(
    2.5,
    Math.max(0.035, 0.22 / Math.max(Math.pow(2, logLuminance), 0.001)),
  );
}
export function adaptExposure(current, target, dt) {
  return (
    current +
    (target - current) *
      (1 - Math.exp(-Math.min(dt, 0.1) * (target < current ? 3 : 1.2)))
  );
}
