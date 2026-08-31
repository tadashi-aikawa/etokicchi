import type { VisitView } from "../game/types.ts";

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

export function getRoomPresentation(visit: VisitView): RoomPresentation {
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

  if (visit.scene.id === "sleeping") {
    return {
      backgroundAssetName: "room-background-pixel.webp",
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 30,
    };
  }

  if (visit.scene.id === "sleepingWithTatsuo") {
    return {
      backgroundAssetName: "room-background-pixel.webp",
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

  if (visit.scene.id === "mimizouVisit") {
    return {
      backgroundAssetName: "room-background-pixel.webp",
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      visitor: {
        assetName: "mimizou-pixel.png",
        height: 31,
        x: 49,
        y: 60,
      },
    };
  }

  if (visit.scene.id === "watchingStars" && visit.mimizouPresent) {
    return {
      backgroundAssetName: "room-background-pixel.webp",
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
    backgroundAssetName: "room-background-pixel.webp",
    sleeperAssetName: "etokichi-sleep-pixel.webp",
    sleeperHeight: 42,
  };
}
