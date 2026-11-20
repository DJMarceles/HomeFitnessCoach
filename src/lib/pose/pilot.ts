import type { NormalizedLandmark as Point } from "@mediapipe/tasks-vision";
import { angleAtPoint, angleFromVertical } from "./geometry";
import type { Correction, CorrectionKey, ExerciseId, PoseAnalysis } from "./poseTypes";

export const isHold = (id: ExerciseId) => ["plank", "side-plank", "wall-sit"].includes(id);
export const isPilot = (id: ExerciseId) =>
  ["squat", "reverse-lunge", "pushup", "glute-bridge", "plank"].includes(id);
export const hasSpecificRules = (id: ExerciseId) =>
  isPilot(id) || isHold(id) || ["split-squat", "knee-pushup"].includes(id);
const joints = { schouder: 11, elleboog: 13, pols: 15, heup: 23, knie: 25, enkel: 27 };
type Joint = keyof typeof joints;
const visible = (p?: Point) =>
  !!p && p.visibility >= 0.5 && p.x > 0.015 && p.x < 0.985 && p.y > 0.015 && p.y < 0.985;

function hint(id: ExerciseId, points: Point[], timestamp: number, message: string): PoseAnalysis {
  return {
    exerciseId: id,
    timestamp,
    landmarks: points,
    confidence: 0,
    corrections: [],
    metrics: {},
    score: 0,
    level: "idle",
    framingHint: message,
  };
}

// Use one complete visible limb chain; never average a hidden far knee into a side view.
export function pilotPose(
  id: ExerciseId,
  points: Point[],
  time: number,
  aspect: number,
  world?: Point[],
): PoseAnalysis {
  const blocked = (message: string) => hint(id, points, time, message);
  if (!points.length) return blocked("Stap in beeld.");
  const push = id === "pushup" || id === "knee-pushup";
  const plank = id === "plank" || id === "side-plank";
  const bridge = id === "glute-bridge";
  const required: Joint[] = ["schouder", "heup", "knie"];
  if (id !== "knee-pushup") required.push("enkel");
  if (push || plank) required.push("elleboog", ...(push ? ["pols" as const] : []));
  const quality = (side: number) =>
    required.reduce((n, j) => n + Number(visible(points[joints[j] + side])), 0);
  let side = quality(1) > quality(0) ? 1 : 0;
  if (id === "side-plank" && quality(0) === required.length && quality(1) === required.length) {
    side = points[12].y > points[11].y ? 1 : 0;
  }
  const missing = required.find((j) => !visible(points[joints[j] + side]));
  if (missing) return blocked(`Breng je ${missing} aan de camerakant in beeld.`);
  const coord = (i: number) => ({ x: points[i].x * aspect, y: points[i].y });
  const joint = (j: Joint) => coord(joints[j] + side);
  const angle = (a: Joint, b: Joint, c: Joint, which = side) => {
    const ids = [a, b, c].map((j) => joints[j] + which);
    if (!world) return angleAtPoint(coord(ids[0]), coord(ids[1]), coord(ids[2]));
    const [p, q, r] = ids.map((i) => world[i]);
    const u = [p.x - q.x, p.y - q.y, p.z - q.z],
      v = [r.x - q.x, r.y - q.y, r.z - q.z];
    const dot = u.reduce((sum, value, i) => sum + value * v[i], 0);
    return (
      (Math.acos(Math.max(-1, Math.min(1, dot / (Math.hypot(...u) * Math.hypot(...v))))) * 180) / Math.PI
    );
  };
  if (world && (world.length < 29 || world.some((p) => ![p.x, p.y, p.z].every(Number.isFinite))))
    return blocked("Geen bruikbare 3D-meting.");
  const [s, h, k] = [joint("schouder"), joint("heup"), joint("knie")];
  const torso = Math.hypot(s.x - h.x, s.y - h.y);
  if (torso < 0.06) return blocked("Zet de camera dichterbij.");
  const other = points[joints.schouder + 1 - side];
  const span = visible(other) ? Math.abs(other.x * aspect - s.x) / torso : null;
  const sideView = span !== null && span < 0.48;
  const kneeSupport = id === "knee-pushup";
  const foot = kneeSupport ? k : joint("enkel");
  const knee = kneeSupport ? 0 : angle("heup", "knie", "enkel");
  const line = angle("schouder", "heup", kneeSupport ? "knie" : "enkel");
  const tilt = angleFromVertical(s, h);
  const corrections: Correction[] = [];
  const tip = (key: CorrectionKey, label: string, detail: string) =>
    corrections.push({ key, label, detail, level: "warning", voice: detail, penalty: 1 });
  const base: PoseAnalysis = {
    exerciseId: id,
    timestamp: time,
    landmarks: points,
    confidence: 1,
    corrections,
    metrics: {},
    level: "good",
    score: 100,
    assessable: sideView,
  };
  if (!plank && span !== null && span > 0.75) return blocked("Zet de camera naast je voor zijaanzicht.");
  if (plank) {
    const elbow = joint("elleboog");
    const stacked = visible(other) && Math.abs(other.y - s.y) > torso * 0.22;
    base.holding =
      tilt >= 55 && line > 125 && elbow.y > s.y + torso * 0.12 && (id === "side-plank" ? stacked : !stacked);
    base.assessable = id === "side-plank" ? stacked : sideView;
    if (line < 158) tip("hip-line", "Heupen in lijn", "Breng je heupen in lijn met je schouders en voeten.");
    if (Math.abs(s.x - elbow.x) > torso * 0.35)
      tip("shoulder-stack", "Steun onder je schouder", "Plaats je steunelleboog onder je schouder.");
  } else if (id === "wall-sit") {
    base.holding = tilt < 32 && knee >= 65 && knee <= 120 && foot.y > k.y && h.y > s.y;
    if (knee > 105) tip("depth", "Zithoogte", "Probeer iets lager te zitten als dat comfortabel voelt.");
  } else if (bridge) {
    if (s.y < h.y - torso * 0.25 || k.y >= foot.y || s.y < k.y)
      return blocked("Ga op je rug liggen, met je voeten en schouders in beeld.");
    const value = angle("schouder", "heup", "knie");
    base.repSignal = { value, downThreshold: 150, upThreshold: 135, label: "Heupstrekking" };
    base.inverted = true;
    base.endpointKey = "hip-line";
    if (value < 160)
      tip("hip-line", "Heupstrekking", "Breng bovenin je heupen rustig in lijn met schouders en knieën.");
  } else if (push) {
    if (tilt < 48 || joint("pols").y <= s.y) return blocked("Neem je opdrukpositie in, dwars op de camera.");
    const value = angle("schouder", "elleboog", "pols");
    base.repSignal = { value, downThreshold: 140, upThreshold: 155, label: "Ellebooghoek" };
    base.endpointKey = "depth";
    if (value > 112)
      tip("depth", "Opdrukdiepte", "Zak de volgende set iets verder, binnen een comfortabele beweging.");
    if (line < 155) tip("hip-line", "Lichaamslijn", "Laat schouders en heupen samen zakken en omhoogkomen.");
  } else {
    if (tilt > 65 || foot.y <= k.y || h.y <= s.y) return blocked("Ga staan met je zijkant naar de camera.");
    // For lunges the nearer leg may be the stationary or stepping leg. Only use a second complete chain.
    const far = 1 - side;
    const secondKnee = [23, 25, 27].every((i) => visible(points[i + far]))
      ? angle("heup", "knie", "enkel", far)
      : knee;
    const value = id === "squat" ? knee : Math.min(knee, secondKnee);
    base.repSignal = { value, downThreshold: 140, upThreshold: 156, label: "Kniehoek" };
    base.endpointKey = "depth";
    if (value > 115)
      tip(
        "depth",
        "Bewegingsdiepte",
        "Probeer de volgende set iets dieper te zakken zolang dat comfortabel voelt.",
      );
    if (tilt > 48) tip("back-neutral", "Rompcontrole", "Houd je romp tijdens het zakken stabiel.");
  }
  if (!base.assessable) base.corrections = [];
  if (isHold(id) && !base.holding)
    base.framingHint =
      id === "wall-sit"
        ? "Neem je zitpositie tegen de muur in."
        : id === "side-plank"
          ? "Neem je zijplank in, met je steunelleboog in beeld."
          : "Neem je plankpositie op je onderarmen in.";
  return base;
}
