import test from "node:test";
import assert from "node:assert/strict";
import { loadTS } from "../validation/load.mjs";
const { analyzePose } = await loadTS("src/lib/pose/poseRules.ts");
const { SessionEngine } = await loadTS("src/lib/pose/sessionEngine.ts");
const { createDemoLandmarks } = await loadTS("src/lib/pose/demoPose.ts");
const { buildSetFeedback } = await loadTS("src/lib/pose/setFeedback.ts");
const { EXERCISES } = await loadTS("src/data/exercises.ts");

function rig(joints, aspect = 1) {
  const p = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0 }));
  for (const [idx, [x, y]] of Object.entries(joints)) {
    for (const side of [0, 1])
      p[Number(idx) + side] = { x: 0.5 + (x - 0.5 + 0.015 * side) / aspect, y, z: 0, visibility: 0.95 };
  }
  return p;
}
const base = { 11: [0.35, 0.25], 23: [0.35, 0.48], 25: [0.35, 0.68], 27: [0.35, 0.91] };
function cyclePose(id, low, aspect) {
  if (id === "pushup")
    return rig(
      {
        11: [0.34, 0.45],
        13: low ? [0.45, 0.51] : [0.345, 0.58],
        15: [0.35, 0.7],
        23: [0.51, 0.46],
        25: [0.62, 0.47],
        27: [0.7, 0.48],
      },
      aspect,
    );
  if (id === "glute-bridge")
    return rig(
      { 11: [0.31, 0.66], 23: low ? [0.47, 0.55] : [0.5, 0.69], 25: [0.61, 0.46], 27: [0.64, 0.71] },
      aspect,
    );
  return rig(
    low ? { ...base, 11: [0.35, 0.42], 23: [0.35, 0.65], 25: [0.53, 0.66], 27: [0.44, 0.85] } : base,
    aspect,
  );
}
test("20 synthetic sets per pilot, varied cadence, aspect and frame intervals", () => {
  for (const id of ["squat", "reverse-lunge", "pushup", "glute-bridge"])
    for (let n = 0; n < 20; n++) {
      const aspect = n % 2 ? 9 / 16 : 16 / 9;
      const engine = new SessionEngine();
      let t = 0;
      const feed = (low) => {
        for (let i = 0; i < 4 + (n % 6); i++)
          engine.feed(analyzePose(id, cyclePose(id, low, aspect), (t += 55 + (n % 4) * 15), aspect));
      };
      feed(false);
      for (let i = 1; i <= 8; i++) {
        feed(true);
        feed(false);
        assert.equal(engine.stats.reps, i, id + " set " + n);
        assert.equal(!!engine.stats.review, i === 8);
      }
      assert.equal(engine.stats.review.assessed, 8);
      assert.deepEqual(engine.stats.review.tips, []);
    }
});
test("one physical knee angle stays unchanged across both source orientations", () => {
  const signals = [9 / 16, 16 / 9].map(
    (a) =>
      analyzePose("squat", rig({ ...base, 25: [0.35, 0.68], 27: [0.49, 0.82] }, a), 0, a).repSignal.value,
  );
  for (const angle of signals) assert.ok(Math.abs(angle - 135) < 1);
});
test("no phantom during setup, threshold spike, pause or re-entry", () => {
  const e = new SessionEngine();
  let t = 0;
  const feed = (low, n) => {
    for (let i = 0; i < n; i++) e.feed(analyzePose("squat", cyclePose("squat", low, 1), (t += 80), 1));
  };
  feed(true, 5);
  feed(false, 5);
  feed(true, 1);
  feed(false, 15);
  feed(true, 5);
  e.feed(null);
  feed(false, 5);
  feed(true, 5);
  t += 1500;
  feed(false, 5);
  feed(true, 5);
  e.interrupt();
  feed(false, 5);
  assert.equal(e.stats.reps, 0);
  feed(true, 5);
  feed(false, 5);
  assert.equal(e.stats.reps, 1);
});
test("deepest point, one vote per rep, threshold 3 of 8, snapshot and identical speech", () => {
  for (const shallow of [0, 1, 2, 3, 8]) {
    const e = new SessionEngine();
    let t = 0;
    const feed = (angle, n) => {
      for (let j = 0; j < n; j++) {
        const f = analyzePose("squat", cyclePose("squat", false, 1), (t += 80), 1);
        f.repSignal.value = angle;
        if (angle <= 115) f.corrections = [];
        e.feed(f);
      }
    };
    feed(170, 4);
    for (let i = 0; i < 8; i++) {
      feed(130, i === 0 ? 55 : 4);
      if (i >= shallow) feed(95, 4);
      feed(170, 4);
      if (i < 7) assert.equal(buildSetFeedback(e.stats, "Squat").voiceText, "");
    }
    const feedback = buildSetFeedback(e.stats, "Squat");
    assert.deepEqual(
      feedback.tips.map((t) => t.key),
      shallow >= 3 ? ["depth"] : [],
    );
    assert.equal(
      feedback.voiceText,
      [feedback.title + ".", feedback.summary, ...feedback.tips.map((t) => t.title + ". " + t.detail)].join(
        " ",
      ),
    );
    feed(130, 5);
    feed(170, 5);
    assert.equal(e.stats.reps, 9);
    assert.deepEqual(buildSetFeedback(e.stats, "Squat"), feedback);
  }
});
test("cropped or occluded joints, frontal setup and uncertain angle", () => {
  const p = cyclePose("squat", false, 1);
  p[27].x = 1.01;
  p[28].visibility = 0.1;
  assert.match(analyzePose("squat", p).framingHint, /enkel/);
  const hidden = cyclePose("squat", false, 1);
  hidden[12].visibility = 0;
  assert.equal(analyzePose("squat", hidden).assessable, false);
  hidden[12] = { ...hidden[11], x: hidden[11].x + 0.3 };
  assert.match(analyzePose("squat", hidden).framingHint, /zijaanzicht/);
});
test("three holds: wait for position, count visible seconds only, freeze at target", () => {
  for (const id of ["plank", "wall-sit", "side-plank"]) {
    const e = new SessionEngine(20);
    let t = 0;
    const p =
      id === "wall-sit"
        ? rig({ 11: [0.35, 0.35], 23: [0.35, 0.6], 25: [0.55, 0.61], 27: [0.55, 0.85] })
        : rig({ 11: [0.3, 0.4], 13: [0.3, 0.54], 23: [0.48, 0.43], 25: [0.6, 0.46], 27: [0.75, 0.49] });
    if (id === "side-plank") p[12].y -= 0.1;
    for (let i = 0; i < 10; i++) e.feed(analyzePose(id, rig(base), (t += 80)));
    assert.equal(e.stats.heldSeconds, 0);
    const run = (n) => {
      for (let i = 0; i < n; i++) e.feed(analyzePose(id, p, (t += 80)));
    };
    run(130);
    assert.equal(e.stats.heldSeconds, 10);
    e.feed(null);
    t += 8000;
    run(100);
    assert.equal(e.stats.review, null);
    run(50);
    assert.equal(e.stats.heldSeconds, 20);
    assert.equal(e.stats.review.units, 20);
  }
});
test("25 camera guides retained and synthetic squat demo reaches eight", () => {
  assert.equal(EXERCISES.length, 25);
  assert.ok(EXERCISES.every((e) => e.camera.position && e.camera.framing));
  const e = new SessionEngine();
  for (let t = 0; t <= 21000; t += 80) e.feed(analyzePose("squat", createDemoLandmarks(t), t));
  assert.equal(e.stats.reps, 8);
  assert.deepEqual(e.stats.review.tips, []);
});
test("uncertain view does not produce a positive form judgement and tip list is capped at two", () => {
  for (const assessable of [false, true]) {
    const e = new SessionEngine();
    let t = 0;
    const feed = (low) => {
      for (let i = 0; i < 5; i++) {
        const f = analyzePose("squat", cyclePose("squat", low, 1), (t += 80));
        f.assessable = assessable;
        f.corrections = ["hip-line", "back-neutral", "shoulder-stack"].map((key) => ({
          key,
          level: "warning",
          label: key,
          detail: key,
        }));
        e.feed(f);
      }
    };
    feed(false);
    for (let i = 0; i < 8; i++) {
      feed(true);
      feed(false);
    }
    const fb = buildSetFeedback(e.stats, "Squat");
    assert.equal(fb.tips.length, assessable ? 2 : 0);
    assert.equal(fb.summary.includes("Onvoldoende"), !assessable);
  }
});
