import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPhysics, fixedBox } from "../src/physics/world.js";
import { Player } from "../src/player/player.js";
import { HumanCharacter } from "../src/characters/character.js";
import { HumanSurfaces } from "../src/characters/surface.js";
import { citizenIdentity } from "../src/characters/identity.js";
import { MotionController } from "../src/animation/controller.js";
import { groundSampler } from "../src/animation/ground.js";
import { PhysicalReactions } from "../src/physical-animation/system.js";

const dt = 1 / 60;
const idle = { x: 0, z: 0, jump: false, sprint: false };
const finite = (v) => [v.x, v.y, v.z].every(Number.isFinite);

async function fixture(settings = {}, { renderEvery = 1 } = {}) {
  const world = await createPhysics(),
    scene = new T.Scene();
  fixedBox(world, 0, -0.25, 0, 80, 0.5, 80);
  const player = new Player(world, scene),
    surfaces = new HumanSurfaces();
  const hero = new HumanCharacter(
    { ...citizenIdentity("physical-integration"), height: 1.74 },
    surfaces,
    2,
  );
  scene.add(hero.group);
  const heroMotion = new MotionController(hero);
  const r = { world, scene, player, humans: { hero, heroMotion }, resets: 0 };
  r.motion = { interaction: null, comparison: false, sample: groundSampler(r) };
  const reactions = new PhysicalReactions(r);
  r.reactions = reactions;
  r.physical = reactions;
  r.reset = () => {
    r.resets++;
    reactions.clear();
    player.teleport({ x: 0, y: 0.9, z: 0 });
  };
  reactions.configure(settings);
  player.teleport({ x: 0, y: 0.9, z: 0 });
  let time = 0,
    physicsTicks = 0,
    renderDt = 0;
  const tick = (input = idle) => {
    time += dt;
    physicsTicks++;
    renderDt += dt;
    if (reactions.beforePhysics(dt)) player.step(dt, input);
    world.step();
    reactions.afterPhysics(dt);
    player.sync();
    if (physicsTicks % renderEvery === 0) {
      hero.group.position.copy(player.mesh.position).y -= 0.87;
      heroMotion.update(time, renderDt, {
        grounded: player.grounded,
        speed: Math.hypot(player.achievedVelocity.x, player.achievedVelocity.z),
        vertical: player.velocityY,
        sampleGround: r.motion.sample,
      });
      reactions.pose();
      renderDt = 0;
    }
    return reactions.stats();
  };
  for (let i = 0; i < 120; i++) tick();
  const baseline = {
    bodies: world.bodies.len(),
    colliders: world.colliders.len(),
    joints: world.impulseJoints.len(),
    groups: player.collider.collisionGroups(),
    culling: hero.mesh.frustumCulled,
  };
  return {
    ...r,
    reactions,
    tick,
    baseline,
    checkReleased() {
      assert.equal(reactions.active, false);
      assert.equal(world.bodies.len(), baseline.bodies);
      assert.equal(world.colliders.len(), baseline.colliders);
      assert.equal(world.impulseJoints.len(), baseline.joints);
      assert.equal(player.collider.isEnabled(), true);
      assert.equal(player.collider.collisionGroups(), baseline.groups);
      assert.equal(hero.mesh.frustumCulled, baseline.culling);
      assert.equal(player.externalVelocity, null);
    },
    dispose() {
      reactions.dispose();
      hero.dispose();
      surfaces.dispose();
      player.dispose(scene);
      world.free();
    },
  };
}

test("Small shoulder impulse stays partial, responds physically, and releases exactly thirteen bodies", async () => {
  const f = await fixture();
  try {
    f.reactions.impact({
      impulse: { x: 20, y: 0, z: 0 },
      source: "shoulder bump",
    });
    assert.equal(f.world.bodies.len(), f.baseline.bodies + 13);
    assert.equal(f.world.impulseJoints.len(), f.baseline.joints + 12);
    assert.ok(
      f.reactions.art.links.get("chest").body.linvel().x > 0.5,
      "Real chest body did not receive impulse",
    );
    const states = new Set();
    let finiteFrames = 0;
    for (let i = 0; i < 240; i++) {
      const s = f.tick();
      states.add(s.state);
      if (s.active) {
        assert.equal(
          f.reactions.art.anchored,
          true,
          `Small bump collapsed: ${JSON.stringify(s)}`,
        );
        assert.equal(s.physical.finite, true);
        finiteFrames++;
      }
    }
    assert.ok(finiteFrames > 30);
    assert.ok(
      states.has("correcting"),
      `Small bump skipped correction: ${[...states]}`,
    );
    assert.ok(!states.has("falling"), "Small bump was mislabeled as a fall");
    assert.equal(f.reactions.completed, 1);
    f.checkReleased();
  } finally {
    f.dispose();
  }
});

test("Harder push moves the actual character controller and produces recovery steps before release", async () => {
  const f = await fixture();
  try {
    const start = { ...f.player.body.translation() },
      steps = f.humans.heroMotion.steps;
    f.reactions.impact({
      impulse: { x: 100, y: 0, z: 0 },
      source: "hard push",
    });
    const states = new Set();
    let peak = 0;
    for (let i = 0; i < 240; i++) {
      const s = f.tick();
      states.add(s.state);
      peak = Math.max(peak, f.player.body.translation().x - start.x);
      assert.ok(finite(f.player.body.translation()));
    }
    assert.ok(peak > 0.1, `Measured capsule response was only ${peak} m`);
    assert.ok(
      f.humans.heroMotion.steps > steps,
      "Hard push produced no actual footstep transition",
    );
    assert.ok(states.has("stepping"), `Hard push states: ${[...states]}`);
    assert.equal(f.reactions.completed, 1);
    f.checkReleased();
  } finally {
    f.dispose();
  }
});

test("Partial bumps and pushes remain truthful and recover with 60 Hz physics and 6/10 Hz visual updates", async (t) => {
  for (const renderEvery of [6, 10]) {
    for (const impulse of [20, 100]) {
      const context = `${impulse} N s at ${60 / renderEvery} Hz visuals`;
      await t.test(context, async () => {
        const f = await fixture({}, { renderEvery });
        try {
          const startX = f.player.body.translation().x;
          const startSteps = f.humans.heroMotion.steps;
          const startAnkles = Object.fromEntries(
            f.humans.heroMotion.feet.map((foot) => [
              foot.side,
              f.humans.hero.rig.named["ankle" + foot.side].getWorldPosition(
                new T.Vector3(),
              ),
            ]),
          );
          const states = new Set();
          let activeFrames = 0;
          let peakDisplacement = 0;
          let swingFrames = 0,
            swingAnkleTravel = 0,
            swingAnkleLift = 0,
            plantedAnkleError = 0;
          f.reactions.impact({
            impulse: { x: impulse, y: 0, z: 0 },
            source: "coarse visual cadence",
          });
          assert.equal(f.world.bodies.len(), f.baseline.bodies + 13, context);
          for (let i = 0; i < 240; i++) {
            const s = f.tick();
            states.add(s.state);
            peakDisplacement = Math.max(
              peakDisplacement,
              f.player.body.translation().x - startX,
            );
            assert.notEqual(
              s.state,
              "falling",
              `${context}: false fall at tick ${i}`,
            );
            if (s.active) {
              activeFrames++;
              assert.equal(
                f.reactions.art.anchored,
                true,
                `${context}: root released`,
              );
              assert.equal(
                s.physical.finite,
                true,
                `${context}: non-finite articulation`,
              );
              assert.equal(f.player.collider.isEnabled(), true, context);
              for (const foot of f.humans.heroMotion.feet) {
                if (foot.locked) {
                  const ankle = f.humans.hero.rig.named[
                    "ankle" + foot.side
                  ].getWorldPosition(new T.Vector3());
                  const target = foot.point
                    .clone()
                    .addScaledVector(
                      foot.normal,
                      f.humans.hero.identity.height * 0.06,
                    );
                  plantedAnkleError = Math.max(
                    plantedAnkleError,
                    ankle.distanceTo(target),
                  );
                }
                if (!foot.locked && foot.progress > 0 && foot.progress < 1) {
                  swingFrames++;
                  const ankle = f.humans.hero.rig.named[
                    "ankle" + foot.side
                  ].getWorldPosition(new T.Vector3());
                  const origin = startAnkles[foot.side];
                  swingAnkleTravel = Math.max(
                    swingAnkleTravel,
                    Math.hypot(ankle.x - origin.x, ankle.z - origin.z),
                  );
                  swingAnkleLift = Math.max(swingAnkleLift, ankle.y - origin.y);
                }
              }
            }
            f.world.bodies.forEach((body) => {
              assert.ok(
                finite(body.translation()) && finite(body.linvel()),
                context,
              );
              const q = body.rotation();
              assert.ok([q.x, q.y, q.z, q.w].every(Number.isFinite), context);
            });
            assert.ok(
              f.humans.hero.rig.bones.every((bone) =>
                bone.matrixWorld.elements.every(Number.isFinite),
              ),
              `${context}: non-finite rendered skeleton`,
            );
          }
          assert.ok(
            activeFrames > 30,
            `${context}: reaction did not stay active`,
          );
          assert.ok(
            states.has("recovering"),
            `${context}: states ${[...states]}`,
          );
          assert.equal(f.reactions.completed, 1, context);
          assert.equal(
            f.resets,
            0,
            `${context}: emergency reset hid a failure`,
          );
          f.checkReleased();
          assert.ok(
            plantedAnkleError < 0.025,
            `${context}: actual planted ankle missed its world contact by ${plantedAnkleError} m`,
          );
          if (impulse === 100) {
            assert.ok(
              states.has("stepping"),
              `${context}: no executed stepping`,
            );
            assert.ok(
              peakDisplacement > 0.1,
              `${context}: only moved ${peakDisplacement} m`,
            );
            assert.ok(
              f.humans.heroMotion.steps > startSteps,
              `${context}: no actual footstep after ${peakDisplacement} m; steps ${startSteps} -> ${f.humans.heroMotion.steps}`,
            );
            assert.ok(
              swingFrames > 0,
              `${context}: foot never entered an advancing unlocked swing`,
            );
            assert.ok(
              swingAnkleTravel > 0.03,
              `${context}: actual swinging ankle traveled only ${swingAnkleTravel} m horizontally`,
            );
            assert.ok(
              swingAnkleLift > 0.015,
              `${context}: actual swinging ankle lifted only ${swingAnkleLift} m`,
            );
          } else {
            assert.ok(states.has("correcting"), `${context}: no correction`);
          }
        } finally {
          f.dispose();
        }
      });
    }
  }
});

test("Severe impulse creates a finite contact-driven fall, recovers to locomotion and restores resources", async () => {
  const f = await fixture();
  try {
    f.reactions.impact({
      impulse: { x: 350, y: 0, z: 0 },
      source: "severe impact",
    });
    assert.equal(f.reactions.fullPhysical, true);
    assert.equal(f.player.collider.isEnabled(), false);
    const states = new Set();
    let contactFrames = 0,
      maxJointError = 0;
    for (let i = 0; i < 600; i++) {
      const s = f.tick();
      states.add(s.state);
      if (s.active) {
        assert.equal(
          s.physical.finite,
          true,
          `Non-finite articulated state: ${JSON.stringify(s)}`,
        );
        if (s.physical.contacts > 0) contactFrames++;
        maxJointError = Math.max(maxJointError, s.physical.maxJointError);
      }
      assert.ok(
        f.humans.hero.rig.bones.every((b) =>
          b.matrixWorld.elements.every(Number.isFinite),
        ),
      );
    }
    assert.ok(
      contactFrames > 10,
      "Fall did not generate repeated physical floor contacts",
    );
    assert.ok(
      states.has("falling") &&
        states.has("recovering") &&
        states.has("balanced"),
      `Observed states ${[...states]}, final ${JSON.stringify(f.reactions.stats())}`,
    );
    assert.ok(
      maxJointError < 0.12,
      `Articulated joints separated by ${maxJointError} m`,
    );
    assert.equal(f.reactions.completed, 1);
    f.checkReleased();
    const before = f.player.body.translation().z;
    for (let i = 0; i < 60; i++) f.tick({ ...idle, z: -1 });
    assert.ok(
      f.player.body.translation().z < before - 1,
      "Locomotion did not resume after physical recovery",
    );
  } finally {
    f.dispose();
  }
});

test("Running into a real wall automatically triggers a reaction from measured blocked movement", async () => {
  const f = await fixture();
  const wall = fixedBox(f.world, 0, 1.5, -4, 12, 3, 0.4);
  try {
    assert.equal(f.reactions.history.length, 0);
    let hit = null;
    for (let i = 0; i < 180 && !f.reactions.active; i++) {
      f.tick({ ...idle, z: -1, sprint: true });
      if (f.player.lastImpact) hit = f.player.lastImpact;
    }
    assert.equal(
      f.reactions.active,
      true,
      "Wall collision did not activate the physical response",
    );
    assert.ok(
      hit && hit.speed > 3.2,
      "No measured blocked-velocity event accompanied activation",
    );
    assert.ok(
      hit.direction.z > 0,
      "Impact should oppose the attempted motion into the wall",
    );
    assert.equal(f.reactions.history.length, 1);
    assert.equal(f.reactions.history[0].source, "running obstacle");
    assert.ok(
      f.player.body.translation().z > -3.6,
      "Player crossed the wall before triggering",
    );
    for (let i = 0; i < 600 && f.reactions.active; i++) {
      const s = f.tick();
      if (s.active) assert.equal(s.physical.finite, true);
    }
    assert.equal(
      f.reactions.completed,
      1,
      `Automatic wall reaction did not recover: ${JSON.stringify(f.reactions.stats())}`,
    );
    assert.equal(
      f.reactions.history.length,
      1,
      "The same encounter repeatedly restarted the reaction",
    );
    f.world.removeRigidBody(wall);
    f.checkReleased();
  } finally {
    if (wall.isValid()) f.world.removeRigidBody(wall);
    f.dispose();
  }
});

test("Mass changes actual impulse velocity and movement, and reset/disposal restores collider ownership", async () => {
  const outcomes = [];
  for (const mass of [60, 100]) {
    const f = await fixture({ mass });
    try {
      const start = f.player.body.translation().x;
      f.reactions.impact({
        impulse: { x: 100, y: 0, z: 0 },
        source: "mass comparison",
      });
      const chestVelocity = f.reactions.art.links.get("chest").body.linvel().x;
      for (let i = 0; i < 60; i++) f.tick();
      outcomes.push({
        mass,
        chestVelocity,
        displacement: f.player.body.translation().x - start,
      });
      f.reactions.clear();
      f.reactions.clear();
      f.checkReleased();
      assert.throws(
        () => f.reactions.impact({ impulse: { x: NaN, y: 0, z: 0 } }),
        /finite/i,
      );
      f.checkReleased();
      f.reactions.impact({ impulse: { x: 350, y: 0, z: 0 } });
      f.reactions.clear();
      f.player.teleport({ x: 0, y: 0.9, z: 0 });
      f.checkReleased();
    } finally {
      f.dispose();
    }
  }
  assert.ok(
    outcomes[0].chestVelocity > outcomes[1].chestVelocity * 1.5,
    JSON.stringify(outcomes),
  );
  assert.ok(
    outcomes[0].displacement > outcomes[1].displacement * 1.15,
    JSON.stringify(outcomes),
  );
});
