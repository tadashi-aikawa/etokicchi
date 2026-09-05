const THUNDER_COMFORT_CYCLE_MS = 7_200;

export const THUNDER_FLASH_COLOR = 0xffd45c;

export const RAIN_WINDOW_BOUNDS = {
  x: 34,
  y: 29,
  width: 34,
  height: 47,
} as const;

interface FlashPulse {
  startMs: number;
  peakMs: number;
  endMs: number;
  alpha: number;
}

export interface RainDropSeed {
  x: number;
  y: number;
  speed: number;
  length: number;
  alpha: number;
}

export interface ThunderComfortFrame {
  flashAlpha: number;
  trembleX: number;
  embraceScale: number;
}

const FLASH_PULSES: readonly FlashPulse[] = [
  { startMs: 820, peakMs: 900, endMs: 1_030, alpha: 0.42 },
  { startMs: 1_100, peakMs: 1_160, endMs: 1_280, alpha: 0.24 },
  { startMs: 4_500, peakMs: 4_580, endMs: 4_720, alpha: 0.32 },
];

export const RAIN_DROP_SEEDS: readonly RainDropSeed[] = [
  { x: 2, y: 4, speed: 25, length: 5, alpha: 0.68 },
  { x: 8, y: 31, speed: 20, length: 4, alpha: 0.55 },
  { x: 14, y: 16, speed: 29, length: 6, alpha: 0.72 },
  { x: 20, y: 45, speed: 23, length: 5, alpha: 0.6 },
  { x: 27, y: 8, speed: 31, length: 7, alpha: 0.75 },
  { x: 34, y: 37, speed: 21, length: 4, alpha: 0.52 },
  { x: 40, y: 22, speed: 27, length: 6, alpha: 0.7 },
  { x: 47, y: 50, speed: 24, length: 5, alpha: 0.62 },
  { x: 53, y: 12, speed: 30, length: 6, alpha: 0.74 },
  { x: 5, y: 24, speed: 22, length: 4, alpha: 0.56 },
  { x: 11, y: 52, speed: 28, length: 6, alpha: 0.68 },
  { x: 18, y: 2, speed: 19, length: 4, alpha: 0.5 },
  { x: 25, y: 29, speed: 32, length: 7, alpha: 0.76 },
  { x: 31, y: 18, speed: 24, length: 5, alpha: 0.61 },
  { x: 38, y: 48, speed: 29, length: 6, alpha: 0.7 },
  { x: 44, y: 6, speed: 21, length: 4, alpha: 0.54 },
  { x: 50, y: 34, speed: 26, length: 5, alpha: 0.65 },
  { x: 55, y: 20, speed: 30, length: 6, alpha: 0.72 },
];

function loop(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function pulseAlpha(phaseMs: number, pulse: FlashPulse): number {
  if (phaseMs < pulse.startMs || phaseMs >= pulse.endMs) return 0;
  if (phaseMs <= pulse.peakMs) {
    return ((phaseMs - pulse.startMs) / (pulse.peakMs - pulse.startMs)) * pulse.alpha;
  }
  return ((pulse.endMs - phaseMs) / (pulse.endMs - pulse.peakMs)) * pulse.alpha;
}

function tremble(phaseMs: number, startMs: number, durationMs: number, amount: number): number {
  const elapsed = phaseMs - startMs;
  if (elapsed < 0 || elapsed >= durationMs) return 0;
  return (Math.floor(elapsed / 55) % 2 === 0 ? -1 : 1) * amount;
}

function embrace(phaseMs: number, startMs: number, durationMs: number, amount: number): number {
  const elapsed = phaseMs - startMs;
  if (elapsed < 0 || elapsed >= durationMs) return 1;
  return 1 + Math.sin((elapsed / durationMs) * Math.PI) * amount;
}

export function getThunderComfortFrame(elapsedMs: number): ThunderComfortFrame {
  const phaseMs = loop(elapsedMs, THUNDER_COMFORT_CYCLE_MS);
  return {
    flashAlpha: Math.max(...FLASH_PULSES.map((pulse) => pulseAlpha(phaseMs, pulse))),
    trembleX: tremble(phaseMs, 900, 420, 0.8) + tremble(phaseMs, 4_580, 320, 0.55),
    embraceScale: Math.max(embrace(phaseMs, 1_220, 1_500, 0.025), embrace(phaseMs, 4_850, 1_200, 0.018)),
  };
}

export function getRainDropPosition(seed: RainDropSeed, elapsedMs: number): { x: number; y: number } {
  const distance = (elapsedMs / 1_000) * seed.speed;
  return {
    x: RAIN_WINDOW_BOUNDS.x + loop(seed.x - distance * 0.18, RAIN_WINDOW_BOUNDS.width),
    y: RAIN_WINDOW_BOUNDS.y + loop(seed.y + distance, RAIN_WINDOW_BOUNDS.height),
  };
}
