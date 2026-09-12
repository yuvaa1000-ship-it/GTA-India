// Authoring ceilings, not claimed resident assets or measured GPU throughput.
const MATERIAL_TIERS = ["full", "reduced", "simple", "distant"];

function policy(
  label,
  triangles,
  radii,
  maxErrorPixels,
  errors = [0, 0.004, 0.018, 0.065],
) {
  return Object.freeze({
    label,
    maxErrorPixels,
    tiers: Object.freeze(
      triangles.map((maxTriangles, i) =>
        Object.freeze({
          maxTriangles,
          minRadiusPixels: radii[i],
          geometricErrorRatio: errors[i],
          materialTier: MATERIAL_TIERS[i],
        }),
      ),
    ),
  });
}

export const GEOMETRY_POLICIES = Object.freeze({
  heroProtagonist: policy(
    "Hero protagonist",
    [32000, 14000, 4500, 1000],
    [210, 90, 26, 0],
    1,
  ),
  storyNPC: policy(
    "Important story NPC",
    [24000, 10000, 3200, 700],
    [190, 80, 24, 0],
    1.2,
  ),
  pedestrian: policy(
    "Normal pedestrian",
    [12000, 5000, 1500, 300],
    [150, 60, 18, 0],
    1.5,
  ),
  crowdPedestrian: policy(
    "Crowd pedestrian",
    [5000, 1800, 500, 96],
    [120, 45, 12, 0],
    2,
  ),
  heroCar: policy("Hero car", [40000, 18000, 5500, 1100], [230, 95, 28, 0], 1),
  scooter: policy("Scooter", [14000, 6000, 1800, 350], [180, 70, 20, 0], 1.3),
  motorcycle: policy(
    "Motorcycle",
    [18000, 8000, 2400, 450],
    [190, 75, 22, 0],
    1.2,
  ),
  autoRickshaw: policy(
    "Auto-rickshaw",
    [18000, 7500, 2500, 550],
    [190, 80, 24, 0],
    1.3,
  ),
  trafficVehicle: policy(
    "Traffic vehicle",
    [14000, 5500, 1800, 350],
    [160, 60, 18, 0],
    1.8,
  ),
  bus: policy("Bus", [22000, 9000, 2800, 650], [230, 90, 26, 0], 1.5),
  truck: policy("Truck", [24000, 10000, 3200, 700], [230, 90, 26, 0], 1.5),
  buildingFacade: policy(
    "Building facade module",
    [16000, 6000, 1800, 240],
    [260, 100, 28, 0],
    1.5,
  ),
  interior: policy(
    "Interior room",
    [24000, 9000, 2500, 400],
    [260, 110, 32, 0],
    1.3,
  ),
  vegetation: policy(
    "Vegetation specimen",
    [7000, 2500, 650, 96],
    [170, 65, 20, 0],
    2,
  ),
  streetProp: policy(
    "Street prop",
    [4000, 1400, 350, 48],
    [130, 50, 14, 0],
    1.5,
  ),
});

function finiteAtLeast(value, minimum, name) {
  if (!Number.isFinite(value) || value < minimum)
    throw new RangeError(`${name} must be finite and at least ${minimum}`);
}

/**
 * Center-plane perspective radius estimate in drawing-buffer pixels.
 * distance is nonnegative camera-to-center distance, worldRadius includes scale.
 * This is not a clipping/occlusion test or an exact off-axis sphere projection.
 */
export function projectedRadiusPixels({
  worldRadius,
  distance,
  viewportHeight,
  fovDegrees,
}) {
  finiteAtLeast(worldRadius, 0, "worldRadius");
  finiteAtLeast(distance, 0, "distance");
  finiteAtLeast(viewportHeight, 0, "viewportHeight");
  if (!Number.isFinite(fovDegrees) || fovDegrees <= 0 || fovDegrees >= 180)
    throw new RangeError("fovDegrees must be between 0 and 180 (exclusive)");
  if (worldRadius === 0 || viewportHeight === 0) return 0;
  // A camera at/inside the bound must not accidentally select the cheapest mesh.
  if (distance <= worldRadius) return Infinity;
  return (
    (worldRadius * viewportHeight) /
    (2 * Math.tan((fovDegrees * Math.PI) / 360) * distance)
  );
}

function resolvePolicy(value) {
  const result = typeof value === "string" ? GEOMETRY_POLICIES[value] : value;
  if (!result || !Array.isArray(result.tiers) || result.tiers.length !== 4)
    throw new TypeError("policy must identify four geometry tiers");
  finiteAtLeast(
    result.maxErrorPixels,
    Number.MIN_VALUE,
    "policy.maxErrorPixels",
  );
  for (let i = 0; i < result.tiers.length; i++) {
    const tier = result.tiers[i];
    if (!tier) throw new TypeError("policy tier is missing");
    finiteAtLeast(tier.minRadiusPixels, 0, "tier.minRadiusPixels");
    finiteAtLeast(tier.geometricErrorRatio, 0, "tier.geometricErrorRatio");
    finiteAtLeast(tier.maxTriangles, 0, "tier.maxTriangles");
    if (!Number.isInteger(tier.maxTriangles))
      throw new RangeError("maxTriangles must be an integer");
    if (
      i &&
      (tier.minRadiusPixels >= result.tiers[i - 1].minRadiusPixels ||
        tier.geometricErrorRatio < result.tiers[i - 1].geometricErrorRatio ||
        tier.maxTriangles > result.tiers[i - 1].maxTriangles)
    )
      throw new RangeError(
        "tiers need descending radii/budgets and ascending geometric error",
      );
  }
  if (
    result.tiers[0].geometricErrorRatio !== 0 ||
    result.tiers[3].minRadiusPixels !== 0
  )
    throw new RangeError(
      "tier 0 must have zero relative error and tier 3 zero minimum radius",
    );
  return result;
}

/** Convert a supplied relative object-space simplification error to pixels. */
export function projectedGeometricErrorPixels(
  radiusPixels,
  geometricErrorRatio,
) {
  if (
    typeof radiusPixels !== "number" ||
    Number.isNaN(radiusPixels) ||
    radiusPixels < 0
  )
    throw new RangeError("radiusPixels must be nonnegative");
  finiteAtLeast(geometricErrorRatio, 0, "geometricErrorRatio");
  return geometricErrorRatio === 0 ? 0 : radiusPixels * geometricErrorRatio;
}

/**
 * Return tier 0 (finest) through 3 (coarsest). Hysteresis creates a dead band
 * around radius transitions. The error ceiling always overrides that band.
 * Callers own mesh visibility, geometry/material replacement and disposal.
 */
export function selectLOD({
  policy: selection = "streetProp",
  previousLevel = null,
  hysteresis = 0.12,
  ...view
}) {
  const { tiers, maxErrorPixels } = resolvePolicy(selection);
  if (!Number.isFinite(hysteresis) || hysteresis < 0 || hysteresis >= 1)
    throw new RangeError(
      "hysteresis must be between 0 (inclusive) and 1 (exclusive)",
    );
  if (
    previousLevel !== null &&
    (!Number.isInteger(previousLevel) || previousLevel < 0 || previousLevel > 3)
  )
    throw new RangeError(
      "previousLevel must be null or an integer from 0 to 3",
    );
  const pixels = projectedRadiusPixels(view);
  if (pixels === Infinity) return 0;
  const boundaries = tiers
    .slice(0, 3)
    .map((tier, i) =>
      Math.min(
        tier.minRadiusPixels,
        tiers[i + 1].geometricErrorRatio === 0
          ? Infinity
          : maxErrorPixels / tiers[i + 1].geometricErrorRatio,
      ),
    );
  let level = previousLevel ?? 0;
  const band = previousLevel === null ? 0 : hysteresis;
  while (
    level > 0 &&
    (pixels >= boundaries[level - 1] * (1 + band) ||
      projectedGeometricErrorPixels(pixels, tiers[level].geometricErrorRatio) >
        maxErrorPixels)
  )
    level--;
  while (level < 3 && pixels < boundaries[level] * (1 - band)) level++;
  return level;
}
