import * as T from "three";
// Shared original pore map; procedural surface modulation is shading, not skin simulation.
export class HumanSurfaces {
  constructor() {
    const size = 128,
      data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const n = Math.sin(x * 17.31 + y * 73.13) * 43758.5453;
        const pore = n - Math.floor(n) - 0.5;
        data.set(
          [128 + pore * 16, 128 + Math.sin(y * 1.3 + x) * 8, 254, 255],
          i,
        );
      }
    this.normal = new T.DataTexture(data, size, size);
    this.normal.wrapS = this.normal.wrapT = T.RepeatWrapping;
    this.normal.repeat.set(7, 7);
    this.normal.generateMipmaps = true;
    this.normal.minFilter = T.LinearMipmapLinearFilter;
    this.normal.needsUpdate = true;
  }
  materials(d) {
    const skin = new T.MeshPhysicalMaterial({
      color: d.complexion,
      roughness: 0.58,
      normalMap: this.normal,
      normalScale: new T.Vector2(0.13, 0.13),
      clearcoat: 0.04,
      clearcoatRoughness: 0.32,
    });
    const cloth = new T.MeshPhysicalMaterial({
      color: d.top,
      roughness: 0.9,
      sheen: 0.35,
      sheenColor: new T.Color(d.top),
    });
    const lower = new T.MeshStandardMaterial({
      color: d.trousers,
      roughness: 0.9,
    });
    const hair = new T.MeshPhysicalMaterial({
      color: d.age > 57 ? "#62605b" : "#201a16",
      roughness: 0.47,
      anisotropy: 0.5,
    });
    const white = new T.MeshPhysicalMaterial({
      color: "#dad8c8",
      roughness: 0.22,
      clearcoat: 1,
    });
    const dark = new T.MeshStandardMaterial({
      color: "#292524",
      roughness: 0.65,
    });
    const materials = [skin, cloth, lower, hair, white, dark];
    for (const m of materials) {
      m.name = "HUMAN/" + d.id;
      m.userData.provenance = "Original procedural HUMAN v1";
    }
    return materials;
  }
  dispose() {
    this.normal.dispose();
  }
}
