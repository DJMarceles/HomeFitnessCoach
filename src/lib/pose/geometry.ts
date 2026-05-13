import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface Point2D {
  x: number;
  y: number;
}

export const MIN_LANDMARK_VISIBILITY = 0.48;

/** Clamps a number between a minimum and maximum value. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Returns the average visibility for a set of landmark indexes. */
export function averageVisibility(landmarks: NormalizedLandmark[], indexes: number[]): number {
  if (indexes.length === 0) {
    return 0;
  }

  const total = indexes.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 0), 0);
  return total / indexes.length;
}

/** Calculates the angle in degrees at the middle point. */
export function angleAtPoint(a: Point2D, middle: Point2D, c: Point2D): number {
  const ab = { x: a.x - middle.x, y: a.y - middle.y };
  const cb = { x: c.x - middle.x, y: c.y - middle.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const abLength = Math.hypot(ab.x, ab.y);
  const cbLength = Math.hypot(cb.x, cb.y);

  if (abLength === 0 || cbLength === 0) {
    return 180;
  }

  const cosine = clamp(dot / (abLength * cbLength), -1, 1);
  return (Math.acos(cosine) * 180) / Math.PI;
}

/** Calculates how many degrees a segment leans away from the vertical axis. */
export function angleFromVertical(a: Point2D, b: Point2D): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

/** Returns the midpoint between two normalized landmarks. */
export function midpoint(a: Point2D, b: Point2D): Point2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

/** Rounds a metric for stable display and comparisons. */
export function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}
