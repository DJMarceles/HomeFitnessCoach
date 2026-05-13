import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { PoseAnalysis, SessionStats } from "../lib/pose/poseTypes";
import { EMPTY_STATS } from "../lib/pose/poseTypes";

type RepPhase = "up" | "down";

interface RepUpdate {
  repDelta: number;
  setStarted: boolean;
}

interface SessionStatsState {
  stats: SessionStats;
  resetStats: () => void;
}

/** Tracks posture score, correction frequency, elapsed time, and reliable reps. */
export function useSessionStats(active: boolean, analysis: PoseAnalysis | null): SessionStatsState {
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS);
  const lastTimestampRef = useRef(0);
  const repPhaseRef = useRef<RepPhase>("up");

  const resetStats = useCallback(() => {
    lastTimestampRef.current = 0;
    repPhaseRef.current = "up";
    setStats({ ...EMPTY_STATS, correctionCounts: { ...EMPTY_STATS.correctionCounts } });
  }, []);

  useEffect(() => {
    if (!active || !analysis || analysis.timestamp === lastTimestampRef.current) {
      return;
    }

    lastTimestampRef.current = analysis.timestamp;
    const repUpdate = getRepUpdate(analysis, repPhaseRef);
    setStats((current) => updateStats(current, analysis, repUpdate));
  }, [active, analysis]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const timer = window.setInterval(() => {
      setStats((current) => updateElapsed(current));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active]);

  return { stats, resetStats };
}

function updateStats(
  current: SessionStats,
  analysis: PoseAnalysis,
  repUpdate: RepUpdate,
): SessionStats {
  const startedAt = current.startedAt ?? (repUpdate.setStarted ? Date.now() : null);

  if (startedAt === null) {
    return current;
  }

  const correctionCounts = { ...current.correctionCounts };
  analysis.corrections.forEach((correction) => {
    correctionCounts[correction.key] += correction.level === "good" ? 0 : 1;
  });

  return {
    ...current,
    startedAt,
    frames: current.frames + 1,
    alignedFrames: current.alignedFrames + (analysis.level === "good" ? 1 : 0),
    reps: current.reps + repUpdate.repDelta,
    correctionCounts,
  };
}

function updateElapsed(current: SessionStats): SessionStats {
  if (current.startedAt === null) {
    return current;
  }

  return {
    ...current,
    elapsedSeconds: current.elapsedSeconds + 1,
  };
}

function getRepUpdate(analysis: PoseAnalysis, repPhaseRef: MutableRefObject<RepPhase>): RepUpdate {
  if (!analysis.repSignal) {
    return { repDelta: 0, setStarted: false };
  }

  if (analysis.repSignal.value < analysis.repSignal.downThreshold) {
    repPhaseRef.current = "down";
    return { repDelta: 0, setStarted: true };
  }

  if (repPhaseRef.current === "down" && analysis.repSignal.value > analysis.repSignal.upThreshold) {
    repPhaseRef.current = "up";
    return { repDelta: 1, setStarted: true };
  }

  return { repDelta: 0, setStarted: repPhaseRef.current === "down" };
}
