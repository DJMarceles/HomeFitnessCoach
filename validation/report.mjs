import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

function check(ok, text) {
  if (!ok) throw Error(text);
}
const listOfTimes = (a) =>
  Array.isArray(a) && a.every((v, i) => Number.isFinite(v) && v >= 0 && (!i || v > a[i - 1]));
const pilot = ["squat", "reverse-lunge", "pushup", "glute-bridge", "plank"];
const keys = ["depth", "hip-line", "shoulder-stack", "back-neutral", "knees-track", "tempo-calm", "camera"];
export function evaluate(labels, reports) {
  check(Array.isArray(labels) && labels.length, "Labels ontbreken.");
  const byCode = new Map(),
    persons = new Map();
  for (const s of labels) {
    check(
      s.code && s.person && !byCode.has(s.code) && pilot.includes(s.exercise),
      "Ongeldige of dubbele setcode.",
    );
    check(
      ["tuning", "test"].includes(s.split) && (!persons.has(s.person) || persons.get(s.person) === s.split),
      "Persoon komt in beide groepen voor.",
    );
    check(
      listOfTimes(s.endsMs) && Number.isFinite(s.heldSeconds) && s.heldSeconds >= 0,
      "Ongeldige tijdlabels.",
    );
    check(
      typeof s.assessable === "boolean" &&
        Array.isArray(s.tips) &&
        s.tips.every((k) => keys.includes(k)) &&
        new Set(s.tips).size === s.tips.length,
      "Trainerlabels ontbreken of zijn dubbel.",
    );
    check(
      Array.isArray(s.negativeWindowsMs) &&
        s.negativeWindowsMs.every((w) => Array.isArray(w) && w.length === 2 && listOfTimes(w)),
      "Ongeldig negatief venster.",
    );
    byCode.set(s.code, s);
    persons.set(s.person, s.split);
  }
  const groups = new Map(),
    seen = new Set();
  for (const r of reports) {
    const s = byCode.get(r.code);
    check(r.schema === 1 && s?.exercise === r.exercise, "Rapport past niet bij de setcode.");
    if (s.split !== "test") continue;
    for (const p of r.rows) {
      check(
        listOfTimes(p.endsMs) && Array.isArray(p.tips) && p.tips.every((k) => keys.includes(k)),
        "Ongeldig meetrapport.",
      );
      const group = [r.exercise, r.sdk, r.model, p.rules].join(" / "),
        key = group + " / " + r.code;
      check(!seen.has(key), "Dubbel meetrapport: " + key);
      seen.add(key);
      const g = groups.get(group) ?? {
        sets: 0,
        exact: 0,
        withinOne: 0,
        maxCountError: 0,
        fullSets: 0,
        fullExact: 0,
        fullMaxError: 0,
        assessable: 0,
        notAssessable: 0,
        incompleteReview: 0,
        shown: 0,
        confirmed: 0,
        expectedVisible: 0,
        recovered: 0,
        phantom: 0,
        holdWithin2s: 0,
        holdMaxErrorSeconds: 0,
      };
      g.sets++;
      const diff = Math.abs(p.endsMs.length - s.endsMs.length);
      if (s.exercise !== "plank" && s.endsMs.length >= 8) {
        g.fullSets++;
        g.fullExact += Number(diff === 0);
        g.fullMaxError = Math.max(g.fullMaxError, diff);
      }
      g.exact += Number(!diff);
      g.withinOne += Number(diff <= 1);
      g.maxCountError = Math.max(g.maxCountError, diff);
      g.assessable += Number(s.assessable);
      g.notAssessable += Number(!s.assessable);
      if ((s.endsMs.length >= 8 || s.heldSeconds >= 20) && !p.review) g.incompleteReview++;
      g.shown += p.tips.length;
      if (s.assessable) {
        const hits = s.tips.filter((k) => p.tips.includes(k)).length;
        g.confirmed += hits;
        g.recovered += hits;
        g.expectedVisible += s.tips.length;
      }
      g.phantom += p.endsMs.filter((t) => s.negativeWindowsMs.some(([a, b]) => a <= t && t <= b)).length;
      if (s.exercise === "plank") {
        const err = Math.abs(p.heldSeconds - Math.min(20, s.heldSeconds));
        g.holdWithin2s += Number(err <= 2);
        g.holdMaxErrorSeconds = Math.max(g.holdMaxErrorSeconds, err);
      }
      groups.set(group, g);
    }
  }
  return [...groups].map(([group, g]) => {
    const exercise = group.split(" / ")[0];
    const expected = labels.filter((s) => s.exercise === exercise && s.split === "test").length;
    return {
      group,
      ...g,
      missing: expected - g.sets,
      exactRate: g.exact / g.sets,
      fullSetExactRate: g.fullSets ? g.fullExact / g.fullSets : null,
      tipPrecision: g.shown ? g.confirmed / g.shown : null,
      tipRecall: g.expectedVisible ? g.recovered / g.expectedVisible : null,
    };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, ...reports] = process.argv.slice(2);
  check(file && reports.length, "Gebruik: npm run pilot:report -- labels.json meetrapport1.json [...]");
  const read = async (f) => JSON.parse(await readFile(f, "utf8"));
  const rows = evaluate(await read(file), await Promise.all(reports.map(read)));
  check(rows.length, "Geen metingen voor de eindtest.");
  console.log(JSON.stringify(rows, null, 2));
}
