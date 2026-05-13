import { RefObject, useCallback, useEffect, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "ready" | "blocked";

export interface CameraZoomState {
  supported: boolean;
  min: number;
  max: number;
  step: number;
  value: number;
  error: string | null;
}

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

interface CameraState {
  status: CameraStatus;
  error: string | null;
  stream: MediaStream | null;
  zoom: CameraZoomState;
  setZoom: (value: number) => Promise<void>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

const DEFAULT_ZOOM: CameraZoomState = {
  supported: false,
  min: 1,
  max: 1,
  step: 0.1,
  value: 1,
  error: null,
};

/** Manages camera permission, stream lifecycle, and video element binding. */
export function useCamera(videoRef: RefObject<HTMLVideoElement | null>): CameraState {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [zoom, setZoomState] = useState<CameraZoomState>(DEFAULT_ZOOM);

  const stopCamera = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("idle");
    setZoomState(DEFAULT_ZOOM);
  }, [videoRef]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("blocked");
      setError("Deze browser ondersteunt geen camera-toegang.");
      return;
    }

    setStatus("requesting");
    setError(null);

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      setStream(nextStream);
      setZoomState(getZoomState(nextStream));
      setStatus("ready");
    } catch (caughtError) {
      setStatus("blocked");
      setError(getCameraErrorMessage(caughtError));
    }
  }, []);

  const setZoom = useCallback(
    async (value: number) => {
      const track = stream?.getVideoTracks()[0];

      if (!track || !zoom.supported) {
        setZoomState((current) => ({ ...current, error: "Deze camera ondersteunt geen browser-zoom." }));
        return;
      }

      const nextValue = clampZoom(value, zoom);

      try {
        await applyTrackZoom(track, nextValue);
        setZoomState((current) => ({ ...current, value: nextValue, error: null }));
      } catch (caughtError) {
        setZoomState((current) => ({ ...current, error: getCameraErrorMessage(caughtError) }));
      }
    },
    [stream, zoom],
  );

  useEffect(() => {
    if (!videoRef.current || !stream) {
      return;
    }

    videoRef.current.srcObject = stream;
    void videoRef.current.play();
  }, [stream, videoRef]);

  useEffect(() => stopCamera, [stopCamera]);

  return { status, error, stream, zoom, setZoom, startCamera, stopCamera };
}

function getZoomState(stream: MediaStream): CameraZoomState {
  const track = stream.getVideoTracks()[0];
  const capabilities = track?.getCapabilities?.() as ZoomCapabilities | undefined;
  const settings = track?.getSettings?.() as ZoomSettings | undefined;
  const zoomCapability = capabilities?.zoom;

  if (!zoomCapability) {
    return DEFAULT_ZOOM;
  }

  return {
    supported: true,
    min: zoomCapability.min,
    max: zoomCapability.max,
    step: zoomCapability.step || 0.1,
    value: settings?.zoom ?? zoomCapability.min,
    error: null,
  };
}

function clampZoom(value: number, zoom: CameraZoomState): number {
  return Math.min(Math.max(value, zoom.min), zoom.max);
}

function applyTrackZoom(track: MediaStreamTrack, zoom: number): Promise<void> {
  return track.applyConstraints({ advanced: [{ zoom }] } as ZoomConstraints);
}

interface ZoomCapabilities extends MediaTrackCapabilities {
  zoom?: {
    max: number;
    min: number;
    step?: number;
  };
}

interface ZoomSettings extends MediaTrackSettings {
  zoom?: number;
}

interface ZoomConstraints extends MediaTrackConstraints {
  advanced: Array<MediaTrackConstraintSet & { zoom: number }>;
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Camera-toegang is geweigerd. Zet toestemming aan om live analyse te gebruiken.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Camera kon niet worden gestart.";
}
