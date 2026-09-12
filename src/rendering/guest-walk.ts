import type { Point } from "./room-furniture.ts";

export type GuestDirection = "down" | "left" | "right" | "up";

export interface GuestWalk {
  speed: number;
  waypoints: readonly (Point & { pauseMs: number; facing: GuestDirection })[];
}

/** 同じ時計で位置と足のコマを決め、停止中の足踏みや周回時の瞬間移動を防ぐ。 */
export function getGuestWalkFrame(walk: GuestWalk, elapsedMs: number) {
  if (walk.speed <= 0 || walk.waypoints.length < 2) throw new Error("同席者の歩行経路が不正です");
  const segments = walk.waypoints.map((from, index) => {
    const to = walk.waypoints[(index + 1) % walk.waypoints.length];
    if (!to) throw new Error("同席者の歩行先がありません");
    return { from, to, duration: (Math.hypot(to.x - from.x, to.y - from.y) / walk.speed) * 1000 };
  });
  const period = segments.reduce((sum, { from, duration }) => sum + from.pauseMs + duration, 0);
  if (period <= 0) throw new Error("同席者の歩行周期が不正です");
  let time = Math.max(0, elapsedMs) % period;
  for (const { from, to, duration } of segments) {
    if (time < from.pauseMs) return { x: from.x, y: from.y, direction: from.facing, column: 1, walking: false };
    time -= from.pauseMs;
    if (time < duration) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const direction: GuestDirection =
        Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
      return {
        x: from.x + dx * (time / duration),
        y: from.y + dy * (time / duration),
        direction,
        column: [0, 1, 2, 1][Math.floor(time / 160) % 4] ?? 1,
        walking: true,
      };
    }
    time -= duration;
  }
  throw new Error("同席者の歩行時刻を解決できません");
}
