import * as T from "three";
import { RAPIER } from "../physics/world.js";
export function groundSampler(runtime) {
  return (x, z, footY) => {
    const origin = { x, y: footY + 0.65, z };
    const hit = runtime.world.castRayAndGetNormal(
      new RAPIER.Ray(origin, { x: 0, y: -1, z: 0 }),
      1.5,
      true,
      undefined,
      undefined,
      runtime.player.collider,
      runtime.player.body,
      (c) => !c.isSensor() && !!c.parent(),
    ); // excludes standalone citizen contacts
    if (!hit || hit.normal.y < 0.45) return null;
    return {
      y: origin.y - hit.timeOfImpact,
      normal: new T.Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
      collider: hit.collider.handle,
    };
  };
}
