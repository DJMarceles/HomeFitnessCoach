import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type ExerciseId =
  | "squat"
  | "reverse-lunge"
  | "forward-lunge"
  | "split-squat"
  | "glute-bridge"
  | "hip-thrust"
  | "calf-raise"
  | "wall-sit"
  | "step-up"
  | "pushup"
  | "knee-pushup"
  | "triceps-dip"
  | "plank"
  | "side-plank"
  | "shoulder-tap"
  | "mountain-climber"
  | "burpee"
  | "jumping-jack"
  | "high-knees"
  | "crunch"
  | "bicycle-crunch"
  | "russian-twist"
  | "dead-bug"
  | "bird-dog"
  | "superman";
export type ExerciseProfile =
  | "squat"
  | "lunge"
  | "hinge"
  | "pushup"
  | "dip"
  | "plank"
  | "bridge"
  | "core"
  | "cardio"
  | "balance";
export type FeedbackLevel = "idle" | "good" | "warning" | "danger";
export type CorrectionKey =
  | "back-neutral"
  | "knees-track"
  | "tempo-calm"
  | "hip-line"
  | "shoulder-stack"
  | "depth"
  | "camera";

export interface Correction {
  key: CorrectionKey;
  label: string;
  detail: string;
  voice: string;
  level: Exclude<FeedbackLevel, "idle">;
  penalty: number;
}

export interface RepSignal {
  value: number;
  downThreshold: number;
  upThreshold: number;
  label: string;
}

export interface PoseAnalysis {
  exerciseId: ExerciseId;
  level: FeedbackLevel;
  score: number;
  confidence: number;
  corrections: Correction[];
  landmarks: NormalizedLandmark[];
  metrics: Record<string, number>;
  repSignal?: RepSignal;
  timestamp: number;
}

export interface SessionStats {
  startedAt: number | null;
  elapsedSeconds: number;
  frames: number;
  alignedFrames: number;
  reps: number;
  correctionCounts: Record<CorrectionKey, number>;
}

export const EMPTY_STATS: SessionStats = {
  startedAt: null,
  elapsedSeconds: 0,
  frames: 0,
  alignedFrames: 0,
  reps: 0,
  correctionCounts: {
    "back-neutral": 0,
    "knees-track": 0,
    "tempo-calm": 0,
    "hip-line": 0,
    "shoulder-stack": 0,
    depth: 0,
    camera: 0,
  },
};
