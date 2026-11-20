import { useEffect, useState, type RefObject } from "react";
import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";

interface PoseState {
  status: "idle" | "loading" | "running" | "error";
  error: string | null;
  landmarks: NormalizedLandmark[];
  timestamp: number;
  aspect: number;
}
const empty: PoseState = { status: "idle", error: null, landmarks: [], timestamp: 0, aspect: 1 };

export function usePoseLandmarker({
  enabled,
  videoRef,
}: {
  enabled: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const [state, setState] = useState(empty);
  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) {
      setState(empty);
      return;
    }
    let disposed = false;
    let model: PoseLandmarker | undefined;
    let id = 0;
    let lastMedia = -1;
    let lastInference = -Infinity;
    const perFrame = typeof video.requestVideoFrameCallback === "function";
    const schedule = () => {
      id = perFrame
        ? video.requestVideoFrameCallback((t, meta) => loop(t, meta.mediaTime))
        : requestAnimationFrame((t) => loop(t, video.currentTime));
    };
    const fail = (e: unknown) => {
      if (!disposed)
        setState({
          ...empty,
          status: "error",
          error: e instanceof Error ? e.message : "Analyse niet beschikbaar.",
        });
    };
    const loop = (t: number, mediaTime: number) => {
      if (disposed || !model) return;
      try {
        if (
          video.readyState >= 2 &&
          video.videoHeight &&
          mediaTime !== lastMedia &&
          t - lastInference >= 65
        ) {
          const result = model.detectForVideo(video, t);
          lastMedia = mediaTime;
          lastInference = t;
          setState({
            status: "running",
            error: null,
            landmarks: result.landmarks[0] ?? [],
            timestamp: t,
            aspect: video.videoWidth / video.videoHeight,
          });
        }
        schedule();
      } catch (e) {
        fail(e);
      }
    };
    setState({ ...empty, status: "loading" });
    void (async () => {
      const files = await FilesetResolver.forVisionTasks("/vendor/mediapipe");
      if (disposed) return;
      const create = (delegate: "GPU" | "CPU") =>
        PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: "/models/pose_landmarker_full.task", delegate },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.55,
          minPosePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
      model = await create("GPU").catch(() => create("CPU"));
      if (disposed) {
        model.close();
        return;
      }
      schedule();
    })().catch(fail);
    return () => {
      disposed = true;
      if (perFrame) video.cancelVideoFrameCallback(id);
      else cancelAnimationFrame(id);
      model?.close();
    };
  }, [enabled, videoRef]);
  return state;
}
