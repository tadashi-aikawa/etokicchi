import type { ColorMatrix } from "pixi.js";
import type { SceneId, TimeBand, VisitView } from "../game/types.ts";
import { type FurnitureId, type FurnitureLayout, type Point, resolveFurnitureActionPoint } from "./room-furniture.ts";
import type { FixtureId } from "./room-fixtures.ts";
import type { RoomDepthDecorationId, RoomDepthDecorationOverride } from "./room-decor.ts";

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

interface GuestPresentationCommon {
  assetName: string;
  height: number;
}

export interface PositionedGuestPresentation extends GuestPresentationCommon {
  x: number;
  y: number;
  depth?: "scene" | "position";
}

export interface FurnitureAttachedGuestPresentation extends GuestPresentationCommon {
  furnitureId: FurnitureId;
  actionPointId: string;
  offset?: Point;
  // 横たわる同席者は複数の座席へまたがるため、位置と前後関係を別の行動地点から解決できるようにする。
  depthActionPointId?: string;
  depthOffset?: number;
}

export type GuestPresentation = PositionedGuestPresentation | FurnitureAttachedGuestPresentation;

interface AttachedScenePropCommon {
  assetName: string;
  height: number;
  offset: Point;
  depthOffset?: number;
}

export interface FurnitureAttachedSceneProp extends AttachedScenePropCommon {
  type: "furniture";
  furnitureId: FurnitureId;
}

export interface FixtureAttachedSceneProp extends AttachedScenePropCommon {
  type: "fixture";
  fixtureId: FixtureId;
}

export type AttachedSceneProp = FurnitureAttachedSceneProp | FixtureAttachedSceneProp;

export interface CharacterBubblePresentation {
  kind: "speech" | "thought";
  text: string;
  offset: Point;
  width: number;
  height: number;
  tailSide?: "left" | "right";
}

export interface ComfortingMaineCoonPresentation {
  assetName: string;
  height: number;
  x: number;
  y: number;
  depthOffset: number;
  observation: string;
}

export interface TatsuoWindowPresentation {
  assetName: string;
  height: number;
  x: number;
  y: number;
}

interface RoomPresentationCommon {
  sleeperAssetName: string;
  sleeperHeight: number;
  sleeperBreathing?: "smooth" | "subtle" | "alternating";
  sleeperBase?: {
    assetName: string;
    height: number;
  };
  companion?: GuestPresentation;
  visitor?: PositionedGuestPresentation;
  furnitureAssetNames?: Partial<Record<FurnitureId, string>>;
  hiddenFurnitureIds?: readonly FurnitureId[];
  hiddenDepthDecorationIds?: readonly RoomDepthDecorationId[];
  depthDecorationOverrides?: Partial<Record<RoomDepthDecorationId, RoomDepthDecorationOverride>>;
  sceneProps?: readonly AttachedSceneProp[];
  hideCharacterShadow?: boolean;
  characterBubble?: CharacterBubblePresentation;
  comfortingMaineCoon?: ComfortingMaineCoonPresentation;
  thunderstorm?: boolean;
  tatsuoWindow?: TatsuoWindowPresentation;
}

export interface LayeredRoomPresentation extends RoomPresentationCommon {
  kind: "layered";
  baseAssetName: "room-base-empty-daytime-pixel.webp";
  windowAssetName: string;
  tint: RoomTint;
}

export type RoomPresentation = LayeredRoomPresentation;

export function resolveGuestPosition(guest: GuestPresentation, furniture: FurnitureLayout): Point {
  if ("furnitureId" in guest) {
    const anchor = resolveFurnitureActionPoint(furniture, guest.furnitureId, guest.actionPointId);
    return {
      x: anchor.x + (guest.offset?.x ?? 0),
      y: anchor.y + (guest.offset?.y ?? 0),
    };
  }
  return { x: guest.x, y: guest.y };
}

export function resolveGuestDepthY(guest: GuestPresentation, sceneDepthY: number, furniture?: FurnitureLayout): number {
  if ("furnitureId" in guest) {
    if (!furniture) throw new Error("家具へ追随する同席者の描画深度には家具配置が必要です");
    const actionPointId = guest.depthActionPointId ?? guest.actionPointId;
    return resolveFurnitureActionPoint(furniture, guest.furnitureId, actionPointId).y + (guest.depthOffset ?? 0);
  }
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

const AWAKE_NIGHT_TINTS: Partial<Record<TimeBand, RoomTint>> = {
  night: { color: 0x1d2a50, alpha: 0.42 },
  deepNight: { color: 0x101a3b, alpha: 0.52 },
};

const BED_SIDE_ACTION_SCENES = new Set<SceneId>(["watchingStars", "morningStretch", "mimizouFarewell"]);

export function getRoomTint(visit: VisitView): RoomTint {
  if (visit.scene.characterPose !== "sleep") {
    const awakeTint = AWAKE_NIGHT_TINTS[visit.assignment.band];
    if (awakeTint) return awakeTint;
  }
  return TIME_TINTS[visit.assignment.band];
}

function layeredPresentation(
  visit: VisitView,
  character: RoomPresentationCommon,
  tint: RoomTint = getRoomTint(visit),
): LayeredRoomPresentation {
  const furnitureAssetNames = BED_SIDE_ACTION_SCENES.has(visit.scene.id)
    ? { bed: "furniture-bed-bare-pixel.webp", ...character.furnitureAssetNames }
    : character.furnitureAssetNames;
  return {
    kind: "layered",
    baseAssetName: "room-base-empty-daytime-pixel.webp",
    windowAssetName: TIME_WINDOW_ASSET_NAMES[visit.assignment.band],
    tint,
    ...character,
    furnitureAssetNames,
  };
}

export function getRoomPresentation(visit: VisitView): RoomPresentation {
  if (visit.scene.id === "kickedBlanket") {
    const covered = visit.interaction?.choiceId === "cover";
    return layeredPresentation(visit, {
      sleeperAssetName: covered ? "etokichi-sleep-covered-pixel.png" : "etokichi-sleep-kicked-pixel.png",
      sleeperHeight: 39,
      furnitureAssetNames: {
        bed: "furniture-bed-bare-pixel.webp",
      },
      sceneProps: covered
        ? undefined
        : [
            {
              type: "furniture",
              assetName: "scene-blanket-floor-pixel.webp",
              height: 30,
              furnitureId: "bed",
              offset: { x: 10, y: 27 },
              depthOffset: 20,
            },
          ],
    });
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

  if (visit.scene.id === "tatsuoAtWindow") {
    return layeredPresentation(
      visit,
      {
        sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
        sleeperHeight: 30,
        hiddenDepthDecorationIds: ["maineCoon"],
        thunderstorm: true,
        tatsuoWindow: {
          assetName: "tatsuo-awake-pixel.png",
          height: 48,
          x: 69,
          y: 25,
        },
      },
      { color: 0x101a3b, alpha: 0.72 },
    );
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
      sleeperHeight: 72,
      sleeperBreathing: "subtle",
      sleeperBase: {
        assetName: "etokichi-window-nap-cushion-base-pixel.png",
        height: 72,
      },
      depthDecorationOverrides: {
        maineCoon: {
          type: "absolute",
          x: 66,
          y: 300,
          depthY: 300,
          observation: "クーンちゃんも、窓から差す日なたを選んで気持ちよさそうに眠っている。",
        },
      },
    });
  }

  if (visit.scene.id === "brushingMaineCoon") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      depthDecorationOverrides: {
        maineCoon: {
          type: "absolute",
          x: 108,
          y: 322,
          depthY: 320,
          width: 68,
          height: 54,
          observation: "クーンちゃんが、ブラシへ背中を預けて気持ちよさそうに目を細めている。",
        },
      },
    });
  }

  if (visit.scene.id === "nappingOnMaineCoon") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-napping-on-maine-coon-pixel.webp",
      sleeperHeight: 56,
      sleeperBreathing: "alternating",
      hiddenDepthDecorationIds: ["maineCoon"],
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

  if (visit.scene.id === "readingComics") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      depthDecorationOverrides: {
        maineCoon: {
          type: "furniture",
          furnitureId: "bed",
          offset: { x: -3, y: -18 },
          width: 54,
          height: 43,
          depthOffset: 1,
          observation: "クーンちゃんが、ベッドの上で満足そうに丸くなっている。",
        },
      },
    });
  }

  if (visit.scene.id === "foldingLaundry") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      depthDecorationOverrides: {
        maineCoon: {
          type: "furniture",
          furnitureId: "sofa",
          assetName: "decor-cat-sofa-curled-compact-pixel.webp",
          offset: { x: 8, y: -14 },
          width: 60,
          height: 75,
          depthOffset: 1,
          observation: "クーンちゃんが、長いソファーの座面でゆったり丸くなっている。",
        },
      },
    });
  }

  if (visit.scene.id === "tatsuoTooComfortable") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      companion: {
        assetName: "tatsuo-too-comfortable-pixel.png",
        height: 88,
        furnitureId: "sofa",
        actionPointId: "sitRear",
        offset: { x: -2, y: 34 },
        depthActionPointId: "sit",
        depthOffset: 30,
      },
    });
  }

  if (visit.scene.id === "littleNightSnack") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      depthDecorationOverrides: {
        maineCoon: {
          type: "absolute",
          assetName: "decor-cat-loaf-blink-pixel.webp",
          x: 83,
          y: 286,
          depthY: 286,
          width: 60,
          height: 48,
          animation: {
            columns: 4,
            frameDurationsMs: [2600, 80, 110, 80],
          },
          observation: "クーンちゃんが目をぱちぱちさせながら、エトキチの秘密の夜食を見つめている。",
        },
      },
    });
  }

  if (visit.scene.id === "comfortingMaineCoon") {
    return layeredPresentation(
      visit,
      {
        sleeperAssetName: "etokichi-sleep-pixel.webp",
        sleeperHeight: 42,
        hiddenDepthDecorationIds: ["maineCoon"],
        comfortingMaineCoon: {
          assetName: "etokichi-comforting-maine-coon-pixel.webp",
          height: 73,
          x: 96,
          y: 326,
          depthOffset: 20,
          observation: "怖がるクーンちゃんを、エトキチが離さないようにやさしく抱きしめている。",
        },
        characterBubble: {
          kind: "speech",
          text: "大丈夫だよー",
          offset: { x: 0, y: -94 },
          width: 80,
          height: 27,
          tailSide: "left",
        },
        thunderstorm: true,
      },
      { color: 0x364963, alpha: 0.32 },
    );
  }

  if (visit.scene.id === "simmeringDinner") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      hideCharacterShadow: true,
      hiddenFurnitureIds: ["roundStool"],
      characterBubble: {
        kind: "thought",
        text: "♪",
        offset: { x: -19, y: -69 },
        width: 28,
        height: 22,
      },
      sceneProps: [
        {
          type: "fixture",
          assetName: "scene-simmering-pot-pixel.webp",
          height: 24,
          fixtureId: "kitchenUnit",
          offset: { x: -18, y: -54 },
          depthOffset: -10,
        },
        {
          type: "fixture",
          assetName: "furniture-round-stool-pixel.webp",
          height: 34,
          fixtureId: "kitchenUnit",
          offset: { x: -44, y: 1 },
          depthOffset: 0,
        },
      ],
    });
  }

  return layeredPresentation(visit, {
    sleeperAssetName: "etokichi-sleep-pixel.webp",
    sleeperHeight: 42,
  });
}
