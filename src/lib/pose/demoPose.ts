import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

const LANDMARK_COUNT = 33;

/** Creates synthetic pose landmarks for camera-free demo verification. */
export function createDemoLandmarks(timeMs: number): NormalizedLandmark[] {
  const phase = (1 - Math.cos(timeMs / 400)) / 2;
  const hipY = 0.48 + phase * 0.16;
  const kneeY = 0.66 + phase * 0.04;
  const kneeShift = phase * 0.135;
  const shoulderY = 0.26 + phase * 0.08;
  const ankleY = 0.88;
  const landmarks = makeEmptyLandmarks();

  setPair(landmarks, 11, 12, 0.45, 0.48, shoulderY);
  setPair(landmarks, 13, 14, 0.4, 0.6, shoulderY + 0.16);
  setPair(landmarks, 15, 16, 0.37, 0.63, shoulderY + 0.29);
  setPair(landmarks, 23, 24, 0.45, 0.48, hipY);
  setPair(landmarks, 25, 26, 0.45 + kneeShift, 0.48 + kneeShift, kneeY);
  setPair(landmarks, 27, 28, 0.45, 0.48, ankleY);
  return landmarks;
}

function makeEmptyLandmarks(): NormalizedLandmark[] {
  return Array.from({ length: LANDMARK_COUNT }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.12,
  }));
}

function setPair(
  landmarks: NormalizedLandmark[],
  leftIndex: number,
  rightIndex: number,
  leftX: number,
  rightX: number,
  y: number,
): void {
  landmarks[leftIndex] = { x: leftX, y, z: 0, visibility: 0.96 };
  landmarks[rightIndex] = { x: rightX, y, z: 0, visibility: 0.96 };
}
