import * as T from "three";
import { fixedBox } from "../physics/world.js";
export class Depot {
  constructor(scene, world, assets) {
    this.inside = false;
    this.scene = scene;
    this.world = world;
    this.assets = assets;
    this.bodies = [];
    this.room = new T.Group();
    this.door = assets.mesh("teal", -9, 1.6, -10, 1, 3.2, 3);
    scene.add(this.door);
  }
  enter(player) {
    this.outside = { ...player.body.translation() };
    const add = (x, y, z, w, h, d) => {
      this.room.add(this.assets.mesh("curb", x, y, z, w, h, d));
      this.bodies.push(fixedBox(this.world, x, y, z, w, h, d));
    };
    add(0, 49, 0, 18, 1, 18);
    add(-9, 52, 0, 1, 6, 18);
    add(9, 52, 0, 1, 6, 18);
    add(0, 52, -9, 18, 6, 1);
    add(0, 52, 9, 18, 6, 1);
    this.scene.add(this.room);
    player.teleport({ x: 0, y: 51, z: 0 });
    this.inside = true;
  }
  exit(player) {
    this.scene.remove(this.room);
    this.room.clear();
    for (const b of this.bodies) this.world.removeRigidBody(b);
    this.bodies = [];
    player.teleport(this.outside);
    this.inside = false;
  }
  interact(player) {
    if (this.inside) {
      this.exit(player);
      return "Back in Old Port";
    }
    const p = player.body.translation();
    if (Math.hypot(p.x + 9, p.z + 10) < 4) {
      this.enter(player);
      return "Depot interior · E to exit";
    }
    return "Find the teal doorway at the northwest corner of the plaza";
  }
  dispose() {
    this.scene.remove(this.door, this.room);
    for (const b of this.bodies) this.world.removeRigidBody(b);
  }
}
