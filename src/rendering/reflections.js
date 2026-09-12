import * as T from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
const puddleShader = {
  name: "PhotonRoughPuddle",
  uniforms: {
    color: { value: new T.Color("#718f99") },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    time: { value: 0 },
    rain: { value: 0 },
    roughness: { value: 0.12 },
    texel: { value: new T.Vector2(1 / 320, 1 / 320) },
  },
  vertexShader: `uniform mat4 textureMatrix;varying vec4 vProjected;varying vec3 vWorld;varying vec2 vSurface;void main(){vProjected=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;vSurface=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:
    `uniform vec3 color;uniform sampler2D tDiffuse;uniform float time,rain,roughness;uniform vec2 texel;varying vec4 vProjected;varying vec3 vWorld;varying vec2 vSurface;
void main(){vec2 p=vWorld.xz;float a=length((p-vec2(-1.8,-5.8))/vec2(1.4,2.1));float b=length((p-vec2(2.,-8.2))/vec2(1.25,1.5));float border=min(a,b)+.07*sin(p.x*9.)*sin(p.y*5.);float mask=1.-smoothstep(.83,1.,border);if(mask<.01)discard;vec2 q=vProjected.xy/vProjected.w;vec2 ripple=vec2(sin(p.x*23.+time*4.),cos(p.y*27.-time*3.))*.0015*(.2+rain);q+=ripple;vec2 blur=texel*(1.+roughness*14.);vec3 reflected=texture2D(tDiffuse,q).rgb*.4;reflected+=(texture2D(tDiffuse,q+vec2(blur.x,0.)).rgb+texture2D(tDiffuse,q-vec2(blur.x,0.)).rgb+texture2D(tDiffuse,q+vec2(0.,blur.y)).rgb+texture2D(tDiffuse,q-vec2(0.,blur.y)).rgb)*.15;float facing=clamp(dot(normalize(cameraPosition-vWorld),vec3(0.,1.,0.)),0.,1.);float fresnel=.02+.98*pow(1.-facing,5.);gl_FragColor=vec4(mix(vec3(.025,.035,.037),reflected,clamp(.17+fresnel*.83,0.,1.)),mask*.92);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(
      ";#include",
      ";\n#include",
    ),
};
export function applyBoxProbe(material, position, min, max) {
  const prior = material.onBeforeCompile;
  material.onBeforeCompile = (shader) => {
    prior?.(shader);
    shader.uniforms.photonProbe = { value: position };
    shader.uniforms.photonMin = { value: min };
    shader.uniforms.photonMax = { value: max };
    shader.vertexShader = "varying vec3 vPhotonWorld;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      "#include <project_vertex>\nvPhotonWorld=(modelMatrix*vec4(transformed,1.)).xyz;",
    );
    shader.fragmentShader =
      "varying vec3 vPhotonWorld;uniform vec3 photonProbe,photonMin,photonMax;\n" +
      shader.fragmentShader;
    let code = T.ShaderChunk.envmap_physical_pars_fragment;
    code = code.replace(
      "reflectVec = inverseTransformDirection( reflectVec, viewMatrix );",
      `reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
 vec3 safeRay=(step(vec3(0.0),reflectVec)*2.0-1.0)*max(abs(reflectVec),vec3(0.00001));
 vec3 exits=max((photonMax-vPhotonWorld)/safeRay,(photonMin-vPhotonWorld)/safeRay);
 float rayDistance=min(exits.x,min(exits.y,exits.z));
 bool inside=all(greaterThanEqual(vPhotonWorld,photonMin))&&all(lessThanEqual(vPhotonWorld,photonMax));
 if(inside)reflectVec=normalize(vPhotonWorld+reflectVec*max(rayDistance,0.0)-photonProbe);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <envmap_physical_pars_fragment>",
      code,
    );
  };
  material.customProgramCacheKey = () => `photon-box-probe-v1`;
  material.needsUpdate = true;
}
export class Reflections {
  constructor(renderer, scene, lab, library, hdr = true) {
    Object.assign(this, { renderer, scene, lab, library, hdr });
    this.pmrem = new T.PMREMGenerator(renderer);
    this.cubeTarget = new T.WebGLCubeRenderTarget(128, {
      type: hdr ? T.HalfFloatType : T.UnsignedByteType,
      generateMipmaps: false,
    });
    this.cube = new T.CubeCamera(0.15, 160, this.cubeTarget);
    this.cube.position.copy(lab.probePosition);
    this.geometry = new T.PlaneGeometry(9, 14);
    this.plane = new Reflector(this.geometry, {
      textureWidth: 320,
      textureHeight: 320,
      multisample: 0,
      clipBias: 0.003,
      shader: puddleShader,
    });
    if (!hdr) this.plane.getRenderTarget().texture.type = T.UnsignedByteType;
    this.plane.rotation.x = -Math.PI / 2;
    this.plane.position.set(0, 0.09, -6);
    this.plane.material.transparent = true;
    this.plane.material.depthWrite = false;
    this.plane.renderOrder = 3;
    this.capture = this.plane.onBeforeRender.bind(this.plane);
    this.plane.onBeforeRender = () => {};
    scene.add(this.plane);
    this.frames = 0;
    this.probeVersion = 0;
    this.planarUpdates = 0;
    this.dirty = true;
    this.enabled = true;
    this.local = true;
    this.profile = { reflection: 320, reflectionEvery: 2 };
    this.bounds = [new T.Vector3(-12, 0, -18), new T.Vector3(12, 16, 8)];
    for (const m of lab.reflectiveMaterials)
      applyBoxProbe(m, this.cube.position, ...this.bounds);
  }
  setQuality(q) {
    this.profile = q;
    this.plane.getRenderTarget().setSize(q.reflection, q.reflection);
    this.plane.material.uniforms.texel.value.set(
      1 / q.reflection,
      1 / q.reflection,
    );
    this.dirty = true;
  }
  captureProbe() {
    if (!this.hdr) {
      this.dirty = false;
      return;
    }
    const previousEnvironment = this.scene.environment;
    this.scene.environment = null;
    let success = false;
    const visible = this.plane.visible;
    this.plane.visible = false;
    const old = [];
    for (const m of this.lab.reflectiveMaterials) {
      old.push(m.envMap);
      m.envMap = null;
    }
    this.scene.updateMatrixWorld(true);
    const shadow = this.renderer.shadowMap.autoUpdate;
    const shadowNeedsUpdate = this.renderer.shadowMap.needsUpdate;
    this.renderer.shadowMap.autoUpdate = false;
    // A dirty probe must see the current sun and geometry. Refresh on the first
    // cube face; WebGLShadowMap clears needsUpdate so the other five reuse it.
    this.renderer.shadowMap.needsUpdate = true;
    try {
      this.cube.update(this.renderer, this.scene);
      const target = this.pmrem.fromCubemap(
        this.cubeTarget.texture,
        this.probeTarget,
      );
      if (this.probeTarget && target !== this.probeTarget)
        this.probeTarget.dispose();
      this.probeTarget = target;
      this.scene.environment = this.probeTarget.texture;
      for (const m of this.lab.reflectiveMaterials)
        m.envMap = this.local ? this.probeTarget.texture : null;
      this.probeVersion++;
      this.dirty = false;
      success = true;
    } finally {
      if (!success) {
        this.scene.environment = previousEnvironment;
        this.lab.reflectiveMaterials.forEach((m, i) => (m.envMap = old[i]));
      }
      this.renderer.shadowMap.autoUpdate = shadow;
      this.renderer.shadowMap.needsUpdate = shadowNeedsUpdate;
      this.plane.visible = visible;
    }
  }
  update(camera, time, rain, profiler, ready) {
    this.frames++;

    this.plane.material.uniforms.time.value = time;
    this.plane.material.uniforms.rain.value = rain;
    this.plane.visible =
      this.enabled &&
      this.lab.group.visible &&
      camera.position.distanceTo(this.lab.probePosition) < 55;
    if (this.dirty && ready && this.lab.group.visible)
      profiler.measure("probe", () => this.captureProbe());
    camera.updateMatrixWorld(true);
    const frustum = new T.Frustum().setFromProjectionMatrix(
      new T.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
    this.plane.visible =
      this.plane.visible &&
      frustum.intersectsSphere(new T.Sphere(new T.Vector3(0, 0, -6), 9));
    for (const surface of this.lab.puddleSurfaces)
      surface.mesh.visible = !this.plane.visible;
    if (
      this.plane.visible &&
      (this.frames % this.profile.reflectionEvery === 0 ||
        this.planarUpdates === 0)
    ) {
      this.scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      profiler.measure("planar", () =>
        this.capture(this.renderer, this.scene, camera),
      );
      this.planarUpdates++;
    }
  }
  setEnabled(v) {
    this.enabled = v;
    this.plane.visible = v;
  }
  dispose() {
    this.scene.remove(this.plane);
    this.scene.environment = null;
    this.geometry.dispose();
    this.plane.dispose();
    this.probeTarget?.dispose();
    this.cubeTarget.dispose();
    this.pmrem.dispose();
  }
}
