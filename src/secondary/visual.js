import * as T from "three";
import { ParticleSurface } from "./solver.js";
import { clothPattern, hairPattern } from "./patterns.js";
export class SecondaryMaterials {
  constructor() {
    const w = 64,
      h = 256,
      data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const u = x / (w - 1),
          v = y / (h - 1),
          stripe = 0.68 + 0.32 * Math.sin(x * 4.7 + y * 0.06) ** 2;
        const edge = Math.sin(Math.PI * u),
          tip = 1 - v;
        const alpha = Math.min(1, edge * 7) * Math.min(1, tip * 12);
        data.set(
          [210 * stripe, 200 * stripe, 180 * stripe, 255 * alpha],
          (y * w + x) * 4,
        );
      }
    this.hair = new T.DataTexture(data, w, h);
    this.hair.colorSpace = T.SRGBColorSpace;
    this.hair.generateMipmaps = true;
    this.hair.minFilter = T.LinearMipmapLinearFilter;
    this.hair.needsUpdate = true;
  }
  dispose() {
    this.hair.dispose();
  }
}
export class SecondaryVisual {
  constructor(
    character,
    surfaces,
    shared,
    {
      fabric = character.identity.garment,
      hair = character.identity.hair === "bun" ? "long" : "short",
      detail = true,
    } = {},
  ) {
    this.c = character;
    this.disposed = false;
    this.fabric = fabric;
    this.style = hair;
    const cloth = clothPattern(fabric, character.identity.height, detail),
      guides = hairPattern(hair, character.identity.height, detail);
    this.cloth = new ParticleSurface(
      cloth.points,
      cloth.edges,
      cloth.pins,
      cloth.settings,
    );
    this.hair = new ParticleSurface(
      guides.points,
      guides.edges,
      guides.pins,
      guides.settings,
    );
    this.guides = guides;
    this.clothGeometry = new T.BufferGeometry();
    this.clothGeometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(
        new Float32Array(cloth.points.length * 3),
        3,
      ),
    );
    this.clothGeometry.setAttribute(
      "uv",
      new T.Float32BufferAttribute(cloth.uv, 2),
    );
    this.clothGeometry.setIndex(cloth.triangles);
    const colors = [];
    for (let i = 0; i < cloth.points.length; i++) {
      const u = cloth.uv[i * 2],
        v = cloth.uv[i * 2 + 1],
        border = u < 0.11 || u > 0.89 || v > 0.91;
      colors.push(...(border ? [0.66, 0.5, 0.25] : [1, 1, 1]));
    }
    this.clothGeometry.setAttribute(
      "color",
      new T.Float32BufferAttribute(colors, 3),
    );
    this.clothMaterial = new T.MeshPhysicalMaterial({
      color: character.identity.top,
      side: T.DoubleSide,
      roughness: 0.82,
      sheen: 0.5,
      sheenColor: new T.Color("#b4a488"),
      vertexColors: true,
      normalMap: surfaces.weaveNormal,
      roughnessMap: surfaces.weaveRoughness,
      normalScale: new T.Vector2(0.22, 0.22),
    });
    this.clothMesh = new T.Mesh(this.clothGeometry, this.clothMaterial);
    const vertices = guides.points.length * 2,
      uv = [],
      indices = [];
    for (let s = 0; s < guides.strands; s++)
      for (let j = 0; j <= guides.segments; j++) {
        const i = (s * (guides.segments + 1) + j) * 2;
        uv.push(0, j / guides.segments, 1, j / guides.segments);
        if (j) indices.push(i - 2, i - 1, i + 1, i - 2, i + 1, i);
      }
    this.hairGeometry = new T.BufferGeometry();
    this.hairGeometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(new Float32Array(vertices * 3), 3),
    );
    this.hairGeometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    this.hairGeometry.setIndex(indices);
    this.hairMaterial = new T.MeshPhysicalMaterial({
      color: character.identity.age > 57 ? "#696258" : "#332018",
      map: shared.hair,
      alphaTest: 0.28,
      side: T.DoubleSide,
      roughness: 0.43,
      anisotropy: 0.8,
      anisotropyRotation: Math.PI / 2,
    });
    this.hairMesh = new T.Mesh(this.hairGeometry, this.hairMaterial);
    for (const mesh of [this.clothMesh, this.hairMesh]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      character.group.add(mesh);
    }
    this.hairMesh.visible = character.identity.hair !== "bald";
    this.updates = 0;
    this.time = 0;
  }
  update(dt, { wind, wet = 0, floor = -Infinity } = {}) {
    if (this.disposed) return;
    const c = this.c,
      n = c.rig.named;
    c.group.updateMatrixWorld(true);
    const point = (name) => n[name].getWorldPosition(new T.Vector3());
    const capsules = [
      { a: point("pelvis"), b: point("neck"), radius: 0.13 * c.identity.build },
      { a: point("head"), b: point("head"), radius: 0.092 },
      ...["L", "R"].flatMap((s) => [
        {
          a: point("upperArm" + s),
          b: point("forearm" + s),
          radius: 0.061 * c.identity.build,
        },
        {
          a: point("thigh" + s),
          b: point("shin" + s),
          radius: 0.072 * c.identity.build,
        },
      ]),
    ];
    const matrix = n.chest.matrixWorld.clone();
    // Panels begin at the shoulders; lower wraps instead attach at the pelvis.
    if (["veshti", "dhoti"].includes(this.fabric))
      matrix.copy(n.pelvis.matrixWorld);
    const head = n.head.matrixWorld.clone();
    this.cloth.advance(dt, matrix, { wind, wet, capsules, floor });
    if (this.hairMesh.visible)
      this.hair.advance(dt, head, { wind, wet, capsules, floor });
    const inverse = c.group.matrixWorld.clone().invert(),
      p = this.clothGeometry.attributes.position;
    this.cloth.p.forEach((v, i) => {
      const local = v.clone().applyMatrix4(inverse);
      p.setXYZ(i, local.x, local.y, local.z);
    });
    p.needsUpdate = true;
    this.clothGeometry.computeVertexNormals();
    const hp = this.hairGeometry.attributes.position,
      g = this.guides;
    const right = new T.Vector3(1, 0, 0).transformDirection(head);
    this.hair.p.forEach((v, i) => {
      const j = i % (g.segments + 1),
        width =
          (this.style === "long" ? 0.012 : 0.016) *
          (1 - (0.8 * j) / g.segments) *
          (1 - wet * 0.45);
      const a = v.clone().addScaledVector(right, -width).applyMatrix4(inverse),
        b = v.clone().addScaledVector(right, width).applyMatrix4(inverse);
      hp.setXYZ(i * 2, a.x, a.y, a.z);
      hp.setXYZ(i * 2 + 1, b.x, b.y, b.z);
    });
    hp.needsUpdate = true;
    this.hairGeometry.computeVertexNormals();
    this.clothMaterial.roughness = 0.82 - wet * 0.22;
    this.clothMaterial.clearcoat =
      this.fabric === "raincoat" ? 0.3 + wet * 0.3 : wet * 0.08;
    this.hairMaterial.roughness = 0.43 - wet * 0.17;
    this.hairMaterial.anisotropy = 0.8 + wet * 0.15;
    this.updates++;
    this.time += dt;
  }
  stats() {
    return {
      fabric: this.fabric,
      hairStyle: this.style,
      updates: this.updates,
      cloth: this.cloth.stats(),
      hair: this.hair.stats(),
      triangles:
        (this.clothGeometry.index.count + this.hairGeometry.index.count) / 3,
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const mesh of [this.clothMesh, this.hairMesh]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  }
}
