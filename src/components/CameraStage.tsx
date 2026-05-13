import { Camera, Maximize2, Minimize2, ShieldCheck, Video, Zap, ZoomIn, ZoomOut } from "lucide-react";
import type { RefObject } from "react";
import type { CameraStatus, CameraZoomState } from "../hooks/useCamera";
import type { PoseAnalysis } from "../lib/pose/poseTypes";
import { PoseOverlay } from "./PoseOverlay";
import { StatusPill } from "./StatusPill";

export type VideoFitMode = "cover" | "contain";

interface CameraStageProps {
  analysis: PoseAnalysis | null;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  cameraZoom: CameraZoomState;
  demoMode: boolean;
  videoFitMode: VideoFitMode;
  landmarks: PoseAnalysis["landmarks"];
  poseStatus: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onCameraZoomChange: (value: number) => void;
  onStartCamera: () => void;
  onToggleDemo: () => void;
  onToggleVideoFit: () => void;
}

export function CameraStage(props: CameraStageProps) {
  const level = props.analysis?.level ?? "idle";

  return (
    <section className="camera-stage" aria-label="Live houding">
      <div className="stage-header">
        <div>
          <p className="section-label">Live houding</p>
          <h1>VormCoach</h1>
        </div>
        <StatusPill level={level} />
      </div>

      <div className={getVideoShellClassName(props.demoMode, props.videoFitMode)}>
        <video className="video-preview" muted playsInline ref={props.videoRef} />
        <PoseOverlay fitMode={props.videoFitMode} landmarks={props.landmarks} level={level} videoRef={props.videoRef} />
        <StageHud analysis={props.analysis} demoMode={props.demoMode} poseStatus={props.poseStatus} />
        <CameraTools {...props} />
        {props.cameraStatus !== "ready" && !props.demoMode ? <CameraEmptyState {...props} /> : null}
      </div>
    </section>
  );
}

function getVideoShellClassName(demoMode: boolean, fitMode: VideoFitMode): string {
  return ["video-shell", demoMode ? "is-demo" : "", fitMode === "contain" ? "is-contained" : ""].filter(Boolean).join(" ");
}

function StageHud({ analysis, demoMode, poseStatus }: Pick<CameraStageProps, "analysis" | "demoMode" | "poseStatus">) {
  return (
    <div className="stage-hud">
      <span>
        <ShieldCheck size={15} aria-hidden="true" />
        Camera lokaal
      </span>
      <span>
        <Zap size={15} aria-hidden="true" />
        {demoMode ? "Demo-analyse" : poseStatus}
      </span>
      <strong>{analysis ? `${analysis.score}%` : "0%"}</strong>
    </div>
  );
}

function CameraEmptyState(props: CameraStageProps) {
  return (
    <div className="camera-empty">
      <div className="empty-icon">
        <Camera size={32} aria-hidden="true" />
      </div>
      <h2>Start je camera of gebruik demo-modus</h2>
      <p>{props.cameraError ?? "De analyse blijft lokaal in je browser. Er wordt geen video geupload."}</p>
      <div className="empty-actions">
        <button className="primary-button" onClick={props.onStartCamera} type="button">
          <Video size={18} aria-hidden="true" />
          Camera starten
        </button>
        <button className="ghost-button" onClick={props.onToggleDemo} type="button">
          Demo-modus
        </button>
      </div>
    </div>
  );
}

function CameraTools(props: CameraStageProps) {
  if (props.demoMode || props.cameraStatus !== "ready") {
    return null;
  }

  return (
    <div className="camera-tools" aria-label="Camera framing">
      <button
        className={props.videoFitMode === "contain" ? "camera-tool-button is-active" : "camera-tool-button"}
        onClick={props.onToggleVideoFit}
        title="Toon volledig camerabeeld zonder visuele crop"
        type="button"
      >
        {props.videoFitMode === "contain" ? <Maximize2 size={15} aria-hidden="true" /> : <Minimize2 size={15} aria-hidden="true" />}
        <span>{props.videoFitMode === "contain" ? "Vullen" : "Volledig beeld"}</span>
      </button>
      <ZoomControl zoom={props.cameraZoom} onZoomChange={props.onCameraZoomChange} />
    </div>
  );
}

function ZoomControl({ zoom, onZoomChange }: { zoom: CameraZoomState; onZoomChange: (value: number) => void }) {
  if (!zoom.supported) {
    return (
      <span className="zoom-unavailable" title="Deze camera geeft geen browser-zoom door">
        <ZoomOut size={15} aria-hidden="true" />
        Lenszoom n.v.t.
      </span>
    );
  }

  return (
    <label className="zoom-control">
      <ZoomOut size={15} aria-hidden="true" />
      <input
        aria-label="Camera zoom"
        max={zoom.max}
        min={zoom.min}
        onChange={(event) => onZoomChange(Number(event.target.value))}
        step={zoom.step}
        type="range"
        value={zoom.value}
      />
      <ZoomIn size={15} aria-hidden="true" />
      <strong>{zoom.value.toFixed(1)}x</strong>
    </label>
  );
}
