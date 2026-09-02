import type { TimeBand, VisitView } from "../game/types.ts";

const TIME_BACKGROUND_ASSET_NAMES: Record<TimeBand, string> = {
  earlyMorning: "room-background-early-morning-pixel.webp",
  morning: "room-background-morning-pixel.webp",
  daytime: "room-background-daytime-pixel.webp",
  evening: "room-background-evening-pixel.webp",
  night: "room-background-night-pixel.webp",
  deepNight: "room-background-deep-night-pixel.webp",
};

export interface RoomPresentation {
  backgroundAssetName: string;
  sleeperAssetName: string;
  sleeperHeight: number;
  companion?: {
    assetName: string;
    height: number;
    x: number;
    y: number;
  };
  visitor?: {
    assetName: string;
    height: number;
    x: number;
    y: number;
  };
}

export interface RoomTint {
  color: number;
  alpha: number;
}

const TIME_TINTS: Record<TimeBand, RoomTint> = {
  earlyMorning: { color: 0xffc578, alpha: 0.02 },
  morning: { color: 0xffdc9c, alpha: 0.01 },
  daytime: { color: 0xfff1c6, alpha: 0 },
  evening: { color: 0xc75b45, alpha: 0.02 },
  night: { color: 0x1d2a50, alpha: 0.08 },
  deepNight: { color: 0x101a3b, alpha: 0.15 },
};

export function getRoomTint(visit: VisitView): RoomTint {
  if (visit.scene.id === "kickedBlanket") {
    return { color: 0x101a3b, alpha: 0.56 };
  }
  return TIME_TINTS[visit.assignment.band];
}

export function getRoomPresentation(visit: VisitView): RoomPresentation {
  const timeBackgroundAssetName = TIME_BACKGROUND_ASSET_NAMES[visit.assignment.band];

  if (visit.scene.id === "kickedBlanket" && visit.interaction?.choiceId === "cover") {
    return {
      backgroundAssetName: "room-background-covered-pixel.webp",
      sleeperAssetName: "etokichi-sleep-covered-pixel.png",
      sleeperHeight: 39,
    };
  }

  if (visit.scene.id === "kickedBlanket") {
    return {
      backgroundAssetName: "room-background-kicked-blanket-pixel.webp",
      sleeperAssetName: "etokichi-sleep-kicked-pixel.png",
      sleeperHeight: 39,
    };
  }

  if (visit.scene.id === "sleeping" || visit.scene.id === "almostAwake") {
    return {
      backgroundAssetName: timeBackgroundAssetName,
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 30,
    };
  }

  if (visit.scene.id === "sleepingWithTatsuo") {
    return {
      backgroundAssetName: timeBackgroundAssetName,
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 28,
      companion: {
        assetName: "tatsuo-sleeping-pixel.png",
        height: 80,
        x: 61,
        y: 170,
      },
    };
  }

  if (visit.scene.id === "tatsuoWakeUp") {
    return {
      backgroundAssetName: timeBackgroundAssetName,
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 28,
      companion: {
        assetName: "tatsuo-awake-pixel-v2.png",
        height: 80,
        x: 61,
        y: 170,
      },
    };
  }

  if (visit.scene.id === "mimizouVisit" || visit.scene.id === "mimizouFarewell") {
    return {
      backgroundAssetName: timeBackgroundAssetName,
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      visitor: {
        assetName: "mimizou-pixel.png",
        height: 40,
        x: 49,
        y: 60,
      },
    };
  }

  if (visit.scene.id === "watchingStars" && visit.mimizouPresent) {
    return {
      backgroundAssetName: timeBackgroundAssetName,
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      companion: {
        assetName: "mimizou-pixel.png",
        height: 34,
        x: 84,
        y: 128,
      },
    };
  }

  return {
    backgroundAssetName: timeBackgroundAssetName,
    sleeperAssetName: "etokichi-sleep-pixel.webp",
    sleeperHeight: 42,
  };
}
