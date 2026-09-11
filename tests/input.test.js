import test from "node:test";
import assert from "node:assert/strict";
import { Input } from "../src/player/input.js";
test("Keyboard press/release between frames retains one action and blur clears held movement", () => {
  const original = {
    document: globalThis.document,
    addEventListener: globalThis.addEventListener,
    removeEventListener: globalThis.removeEventListener,
  };
  const windowEvents = new EventTarget();
  globalThis.document = new EventTarget();
  globalThis.addEventListener =
    windowEvents.addEventListener.bind(windowEvents);
  globalThis.removeEventListener =
    windowEvents.removeEventListener.bind(windowEvents);
  const input = new Input({});
  input.enabled = true;
  const dispatch = (type, code, repeat = false) =>
    windowEvents.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), { code, repeat }),
    );
  try {
    dispatch("keydown", "Space");
    dispatch("keyup", "Space");
    assert.equal(input.sample(1 / 60).jump, true);
    assert.equal(input.sample(1 / 60).jump, false);
    dispatch("keydown", "KeyE");
    dispatch("keyup", "KeyE");
    assert.equal(input.consume("KeyE"), true);
    dispatch("keydown", "KeyW");
    assert.equal(input.sample(1 / 60).z, -1);
    windowEvents.dispatchEvent(new Event("blur"));
    assert.equal(input.sample(1 / 60).z, 0);
  } finally {
    input.dispose();
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
