import * as T from "three";
import { createMaterialLibrary } from "./materials.js";
import { ValidationLab } from "./validation-lab.js";
import { Atmosphere } from "./atmosphere.js";
import { Reflections } from "./reflections.js";
import { PostProcess } from "./postprocess.js";
import { GPUProfiler } from "./gpu-profiler.js";
import { QUALITY, adaptScale } from "./quality.js";
import { verifyHDR, inspectWebGPU } from "./capabilities.js";
import { selectLOD } from "./lod.js";
import { addCloudAttenuation } from "./clouds.js";
export class Photon {
  constructor(runtime) {
    this.r = runtime;
    const { scene, renderer, camera, sun } = runtime;
    this.hdr = verifyHDR(renderer);
    this.profiler = new GPUProfiler(renderer);
    this.library = createMaterialLibrary(renderer);
    this.lab = new ValidationLab(scene, this.library);
    this.atmosphere = new Atmosphere(scene, sun);
    this.reflections = new Reflections(
      renderer,
      scene,
      this.lab,
      this.library,
      this.hdr,
    );
    this.post = new PostProcess(renderer, camera, this.hdr);
    this.cloud = { time: { value: 0 }, amount: { value: 0 } };
    for (const material of [
      ...Object.values(runtime.assets.materials),
      ...Object.values(this.library.materials),
    ])
      addCloudAttenuation(material, this.cloud);
    this.frame = 0;
    this.adaptive = false;
    this.lastScaleAt = 0;
    this.quality = "balanced";
    this.scale = QUALITY.balanced.scale;
    this.webgpu = { pending: true };
    inspectWebGPU().then((result) => {
      this.webgpu = result;
    });
    this.makeRain(scene);
    this.resize = () => this.resizeTargets();
    addEventListener("resize", this.resize);
    this.setQuality("balanced");
    renderer.info.autoReset = false;
    this.setCondition("sunset");
  }
  makeRain(scene) {
    const data = [],
      bases = [],
      offsets = [];
    for (let i = 0; i < 160; i++) {
      const x = Math.sin(i * 91.3) * 9,
        z = Math.cos(i * 41.7) * 9 - 5,
        y = ((i * 0.618) % 1) * 14;
      data.push(x, y, z, x + 0.04, y + 0.5, z);
      bases.push(y, y);
      offsets.push(0, 0.5);
    }
    this.rainGeometry = new T.BufferGeometry();
    this.rainGeometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(data, 3),
    );
    this.rainGeometry.setAttribute(
      "baseY",
      new T.Float32BufferAttribute(bases, 1),
    );
    this.rainGeometry.setAttribute(
      "endOffset",
      new T.Float32BufferAttribute(offsets, 1),
    );
    this.rainMaterial = new T.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `uniform float time;attribute float baseY,endOffset;void main(){vec3 p=position;p.y=mod(baseY-time*8.,14.)+endOffset;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `void main(){gl_FragColor=vec4(.58,.71,.79,.28);}`,
      transparent: true,
      depthWrite: false,
    });
    this.rain = new T.LineSegments(this.rainGeometry, this.rainMaterial);
    this.rain.frustumCulled = false;
    scene.add(this.rain);
  }
  setCondition(name) {
    this.atmosphere.set(name);
    this.reflections.dirty = true;
    this.cloud.amount.value = this.atmosphere.condition.rain;
    this.rain.visible = !!this.atmosphere.condition.rain;
  }
  setQuality(name) {
    if (!QUALITY[name]) throw Error("Unknown render quality");
    this.quality = name;
    const q = QUALITY[name];
    this.scale = q.scale;
    this.library.setGlassTransmission(q.transmission);
    this.reflections.setQuality(q);
    this.post.setQuality(q);
    const shadow = this.r.sun.shadow;
    if (shadow.mapSize.x !== q.shadow) {
      shadow.map?.dispose();
      shadow.map = null;
      shadow.mapSize.set(q.shadow, q.shadow);
    }
    this.resizeTargets();
    this.lastScaleAt = this.r.time ?? 0;
  }
  resizeTargets() {
    const r = this.r.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio, 1.5) * this.scale);
    r.setSize(innerWidth, innerHeight);
    this.post.resize(r.domElement.width, r.domElement.height);
  }
  updateLOD(camera) {
    this.detailCells = 0;
    const viewportHeight = this.r.renderer.domElement.height;
    for (const cell of this.r.streaming.cells.values()) {
      const distance = Math.hypot(
        camera.position.x - cell.data.x * 64,
        camera.position.y - 7,
        camera.position.z - cell.data.z * 64,
      );
      cell.renderLOD = selectLOD({
        policy: "buildingFacade",
        worldRadius: 13,
        distance,
        viewportHeight,
        fovDegrees: camera.getEffectiveFOV(),
        previousLevel: cell.renderLOD ?? null,
      });
      cell.windowBatch.visible = cell.renderLOD < 2;
      if (cell.windowBatch.visible) this.detailCells++;
    }
  }
  render(time, dt, rawDt) {
    const { renderer, scene, camera, player, streaming } = this.r;
    this.frame++;
    this.profiler.poll();
    renderer.info.reset();
    this.lab.setVisible(
      !this.r.depot.inside &&
        player.mesh.position.distanceTo(this.lab.probePosition) < 160,
    );
    const c = this.atmosphere.condition;
    this.atmosphere.update(player.mesh.position, time);
    this.lab.update(time, c);
    this.cloud.time.value = time;
    this.rainMaterial.uniforms.time.value = time;
    this.rain.visible = !!c.rain && this.lab.group.visible;
    this.updateLOD(camera);
    if (this.adaptive && time - this.lastScaleAt > 2) {
      const next = adaptScale(
        this.scale,
        rawDt * 1000,
        time - this.lastScaleAt,
      );
      if (next !== this.scale) {
        this.scale = next;
        this.resizeTargets();
      }
      this.lastScaleAt = time;
    }
    this.reflections.update(
      camera,
      time,
      c.rain,
      this.profiler,
      streaming.cells.size === 25 &&
        streaming.pending.size === 0 &&
        streaming.isReady(this.lab.probePosition),
    );
    this.post.render(scene, this.atmosphere, time, dt, this.profiler);
  }
  stats() {
    return {
      quality: this.quality,
      renderScale: this.scale,
      adaptive: this.adaptive,
      hdrFramebuffer: this.hdr,
      webgpu: this.webgpu,
      condition: this.atmosphere.name,
      exposure: this.post.exposure,
      logLuminance: this.post.logLuminance,
      meterCount: this.post.meterCount,
      meterReadback: "WebGL2 PBO/fence",
      meterPending: this.post.readback.pending,
      meterError: this.post.readback.error,
      probeVersion: this.reflections.probeVersion,
      planarUpdates: this.reflections.planarUpdates,
      planarEnabled: this.reflections.enabled,
      reflectionSize: this.reflections.profile.reflection,
      reflectionEvery: this.reflections.profile.reflectionEvery,
      roughnessAwareProbe: this.hdr,
      boxParallax: this.hdr,
      ao: !!this.post.uniforms.aoOn.value,
      bloom: !!this.post.uniforms.bloomOn.value,
      glassTransmission: this.library.materials.glass.transmission,
      detailCells: this.detailCells,
      gpuPassMs: {
        ...this.profiler.values,
        planar: this.reflections.plane.visible
          ? (this.profiler.values.planar ?? null)
          : null,
      },
      gpuSampleAgeMs: Object.fromEntries(
        Object.entries(this.profiler.timestamps).map(([name, at]) => [
          name,
          performance.now() - at,
        ]),
      ),
      cpuPassMs: { ...this.profiler.cpu },
    };
  }
  dispose() {
    removeEventListener("resize", this.resize);
    this.reflections.dispose();
    this.post.dispose();
    this.atmosphere.dispose();
    this.lab.dispose();
    this.library.dispose();
    this.profiler.dispose();
    this.r.scene.remove(this.rain);
    this.rainGeometry.dispose();
    this.rainMaterial.dispose();
  }
}
