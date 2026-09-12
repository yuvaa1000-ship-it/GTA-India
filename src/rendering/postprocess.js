import * as T from "three";
import { PixelReadback } from "./pixel-readback.js";
import { exposureTarget, adaptExposure } from "./quality.js";
const vertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const fragment = `varying vec2 vUv;uniform sampler2D sceneColor,sceneDepth;uniform vec2 texel;uniform mat4 inverseProjection,inverseView;uniform vec3 fogColor;uniform float aoOn,bloomOn,fogDensity,heightFalloff,farPlane;
vec3 positionAt(vec2 uv){float z=texture2D(sceneDepth,uv).x;vec4 p=inverseProjection*vec4(uv*2.-1.,z*2.-1.,1.);return p.xyz/p.w;}
void main(){vec3 color=texture2D(sceneColor,vUv).rgb;
vec3 north=texture2D(sceneColor,vUv+vec2(0.,texel.y)).rgb;
vec3 south=texture2D(sceneColor,vUv-vec2(0.,texel.y)).rgb;
vec3 east=texture2D(sceneColor,vUv+vec2(texel.x,0.)).rgb;
vec3 west=texture2D(sceneColor,vUv-vec2(texel.x,0.)).rgb;
vec3 neighbor=(north+south+east+west)*.25;
float edge=length(color-neighbor)/max(length(color)+length(neighbor),.1);
color=mix(color,neighbor,smoothstep(.08,.4,edge)*.32);float depth=texture2D(sceneDepth,vUv).x;vec3 p=positionAt(vUv);float occ=0.;
if(aoOn>.5&&depth<.99999){vec3 normal=normalize(cross(dFdx(p),dFdy(p)));if(dot(normal,-p)<0.)normal=-normal;float radiusPx=clamp(110./max(-p.z,1.),2.,16.);for(int i=0;i<8;i++){float angle=float(i)*2.39996;vec2 uv=vUv+vec2(cos(angle),sin(angle))*texel*radiusPx*(.45+float(i)*.08);vec3 d=positionAt(clamp(uv,vec2(.001),vec2(.999)))-p;float dist=length(d);occ+=max(dot(normal,d/max(dist,.0001))-.08,0.)*(1.-smoothstep(.05,1.2,dist));}color*=1.-clamp(occ*.14,0.,.45);}
if(depth<.99999){vec3 wp=(inverseView*vec4(p,1.)).xyz;vec3 cp=inverseView[3].xyz;float delta=wp.y-cp.y;float segment=(abs(delta)<.001)?exp(-heightFalloff*max(cp.y,0.)):(exp(-heightFalloff*max(cp.y,0.))-exp(-heightFalloff*max(wp.y,0.)))/max(abs(heightFalloff*delta),.001);segment=abs(segment);float trans=exp(-fogDensity*length(p)*max(segment,.025));color=mix(fogColor,color,clamp(trans,0.,1.));}
if(bloomOn>.5){vec3 glow=vec3(0.);for(int i=0;i<8;i++){float angle=float(i)*.785398;vec3 c=texture2D(sceneColor,clamp(vUv+vec2(cos(angle),sin(angle))*texel*5.,vec2(.001),vec2(.999))).rgb;float peak=max(c.r,max(c.g,c.b));glow+=c*max(peak-1.4,0.)/max(peak,.001);}color+=glow*.016;}
gl_FragColor=vec4(color,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const meterFragment = `varying vec2 vUv;uniform sampler2D sceneColor;void main(){vec3 c=texture2D(sceneColor,vUv).rgb;float lum=dot(c,vec3(.2126,.7152,.0722));float encoded=clamp((log2(max(lum,.000244))+12.)/24.,0.,1.);gl_FragColor=vec4(vec3(encoded),1.);}`;
export class PostProcess {
  constructor(renderer, camera, hdr) {
    this.renderer = renderer;
    this.camera = camera;
    this.hdr = hdr;
    this.target = new T.WebGLRenderTarget(1, 1, {
      type: hdr ? T.HalfFloatType : T.UnsignedByteType,
      minFilter: T.LinearFilter,
      magFilter: T.LinearFilter,
    });
    this.target.depthTexture = new T.DepthTexture(1, 1, T.UnsignedIntType);
    this.quadScene = new T.Scene();
    this.quadCamera = new T.Camera();
    this.geometry = new T.PlaneGeometry(2, 2);
    this.uniforms = {
      sceneColor: { value: this.target.texture },
      sceneDepth: { value: this.target.depthTexture },
      texel: { value: new T.Vector2() },
      inverseProjection: { value: camera.projectionMatrixInverse },
      inverseView: { value: camera.matrixWorld },
      fogColor: { value: new T.Color() },
      aoOn: { value: 0 },
      bloomOn: { value: 1 },
      fogDensity: { value: 0.012 },
      heightFalloff: { value: 0.12 },
      farPlane: { value: camera.far },
    };
    this.material = new T.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: this.uniforms,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new T.Mesh(this.geometry, this.material);
    this.quadScene.add(this.quad);
    this.meterMaterial = new T.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: meterFragment,
      uniforms: { sceneColor: { value: this.target.texture } },
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
    });
    this.meterTarget = new T.WebGLRenderTarget(16, 16, {
      type: T.UnsignedByteType,
      depthBuffer: false,
    });
    this.readback = new PixelReadback(renderer.getContext());
    this.exposure = 1;
    this.targetExposure = 1;
    this.autoExposure = true;
    this.logLuminance = null;
    this.meterAt = -10;
    this.meterCount = 0;
  }
  resize(w, h) {
    this.target.setSize(w, h);
    this.uniforms.texel.value.set(1 / w, 1 / h);
  }
  setQuality(q) {
    this.uniforms.aoOn.value = Number(q.ao);
    this.uniforms.bloomOn.value = Number(q.bloom);
  }
  render(scene, atmosphere, time, dt, profiler) {
    const r = this.renderer;
    this.uniforms.fogColor.value.copy(atmosphere.fogColor);
    this.uniforms.fogDensity.value = atmosphere.condition.rain ? 0.024 : 0.004;
    profiler.measure("scene", () => {
      r.setRenderTarget(this.target);
      r.render(scene, this.camera);
    });
    const pixels = this.readback.poll();
    if (pixels) {
      let sum = 0;
      for (let i = 0; i < pixels.length; i += 4)
        sum += (pixels[i] / 255) * 24 - 12;
      this.logLuminance = sum / 256;
      this.targetExposure = exposureTarget(this.logLuminance);
      this.meterCount++;
    }
    if (
      this.autoExposure &&
      !this.readback.pending &&
      time - this.meterAt > 1.5
    ) {
      profiler.measure("meter", () => {
        this.quad.material = this.meterMaterial;
        r.setRenderTarget(this.meterTarget);
        r.render(this.quadScene, this.quadCamera);
        this.readback.submit(16, 16);
        this.quad.material = this.material;
      });
      this.meterAt = time;
    }
    this.exposure = this.autoExposure
      ? adaptExposure(this.exposure, this.targetExposure, dt)
      : 1;
    r.toneMappingExposure = this.exposure;
    profiler.measure("post", () => {
      r.setRenderTarget(null);
      r.render(this.quadScene, this.quadCamera);
    });
  }
  dispose() {
    this.readback.dispose();
    this.target.depthTexture.dispose();
    this.target.dispose();
    this.meterTarget.dispose();
    this.material.dispose();
    this.meterMaterial.dispose();
    this.geometry.dispose();
  }
}
