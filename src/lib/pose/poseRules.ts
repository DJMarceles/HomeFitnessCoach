import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { getExerciseById } from "../../data/exercises";
import { hasSpecificRules, pilotPose } from "./pilot";
import type { Correction, ExerciseId, FeedbackLevel, PoseAnalysis } from "./poseTypes";
import { angleAtPoint, angleFromVertical, averageVisibility, clamp, midpoint, roundMetric } from "./geometry";

const LANDMARK = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

const CORE_POINTS = [
  LANDMARK.leftShoulder,
  LANDMARK.rightShoulder,
  LANDMARK.leftHip,
  LANDMARK.rightHip,
  LANDMARK.leftKnee,
  LANDMARK.rightKnee,
  LANDMARK.leftAnkle,
  LANDMARK.rightAnkle,
];

const GOOD_CORRECTION: Correction = {
  key: "tempo-calm",
  label: "Tempo rustig",
  detail: "Je houding is stabiel genoeg om gecontroleerd door te bewegen.",
  voice: "Goed zo. Houd dit rustige tempo vast.",
  level: "good",
  penalty: 0,
};

interface ExerciseRuleAnalysis {
  corrections: Correction[];
  metrics: Record<string, number>;
  repSignal?: PoseAnalysis["repSignal"];
}

/** Converts pose landmarks into posture feedback for the selected exercise. */
export function analyzePose(
  exerciseId: ExerciseId,
  landmarks: NormalizedLandmark[],
  timestamp = performance.now(),
  aspect = 1,
): PoseAnalysis {
  if (hasSpecificRules(exerciseId)) return pilotPose(exerciseId, landmarks, timestamp, aspect);
  const confidence = averageVisibility(landmarks, CORE_POINTS);

  if (confidence < 0.45 || landmarks.length < 29) {
    return createCameraAnalysis(exerciseId, landmarks, confidence, timestamp);
  }

  const profile = getExerciseById(exerciseId).profile;
  const pairs: [number, string][] = [[11,"schouders"],[23,"heupen"],[25,"knieën"],[27,"enkels"]];
  if (["plank","dip","pushup","cardio"].includes(profile)) pairs.push([15,"polsen"]);
  if (["dip","pushup"].includes(profile)) pairs.push([13,"ellebogen"]);
  for (const [i,name] of pairs) {
    if (![landmarks[i],landmarks[i+1]].every(p => p && p.visibility >= 0.48 && p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1)) {
      return { ...createCameraAnalysis(exerciseId, landmarks, confidence, timestamp), framingHint: `Breng je ${name} in beeld.` };
    }
  }
  const analysis = getExerciseAnalysis(exerciseId, landmarks.map(p => ({ ...p, x: p.x * aspect })));
  const score = scoreCorrections(analysis.corrections, confidence);

  return {
    exerciseId,
    level: getLevel(score, analysis.corrections),
    score,
    confidence,
    landmarks,
    metrics: analysis.metrics,
    corrections: analysis.corrections.length > 0 ? analysis.corrections : [GOOD_CORRECTION],
    repSignal: analysis.repSignal,
    assessable: false,
    timestamp,
  };
}

function createCameraAnalysis(
  exerciseId: ExerciseId,
  landmarks: NormalizedLandmark[],
  confidence: number,
  timestamp: number,
): PoseAnalysis {
  return {
    exerciseId,
    level: "idle",
    score: 0,
    confidence,
    landmarks,
    metrics: {},
    timestamp,
    corrections: [
      {
        key: "camera",
        label: "Camera lokaal",
        detail: "Zet je hele lichaam in beeld zodat de analyse betrouwbaar wordt.",
        voice: "Zet je hele lichaam in beeld.",
        level: "warning",
        penalty: 28,
      },
    ],
  };
}

function getExerciseAnalysis(exerciseId: ExerciseId, landmarks: NormalizedLandmark[]): ExerciseRuleAnalysis {
  const profile = getExerciseById(exerciseId).profile;

  if (profile === "pushup") {
    return analyzePushup(landmarks, exerciseId);
  }

  if (profile === "plank") {
    return analyzePlank(landmarks, exerciseId);
  }

  if (profile === "lunge") {
    return analyzeLunge(landmarks);
  }

  if (profile === "bridge") {
    return analyzeBridge(landmarks);
  }

  if (profile === "hinge") {
    return analyzeHinge(landmarks);
  }

  if (profile === "dip") {
    return analyzeDip(landmarks);
  }

  if (profile === "cardio") {
    return analyzeCardio(landmarks);
  }

  if (profile === "core") {
    return analyzeCore(landmarks);
  }

  if (profile === "balance") {
    return analyzeBalance(landmarks, exerciseId);
  }

  return analyzeSquat(landmarks);
}

function analyzeSquat(landmarks: NormalizedLandmark[]) {
  const leftKnee = angleAtPoint(landmarks[23], landmarks[25], landmarks[27]);
  const rightKnee = angleAtPoint(landmarks[24], landmarks[26], landmarks[28]);
  const kneeAngle = (leftKnee + rightKnee) / 2;
  const hip = midpoint(landmarks[23], landmarks[24]);
  const shoulder = midpoint(landmarks[11], landmarks[12]);
  const torsoLean = angleFromVertical(shoulder, hip);
  const kneeDrift = getKneeDrift(landmarks);
  const corrections = getSquatCorrections(kneeAngle, torsoLean, kneeDrift);

  return {
    corrections,
    metrics: {
      "Kniehoek": roundMetric(kneeAngle),
      "Rughoek": roundMetric(torsoLean),
      "Knie-spoor": roundMetric(kneeDrift * 100),
    },
    repSignal: {
      value: kneeAngle,
      downThreshold: 105,
      upThreshold: 150,
      label: "Squat reps",
    },
  };
}

function analyzePushup(landmarks: NormalizedLandmark[], exerciseId: ExerciseId) {
  const bodyLine = getBodyLineAngle(landmarks);
  const elbowAngle = getAverageElbowAngle(landmarks);
  const shoulderStack = Math.abs(landmarks[11].x - landmarks[15].x) * 100;
  const corrections = getPushupCorrections(bodyLine, elbowAngle, shoulderStack);
  const repSignal =
    exerciseId === "mountain-climber"
      ? { value: getKneeDriveSignal(landmarks), downThreshold: 16, upThreshold: 28, label: "Mountain climber reps" }
      : { value: elbowAngle, downThreshold: 95, upThreshold: 150, label: "Push-up reps" };

  return {
    corrections,
    metrics: {
      "Lichaamslijn": roundMetric(bodyLine),
      "Ellebooghoek": roundMetric(elbowAngle),
      "Schouderlijn": roundMetric(shoulderStack),
    },
    repSignal,
  };
}

function analyzePlank(landmarks: NormalizedLandmark[], exerciseId: ExerciseId) {
  const bodyLine = getBodyLineAngle(landmarks);
  const shoulderElbowOffset = Math.abs(landmarks[11].x - landmarks[13].x) * 100;
  const hipDrop = Math.abs(midpoint(landmarks[23], landmarks[24]).y - midpoint(landmarks[11], landmarks[12]).y);
  const tapSignal = getShoulderTapSignal(landmarks);
  const corrections = getPlankCorrections(bodyLine, shoulderElbowOffset, hipDrop);

  return {
    corrections,
    metrics: {
      "Lichaamslijn": roundMetric(bodyLine),
      "Schouder-stack": roundMetric(shoulderElbowOffset),
      "Heuphoogte": roundMetric(hipDrop * 100),
    },
    repSignal:
      exerciseId === "shoulder-tap"
        ? { value: tapSignal, downThreshold: 8, upThreshold: 18, label: "Shoulder tap reps" }
        : undefined,
  };
}

function analyzeLunge(landmarks: NormalizedLandmark[]) {
  const kneeAngle = Math.min(
    angleAtPoint(landmarks[23], landmarks[25], landmarks[27]),
    angleAtPoint(landmarks[24], landmarks[26], landmarks[28]),
  );
  const torsoLean = angleFromVertical(midpoint(landmarks[11], landmarks[12]), midpoint(landmarks[23], landmarks[24]));
  const kneeDrift = getKneeDrift(landmarks);

  return {
    corrections: getLungeCorrections(kneeAngle, torsoLean, kneeDrift),
    metrics: {
      "Voorste knie": roundMetric(kneeAngle),
      "Romphoek": roundMetric(torsoLean),
      "Knie-spoor": roundMetric(kneeDrift * 100),
    },
    repSignal: { value: kneeAngle, downThreshold: 105, upThreshold: 145, label: "Lunge reps" },
  };
}

function analyzeBridge(landmarks: NormalizedLandmark[]) {
  const bridgeLine = angleAtPoint(midpoint(landmarks[11], landmarks[12]), midpoint(landmarks[23], landmarks[24]), midpoint(landmarks[25], landmarks[26]));
  const kneeDrift = getKneeDrift(landmarks);

  return {
    corrections: getBridgeCorrections(bridgeLine, kneeDrift),
    metrics: {
      "Heuplijn": roundMetric(bridgeLine),
      "Knie-spoor": roundMetric(kneeDrift * 100),
    },
    repSignal: { value: bridgeLine, downThreshold: 142, upThreshold: 165, label: "Bridge reps" },
  };
}

function analyzeHinge(landmarks: NormalizedLandmark[]) {
  const hipAngle = angleAtPoint(midpoint(landmarks[11], landmarks[12]), midpoint(landmarks[23], landmarks[24]), midpoint(landmarks[25], landmarks[26]));
  const torsoLean = angleFromVertical(midpoint(landmarks[11], landmarks[12]), midpoint(landmarks[23], landmarks[24]));

  return {
    corrections: getHingeCorrections(hipAngle, torsoLean),
    metrics: {
      "Heuphoek": roundMetric(hipAngle),
      "Romphoek": roundMetric(torsoLean),
    },
    repSignal: { value: hipAngle, downThreshold: 145, upThreshold: 165, label: "Hinge reps" },
  };
}

function analyzeDip(landmarks: NormalizedLandmark[]) {
  const elbowAngle = getAverageElbowAngle(landmarks);
  const bodyLine = getBodyLineAngle(landmarks);

  return {
    corrections: getDipCorrections(elbowAngle, bodyLine),
    metrics: {
      "Ellebooghoek": roundMetric(elbowAngle),
      "Romplijn": roundMetric(bodyLine),
    },
    repSignal: { value: elbowAngle, downThreshold: 100, upThreshold: 150, label: "Dip reps" },
  };
}

function analyzeCardio(landmarks: NormalizedLandmark[]) {
  const shoulderLevel = Math.abs(landmarks[11].y - landmarks[12].y) * 100;
  const hipLevel = Math.abs(landmarks[23].y - landmarks[24].y) * 100;
  const kneeLevel = Math.abs(landmarks[25].y - landmarks[26].y) * 100;
  const cycleSignal = getCardioCycleSignal(landmarks, kneeLevel);

  return {
    corrections: getStabilityCorrections(shoulderLevel, hipLevel),
    metrics: {
      "Schouderbalans": roundMetric(shoulderLevel),
      "Heupbalans": roundMetric(hipLevel),
      "Rep-signaal": roundMetric(cycleSignal),
    },
    repSignal: { value: cycleSignal, downThreshold: 8, upThreshold: 20, label: "Cardio reps" },
  };
}

function analyzeCore(landmarks: NormalizedLandmark[]) {
  const bodyLine = getBodyLineAngle(landmarks);
  const shoulderLevel = Math.abs(landmarks[11].y - landmarks[12].y) * 100;
  const hipLevel = Math.abs(landmarks[23].y - landmarks[24].y) * 100;

  return {
    corrections: getBalanceCorrections(bodyLine, shoulderLevel, hipLevel),
    metrics: {
      "Lichaamslijn": roundMetric(bodyLine),
      "Schouders": roundMetric(shoulderLevel),
      "Heupen": roundMetric(hipLevel),
    },
    repSignal: { value: bodyLine, downThreshold: 145, upThreshold: 165, label: "Core reps" },
  };
}

function analyzeBalance(landmarks: NormalizedLandmark[], exerciseId: ExerciseId) {
  const bodyLine = getBodyLineAngle(landmarks);
  const shoulderLevel = Math.abs(landmarks[11].y - landmarks[12].y) * 100;
  const hipLevel = Math.abs(landmarks[23].y - landmarks[24].y) * 100;
  const verticalLift = getVerticalLiftSignal(landmarks);
  const repSignal =
    exerciseId === "calf-raise"
      ? { value: verticalLift, downThreshold: 54, upThreshold: 58, label: "Calf raise reps" }
      : { value: bodyLine, downThreshold: 145, upThreshold: 165, label: "Balance reps" };

  return {
    corrections: getBalanceCorrections(bodyLine, shoulderLevel, hipLevel),
    metrics: {
      "Lichaamslijn": roundMetric(bodyLine),
      "Schouders": roundMetric(shoulderLevel),
      "Heupen": roundMetric(hipLevel),
    },
    repSignal,
  };
}

function getKneeDrift(landmarks: NormalizedLandmark[]): number {
  const left = Math.abs(landmarks[25].x - landmarks[27].x);
  const right = Math.abs(landmarks[26].x - landmarks[28].x);
  return (left + right) / 2;
}

function getBodyLineAngle(landmarks: NormalizedLandmark[]): number {
  const shoulder = midpoint(landmarks[11], landmarks[12]);
  const hip = midpoint(landmarks[23], landmarks[24]);
  const ankle = midpoint(landmarks[27], landmarks[28]);
  return angleAtPoint(shoulder, hip, ankle);
}

function getAverageElbowAngle(landmarks: NormalizedLandmark[]): number {
  const left = angleAtPoint(landmarks[11], landmarks[13], landmarks[15]);
  const right = angleAtPoint(landmarks[12], landmarks[14], landmarks[16]);
  return (left + right) / 2;
}

function getCardioCycleSignal(landmarks: NormalizedLandmark[], kneeLevel: number): number {
  const ankleSpread = Math.abs(landmarks[27].x - landmarks[28].x) * 100;
  const wristSpread = Math.abs(landmarks[15].x - landmarks[16].x) * 100;
  return Math.max(kneeLevel, Math.max(0, ankleSpread - 24) + Math.max(0, wristSpread - 28) * 0.6);
}

function getShoulderTapSignal(landmarks: NormalizedLandmark[]): number {
  const wristLevel = Math.abs(landmarks[15].y - landmarks[16].y) * 100;
  const shoulderLevel = Math.abs(landmarks[11].y - landmarks[12].y) * 100;
  return wristLevel + shoulderLevel;
}

function getKneeDriveSignal(landmarks: NormalizedLandmark[]): number {
  const leftGap = Math.abs(landmarks[25].y - landmarks[23].y) * 100;
  const rightGap = Math.abs(landmarks[26].y - landmarks[24].y) * 100;
  return Math.min(leftGap, rightGap);
}

function getVerticalLiftSignal(landmarks: NormalizedLandmark[]): number {
  const shoulder = midpoint(landmarks[11], landmarks[12]);
  const hip = midpoint(landmarks[23], landmarks[24]);
  return 100 - midpoint(shoulder, hip).y * 100;
}

function getSquatCorrections(kneeAngle: number, torsoLean: number, kneeDrift: number): Correction[] {
  return [
    kneeAngle > 138 ? makeCorrection("depth", "Zak iets dieper", "Buig verder tot je controle houdt.", 12) : null,
    torsoLean > 28 ? makeCorrection("back-neutral", "Rug neutraal", "Breng je borst iets omhoog.", 18) : null,
    kneeDrift > 0.09 ? makeCorrection("knees-track", "Knieen volgen tenen", "Duw je knieen in dezelfde lijn als je voeten.", 16) : null,
  ].filter(Boolean) as Correction[];
}

function getPushupCorrections(bodyLine: number, elbowAngle: number, shoulderStack: number): Correction[] {
  return [
    bodyLine < 158 ? makeCorrection("hip-line", "Heupen in lijn", "Span je buik aan en maak je lichaam langer.", 18) : null,
    elbowAngle > 168 ? makeCorrection("depth", "Zak gecontroleerd", "Buig je ellebogen iets verder.", 10) : null,
    shoulderStack > 18 ? makeCorrection("shoulder-stack", "Schouders stabiel", "Plaats je handen onder je schouders.", 14) : null,
  ].filter(Boolean) as Correction[];
}

function getPlankCorrections(bodyLine: number, shoulderElbowOffset: number, hipDrop: number): Correction[] {
  return [
    bodyLine < 162 ? makeCorrection("hip-line", "Heupen in lijn", "Breng je heupen terug naar een rechte lijn.", 20) : null,
    shoulderElbowOffset > 14 ? makeCorrection("shoulder-stack", "Schouders boven ellebogen", "Schuif je schouders boven je ellebogen.", 14) : null,
    hipDrop > 0.24 ? makeCorrection("back-neutral", "Rug neutraal", "Kantel je bekken licht en span je core aan.", 16) : null,
  ].filter(Boolean) as Correction[];
}

function getLungeCorrections(kneeAngle: number, torsoLean: number, kneeDrift: number): Correction[] {
  return [
    kneeAngle > 128 ? makeCorrection("depth", "Zak gecontroleerd", "Buig je voorste knie iets verder.", 10) : null,
    torsoLean > 24 ? makeCorrection("back-neutral", "Romp lang", "Maak je rug langer en kijk vooruit.", 16) : null,
    kneeDrift > 0.1 ? makeCorrection("knees-track", "Knie volgt tenen", "Houd je voorste knie in lijn met je voet.", 16) : null,
  ].filter(Boolean) as Correction[];
}

function getBridgeCorrections(bridgeLine: number, kneeDrift: number): Correction[] {
  return [
    bridgeLine < 158 ? makeCorrection("hip-line", "Heupen hoger", "Duw je heupen omhoog tot schouders, heupen en knieen een lijn maken.", 16) : null,
    kneeDrift > 0.1 ? makeCorrection("knees-track", "Knieen parallel", "Houd je knieen op heupbreedte.", 12) : null,
  ].filter(Boolean) as Correction[];
}

function getHingeCorrections(hipAngle: number, torsoLean: number): Correction[] {
  return [
    hipAngle > 168 ? makeCorrection("depth", "Scharnier vanuit heupen", "Duw je heupen naar achteren zonder je rug te ronden.", 12) : null,
    torsoLean < 10 ? makeCorrection("back-neutral", "Romp actief", "Houd je borst open en je rug lang.", 12) : null,
  ].filter(Boolean) as Correction[];
}

function getDipCorrections(elbowAngle: number, bodyLine: number): Correction[] {
  return [
    elbowAngle > 162 ? makeCorrection("depth", "Buig gecontroleerd", "Laat je ellebogen rustig zakken.", 10) : null,
    bodyLine < 150 ? makeCorrection("shoulder-stack", "Schouders laag", "Houd je borst open en schouders weg van je oren.", 16) : null,
  ].filter(Boolean) as Correction[];
}

function getStabilityCorrections(shoulderLevel: number, hipLevel: number): Correction[] {
  return [
    shoulderLevel > 8 ? makeCorrection("shoulder-stack", "Schouders gelijk", "Houd je schouders stabiel terwijl je beweegt.", 10) : null,
    hipLevel > 8 ? makeCorrection("hip-line", "Heupen stabiel", "Beweeg ritmisch zonder je heupen te laten kantelen.", 12) : null,
  ].filter(Boolean) as Correction[];
}

function getBalanceCorrections(bodyLine: number, shoulderLevel: number, hipLevel: number): Correction[] {
  return [
    bodyLine < 150 ? makeCorrection("hip-line", "Lange lijn", "Maak een lange lijn door je rug en heupen.", 14) : null,
    ...getStabilityCorrections(shoulderLevel, hipLevel),
  ].filter(Boolean) as Correction[];
}

function makeCorrection(key: Correction["key"], label: string, detail: string, penalty: number): Correction {
  return {
    key,
    label,
    detail,
    voice: detail,
    level: penalty >= 18 ? "danger" : "warning",
    penalty,
  };
}

function scoreCorrections(corrections: Correction[], confidence: number): number {
  const penalty = corrections.reduce((total, correction) => total + correction.penalty, 0);
  return Math.round(clamp(100 - penalty - (1 - confidence) * 12, 0, 100));
}

function getLevel(score: number, corrections: Correction[]): FeedbackLevel {
  if (corrections.some((correction) => correction.level === "danger")) {
    return "danger";
  }

  if (score < 82 || corrections.length > 0) {
    return "warning";
  }

  return "good";
}
