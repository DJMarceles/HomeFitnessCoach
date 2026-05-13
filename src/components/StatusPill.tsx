import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import type { FeedbackLevel } from "../lib/pose/poseTypes";

interface StatusPillProps {
  level: FeedbackLevel;
  label?: string;
}

export function StatusPill({ level, label }: StatusPillProps) {
  const Icon = level === "good" ? CheckCircle2 : level === "idle" ? CircleDashed : AlertTriangle;
  const text = label ?? getLabel(level);

  return (
    <span className={`status-pill status-pill--${level}`}>
      <Icon size={15} aria-hidden="true" />
      {text}
    </span>
  );
}

function getLabel(level: FeedbackLevel): string {
  if (level === "good") {
    return "Stabiel";
  }

  if (level === "danger") {
    return "Corrigeer";
  }

  if (level === "warning") {
    return "Let op";
  }

  return "Wacht op houding";
}
