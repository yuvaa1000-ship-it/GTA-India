import * as T from "three";
export function validateHuman(character) {
  const g = character.geometry,
    rig = character.rig,
    errors = [];
  let badWeights = 0,
    badVertices = 0;
  for (let i = 0; i < g.attributes.position.count; i++) {
    const p = new T.Vector3().fromBufferAttribute(g.attributes.position, i);
    if (![p.x, p.y, p.z].every(Number.isFinite)) badVertices++;
    let sum = 0;
    for (let j = 0; j < 4; j++) {
      const w = g.attributes.skinWeight.array[i * 4 + j],
        bone = g.attributes.skinIndex.array[i * 4 + j];
      if (w < 0 || w > 1 || bone >= rig.bones.length) badWeights++;
      sum += w;
    }
    if (Math.abs(sum - 1) > 1e-5) badWeights++;
  }
  if (badWeights) errors.push("Invalid normalized weights or bone indices");
  if (badVertices) errors.push("Non-finite vertex");
  g.computeBoundingBox();
  const size = g.boundingBox.getSize(new T.Vector3());
  if (size.y < 1.4 || size.y > 2.2)
    errors.push("Height outside human source scale contract");
  if (g.boundingBox.min.y < -0.05 || g.boundingBox.min.y > 0.1)
    errors.push("Feet pivot outside tolerance");
  if (g.index.count % 3) errors.push("Invalid triangle index count");
  if (
    g.morphAttributes.position.some(
      (a) => a.count !== g.attributes.position.count,
    )
  )
    errors.push("Morph topology mismatch");
  return {
    passed: !errors.length,
    errors,
    vertices: g.attributes.position.count,
    triangles: g.index.count / 3,
    bones: rig.bones.length,
    metres: [size.x, size.y, size.z],
    morphs: Object.keys(character.mesh.morphTargetDictionary),
  };
}
