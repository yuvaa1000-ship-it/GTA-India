import * as T from "three";
import { FABRICS } from "../secondary/patterns.js";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function validateSecondary(r) {
  let box = document.querySelector("#diagnostics");
  if (!box) {
    box = document.createElement("pre");
    box.id = "diagnostics";
    document.body.append(box);
  }
  const tests = [],
    runs = [];
  const output = () =>
    (box.textContent =
      tests
        .map(
          (t) =>
            `${t.passed ? "PASS" : "FAIL"} ${t.name}: ${JSON.stringify(t.detail)}`,
        )
        .join("\n") +
      "\n\n" +
      JSON.stringify({ runs, metrics: r.metrics.report(r) }, null, 2));
  const check = (name, passed, detail) => {
    tests.push({ name, passed: !!passed, detail });
    output();
  };
  const until = async (predicate) => {
    const deadline = performance.now() + 100000;
    while (!predicate()) {
      if (performance.now() > deadline)
        throw Error("Secondary validation timeout");
      await wait(50);
    }
  };
  const simulate = async (seconds, sample) => {
    const end = r.clock.elapsed + seconds;
    await until(() => {
      sample?.();
      return r.clock.elapsed >= end;
    });
  };
  const s = r.secondary,
    old = {
      enabled: r.input.enabled,
      wind: s.wind,
      wet: s.wetOverride,
      fabric: s.fabric,
      hair: s.hairStyle,
      conversation: s.conversation,
      emotion: s.emotion,
    };
  r.input.enabled = false;
  r.overrideInput = { x: 0, z: 0, jump: false, sprint: false };
  try {
    r.reset();
    s.enabled = true;
    s.wind = 0;
    s.wetOverride = 0;
    s.conversation = false;
    await until(
      () =>
        r.streaming.cells.size === 25 &&
        !r.streaming.pending.size &&
        !r.streaming.ready.length,
    );
    await simulate(0.5);
    const bodies = r.world.bodies.len();
    s.configure({ fabric: "dupatta", hair: "long" });
    await simulate(0.5);
    check(
      "Multiple secondary actors",
      s.actors.size >= 5 && s.actors.size <= 9,
      { actors: s.actors.size, particles: s.stats().particles },
    );
    const visual = s.actors.get(r.humans.hero).visual,
      initial = visual.cloth.p.at(-1).clone(),
      hairInitial = visual.hair.p.at(-1).clone();
    s.wind = 7;
    let finite = true,
      maxStretch = 0;
    await simulate(1.3, () => {
      const report = s.stats();
      finite &&= report.finite;
      maxStretch = Math.max(maxStretch, report.hero?.cloth.maxStretch ?? 0);
    });
    const clothTravel = visual.cloth.p.at(-1).distanceTo(initial),
      hairTravel = visual.hair.p.at(-1).distanceTo(hairInitial);
    check(
      "Wind moves rendered fabric and guides",
      clothTravel > 0.02 && hairTravel > 0.005 && finite,
      { clothTravel, hairTravel, maxStretch, updates: visual.updates },
    );
    const dryRoughness = visual.hairMaterial.roughness;
    s.wetOverride = 1;
    await simulate(1.2);
    check(
      "Wetness changes live material and dynamics inputs",
      s.wet > 0.7 && visual.hairMaterial.roughness < dryRoughness,
      {
        wet: s.wet,
        hairRoughness: visual.hairMaterial.roughness,
        clothRoughness: visual.clothMaterial.roughness,
      },
    );
    const visemes = new Set(),
      blinks = new Set();
    s.conversation = true;
    s.emotion = "surprised";
    await simulate(4, () => {
      for (const [c, a] of s.actors) {
        if (a.face.value.viseme !== "sil") visemes.add(a.face.value.viseme);
        if (a.face.value.blink > 0.3) blinks.add(c.identity.id);
      }
    });
    const brow =
      r.humans.hero.mesh.morphTargetInfluences[
        r.humans.hero.mesh.morphTargetDictionary.browRaise
      ];
    check(
      "Timed face performance changes actual morphs",
      visemes.size >= 3 && brow > 0.5,
      { visemes: [...visemes], browRaise: brow, blinkActors: blinks.size },
    );
    const face = s.actors.get(r.humans.hero).face;
    face.attend(
      r.humans.hero.group.position.clone().add(new T.Vector3(-2, 1.7, 2)),
      "test object",
    );
    await simulate(0.4);
    check(
      "Attention drives head-eye gaze",
      Math.abs(face.value.gazeYaw) > 0.1,
      {
        yaw: face.value.gazeYaw,
        pitch: face.value.gazePitch,
        source: face.value.source,
      },
    );
    s.conversation = false;
    r.reactions.impact({
      impulse: { x: 350, y: 0, z: 0 },
      forceFall: true,
      source: "secondary regression",
    });
    let falling = false,
      activeUpdates = 0;
    await until(() => {
      falling ||= r.reactions.fullPhysical;
      finite &&= s.stats().finite;
      activeUpdates++;
      return !r.reactions.active;
    });
    check(
      "Secondary motion survives full fall and recovery",
      falling && finite && r.player.collider.isEnabled(),
      { falling, finite, activeUpdates, reaction: r.reactions.state },
    );
    for (const fabric of Object.keys(FABRICS)) {
      s.configure({ fabric, hair: fabric === "shirt" ? "short" : "long" });
      await simulate(0.13);
      const stats = s.stats();
      runs.push({
        fabric,
        particles: stats.hero.cloth.particles,
        steps: stats.hero.cloth.steps,
        finite: stats.finite,
      });
    }
    check(
      "Distinct garment panels execute and replace safely",
      runs.length === 10 && runs.every((x) => x.finite && x.steps > 0),
      runs,
    );
    s.enabled = false;
    await simulate(0.15);
    check(
      "Owned secondary meshes release",
      s.actors.size === 0 && r.humans.hero.group.children.length === 1,
      {
        actors: s.actors.size,
        heroChildren: r.humans.hero.group.children.length,
      },
    );
    check(
      "World physics preserved",
      r.world.bodies.len() === bodies && r.world.impulseJoints.len() === 0,
      {
        before: bodies,
        after: r.world.bodies.len(),
        joints: r.world.impulseJoints.len(),
      },
    );
    s.enabled = true;
    s.configure({ fabric: old.fabric, hair: old.hair });
    await simulate(0.15);
    r.lastReport = {
      operation: "SECONDARY LIFE",
      tests,
      runs,
      metrics: r.metrics.report(r),
    };
    output();
  } catch (e) {
    check("Harness", false, e.message);
    r.lastReport = {
      operation: "SECONDARY LIFE",
      tests,
      runs,
      error: e.message,
    };
  } finally {
    r.reactions.clear();
    s.enabled = true;
    s.wind = old.wind;
    s.wetOverride = old.wet;
    s.emotion = old.emotion;
    s.conversation = old.conversation;
    s.configure({ fabric: old.fabric, hair: old.hair });
    r.overrideInput = null;
    r.input.enabled = old.enabled;
  }
  return r.lastReport;
}
