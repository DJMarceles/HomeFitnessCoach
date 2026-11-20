import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Activity, Dumbbell, Gauge, ShieldCheck } from "lucide-react";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { CameraStage, type VideoFitMode } from "./components/CameraStage";
import { ControlBar } from "./components/ControlBar";
import { SessionSummary } from "./components/SessionSummary";
import { getExerciseById, type ExerciseConfig } from "./data/exercises";
import { useCamera } from "./hooks/useCamera";
import { usePoseLandmarker } from "./hooks/usePoseLandmarker";
import { useSessionStats } from "./hooks/useSessionStats";
import { createDemoLandmarks } from "./lib/pose/demoPose";
import { analyzePose } from "./lib/pose/poseRules";
import { hasSpecificRules, isHold } from "./lib/pose/pilot";
import type { ExerciseId, PoseAnalysis, SessionStats } from "./lib/pose/poseTypes";
import { buildSetFeedback, type SetFeedback } from "./lib/pose/setFeedback";
import { useVoiceCoach } from "./lib/voice/useVoiceCoach";
import { useCloudVoiceStatus, type CloudVoiceStatus } from "./lib/voice/useCloudVoiceStatus";
import { useVoiceOptions, type VoiceOption } from "./lib/voice/useVoiceOptions";

interface TrainingController {
  holdTarget: number;
  onHoldTarget: (seconds: number) => void;
  devices: MediaDeviceInfo[];
  deviceId: string;
  onDeviceChange: (id: string) => void;
  analysis: PoseAnalysis | null;
  cameraError: string | null;
  cameraStatus: ReturnType<typeof useCamera>["status"];
  cameraZoom: ReturnType<typeof useCamera>["zoom"];
  demoMode: boolean;
  exercise: ExerciseConfig;
  landmarks: NormalizedLandmark[];
  poseStatus: string;
  selectedExerciseId: ExerciseId;
  selectedVoiceURI: string;
  setFeedback: SetFeedback;
  sessionActive: boolean;
  stats: SessionStats;
  videoRef: RefObject<HTMLVideoElement | null>;
  voiceEnabled: boolean;
  voiceStatusMessage: string;
  voiceOptions: VoiceOption[];
  voiceSupported: boolean;
  videoFitMode: VideoFitMode;
  onCameraZoomChange: (value: number) => void;
  onExerciseChange: (exerciseId: ExerciseId) => void;
  onReset: () => void;
  onStart: () => void;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onPlaySetFeedback: () => void;
  onTestVoice: () => void;
  onToggleDemo: () => void;
  onToggleVideoFit: () => void;
  onToggleVoice: () => void;
  onVoiceChange: (voiceURI: string) => void;
}

export function App() {
  const controller = useTrainingController();

  return (
    <div className="app-shell">
      <Navigation />
      <TrainingWorkspace controller={controller} />
    </div>
  );
}

function TrainingWorkspace({ controller }: { controller: TrainingController }) {
  return (
    <main className="workspace">
      <TopBar voiceSupported={controller.voiceSupported} />
      <div className="training-grid">
        <TrainingMain controller={controller} />
        <AnalysisPanel
          exercise={controller.exercise}
          holdTarget={controller.holdTarget}
          onHoldTarget={controller.onHoldTarget}
          onTestVoice={controller.onTestVoice}
          onPlaySetFeedback={controller.onPlaySetFeedback}
          onVoiceChange={controller.onVoiceChange}
          selectedVoiceURI={controller.selectedVoiceURI}
          setFeedback={controller.setFeedback}
          voiceEnabled={controller.voiceEnabled}
          voiceOptions={controller.voiceOptions}
          voiceStatusMessage={controller.voiceStatusMessage}
        />
      </div>
    </main>
  );
}

function TrainingMain({ controller }: { controller: TrainingController }) {
  return (
    <div className="training-main">
      <CameraStage
        analysis={controller.analysis}
        cameraError={controller.cameraError}
        cameraStatus={controller.cameraStatus}
        devices={controller.devices}
        deviceId={controller.deviceId}
        onDeviceChange={controller.onDeviceChange}
        counter={isHold(controller.exercise.id) ? `${controller.stats.heldSeconds} / ${controller.holdTarget} s` : `${controller.stats.reps} reps`}
        cameraZoom={controller.cameraZoom}
        demoMode={controller.demoMode}
        landmarks={controller.landmarks}
        onCameraZoomChange={controller.onCameraZoomChange}
        onStartCamera={controller.onStartCamera}
        onStopCamera={controller.onStopCamera}
        onToggleVideoFit={controller.onToggleVideoFit}
        onToggleDemo={controller.onToggleDemo}
        poseStatus={controller.poseStatus}
        videoFitMode={controller.videoFitMode}
        videoRef={controller.videoRef}
      />
      <ControlBar
        active={controller.sessionActive}
        demoMode={controller.demoMode}
        onExerciseChange={controller.onExerciseChange}
        onReset={controller.onReset}
        onStart={controller.onStart}
        onToggleDemo={controller.onToggleDemo}
        onToggleVoice={controller.onToggleVoice}
        selectedExerciseId={controller.selectedExerciseId}
        voiceEnabled={controller.voiceEnabled}
      />
      <SessionSummary stats={controller.stats} hold={isHold(controller.exercise.id)} />
    </div>
  );
}

function Navigation() {
  return (
    <aside className="nav-rail" aria-label="VormCoach navigatie">
      <div className="brand-mark">
        <Activity size={24} aria-hidden="true" />
      </div>
      <button className="nav-button is-active" title="Training" type="button">
        <Dumbbell size={20} aria-hidden="true" />
      </button>
      <button className="nav-button" title="Analyse" type="button">
        <Gauge size={20} aria-hidden="true" />
      </button>
      <button className="nav-button" title="Privacy" type="button">
        <ShieldCheck size={20} aria-hidden="true" />
      </button>
    </aside>
  );
}

function TopBar({ voiceSupported }: { voiceSupported: boolean }) {
  return (
    <header className="top-bar">
      <div>
        <p className="section-label">Thuis trainen met camera-coaching</p>
        <h2>Live monitoren, feedback na je set.</h2>
      </div>
      <div className="top-meta">
        <span>Privacy lokaal</span>
        <span>{voiceSupported ? "Stem beschikbaar" : "Stem niet ondersteund"}</span>
      </div>
    </header>
  );
}

function useTrainingController(): TrainingController {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<ExerciseId>("squat");
  const [sessionActive, setSessionActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [holdTarget, setHoldTarget] = useState(20);
  const [demoLandmarks, setDemoLandmarks] = useState<NormalizedLandmark[]>([]);
  const [videoFitMode, setVideoFitMode] = useState<VideoFitMode>("contain");
  const cloudVoiceStatus = useCloudVoiceStatus();
  const voiceOptions = useVoiceOptions(cloudVoiceStatus);
  const camera = useCamera(videoRef);
  const pose = usePoseLandmarker({ enabled: camera.status === "ready" && !demoMode, videoRef });
  const landmarks = demoMode ? demoLandmarks : pose.landmarks;
  const analysis = useMemo(() => analyzePose(selectedExerciseId, landmarks,
    demoMode ? performance.now() : pose.timestamp, demoMode ? 1 : pose.aspect),
    [selectedExerciseId, landmarks, demoMode, pose.timestamp, pose.aspect]);
  const exercise = getExerciseById(selectedExerciseId);
  const voice = useVoiceCoach(voiceEnabled, selectedVoiceURI);
  const { stats, resetStats } = useSessionStats(sessionActive, analysis, holdTarget);
  const setFeedback = useMemo(() => buildSetFeedback(stats, exercise.label, isHold(exercise.id), holdTarget, hasSpecificRules(exercise.id)), [exercise, stats, holdTarget]);
  const actions = useTrainingActions(
    getActionInputs(camera, exercise, voice, demoMode, sessionActive, setDemoMode, setSessionActive, resetStats),
  );

  useDemoPoseLoop(demoMode, setDemoLandmarks);
  usePreferredVoice(selectedVoiceURI, voiceOptions.preferredVoiceURI, setSelectedVoiceURI);

  return {
    analysis: demoMode || pose.status === "running" ? analysis : null,
    devices: camera.devices, deviceId: camera.stream?.getVideoTracks()[0]?.getSettings().deviceId ?? "",
    onDeviceChange: id => { actions.onReset(); void camera.startCamera(id); },
    holdTarget, onHoldTarget: seconds => { actions.onReset(); setHoldTarget(seconds); },
    cameraError: camera.error,
    cameraStatus: camera.status,
    cameraZoom: camera.zoom,
    demoMode,
    exercise,
    landmarks,
    poseStatus: pose.error ? "Model niet beschikbaar" : getPoseStatus(pose.status),
    selectedExerciseId,
    selectedVoiceURI,
    setFeedback,
    sessionActive,
    stats,
    videoRef,
    voiceEnabled,
    voiceStatusMessage: getVoiceStatusMessage(cloudVoiceStatus, voice.lastError),
    voiceOptions: voiceOptions.options,
    voiceSupported: voice.supported,
    videoFitMode,
    onCameraZoomChange: (value) => {
      void camera.setZoom(value);
    },
    onExerciseChange: (exerciseId) => {
      actions.onReset();
      setDemoMode(false);
      setSelectedExerciseId(exerciseId);
    },
    onPlaySetFeedback: () => voice.speakCue("set-feedback", setFeedback.voiceText, true),
    onTestVoice: () => voice.speakCue("voice-test", "Dit is de gekozen VormCoach stem.", true),
    onToggleVoice: () => { voice.stop(); setVoiceEnabled((current) => !current); },
    onToggleVideoFit: () => setVideoFitMode((current) => (current === "cover" ? "contain" : "cover")),
    onVoiceChange: setSelectedVoiceURI,
    ...actions,
    onStopCamera: () => { actions.onReset(); camera.stopCamera(); },
    onToggleDemo: () => {
      if (!demoMode) { camera.stopCamera(); setSelectedExerciseId("squat"); }
      actions.onToggleDemo();
    },
  };
}

function getVoiceStatusMessage(status: CloudVoiceStatus, playbackError: string | null): string {
  if (playbackError) {
    return `Stemfout: ${playbackError}`;
  }

  if (status.error) {
    return `Cloudstem status onbekend: ${status.error}`;
  }

  if (status.configured) {
    return `${status.voiceLabel} is actief zodra je ElevenLabs kiest.`;
  }

  return "Voor betere Nederlandse audio: vul ELEVENLABS_API_KEY en ELEVENLABS_VOICE_ID in .env.";
}

function getActionInputs(
  camera: ReturnType<typeof useCamera>,
  exercise: ExerciseConfig,
  voice: ReturnType<typeof useVoiceCoach>,
  demoMode: boolean,
  sessionActive: boolean,
  setDemoMode: Dispatch<SetStateAction<boolean>>,
  setSessionActive: Dispatch<SetStateAction<boolean>>,
  resetStats: () => void,
) {
  return { camera, demoMode, exercise, resetStats, sessionActive, setDemoMode, setSessionActive, voice };
}

function useTrainingActions(inputs: ReturnType<typeof getActionInputs>) {
  const onStart = useCallback(async () => {
    if (!inputs.sessionActive && !inputs.demoMode && inputs.camera.status !== "ready") {
      if (!await inputs.camera.startCamera()) return;
    }

    const nextActive = !inputs.sessionActive;
    inputs.setSessionActive(nextActive);

    if (!nextActive) {
      inputs.voice.stop();
    }
  }, [inputs]);

  const onReset = useCallback(() => {
    if (inputs.camera.status === "requesting") inputs.camera.stopCamera();
    inputs.setSessionActive(false);
    inputs.resetStats();
    inputs.voice.stop();
  }, [inputs]);

  const onToggleDemo = useCallback(() => {
    inputs.setDemoMode((current) => !current);
    onReset();
  }, [inputs, onReset]);

  return {
    onStart: () => {
      void onStart();
    },
    onStartCamera: () => {
      void inputs.camera.startCamera();
    },
    onReset,
    onToggleDemo,
  };
}

function usePreferredVoice(
  selectedVoiceURI: string,
  preferredVoiceURI: string,
  setSelectedVoiceURI: Dispatch<SetStateAction<string>>,
): void {
  useEffect(() => {
    if (!selectedVoiceURI && preferredVoiceURI) {
      setSelectedVoiceURI(preferredVoiceURI);
    }
  }, [preferredVoiceURI, selectedVoiceURI, setSelectedVoiceURI]);
}

function useDemoPoseLoop(
  enabled: boolean,
  setDemoLandmarks: Dispatch<SetStateAction<NormalizedLandmark[]>>,
): void {
  useEffect(() => {
    if (!enabled) {
      setDemoLandmarks([]);
      return;
    }

    let frameId = 0;
    const start = performance.now();
    let last = -Infinity;
    const loop = (time: number): void => {
      if (time - last >= 65) {
        setDemoLandmarks(createDemoLandmarks(time - start));
        last = time;
      }
      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frameId);
  }, [enabled, setDemoLandmarks]);
}

function getPoseStatus(status: string): string {
  if (status === "loading") {
    return "Model laden";
  }

  if (status === "running") {
    return "Analyse actief";
  }

  if (status === "error") {
    return "Analyse fout";
  }

  return "Wacht op camera";
}
