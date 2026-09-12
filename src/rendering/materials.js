import * as T from "three";

// Small, deterministic original textures. Normal/roughness samples stay linear.
function texture(size, sample, repeat, anisotropy) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const value = sample(x, y);
      const offset = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) data[offset + c] = value[c];
      data[offset + 3] = 255;
    }
  const result = new T.DataTexture(data, size, size, T.RGBAFormat);
  result.wrapS = result.wrapT = T.RepeatWrapping;
  result.repeat.set(repeat, repeat);
  result.magFilter = T.LinearFilter;
  result.minFilter = T.LinearMipmapLinearFilter;
  result.generateMipmaps = true;
  result.anisotropy = anisotropy;
  result.needsUpdate = true;
  return result;
}

function noise(x, y) {
  let n = Math.imul(x & 127, 374761393) ^ Math.imul(y & 127, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function normalSample(height, x, y, strength) {
  const nx = (height(x - 1, y) - height(x + 1, y)) * strength;
  const ny = (height(x, y - 1) - height(x, y + 1)) * strength;
  const inverseLength = 1 / Math.hypot(nx, ny, 1);
  return [
    127.5 + nx * inverseLength * 127.5,
    127.5 + ny * inverseLength * 127.5,
    127.5 + inverseLength * 127.5,
  ];
}

export function createMaterialLibrary(renderer) {
  const anisotropy = Math.min(
    8,
    renderer?.capabilities?.getMaxAnisotropy?.() ?? 1,
  );
  const grain = (x, y) => noise(x, y) * 0.7 + noise(x >> 2, y >> 2) * 0.3;
  const weave = (x, y) =>
    Math.sin((x * Math.PI) / 4) * Math.sin((y * Math.PI) / 4);
  const textures = {
    grainNormal: texture(
      128,
      (x, y) => normalSample(grain, x, y, 0.75),
      8,
      anisotropy,
    ),
    grainRoughness: texture(
      128,
      (x, y) => {
        const roughness = 160 + grain(x, y) * 95;
        return [roughness, roughness, roughness];
      },
      8,
      anisotropy,
    ),
    flakeNormal: texture(
      128,
      (x, y) => normalSample(noise, x, y, 0.22),
      6,
      anisotropy,
    ),
    weaveNormal: texture(
      128,
      (x, y) => normalSample(weave, x, y, 0.16),
      6,
      anisotropy,
    ),
  };
  const physical = (name, properties, approximation) => {
    const material = new T.MeshPhysicalMaterial(properties);
    material.name = `PHOTON/${name}`;
    material.userData = { approximation: approximation ?? null };
    return material;
  };
  const materials = {
    asphalt: physical(
      "asphalt",
      {
        color: "#343d40",
        roughness: 0.9,
        metalness: 0,
        normalMap: textures.grainNormal,
        normalScale: new T.Vector2(0.6, 0.6),
        roughnessMap: textures.grainRoughness,
        clearcoat: 0.01,
        clearcoatRoughness: 0.28,
      },
      "Rain blends a dielectric clearcoat over aggregate; no multilayer water simulation.",
    ),
    puddle: physical(
      "puddle",
      {
        color: "#647779",
        roughness: 0.075,
        metalness: 0,
        ior: 1.333,
        clearcoat: 1,
        clearcoatRoughness: 0.025,
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
      },
      "Flat water coupon; root reflection service supplies projected reflection.",
    ),
    chrome: physical("chrome", {
      color: "#d7dcdf",
      metalness: 1,
      roughness: 0.075,
    }),
    brushedMetal: physical("brushed-metal", {
      color: "#b1bac2",
      metalness: 1,
      roughness: 0.37,
      anisotropy: 0.7,
      anisotropyRotation: Math.PI / 2,
    }),
    glass: physical(
      "glass",
      {
        color: "#bce1df",
        metalness: 0,
        roughness: 0.045,
        ior: 1.5,
        transmission: 0,
        thickness: 0.15,
        transparent: true,
        opacity: 0.23,
        depthWrite: false,
        side: T.DoubleSide,
      },
      "Default alpha transmission fallback: no refraction; high tier uses Three screen-space transmission.",
    ),
    carPaint: physical(
      "car-paint",
      {
        color: "#a11e17",
        metalness: 0.55,
        roughness: 0.24,
        clearcoat: 1,
        clearcoatRoughness: 0.055,
        normalMap: textures.flakeNormal,
        normalScale: new T.Vector2(0.12, 0.12),
      },
      "Micro-normal metallic flake approximation; no individual flake geometry.",
    ),
    rickshawPaint: physical("rickshaw-paint", {
      color: "#f0b72c",
      metalness: 0.12,
      roughness: 0.33,
      clearcoat: 0.8,
      clearcoatRoughness: 0.14,
      normalMap: textures.flakeNormal,
      normalScale: new T.Vector2(0.08, 0.08),
    }),
    rubber: physical("rubber", { color: "#1b1c1e", roughness: 0.98 }),
    skin: physical(
      "skin-proxy",
      {
        color: "#a46b49",
        roughness: 0.52,
        ior: 1.4,
        sheen: 0.16,
        sheenColor: "#b57253",
        sheenRoughness: 0.8,
        normalMap: textures.grainNormal,
        normalScale: new T.Vector2(0.05, 0.05),
      },
      "Opaque dielectric skin coupon; sheen is not subsurface scattering.",
    ),
    eyeWhite: physical(
      "eye-proxy",
      {
        color: "#eee5d5",
        roughness: 0.18,
        ior: 1.376,
        clearcoat: 1,
        clearcoatRoughness: 0.025,
      },
      "Layered specular eye proxy; no anatomical corneal refraction.",
    ),
    iris: physical("iris", { color: "#362012", roughness: 0.25, clearcoat: 1 }),
    hair: physical(
      "hair-proxy",
      {
        color: "#201711",
        roughness: 0.42,
        anisotropy: 0.85,
        anisotropyRotation: Math.PI / 2,
      },
      "Anisotropic surface cap; no strand scattering, hair cards or simulation.",
    ),
    cloth: physical(
      "cloth",
      {
        color: "#18797f",
        roughness: 0.94,
        sheen: 1,
        sheenColor: "#71babc",
        sheenRoughness: 0.85,
        normalMap: textures.weaveNormal,
        normalScale: new T.Vector2(0.6, 0.6),
        side: T.DoubleSide,
      },
      "Static procedural drape and weave; no cloth simulation.",
    ),
    concrete: physical("concrete", {
      color: "#b5aa92",
      roughness: 0.96,
      normalMap: textures.grainNormal,
      normalScale: new T.Vector2(0.32, 0.32),
      roughnessMap: textures.grainRoughness,
    }),
    foliage: physical(
      "foliage",
      {
        color: "#56884b",
        roughness: 0.8,
        side: T.DoubleSide,
      },
      "Opaque double-sided leaf coupons; no translucency or biological simulation.",
    ),
    sign: physical("emissive-sign", {
      color: "#85f7ee",
      emissive: "#26e8d4",
      emissiveIntensity: 2.5,
      roughness: 0.3,
    }),
    headlamp: physical("headlamp", {
      color: "#fff4d0",
      emissive: "#ffdb95",
      emissiveIntensity: 2,
      roughness: 0.2,
    }),
    interior: physical("interior", { color: "#95563a", roughness: 0.85 }),
    darkTrim: physical("dark-trim", { color: "#183d40", roughness: 0.62 }),
  };
  let disposed = false;
  return {
    materials,
    textures,
    setGlassTransmission(enabled) {
      const glass = materials.glass;
      if (glass.transmission > 0 === Boolean(enabled)) return;
      glass.transmission = enabled ? 0.92 : 0;
      glass.opacity = enabled ? 1 : 0.23;
      glass.transparent = !enabled;
      glass.needsUpdate = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      Object.values(materials).forEach((material) => material.dispose());
      Object.values(textures).forEach((map) => map.dispose());
    },
  };
}
