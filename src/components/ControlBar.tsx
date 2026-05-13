import { Mic, MicOff, Pause, Play, RotateCcw, Video } from "lucide-react";
import type { ExerciseId } from "../lib/pose/poseTypes";
import { ExerciseSelector } from "./ExerciseSelector";

interface ControlBarProps {
  active: boolean;
  demoMode: boolean;
  selectedExerciseId: ExerciseId;
  voiceEnabled: boolean;
  onExerciseChange: (exerciseId: ExerciseId) => void;
  onReset: () => void;
  onStart: () => void;
  onToggleDemo: () => void;
  onToggleVoice: () => void;
}

export function ControlBar(props: ControlBarProps) {
  const VoiceIcon = props.voiceEnabled ? Mic : MicOff;

  return (
    <section className="control-bar" aria-label="Oefenbediening">
      <ExerciseSelector selectedExerciseId={props.selectedExerciseId} onSelect={props.onExerciseChange} />
      <div className="control-actions">
        <button className="icon-button" onClick={props.onToggleVoice} title="Stem aan" type="button">
          <VoiceIcon size={18} aria-hidden="true" />
          <span>Stem aan</span>
        </button>
        <button className={props.demoMode ? "icon-button is-active" : "icon-button"} onClick={props.onToggleDemo} type="button">
          <Video size={18} aria-hidden="true" />
          <span>Demo</span>
        </button>
        <button className="icon-button" onClick={props.onReset} title="Reset sessie" type="button">
          <RotateCcw size={18} aria-hidden="true" />
        </button>
        <button className="primary-button" onClick={props.onStart} type="button">
          {props.active ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          {props.active ? "Pauze" : "Start monitoring"}
        </button>
      </div>
    </section>
  );
}
