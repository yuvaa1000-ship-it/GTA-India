import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPhysics, fixedBox, RAPIER } from "../src/physics/world.js";
import { HumanCharacter } from "../src/characters/character.js";
import { HumanSurfaces } from "../src/characters/surface.js";
import { citizenIdentity } from "../src/characters/identity.js";
import { Articulation } from "../src/physical-animation/articulation.js";
import { WallBrace } from "../src/physical-animation/brace.js";

async function setup() {
  const world = await createPhysics();
  world.gravity = { x: 0, y: 0, z: 0 };
  const surfaces = new HumanSurfaces();
  const character = new HumanCharacter(
    { ...citizenIdentity("wall-brace"), height: 1.74 },
    surfaces,
  );
  const articulation = new Articulation(world, character);
  const brace = new WallBrace(world, articulation);
  const hand = brace.endpoint();
  const wall = fixedBox(world, hand.x, hand.y, hand.z + 0.11, 0.25, 0.24, 0.1);
  const collider = wall.collider(0);
  const point = hand.clone().add(new T.Vector3(0, 0, 0.06));
  world.step();
  return {
    world,
    surfaces,
    character,
    articulation,
    brace,
    wall,
    collider,
    point,
  };
}
function cleanup(r) {
  r.brace.dispose();
  r.articulation.dispose();
  r.character.dispose();
  r.surfaces.dispose();
  r.world.free();
}

test("Wall brace catches only actual nearby fixed vertical surfaces", async () => {
  const r = await setup();
  try {
    const baseline = r.world.impulseJoints.len();
    const far = fixedBox(r.world, r.point.x, r.point.y, 1.1, 0.2, 0.2, 0.1);
    assert.equal(
      r.brace.tryCatch(
        { x: r.point.x, y: r.point.y, z: 1.05 },
        far.collider(0),
      ),
      false,
    );
    assert.equal(
      r.brace.tryCatch(r.point, far.collider(0)),
      false,
      "A nearby invented point cannot stand in for the distant wall",
    );
    assert.equal(r.brace.tryCatch({ x: NaN, y: 0, z: 0 }, r.collider), false);
    r.collider.setSensor(true);
    assert.equal(r.brace.tryCatch(r.point, r.collider), false);
    r.collider.setSensor(false);
    const floor = fixedBox(
      r.world,
      r.point.x,
      r.point.y - 0.11,
      0,
      0.2,
      0.1,
      0.2,
    );
    assert.equal(
      r.brace.tryCatch(
        { x: r.point.x, y: r.point.y - 0.06, z: 0 },
        floor.collider(0),
      ),
      false,
    );
    const dynamic = r.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(r.point.x, r.point.y, 0.11),
    );
    const dc = r.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.1, 0.1, 0.05),
      dynamic,
    );
    assert.equal(r.brace.tryCatch(r.point, dc), false);
    assert.equal(r.world.impulseJoints.len(), baseline);
    assert.equal(r.brace.tryCatch(r.point, r.collider), true);
    assert.equal(r.world.impulseJoints.len(), baseline + 1);
  } finally {
    cleanup(r);
  }
});

test("Scene-query catch creates a real short constraint and expires without continuous recapture", async () => {
  const r = await setup();
  try {
    const bodies = r.world.bodies.len(),
      colliders = r.world.colliders.len(),
      joints = r.world.impulseJoints.len();
    r.brace.update(1 / 60, { enabled: true, direction: { x: 0, y: 0, z: 1 } });
    assert.equal(r.brace.stats().active, true);
    r.articulation.impulse({ x: 0, y: -0.8, z: 0 }, "forearmR");
    for (let i = 0; i < 24; i++) {
      r.world.step();
      r.brace.update(1 / 60, {
        enabled: true,
        direction: { x: 0, y: 0, z: 1 },
      });
    }
    assert.equal(r.brace.stats().active, true);
    assert.ok(
      r.brace.endpoint().distanceTo(r.point) < 0.025,
      JSON.stringify(r.brace.stats()),
    );
    assert.ok(r.articulation.stats().finite);
    assert.equal(r.world.bodies.len(), bodies);
    assert.equal(r.world.colliders.len(), colliders);
    for (let i = 0; i < 40; i++) {
      r.world.step();
      r.brace.update(1 / 60, {
        enabled: true,
        direction: { x: 0, y: 0, z: 1 },
      });
    }
    assert.equal(r.brace.stats().active, false);
    assert.equal(r.brace.stats().reason, "expired");
    assert.equal(r.brace.stats().catches, 1);
    assert.equal(r.world.impulseJoints.len(), joints);
    r.brace.update(1 / 60, { enabled: false });
    assert.equal(r.brace.stats().armed, true);
  } finally {
    cleanup(r);
  }
});

test("Excess contact error, invalid time and removed support release safely", async () => {
  const r = await setup();
  try {
    const count = r.world.impulseJoints.len();
    assert.ok(r.brace.tryCatch(r.point, r.collider));
    const body = r.articulation.links.get("forearmR").body;
    const original = { ...body.translation() };
    body.setTranslation(
      { x: original.x + 0.5, y: original.y, z: original.z },
      true,
    );
    r.brace.update(1 / 60, { enabled: true });
    assert.equal(r.brace.stats().reason, "contact-error");
    assert.equal(r.world.impulseJoints.len(), count);
    body.setTranslation(original, true);
    r.brace.update(0, { enabled: false });
    assert.ok(r.brace.tryCatch(r.point, r.collider));
    r.brace.update(NaN, { enabled: true });
    assert.equal(r.brace.stats().reason, "invalid-timestep");
    assert.equal(r.world.impulseJoints.len(), count);
    r.brace.update(0, { enabled: false });
    assert.ok(r.brace.tryCatch(r.point, r.collider));
    r.world.removeRigidBody(r.wall);
    assert.doesNotThrow(() => r.brace.update(1 / 60, { enabled: true }));
    assert.equal(r.brace.stats().reason, "support-removed");
    assert.equal(r.world.impulseJoints.len(), count);
  } finally {
    cleanup(r);
  }
});

test("Repeated temporary wall bracing returns joint count exactly and tolerates articulation disposal", async () => {
  const r = await setup();
  try {
    const count = r.world.impulseJoints.len();
    for (let i = 0; i < 5; i++) {
      r.brace.update(0, { enabled: false });
      assert.ok(r.brace.tryCatch(r.point, r.collider));
      assert.equal(r.brace.tryCatch(r.point, r.collider), false);
      assert.equal(r.world.impulseJoints.len(), count + 1);
      r.brace.update(0.6, { enabled: true });
      assert.equal(r.world.impulseJoints.len(), count);
      assert.equal(r.brace.stats().active, false);
    }
    r.brace.update(0, { enabled: false });
    assert.ok(r.brace.tryCatch(r.point, r.collider));
    r.articulation.dispose();
    assert.doesNotThrow(() => r.brace.update(1 / 60, { enabled: true }));
    assert.equal(r.brace.stats().active, false);
    assert.equal(r.world.impulseJoints.len(), 0);
    r.brace.dispose();
    r.brace.dispose();
    assert.equal(r.world.impulseJoints.len(), 0);
  } finally {
    cleanup(r);
  }
});
