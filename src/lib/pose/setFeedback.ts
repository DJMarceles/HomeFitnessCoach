import type { CorrectionKey, SessionStats } from "./poseTypes";

export const MIN_REPS_FOR_SET_FEEDBACK = 8;
export const FULL_SET_REPS = 10;

export interface SetTip {
  key: CorrectionKey | "good";
  title: string;
  detail: string;
}

export interface SetFeedback {
  ready: boolean;
  progress: number;
  waitingForStart: boolean;
  title: string;
  summary: string;
  tips: SetTip[];
  voiceText: string;
}

const TIP_LIBRARY: Record<CorrectionKey, SetTip> = {
  "back-neutral": {
    key: "back-neutral",
    title: "Rug neutraler houden",
    detail: "Start de volgende set iets rustiger en denk aan een lange rug voordat je de beweging inzet.",
  },
  "knees-track": {
    key: "knees-track",
    title: "Knieen beter laten volgen",
    detail: "Zet je voeten stevig neer en laat je knieen dezelfde richting volgen als je tenen.",
  },
  "tempo-calm": {
    key: "tempo-calm",
    title: "Tempo vasthouden",
    detail: "Je controle is goed. Blijf langzaam zakken en rustig terugkomen.",
  },
  "hip-line": {
    key: "hip-line",
    title: "Heupen stabieler houden",
    detail: "Span je core aan voordat je beweegt en voorkom dat je heupen wegzakken of draaien.",
  },
  "shoulder-stack": {
    key: "shoulder-stack",
    title: "Schouders beter stapelen",
    detail: "Breng je handen of ellebogen onder je schouders en houd je schouders laag.",
  },
  depth: {
    key: "depth",
    title: "Bewegingsdiepte verbeteren",
    detail: "Werk aan iets meer gecontroleerde diepte zonder spanning in rug of knieen te verliezen.",
  },
  camera: {
    key: "camera",
    title: "Camera beter plaatsen",
    detail: "Zet je volledige lichaam in beeld voordat je start, anders wordt de analyse minder betrouwbaar.",
  },
};

const GOOD_TIP: SetTip = {
  key: "good",
  title: "Sterke set",
  detail: "Je houding bleef grotendeels stabiel. Houd hetzelfde tempo aan en voeg pas daarna extra herhalingen toe.",
};

/** Builds a delayed set review after enough repetitions have been monitored. */
export function buildSetFeedback(stats: SessionStats, exerciseLabel: string): SetFeedback {
  const waitingForStart = stats.startedAt === null;
  const ready = stats.reps >= MIN_REPS_FOR_SET_FEEDBACK;
  const progress = Math.min(stats.reps / FULL_SET_REPS, 1);
  const tips = ready ? getTopTips(stats) : [];
  const title = getFeedbackTitle(ready, waitingForStart, stats.reps);
  const summary = ready ? getReadySummary(stats, exerciseLabel, tips) : getWaitingSummary(stats.reps, waitingForStart);

  return {
    ready,
    progress,
    waitingForStart,
    title,
    summary,
    tips,
    voiceText: buildVoiceText(title, summary, tips),
  };
}

function getTopTips(stats: SessionStats): SetTip[] {
  const tips = Object.entries(stats.correctionCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => TIP_LIBRARY[key as CorrectionKey]);

  return tips.length > 0 ? tips : [GOOD_TIP];
}

function getReadyTitle(reps: number): string {
  return reps >= FULL_SET_REPS ? "Setanalyse compleet" : "Eerste setanalyse klaar";
}

function getFeedbackTitle(ready: boolean, waitingForStart: boolean, reps: number): string {
  if (ready) {
    return getReadyTitle(reps);
  }

  return waitingForStart ? "Wacht op eerste herhaling" : "Set wordt gemonitord";
}

function getReadySummary(stats: SessionStats, exerciseLabel: string, tips: SetTip[]): string {
  if (tips[0]?.key === "good") {
    return `${exerciseLabel}: ${stats.reps} herhalingen gemonitord. Je houding was stabiel genoeg voor een rustige opbouw.`;
  }

  return `${exerciseLabel}: ${stats.reps} herhalingen gemonitord. Focus volgende set op ${tips[0].title.toLowerCase()}.`;
}

function getWaitingSummary(reps: number, waitingForStart: boolean): string {
  if (waitingForStart) {
    return "Start met de oefening. Ik begin pas te tellen zodra ik de eerste herhaling herken.";
  }

  const remaining = Math.max(MIN_REPS_FOR_SET_FEEDBACK - reps, 0);
  return `Nog ${remaining} geldige herhalingen nodig voor betrouwbare tips. Ik monitor live, maar geef nog geen aanwijzingen tussendoor.`;
}

function buildVoiceText(title: string, summary: string, tips: SetTip[]): string {
  const tipText = tips.map((tip, index) => `Tip ${index + 1}. ${tip.title}. ${tip.detail}`).join(" ");
  return `${title}. ${summary} ${tipText}`.trim();
}
