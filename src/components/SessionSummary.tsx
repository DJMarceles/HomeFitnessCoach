import { Clock3, ListChecks, Medal, Repeat2 } from "lucide-react";
import type { ReactNode } from "react";
import type { SessionStats } from "../lib/pose/poseTypes";
import { formatDuration, formatPercent } from "../lib/format";

interface SessionSummaryProps {
  stats: SessionStats;
}

export function SessionSummary({ stats }: SessionSummaryProps) {
  const alignmentRatio = stats.frames > 0 ? stats.alignedFrames / stats.frames : 0;
  const topCorrection = getTopCorrection(stats);

  return (
    <section className="session-summary" aria-label="Sessieanalyse">
      <SummaryItem icon={<Clock3 size={18} />} label="Settijd" value={formatDuration(stats.elapsedSeconds)} />
      <SummaryItem icon={<Repeat2 size={18} />} label="Getelde reps" value={String(stats.reps)} />
      <SummaryItem icon={<Medal size={18} />} label="Stabiele frames" value={formatPercent(alignmentRatio)} />
      <SummaryItem icon={<ListChecks size={18} />} label="Meest genoemd" value={topCorrection} />
    </section>
  );
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="summary-item">
      <span aria-hidden="true">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function getTopCorrection(stats: SessionStats): string {
  const [key, count] = Object.entries(stats.correctionCounts).sort((a, b) => b[1] - a[1])[0];

  if (!key || count === 0) {
    return "Geen";
  }

  const labels: Record<string, string> = {
    "back-neutral": "Rug neutraal",
    "knees-track": "Knieen volgen tenen",
    "tempo-calm": "Tempo rustig",
    "hip-line": "Heupen in lijn",
    "shoulder-stack": "Schouders",
    depth: "Diepte",
    camera: "Camera",
  };

  return labels[key] ?? key;
}
