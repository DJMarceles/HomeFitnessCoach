import { Camera, MapPinned, PlayCircle, Volume2 } from "lucide-react";
import type { ExerciseConfig } from "../data/exercises";
import type { SetFeedback } from "../lib/pose/setFeedback";
import type { VoiceOption } from "../lib/voice/useVoiceOptions";
import { hasSpecificRules, isHold, isPilot } from "../lib/pose/pilot";

interface AnalysisPanelProps {
  holdTarget: number;
  onHoldTarget: (seconds: number) => void;
  exercise: ExerciseConfig;
  selectedVoiceURI: string;
  setFeedback: SetFeedback;
  voiceEnabled: boolean;
  voiceOptions: VoiceOption[];
  voiceStatusMessage: string;
  onPlaySetFeedback: () => void;
  onTestVoice: () => void;
  onVoiceChange: (voiceURI: string) => void;
}

export function AnalysisPanel(props: AnalysisPanelProps) {
  const { exercise } = props;

  return (
    <aside className="analysis-panel" aria-label="Analyse">
      <PanelHeader exercise={exercise} />
      <SetFeedbackCard {...props} />
      <CameraPlacementCard exercise={exercise} />
      <VoiceSettings {...props} />
    </aside>
  );
}

function PanelHeader({ exercise }: Pick<AnalysisPanelProps, "exercise">) {
  return (
    <div className="panel-block">
      <div className="panel-title-row">
        <div>
          <p className="section-label">Analyse</p>
          <h2>{exercise.label}</h2>
        </div>
      </div>
      <p className="panel-copy">{isPilot(exercise.id) ? "Pilot · praktijktoets volgt" : hasSpecificRules(exercise.id) ? "Proefversie · praktijktoets volgt" : "Experimentele telling · geen houdingsbeoordeling"}</p>
    </div>
  );
}

function CameraPlacementCard({ exercise }: Pick<AnalysisPanelProps, "exercise">) {
  const rows = [
    ["Positie", exercise.camera.position],
    ["Afstand", exercise.camera.distance],
    ["Hoogte", exercise.camera.height],
    ["Hoek", exercise.camera.angle],
    ["Framing", exercise.camera.framing],
    ["Licht", exercise.camera.lighting],
  ];

  return (
    <div className="panel-block camera-placement">
      <div className="panel-title-row">
        <h3>Camera-opstelling</h3>
        <Camera size={18} aria-hidden="true" />
      </div>
      <div className="placement-list">
        {rows.map(([label, value]) => (
          <div className="placement-row" key={label}>
            <MapPinned size={15} aria-hidden="true" />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SetFeedbackCard(props: AnalysisPanelProps) {
  const feedback = props.setFeedback;

  return (
    <div className="panel-block set-feedback">
      <div className="panel-title-row">
        <h3>Setanalyse</h3>
        <button
          className="mini-button"
          disabled={!feedback.ready || !props.voiceEnabled}
          onClick={props.onPlaySetFeedback}
          type="button"
        >
          <Volume2 size={15} aria-hidden="true" />
          Speel af
        </button>
      </div>
      {isHold(props.exercise.id) && <label className="hold-target">Houdtijd
        <select value={props.holdTarget} onChange={e => props.onHoldTarget(Number(e.target.value))}>
          {[10,20,30,45,60].map(s => <option key={s} value={s}>{s} seconden</option>)}
        </select></label>}
      <div className="set-progress" aria-label="Voortgang setanalyse">
        <span style={{ width: `${feedback.progress * 100}%` }} />
      </div>
      <strong>{feedback.title}</strong>
      <p>{feedback.summary}</p>
      <div className="tip-list">
        {feedback.tips.map((tip) => (
            <article className="tip-card" key={tip.key}>
              <strong>{tip.title}</strong>
              <p>{tip.detail}</p>
            </article>
          ))}
      </div>
    </div>
  );
}

function VoiceSettings(props: AnalysisPanelProps) {
  const selectableVoices = props.voiceOptions.filter((voice) => !voice.disabled);

  return (
    <div className="panel-block voice-settings">
      <div className="panel-title-row">
        <h3>Stem</h3>
        <button className="mini-button" onClick={props.onTestVoice} type="button">
          <PlayCircle size={15} aria-hidden="true" />
          Test
        </button>
      </div>
      <select
        aria-label="Kies stem"
        className="voice-select"
        disabled={selectableVoices.length === 0}
        onChange={(event) => props.onVoiceChange(event.target.value)}
        value={props.selectedVoiceURI}
      >
        <option value="">Standaard browserstem</option>
        {props.voiceOptions.map((voice) => (
          <option disabled={voice.disabled} key={voice.uri} value={voice.uri}>
            {voice.label}
          </option>
        ))}
      </select>
      <p className="voice-note">{props.voiceStatusMessage}</p>
    </div>
  );
}
