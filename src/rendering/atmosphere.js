import * as T from "three";
import { Sky } from "three/addons/objects/Sky.js";
export const CONDITIONS = {
  sunset: {
    elevation: 9,
    azimuth: 235,
    sun: 3.4,
    hemi: 1.25,
    fog: "#bea08f",
    night: 0,
    rain: 0,
  },
  night: {
    elevation: -12,
    azimuth: 235,
    sun: 0.055,
    hemi: 0.12,
    fog: "#101c32",
    night: 1,
    rain: 0,
  },
  rain: {
    elevation: 16,
    azimuth: 235,
    sun: 1.35,
    hemi: 1.0,
    fog: "#53636d",
    night: 0.25,
    rain: 1,
  },
};
export class Atmosphere {
  constructor(scene, sun) {
    this.scene = scene;
    this.sun = sun;
    this.hemi = scene.children.find((o) => o.isHemisphereLight);
    this.sky = new Sky();
    this.sky.scale.setScalar(420);
    this.sky.frustumCulled = false;
    scene.add(this.sky);
    this.sky.material.uniforms.nightMix = { value: 0 };
    this.sky.material.fragmentShader = this.sky.material.fragmentShader.replace(
      "uniform vec3 up;",
      "uniform vec3 up;\nuniform float nightMix;",
    );
    this.sky.material.fragmentShader = this.sky.material.fragmentShader.replace(
      "#include <tonemapping_fragment>",
      "gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.008,0.017,0.042) + vec3(0.015)*pow(max(direction.y,0.0),2.0), nightMix);\n#include <tonemapping_fragment>",
    );
    this.direction = new T.Vector3();
    this.scene.background = null;
    this.scene.fog = null;
    this.set("sunset");
  }
  set(name) {
    this.name = name;
    this.condition = CONDITIONS[name] ?? CONDITIONS.sunset;
    const c = this.condition;
    this.direction.setFromSphericalCoords(
      1,
      T.MathUtils.degToRad(90 - c.elevation),
      T.MathUtils.degToRad(c.azimuth),
    );
    const u = this.sky.material.uniforms;
    u.sunPosition.value.copy(this.direction);
    u.turbidity.value = c.rain ? 12 : 3;
    u.rayleigh.value = 2;
    u.mieCoefficient.value = c.rain ? 0.035 : 0.006;
    u.mieDirectionalG.value = 0.82;
    u.nightMix.value = c.night;
    this.sun.intensity = c.sun;
    this.sun.color.set(c.night > 0.5 ? "#9cb6ff" : "#ffd3a1");
    if (this.hemi) this.hemi.intensity = c.hemi;
    this.fogColor = new T.Color(c.fog);
  }
  update(player, time) {
    this.sky.position.copy(player);
    this.sun.position.copy(player).addScaledVector(this.direction, 75);
    this.sun.target.position.copy(player);
    this.sun.intensity =
      this.condition.sun *
      (this.condition.rain ? 0.8 + 0.2 * Math.sin(time * 0.08) : 1);
  }
  dispose() {
    this.scene.remove(this.sky);
    this.sky.geometry.dispose();
    this.sky.material.dispose();
  }
}
