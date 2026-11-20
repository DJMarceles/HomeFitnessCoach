import type { SessionStats } from "./poseTypes";
import { SET_REPS } from "./sessionEngine";

export function buildSetFeedback(
  stats: SessionStats,
  label: string,
  hold = false,
  seconds = 20,
  technique = true,
) {
  const review = stats.review;
  const target = hold ? seconds : SET_REPS;
  const value = hold ? stats.heldSeconds : stats.reps;
  const unit = hold ? "seconden" : "herhalingen";
  const title = review ? "Setanalyse klaar" : stats.startedAt === null ? "Klaar voor de start" : "Set bezig";
  const insufficient = review && review.assessed < Math.ceil(target * 0.75);
  const tips = review?.tips.map((t) => ({ key: t.key, title: t.label, detail: t.detail })) ?? [];
  const summary = review
    ? `${label}: ${target} ${unit}. ${!technique ? "Voor deze oefening is alleen de experimentele telling beschikbaar." : insufficient ? "Onvoldoende beoordeelbare beelden voor een volledige houdingsanalyse." : tips.length ? "Aandacht voor de volgende set:" : "Geen terugkerend aandachtspunt gezien vanuit deze camerahoek."}`
    : `${value} van ${target} ${unit}`;
  return {
    ready: !!review,
    title,
    summary,
    tips,
    progress: Math.min(value / target, 1),
    voiceText: review ? [title + ".", summary, ...tips.map((t) => t.title + ". " + t.detail)].join(" ") : "",
  };
}
export type SetFeedback = ReturnType<typeof buildSetFeedback>;
