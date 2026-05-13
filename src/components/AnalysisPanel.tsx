import { Activity, Camera, Gauge, MapPinned, PlayCircle, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ExerciseConfig } from "../data/exercises";
import type { PoseAnalysis } from "../lib/pose/poseTypes";
import type { SetFeedback } from "../lib/pose/setFeedback";
import type { VoiceOption } from "../lib/voice/useVoiceOptions";
import { StatusPill } from "./StatusPill";

interface AnalysisPanelProps {
  analysis: PoseAnalysis | null;
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
  const { analysis, exercise } = props;

  return (
    <aside className="analysis-panel" aria-label="Analyse">
      <PanelHeader analysis={analysis} exercise={exercise} />
      <CameraPlacementCard exercise={exercise} />
      <MetricGrid analysis={analysis} />
      <SetFeedbackCard {...props} />
      <VoiceSettings {...props} />
    </aside>
  );
}

function PanelHeader({ analysis, exercise }: Pick<AnalysisPanelProps, "analysis" | "exercise">) {
  return (
    <div className="panel-block">
      <div className="panel-title-row">
        <div>
          <p className="section-label">Analyse</p>
          <h2>{exercise.label}</h2>
        </div>
        <StatusPill level={analysis?.level ?? "idle"} />
      </div>
      <p className="panel-copy">{exercise.focus}</p>
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

function MetricGrid({ analysis }: Pick<AnalysisPanelProps, "analysis">) {
  const metrics = Object.entries(analysis?.metrics ?? {}).slice(0, 4);

  return (
    <div className="metric-grid">
      <MetricCard icon={<Gauge size={18} />} label="Houding-score" value={`${analysis?.score ?? 0}%`} />
      <MetricCard icon={<Activity size={18} />} label="Confidence" value={`${Math.round((analysis?.confidence ?? 0) * 100)}%`} />
      {metrics.map(([label, value]) => (
        <MetricCard key={label} icon={<Activity size={18} />} label={label} value={String(value)} />
      ))}
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric-card">
      <span aria-hidden="true">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
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
      <div className="set-progress" aria-label="Voortgang setanalyse">
        <span style={{ width: `${feedback.progress * 100}%` }} />
      </div>
      <strong>{feedback.title}</strong>
      <p>{feedback.summary}</p>
      <div className="tip-list">
        {feedback.ready ? (
          feedback.tips.map((tip) => (
            <article className="tip-card" key={tip.key}>
              <strong>{tip.title}</strong>
              <p>{tip.detail}</p>
            </article>
          ))
        ) : (
          <article className="tip-card is-muted">
            <strong>{feedback.waitingForStart ? "Rep-teller staat klaar" : "Nog geen tussentijdse coaching"}</strong>
            <p>
              {feedback.waitingForStart
                ? "Begin met bewegen. De teller start automatisch bij de eerste herhaling."
                : "Maak eerst minimaal 8 geldige herhalingen. Daarna krijg je de tips in een keer."}
            </p>
          </article>
        )}
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
