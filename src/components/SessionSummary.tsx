import type { SessionStats } from "../lib/pose/poseTypes";
import { formatDuration } from "../lib/format";

export function SessionSummary({ stats, hold }: { stats: SessionStats; hold: boolean }) {
  return (
    <section className="session-summary" aria-label="Sessie">
      <div className="summary-item">
        <small>{hold ? "Houdtijd" : "Herhalingen"}</small>
        <strong>{hold ? formatDuration(stats.heldSeconds) : stats.reps}</strong>
      </div>
      {!hold && (
        <div className="summary-item">
          <small>Settijd</small>
          <strong>{formatDuration(stats.elapsedSeconds)}</strong>
        </div>
      )}
    </section>
  );
}
