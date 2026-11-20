import assert from "node:assert/strict";
import { buildBaseline, loadTS } from "./load.mjs";
await buildBaseline();
const old = await import("./.assets/baseline.mjs");
const { createDemoLandmarks } = await loadTS("src/lib/pose/demoPose.ts");
const { analyzePose } = await loadTS("src/lib/pose/poseRules.ts");
const { SessionEngine } = await loadTS("src/lib/pose/sessionEngine.ts");
const engine = new SessionEngine(),
  phase = { current: "up" },
  oldEnds = [],
  newEnds = [];
let stats = old.EMPTY_STATS,
  endDepth = 0;
for (let ms = 0; ms <= 21000; ms += 80) {
  const p = createDemoLandmarks(ms),
    f = old.analyzePose("squat", p, ms);
  const next = old.updateStats(stats, f, old.getRepUpdate(f, phase));
  if (next.reps > stats.reps) {
    oldEnds.push(ms);
    if (f.corrections.some((t) => t.key === "depth")) endDepth++;
  }
  stats = next;
  const before = engine.stats.reps;
  engine.feed(analyzePose("squat", p, ms));
  if (before < engine.stats.reps) newEnds.push(ms);
}
const oldTips = old.buildSetFeedback(stats, "Squat").tips.map((t) => t.key);
console.log(
  JSON.stringify(
    { synthetic: true, oldEnds, newEnds, endDepth, oldTips, newReview: engine.stats.review },
    null,
    2,
  ),
);
assert.equal(oldEnds.length, 8);
assert.equal(newEnds.length, 8);
assert.equal(endDepth, 8);
assert.ok(oldTips.includes("depth"));
assert.deepEqual(engine.stats.review.tips, []);
