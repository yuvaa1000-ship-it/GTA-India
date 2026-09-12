import * as T from "three";
export function createRenderer(canvas) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new T.Scene();
  scene.background = new T.Color("#b8cbc9");
  scene.fog = new T.Fog("#b8cbc9", 90, 185);
  scene.add(new T.HemisphereLight("#d7edf5", "#96775c", 2.5));
  const sun = new T.DirectionalLight("#ffdda7", 3.4);
  sun.position.set(-35, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -55,
    right: 55,
    top: 55,
    bottom: -55,
    near: 0.1,
    far: 180,
  });
  sun.shadow.bias = -0.001;
  scene.add(sun, sun.target);
  const camera = new T.PerspectiveCamera(57, 1, 0.1, 230);
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize);
  resize();
  return {
    renderer,
    scene,
    camera,
    sun,
    disposeRenderer() {
      removeEventListener("resize", resize);
      sun.dispose();
      renderer.dispose();
    },
  };
}
export class Assets {
  constructor() {
    this.box = new T.BoxGeometry(1, 1, 1);
    this.materials = {};
    for (const [k, c] of Object.entries({
      ground: "#b1a287",
      road: "#424d51",
      curb: "#cbbd9d",
      window: "#28454d",
      trim: "#e7ddbe",
      teal: "#137e80",
      crate: "#a66337",
      leaf: "#536947",
      trunk: "#77563c",
      0: "#c59170",
      1: "#bdb08f",
      2: "#85a6a3",
      3: "#dcbd88",
      4: "#a3918b",
    }))
      this.materials[k] = new T.MeshStandardMaterial({
        color: c,
        roughness: 0.9,
      });
  }
  mesh(material, x, y, z, w, h, d) {
    const m = new T.Mesh(this.box, this.materials[material]);
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  dispose() {
    this.box.dispose();
    Object.values(this.materials).forEach((m) => m.dispose());
  }
}
