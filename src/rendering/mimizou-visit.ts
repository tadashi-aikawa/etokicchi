const TIMING = {
  cycle: 9800,
  appearStart: 2000,
  appearEnd: 3400,
  reactStart: 5200,
  disappearStart: 6900,
  disappearEnd: 8500,
} as const;

export interface MimizouVisitFrame {
  reacting: boolean;
  reactionHop: number;
  visitorInteractive: boolean;
  visitorVisibility: number;
  visitorYOffset: number;
}

function progressBetween(elapsed: number, start: number, end: number): number {
  return Math.min(Math.max((elapsed - start) / (end - start), 0), 1);
}

export function getMimizouVisitFrame(elapsedMs: number): MimizouVisitFrame {
  const elapsed = ((elapsedMs % TIMING.cycle) + TIMING.cycle) % TIMING.cycle;
  const appearing = progressBetween(elapsed, TIMING.appearStart, TIMING.appearEnd);
  const disappearing = progressBetween(elapsed, TIMING.disappearStart, TIMING.disappearEnd);
  const visitorVisibility = Math.min(appearing, 1 - disappearing);
  const reacting = elapsed >= TIMING.reactStart;
  const reactionProgress = reacting ? Math.min((elapsed - TIMING.reactStart) / 450, 1) : 0;

  return {
    reacting,
    reactionHop: Math.sin(reactionProgress * Math.PI) * 3,
    visitorInteractive: visitorVisibility > 0.15,
    visitorVisibility,
    visitorYOffset: (1 - visitorVisibility) * 8 + Math.sin(elapsed / 420) * visitorVisibility,
  };
}
