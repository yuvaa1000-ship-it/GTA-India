export function addCloudAttenuation(material, uniforms) {
  const prior = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader) => {
    prior(shader);
    shader.uniforms.photonCloudTime = uniforms.time;
    shader.uniforms.photonCloudAmount = uniforms.amount;
    shader.vertexShader = "varying vec3 vCloudWorld;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      "#include <project_vertex>\nvec4 cloudPosition=vec4(transformed,1.);\n#ifdef USE_INSTANCING\ncloudPosition=instanceMatrix*cloudPosition;\n#endif\nvCloudWorld=(modelMatrix*cloudPosition).xyz;",
    );
    shader.fragmentShader =
      "varying vec3 vCloudWorld;uniform float photonCloudTime,photonCloudAmount;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_fragment_end>",
      `#include <lights_fragment_end>
float cloud=0.7+0.3*sin(vCloudWorld.x*.045+photonCloudTime*.035)*sin(vCloudWorld.z*.032-photonCloudTime*.025);
reflectedLight.directDiffuse*=mix(1.,cloud,photonCloudAmount);
reflectedLight.directSpecular*=mix(1.,cloud,photonCloudAmount);`,
    );
  };
  const key = previousKey();
  material.customProgramCacheKey = () => key + "-cloud-v1";
  material.needsUpdate = true;
}
