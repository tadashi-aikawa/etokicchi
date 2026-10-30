import type { ResolvedWaypoint } from "./route-definitions.ts";
import type { Point } from "./room-furniture.ts";

type Direction = "down" | "left" | "right" | "up";
export const HALLOWEEN_GHOST_QUILT_DEPTH_Y = 166;
export interface HalloweenGhostFrame extends Point {
  depthY: number;
  phase: "approach" | "curious" | "surprise" | "relief" | "return" | "reset";
  walking: boolean;
  direction: Direction;
  column: number;
  reaction: 0 | 1 | 2;
  guestFrame: 0 | 1 | 2;
  jump: number;
}

interface Beat {
  from: Point;
  to: Point;
  duration: number;
  phase: HalloweenGhostFrame["phase"];
  walking?: boolean;
  reaction: 0 | 1 | 2;
  guestFrame: 0 | 1 | 2;
  jump?: boolean;
}

// 接近・飛び出し・跳び退きが別々のループでずれないよう、全員を同じ生活シーンの時計で動かす。
export function getHalloweenGhostFrame(elapsedMs: number, route: readonly ResolvedWaypoint[]): HalloweenGhostFrame {
  const [start, midway, bedside, retreat] = route;
  if (!start || !midway || !bedside || !retreat) throw new Error("おばけの経路には4地点が必要です");
  const travel = (from: Point, to: Point) => (Math.hypot(to.x - from.x, to.y - from.y) / 19) * 1000;
  const beats: Beat[] = [
    { from: start, to: start, duration: 1200, phase: "approach", reaction: 0, guestFrame: 0 },
    {
      from: start,
      to: midway,
      duration: travel(start, midway),
      phase: "approach",
      walking: true,
      reaction: 0,
      guestFrame: 0,
    },
    {
      from: midway,
      to: bedside,
      duration: travel(midway, bedside),
      phase: "approach",
      walking: true,
      reaction: 0,
      guestFrame: 0,
    },
    // ベッド脇へ着くまでは布団のふくらみだけを見せ、近づいてから不思議がる間を置く。
    { from: bedside, to: bedside, duration: 1600, phase: "curious", reaction: 0, guestFrame: 0 },
    { from: bedside, to: retreat, duration: 650, phase: "surprise", reaction: 1, guestFrame: 1, jump: true },
    { from: retreat, to: retreat, duration: 1100, phase: "surprise", reaction: 1, guestFrame: 1 },
    { from: retreat, to: retreat, duration: 2200, phase: "relief", reaction: 2, guestFrame: 2 },
    {
      from: retreat,
      to: midway,
      duration: travel(retreat, midway),
      phase: "return",
      walking: true,
      reaction: 2,
      guestFrame: 2,
    },
    {
      from: midway,
      to: start,
      duration: travel(midway, start),
      phase: "return",
      walking: true,
      reaction: 2,
      guestFrame: 2,
    },
    { from: start, to: start, duration: 1600, phase: "reset", reaction: 0, guestFrame: 0 },
  ];
  const period = beats.reduce((sum, beat) => sum + beat.duration, 0);
  let time = Math.max(0, elapsedMs) % period;
  for (const beat of beats) {
    if (time >= beat.duration) {
      time -= beat.duration;
      continue;
    }
    const progress = time / beat.duration;
    const dx = beat.to.x - beat.from.x;
    const dy = beat.to.y - beat.from.y;
    const direction: Direction = beat.walking
      ? Math.abs(dx) > Math.abs(dy)
        ? dx < 0
          ? "left"
          : "right"
        : dy < 0
          ? "up"
          : "down"
      : "left";
    const y = beat.from.y + dy * progress;
    return {
      x: beat.from.x + dx * progress,
      y,
      depthY: Math.max(y, HALLOWEEN_GHOST_QUILT_DEPTH_Y),
      phase: beat.phase,
      walking: beat.walking ?? false,
      direction,
      column: beat.walking ? ([0, 1, 2, 1][Math.floor(time / 160) % 4] ?? 1) : 1,
      reaction: beat.reaction,
      guestFrame: beat.guestFrame,
      jump: beat.jump ? Math.sin(progress * Math.PI) * 13 : 0,
    };
  }
  throw new Error("おばけの時刻を解決できません");
}
