import {
  EMPTY_STATS,
  type Correction,
  type CorrectionKey,
  type PoseAnalysis,
  type SessionStats,
} from "./poseTypes";
import { isHold } from "./pilot";

export const SET_REPS = 8;
const MAX_GAP = 400;
const CONFIRM_MS = 80;
type Evidence = {
  observed: number;
  usable: number;
  issues: Map<CorrectionKey, { tip: Correction; n: number }>;
};
const evidence = (): Evidence => ({ observed: 0, usable: 0, issues: new Map() });

function observe(e: Evidence, frame: PoseAnalysis, duration: number) {
  e.observed += duration;
  if (!frame.assessable) return;
  e.usable += duration;
  for (const tip of frame.corrections) {
    if (tip.level === "good" || tip.key === frame.endpointKey) continue;
    e.issues.set(tip.key, { tip, n: (e.issues.get(tip.key)?.n ?? 0) + duration });
  }
}

export class SessionEngine {
  stats: SessionStats = { ...EMPTY_STATS };
  private phase: "entry" | "armed" | "moving" = "entry";
  private since: number | null = null;
  private last: number | null = null;
  private extreme: PoseAnalysis | null = null;
  private samples: PoseAnalysis[] = [];
  private movement = evidence();
  private votes = new Map<CorrectionKey, { tip: Correction; n: number }>();
  private assessed = 0;
  private heldMs = 0;
  private elapsedMs = 0;
  constructor(private readonly holdTarget = 20) {}

  interrupt() {
    this.phase = "entry";
    this.since = this.last = this.extreme = null;
    this.samples = [];
    this.movement = evidence();
  }
  private holdBucket = evidence();

  private confirmed(condition: boolean, now: number) {
    this.since = condition ? (this.since ?? now) : null;
    return this.since !== null && now - this.since >= CONFIRM_MS;
  }

  feed(f: PoseAnalysis | null): SessionStats {
    if (!f || f.level === "idle") {
      this.interrupt();
      return this.stats;
    }
    if (this.last !== null && f.timestamp <= this.last) return this.stats;
    if (this.last !== null && f.timestamp - this.last > MAX_GAP) this.interrupt();
    const dt = this.last === null ? 0 : f.timestamp - this.last;
    this.last = f.timestamp;
    if (isHold(f.exerciseId)) {
      if (!f.holding || this.stats.review) {
        this.interrupt();
        return this.stats;
      }
      if (this.phase === "entry") {
        if (!this.confirmed(true, f.timestamp)) return this.stats;
        this.phase = "armed";
        this.stats = { ...this.stats, startedAt: this.stats.startedAt ?? f.timestamp };
        return this.stats;
      }
      let left = Math.min(dt, this.holdTarget * 1000 - this.heldMs);
      while (left > 0) {
        const part = Math.min(left, 1000 - (this.heldMs % 1000));
        observe(this.holdBucket, f, part);
        this.heldMs += part;
        left -= part;
        if (this.heldMs % 1000 === 0) {
          this.ballot(this.holdBucket, null);
          this.holdBucket = evidence();
        }
      }
      const seconds = Math.floor(this.heldMs / 1000);
      if (seconds !== this.stats.heldSeconds) {
        this.stats = { ...this.stats, heldSeconds: seconds, elapsedSeconds: seconds };
        if (seconds === this.holdTarget) this.finish(seconds);
      }
      return this.stats;
    }
    const signal = f.repSignal;
    if (!signal || !Number.isFinite(signal.value)) {
      this.interrupt();
      return this.stats;
    }
    const neutral = f.inverted ? signal.value <= signal.upThreshold : signal.value >= signal.upThreshold;
    const excursion = f.inverted
      ? signal.value >= signal.downThreshold
      : signal.value <= signal.downThreshold;
    if (this.stats.startedAt !== null) {
      this.elapsedMs += dt;
      const seconds = Math.floor(this.elapsedMs / 1000);
      if (seconds !== this.stats.elapsedSeconds) this.stats = { ...this.stats, elapsedSeconds: seconds };
    }
    if (this.phase === "entry") {
      if (this.confirmed(neutral, f.timestamp)) {
        this.phase = "armed";
        this.since = null;
      }
    } else if (this.phase === "armed") {
      if (excursion) this.track(f, dt);
      else {
        this.extreme = null;
        this.samples = [];
        this.movement = evidence();
      }
      if (this.confirmed(excursion, f.timestamp)) {
        this.phase = "moving";
        this.since = null;
        this.stats = { ...this.stats, startedAt: this.stats.startedAt ?? f.timestamp };
      }
    } else {
      if (!neutral) this.track(f, dt);
      if (this.confirmed(neutral, f.timestamp)) {
        this.stats = { ...this.stats, reps: this.stats.reps + 1 };
        if (!this.stats.review) {
          this.ballot(this.movement, this.extreme);
          if (this.stats.reps === SET_REPS) this.finish(SET_REPS);
        }
        this.phase = "armed";
        this.since = this.extreme = null;
        this.samples = [];
        this.movement = evidence();
      }
    }
    return this.stats;
  }

  private track(f: PoseAnalysis, dt: number) {
    observe(this.movement, f, dt);
    this.samples.push(f);
    if (this.samples.length > 3) this.samples.shift();
    if (this.samples.length < 2) return;
    // A single extreme landmark spike is not evidence of a deeper repetition.
    const sorted = [...this.samples].sort((a, b) => a.repSignal!.value - b.repSignal!.value);
    const candidate = sorted[this.samples.length === 2 && f.inverted ? 0 : 1];
    const previous = this.extreme?.repSignal?.value;
    if (
      previous === undefined ||
      (f.inverted ? candidate.repSignal!.value > previous : candidate.repSignal!.value < previous)
    )
      this.extreme = candidate;
  }

  private ballot(e: Evidence, endpoint: PoseAnalysis | null) {
    if (!e.observed || e.usable < e.observed * 0.75 || (endpoint && !endpoint.assessable)) return;
    this.assessed++;
    const tips = [...e.issues.values()].filter((v) => v.n >= e.usable / 2).map((v) => v.tip);
    const endTip = endpoint?.corrections.find((t) => t.key === endpoint.endpointKey);
    if (endTip) tips.push(endTip);
    for (const tip of tips) this.votes.set(tip.key, { tip, n: 1 + (this.votes.get(tip.key)?.n ?? 0) });
  }

  private finish(units: number) {
    const tips = [...this.votes.values()]
      .filter((v) => v.n >= Math.ceil((units * 3) / 8))
      .sort((a, b) => b.n - a.n)
      .slice(0, 2)
      .map((v) => v.tip);
    this.stats = { ...this.stats, review: { units, assessed: this.assessed, tips } };
  }
}
