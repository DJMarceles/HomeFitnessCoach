import test from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../validation/report.mjs";
const s = {
  code: "sample",
  person: "p1",
  exercise: "squat",
  split: "test",
  assessable: true,
  endsMs: [900, 1800, 2700, 3600, 4500, 5400, 6300, 7200],
  heldSeconds: 0,
  tips: ["depth"],
  negativeWindowsMs: [[0, 500]],
};
const report = {
  schema: 1,
  code: s.code,
  exercise: s.exercise,
  sdk: "0.10.35",
  model: "Lite",
  rows: [
    { rules: "2D", endsMs: [100, ...s.endsMs], review: true, heldSeconds: 0, tips: ["depth", "hip-line"] },
  ],
};
test("report distinguishes missing sets, overcount, precision, recall, and phantom reps", () => {
  const [r] = evaluate([s, { ...s, code: "missing" }], [report]);
  assert.equal(r.missing, 1);
  assert.equal(r.phantom, 1);
  assert.equal(r.exact, 0);
  assert.equal(r.withinOne, 1);
  assert.equal(r.tipPrecision, 0.5);
  assert.equal(r.tipRecall, 1);
});
test("reports reject duplicate sets, duplicate results and test-person leakage", () => {
  assert.throws(() => evaluate([s, s], [report]));
  assert.throws(() => evaluate([s], [report, report]));
  assert.throws(() => evaluate([s, { ...s, code: "other", split: "tuning" }], [report]));
});
