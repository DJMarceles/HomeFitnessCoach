import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseAnalysis } from "../lib/pose/poseTypes";
import { SessionEngine } from "../lib/pose/sessionEngine";

export function useSessionStats(active: boolean, analysis: PoseAnalysis | null, target: number) {
  const engine = useRef(new SessionEngine(target));
  const [stats, setStats] = useState(engine.current.stats);
  const resetStats = useCallback(() => {
    engine.current = new SessionEngine(target);
    setStats(engine.current.stats);
  }, [target]);
  useEffect(resetStats, [resetStats]);
  useEffect(() => {
    if (active) setStats(engine.current.feed(analysis));
    else engine.current.interrupt();
  }, [active, analysis]);
  return { stats, resetStats };
}
