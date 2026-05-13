import { useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

const WASM_ASSET_PATH = "/vendor/mediapipe";
const MODEL_ASSET_PATH = "/models/pose_landmarker_lite.task";
const DETECTION_INTERVAL_MS = 80;

type PoseStatus = "idle" | "loading" | "ready" | "running" | "error";

interface PoseState {
  status: PoseStatus;
  error: string | null;
  landmarks: NormalizedLandmark[];
}

interface PoseOptions {
  enabled: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
}

/** Runs local MediaPipe pose inference against the active video element. */
export function usePoseLandmarker({ enabled, videoRef }: PoseOptions): PoseState {
  const [state, setState] = useState<PoseState>({ status: "idle", error: null, landmarks: [] });
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastDetectionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      stopLoop(frameRef);
      setState((current) => ({ ...current, status: "idle", landmarks: [] }));
      return;
    }

    async function start(): Promise<void> {
      try {
        setState((current) => ({ ...current, status: "loading", error: null }));
        landmarkerRef.current ??= await createPoseLandmarker();

        if (!cancelled) {
          setState((current) => ({ ...current, status: "running" }));
          frameRef.current = window.requestAnimationFrame(loop);
        }
      } catch (error) {
        setState({ status: "error", error: getPoseErrorMessage(error), landmarks: [] });
      }
    }

    const loop = (time: number): void => {
      detectFrame(time, videoRef.current, landmarkerRef.current, setState, lastDetectionRef);
      frameRef.current = window.requestAnimationFrame(loop);
    };

    void start();

    return () => {
      cancelled = true;
      stopLoop(frameRef);
    };
  }, [enabled, videoRef]);

  return state;
}

async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_ASSET_PATH);

  try {
    return await createWithDelegate(fileset, "GPU");
  } catch {
    return createWithDelegate(fileset, "CPU");
  }
}

async function createWithDelegate(fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: "GPU" | "CPU") {
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: MODEL_ASSET_PATH,
      delegate,
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.55,
    minPosePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  });
}

function detectFrame(
  time: number,
  video: HTMLVideoElement | null,
  landmarker: PoseLandmarker | null,
  setState: Dispatch<SetStateAction<PoseState>>,
  lastDetectionRef: MutableRefObject<number>,
): void {
  if (!video || !landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  if (time - lastDetectionRef.current < DETECTION_INTERVAL_MS) {
    return;
  }

  lastDetectionRef.current = time;
  const result = landmarker.detectForVideo(video, time);
  setState(getPoseState(result));
}

function getPoseState(result: PoseLandmarkerResult): PoseState {
  return {
    status: "running",
    error: null,
    landmarks: result.landmarks[0] ?? [],
  };
}

function stopLoop(frameRef: MutableRefObject<number | null>): void {
  if (frameRef.current !== null) {
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }
}

function getPoseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Pose-analyse kon niet worden gestart.";
}
