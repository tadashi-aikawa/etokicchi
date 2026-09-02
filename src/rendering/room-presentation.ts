import type { ColorMatrix } from "pixi.js";
import type { TimeBand, VisitView } from "../game/types.ts";

const TIME_WINDOW_ASSET_NAMES: Record<TimeBand, string> = {
  earlyMorning: "room-background-early-morning-pixel.webp",
  morning: "room-background-morning-pixel.webp",
  daytime: "room-background-daytime-pixel.webp",
  evening: "room-background-evening-pixel.webp",
  night: "room-background-night-pixel.webp",
  deepNight: "room-background-deep-night-pixel.webp",
};

export interface RoomTint {
  color: number;
  alpha: number;
}

export interface GuestPresentation {
  assetName: string;
  height: number;
  x: number;
  y: number;
  depth?: "scene" | "position";
}

interface RoomPresentationCommon {
  sleeperAssetName: string;
  sleeperHeight: number;
  sleeperBase?: {
    assetName: string;
    height: number;
  };
  companion?: GuestPresentation;
  visitor?: GuestPresentation;
}

export interface LayeredRoomPresentation extends RoomPresentationCommon {
  kind: "layered";
  baseAssetName: "room-base-daytime-pixel.webp";
  windowAssetName: string;
  tint: RoomTint;
}

export interface LegacyRoomPresentation extends RoomPresentationCommon {
  kind: "legacy";
  backgroundAssetName: string;
  tint: RoomTint;
  tintPlacement: "beforeCharacters";
  characterOrder: "companionVisitorForegroundBaseCharacter";
}

export type RoomPresentation = LayeredRoomPresentation | LegacyRoomPresentation;

export function resolveGuestDepthY(guest: GuestPresentation, sceneDepthY: number): number {
  return guest.depth === "scene" ? sceneDepthY : guest.y;
}

export function getLightingColorMatrix({ color, alpha }: RoomTint): ColorMatrix {
  const retained = 1 - alpha;
  return [
    retained,
    0,
    0,
    0,
    ((color >> 16) & 0xff) * (alpha / 255),
    0,
    retained,
    0,
    0,
    ((color >> 8) & 0xff) * (alpha / 255),
    0,
    0,
    retained,
    0,
    (color & 0xff) * (alpha / 255),
    0,
    0,
    0,
    1,
    0,
  ];
}

const TIME_TINTS: Record<TimeBand, RoomTint> = {
  // The layered room starts from a time-neutral base, so these values carry the
  // room lighting that used to be baked into each full-background asset.
  earlyMorning: { color: 0xffc578, alpha: 0.12 },
  morning: { color: 0xffdc9c, alpha: 0.05 },
  daytime: { color: 0xfff1c6, alpha: 0 },
  evening: { color: 0xc75b45, alpha: 0.18 },
  night: { color: 0x1d2a50, alpha: 0.52 },
  deepNight: { color: 0x101a3b, alpha: 0.65 },
};

export function getRoomTint(visit: VisitView): RoomTint {
  if (visit.scene.id === "kickedBlanket") return { color: 0x101a3b, alpha: 0.56 };
  return TIME_TINTS[visit.assignment.band];
}

function layeredPresentation(visit: VisitView, character: RoomPresentationCommon): LayeredRoomPresentation {
  return {
    kind: "layered",
    baseAssetName: "room-base-daytime-pixel.webp",
    windowAssetName: TIME_WINDOW_ASSET_NAMES[visit.assignment.band],
    tint: getRoomTint(visit),
    ...character,
  };
}

export function getRoomPresentation(visit: VisitView): RoomPresentation {
  if (visit.scene.id === "kickedBlanket") {
    const covered = visit.interaction?.choiceId === "cover";
    return {
      kind: "legacy",
      backgroundAssetName: covered ? "room-background-covered-pixel.webp" : "room-background-kicked-blanket-pixel.webp",
      tint: getRoomTint(visit),
      tintPlacement: "beforeCharacters",
      characterOrder: "companionVisitorForegroundBaseCharacter",
      sleeperAssetName: covered ? "etokichi-sleep-covered-pixel.png" : "etokichi-sleep-kicked-pixel.png",
      sleeperHeight: 39,
    };
  }

  if (visit.scene.id === "sleeping" || visit.scene.id === "almostAwake") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 30,
    });
  }

  if (visit.scene.id === "sleepingWithTatsuo") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 28,
      companion: {
        assetName: "tatsuo-sleeping-pixel.png",
        height: 80,
        x: 61,
        y: 170,
        depth: "scene",
      },
    });
  }

  if (visit.scene.id === "tatsuoWakeUp") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 28,
      companion: {
        assetName: "tatsuo-awake-pixel-v2.png",
        height: 80,
        x: 76,
        y: 170,
        depth: "scene",
      },
    });
  }

  if (visit.scene.id === "windowNap") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-window-nap-star-book-pixel.png",
      sleeperHeight: 64,
      sleeperBase: {
        assetName: "etokichi-window-nap-cushion-base-pixel.png",
        height: 64,
      },
    });
  }

  if (visit.scene.id === "mimizouVisit" || visit.scene.id === "mimizouFarewell") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      visitor: {
        assetName: "mimizou-pixel.png",
        height: 40,
        x: 49,
        y: 60,
      },
    });
  }

  if (visit.scene.id === "watchingStars" && visit.mimizouPresent) {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      companion: {
        assetName: "mimizou-pixel.png",
        height: 34,
        x: 84,
        y: 128,
      },
    });
  }

  return layeredPresentation(visit, {
    sleeperAssetName: "etokichi-sleep-pixel.webp",
    sleeperHeight: 42,
  });
}
