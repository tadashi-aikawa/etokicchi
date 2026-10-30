import type { RoomPresentationCommon } from "../rendering/room-presentation-types.ts";
import { HALLOWEEN_GHOST_QUILT_DEPTH_Y } from "../rendering/halloween-ghost.ts";
import { point } from "../rendering/route-definitions.ts";
import type { ScenePresentationDefinition } from "./scene-presentations.ts";

const DEFAULT_ROOM: RoomPresentationCommon = {
  sleeperAssetName: "etokichi-sleep-pixel.webp",
  sleeperHeight: 42,
};

function guestRoom(
  assetName: string,
  height: number,
  x: number,
  y: number,
  lines: readonly [string, string, string],
): RoomPresentationCommon {
  return {
    ...DEFAULT_ROOM,
    companion: {
      assetName,
      height,
      x,
      y,
      depth: "position",
      animation: {
        columns: 3,
        rows: 1,
        frames: lines.map((speech, index) => ({ durationMs: index === 2 ? 2400 : 1800, speech })),
      },
    },
  };
}

export const HALLOWEEN_PRESENTATIONS = {
  halloweenGarland: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: point(98, 176), pauseMs: 5000, action: true }],
    },
    action: { assetName: "etokichi-halloween-garland-pixel.webp" },
    observations: {
      bookshelf: "オレンジ色の紙とひもが抜き出され、飾りつけの本が開いている。",
      window: "まだ薄暗い窓に、できたての紙のかぼちゃを一つ透かしてみている。",
    },
    thoughts: { maineCoon: "そのひも、ひとつだけわたしにくれないかしら。" },
    collectionImage: "assets/collection/halloween-garland.webp",
    room: DEFAULT_ROOM,
  },
  halloweenWitchCat: {
    route: {
      movement: "walking",
      waypoints: [
        { destination: point(61, 316), pauseMs: 4200, action: true, actionFacing: "right", actionOffsetY: 7 },
        { destination: point(61, 290), pauseMs: 400, idleFacing: "right" },
        { destination: point(49, 277), pauseMs: 900, idleFacing: "down" },
        { destination: point(52, 291), pauseMs: 0 },
      ],
    },
    action: { assetName: "etokichi-halloween-cat-chat-pixel.webp" },
    observations: {
      sofa: "いつもの寝床は空っぽ。今日は魔女のお披露目が先らしい。",
      bookshelf: "帽子の作り方を見た本に、紫のリボンが挟まっている。",
    },
    collectionImage: "assets/collection/halloween-witch-cat.webp",
    room: {
      ...guestRoom("maine-coon-halloween-witch-pixel.webp", 64, 104, 318, [
        "お耳が隠れちゃうの。",
        "ちょいと直すの。",
        "ごはんを出す魔法なの。",
      ]),
      hiddenDepthDecorationIds: ["maineCoon"],
    },
  },
  halloweenPumpkinPup: {
    route: {
      movement: "walking",
      waypoints: [
        {
          destination: point(132, 198),
          pauseMs: 3800,
          action: true,
          actionFacing: "left",
          actionOffsetY: 12,
          actionScale: 1.12,
        },
        { destination: point(140, 238), pauseMs: 800, idleFacing: "up" },
        { destination: point(137, 190), pauseMs: 600, idleFacing: "left" },
      ],
    },
    action: { assetName: "etokichi-halloween-pumpkin-play-pixel.webp" },
    observations: {
      window: "窓辺へ運ぶはずのかぼちゃが、まだ床の上でころころしている。",
      floorPlant: "植木鉢のある隅まで転がさないよう、エトキチがそっと見守っている。",
    },
    thoughts: { maineCoon: "追いかけるのはわたしの得意技なの。今日は見てるだけなの。" },
    collectionImage: "assets/collection/halloween-pumpkin-pup.webp",
    room: guestRoom("masaharu-halloween-pumpkin-pixel.webp", 61, 86, 191, [
      "くんくん……わふっ！",
      "わんっ、わんっ！",
      "わふ！ ……はっ、はっ。",
    ]),
  },
  halloweenPumpkinSkewer: {
    route: {
      movement: "walking",
      waypoints: [
        { destination: point(92, 291), pauseMs: 3900, action: true, actionFacing: "right", actionOffsetY: 5 },
        { destination: point(78, 273), pauseMs: 1200, idleFacing: "up" },
        { destination: point(96, 266), pauseMs: 600, idleFacing: "right" },
      ],
    },
    action: { assetName: "etokichi-watching-sunagimo-pixel.webp" },
    observations: {
      stove: "かぼちゃの甘い香りがする。串の焼き目は、砂肝が一つずつ確かめた。",
      diningSet: "かぼちゃの串を分けるお皿が、みんなの分だけ用意されている。",
    },
    thoughts: { maineCoon: "今日の串はいつもと違うにおいなの。お顔までついてるの。" },
    collectionImage: "assets/collection/halloween-pumpkin-skewer.webp",
    room: {
      ...guestRoom("sunagimo-halloween-pumpkin-pixel.webp", 54, 136, 294, [
        "かぼちゃを焼くギモ",
        "裏もこんがりギモ",
        "食べごろギモ！",
      ]),
      hiddenFurnitureIds: ["roundStool"],
      depthDecorationOverrides: {
        maineCoon: { type: "absolute", x: 82, y: 338, width: 60, height: 48 },
      },
    },
  },
  halloweenCandyOwl: {
    route: {
      movement: "walking",
      waypoints: [
        { destination: point(121, 152), pauseMs: 4200, action: true, actionFacing: "left", actionOffsetY: 7 },
        { destination: point(136, 173), pauseMs: 400, idleFacing: "left" },
        { destination: point(113, 190), pauseMs: 800, idleFacing: "up" },
      ],
    },
    action: { assetName: "etokichi-halloween-candy-receive-pixel.webp" },
    observations: {
      window: "みみぞうが運んできたバケツの取っ手に、夜露が一粒光っている。",
      bookshelf: "みんなへ配るお菓子を置けるように、棚の端が空けてある。",
    },
    thoughts: { maineCoon: "わたしは包みのかさかさした音が好きなの。" },
    collectionImage: "assets/collection/halloween-candy-owl.webp",
    room: guestRoom("mimizou-halloween-candy-pixel.webp", 64, 77, 150, [
      "どれがいいホー？",
      "大きいのにするホー。",
      "はい、どうぞホー。",
    ]),
  },
  halloweenGentleGhost: {
    // 往復の5地点を衝突検査へ渡す。段階の時間はhalloween-ghost.tsの共通時計だけで管理する。
    route: {
      movement: "walking",
      waypoints: [
        { destination: point(117, 211), pauseMs: 0, action: true, actionOffsetY: 7 },
        { destination: point(90, 180), pauseMs: 0 },
        { destination: point(82, 158), pauseMs: 0, action: true },
        { destination: point(100, 178), pauseMs: 0, action: true },
        { destination: point(90, 180), pauseMs: 0 },
      ],
    },
    action: { assetName: "etokichi-halloween-ghost-reaction-pixel.webp" },
    observations: {
      bed: "だれもいないはずの布団が、こんもりふくらんでいる。時々、もぞりと動いた気がする。",
      window: "窓の月明かりに、シーツの白い裾がふわりと光る。",
    },
    thoughts: { maineCoon: "あんなに布団がふくらんでたら、だれがいるか分かるの。" },
    collectionImage: "assets/collection/halloween-gentle-ghost.webp",
    room: {
      ...guestRoom("tatsuo-halloween-ambush-pixel.webp", 72, 36, 166, [
        "しーっ……まだ内緒ウホ。",
        "ばあっ！ おばけだウホ！",
        "びっくりさせたウホ。",
      ]),
      furnitureAssetNames: { bed: "furniture-bed-bare-pixel.webp" },
      sceneProps: [
        {
          type: "furniture",
          furnitureId: "bed",
          assetName: "scene-halloween-raised-quilt-pixel.webp",
          height: 78,
          depthY: HALLOWEEN_GHOST_QUILT_DEPTH_Y,
          offset: { x: 8, y: -3 },
        },
      ],
    },
  },
} satisfies Record<string, ScenePresentationDefinition>;
