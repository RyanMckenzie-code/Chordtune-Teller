import test from "node:test";
import assert from "node:assert/strict";
import { chords } from "./detector.mjs";
import { createChordTracker } from "./tracker.mjs";

const hit = (family) => ({
  i: chords.findIndex((c) => c.family === family && c.tones[0] === 4),
  pitches: [40, 47, 52, 56, 59, 64],
});
const major = hit("Major"),
  seventh = hit("7"),
  ninth = hit("9");

test("a quick E-major strum does not publish transient E9 or E7 attack frames", () => {
  const tracker = createChordTracker();
  for (let t = 0; t < 250; t += 50) {
    assert.equal(tracker.update(t < 150 ? ninth : seventh, 0.08, t, 200), null);
  }
  assert.equal(tracker.update(major, 0.06, 250, 200), null);
  assert.equal(tracker.update(major, 0.05, 300, 200), null);
  assert.equal(tracker.update(major, 0.04, 350, 200).i, major.i);
});

for (const extended of [seventh, ninth]) {
  test(
    "sustained " + chords[extended.i].name + " still confirms after the attack",
    () => {
      const tracker = createChordTracker();
      for (let t = 0; t < 450; t += 50)
        assert.equal(tracker.update(extended, 0.08, t, 200), null);
      assert.equal(tracker.update(extended, 0.08, 450, 200).i, extended.i);
    },
  );
}

test("a new strum clears evidence from the preceding chord", () => {
  const tracker = createChordTracker();
  tracker.update(major, 0.02, 0, 200);
  for (let t = 250; t <= 350; t += 50) tracker.update(major, 0.02, t, 200);
  assert.equal(tracker.update(ninth, 0.12, 400, 200), null);
  assert.equal(tracker.update(ninth, 0.1, 600, 200), null);
  assert.equal(tracker.update(major, 0.06, 650, 200), null);
  assert.equal(tracker.update(major, 0.05, 700, 200), null);
  assert.equal(tracker.update(major, 0.04, 750, 200).i, major.i);
});

test("ambiguous frames and silence break confirmation instead of reusing stale votes", () => {
  const tracker = createChordTracker();
  tracker.update(major, 0.04, 0, 200);
  tracker.update(major, 0.04, 250, 200);
  tracker.update(major, 0.04, 300, 200);
  assert.equal(tracker.update(null, 0.04, 350, 200), null);
  assert.equal(tracker.update(major, 0.04, 400, 200), null);
  assert.equal(tracker.update(major, 0.001, 450, 200), null);
  assert.equal(tracker.update(major, 0.04, 500, 200), null);
  tracker.reset();
  assert.equal(tracker.update(major, 0.04, 1000, 200), null);
});

test("only repeated pitch evidence is displayed", () => {
  const tracker = createChordTracker();
  tracker.update(major, 0.04, 0, 200);
  tracker.update({ ...major, pitches: [40, 56] }, 0.04, 250, 200);
  tracker.update({ ...major, pitches: [40, 56] }, 0.04, 300, 200);
  const confirmed = tracker.update(
    { ...major, pitches: [40, 56, 62] },
    0.04,
    350,
    200,
  );
  assert.deepEqual(confirmed.pitches, [40, 56]);
});
