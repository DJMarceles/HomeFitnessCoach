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
  framingHint?: string;
  assessable?: boolean;
  holding?: boolean;
  endpointKey?: CorrectionKey;
  inverted?: boolean;
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
  reps: number;
  heldSeconds: number;
  review: { units: number; assessed: number; tips: Correction[] } | null;
}

export const EMPTY_STATS: SessionStats = {
  startedAt: null,
  elapsedSeconds: 0,
  reps: 0,
  heldSeconds: 0,
  review: null,
};
