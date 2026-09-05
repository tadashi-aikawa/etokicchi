const THUNDER_WINDOW_CYCLE_MS = 9_000;

interface FlashPulse {
  startMs: number;
  peakMs: number;
  holdUntilMs: number;
  endMs: number;
  alpha: number;
}

export type ThunderWindowPose = "sleeping" | "awake" | "startled" | "hidden";

export interface ThunderWindowFrame {
  flashAlpha: number;
  tatsuoVisibility: number;
  pose: ThunderWindowPose;
  trembleX: number;
}

const FLASH_PULSES: readonly FlashPulse[] = [
  { startMs: 2_000, peakMs: 2_050, holdUntilMs: 2_080, endMs: 2_180, alpha: 0.3 },
  { startMs: 2_550, peakMs: 2_600, holdUntilMs: 2_630, endMs: 2_730, alpha: 0.34 },
  { startMs: 3_300, peakMs: 3_390, holdUntilMs: 3_950, endMs: 4_180, alpha: 0.5 },
];

function loop(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function pulseAlpha(phaseMs: number, pulse: FlashPulse): number {
  if (phaseMs < pulse.startMs || phaseMs >= pulse.endMs) return 0;
  if (phaseMs < pulse.peakMs) return ((phaseMs - pulse.startMs) / (pulse.peakMs - pulse.startMs)) * pulse.alpha;
  if (phaseMs < pulse.holdUntilMs) return pulse.alpha;
  return ((pulse.endMs - phaseMs) / (pulse.endMs - pulse.holdUntilMs)) * pulse.alpha;
}

function envelope(phaseMs: number, startMs: number, fadeInMs: number, holdMs: number, fadeOutMs: number): number {
  const elapsed = phaseMs - startMs;
  if (elapsed < 0 || elapsed >= fadeInMs + holdMs + fadeOutMs) return 0;
  if (elapsed < fadeInMs) return elapsed / fadeInMs;
  if (elapsed < fadeInMs + holdMs) return 1;
  return 1 - (elapsed - fadeInMs - holdMs) / fadeOutMs;
}

function resolvePose(phaseMs: number): ThunderWindowPose {
  if (phaseMs < 1_250 || phaseMs >= 8_050) return "sleeping";
  if (phaseMs < 4_180) return "awake";
  if (phaseMs < 5_650) return "startled";
  if (phaseMs < 7_200) return "awake";
  return "hidden";
}

export function getThunderWindowFrame(elapsedMs: number): ThunderWindowFrame {
  const phaseMs = loop(elapsedMs, THUNDER_WINDOW_CYCLE_MS);
  const pose = resolvePose(phaseMs);
  return {
    flashAlpha: Math.max(...FLASH_PULSES.map((pulse) => pulseAlpha(phaseMs, pulse))),
    tatsuoVisibility: envelope(phaseMs, 3_400, 70, 420, 120),
    pose,
    trembleX: pose === "startled" ? (Math.floor((phaseMs - 4_180) / 65) % 2 === 0 ? -0.8 : 0.8) : 0,
  };
}
