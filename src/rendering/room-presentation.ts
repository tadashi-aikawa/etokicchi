import type { ColorMatrix } from "pixi.js";
import type { SceneId, TimeBand, VisitView } from "../game/types.ts";
import { type FurnitureId, type FurnitureLayout, type Point, resolveFurnitureActionPoint } from "./room-furniture.ts";
import type { FixtureHotspotId, FixtureId } from "./room-fixtures.ts";
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

// タップで観察できる対象。家具・キッチンの部位・キッチン本体・窓をひとつの識別子空間にまとめる。
export type ObservationTargetId = FurnitureId | FixtureHotspotId | FixtureId | "window";

export type ObservationOverrides = Partial<Record<ObservationTargetId, string>>;

export const WINDOW_OBSERVATIONS: Record<TimeBand, string> = {
  earlyMorning: "空が白み始めて、街はまだ静かだ。",
  morning: "朝の光が窓いっぱいに差し込んでいる。",
  daytime: "昼の空が高く、遠くの洗濯物が風に揺れている。",
  evening: "夕焼けが街の輪郭をオレンジに染めている。",
  night: "街の明かりがぽつぽつと灯り始めている。",
  deepNight: "街は眠り、窓には小さな星がいくつか見える。",
};

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

interface ScenePropCommon {
  assetName: string;
  height: number;
  depthOffset?: number;
  // 描画深度だけを配置位置から切り離す。家具の天板へ置いた小物を家具より手前に描くために使う。
  depthY?: number;
  // 経路のこのwaypoint(0始まり)へキャラクターが到着するまで隠す。歩行しないシーンでは無視される。
  revealAtWaypoint?: number;
}

interface AttachedScenePropCommon extends ScenePropCommon {
  offset: Point;
}

export interface FurnitureAttachedSceneProp extends AttachedScenePropCommon {
  type: "furniture";
  furnitureId: FurnitureId;
}

export interface FixtureAttachedSceneProp extends AttachedScenePropCommon {
  type: "fixture";
  fixtureId: FixtureId;
}

export interface AbsoluteSceneProp extends ScenePropCommon {
  type: "absolute";
  x: number;
  y: number;
}

export type AttachedSceneProp = FurnitureAttachedSceneProp | FixtureAttachedSceneProp | AbsoluteSceneProp;

export interface ScenePropAnchorLayout {
  furniture: Readonly<Record<FurnitureId, { anchor: Point }>>;
  fixtures: Readonly<Record<FixtureId, { anchor: Point }>>;
}

export function resolveScenePropPosition(prop: AttachedSceneProp, layout: ScenePropAnchorLayout): Point {
  if (prop.type === "absolute") return { x: prop.x, y: prop.y };
  const anchor =
    prop.type === "furniture" ? layout.furniture[prop.furnitureId].anchor : layout.fixtures[prop.fixtureId].anchor;
  return { x: anchor.x + prop.offset.x, y: anchor.y + prop.offset.y };
}

export function resolveScenePropDepthY(prop: AttachedSceneProp, position: Point): number {
  return prop.depthY ?? position.y;
}

export function isScenePropInitiallyVisible(prop: AttachedSceneProp): boolean {
  return prop.revealAtWaypoint === undefined;
}

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

// 窓のタツヲは素材の上からこの割合だけを切り出して顔として出す。
// 切り出し高さ floor(素材の高さ × この値) が表示する論理高さの2倍になるよう素材を作る。
export const TATSUO_WINDOW_FACE_RATIO = 0.55;

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
  observationOverrides?: ObservationOverrides;
}

export interface LayeredRoomPresentation extends RoomPresentationCommon {
  kind: "layered";
  baseAssetName: "room-base-empty-daytime-pixel.webp";
  windowAssetName: string;
  tint: RoomTint;
  observationOverrides: ObservationOverrides;
  windowObservation: string;
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

const BED_SIDE_ACTION_SCENES = new Set<SceneId>(["morningStretch", "mimizouFarewell"]);

// シーンごとの観察文。ここに無い対象は家具・設備・時間帯別の既定文をそのまま使う。
const SCENE_OBSERVATION_OVERRIDES: Partial<Record<SceneId, ObservationOverrides>> = {
  sleeping: {
    bed: "エトキチの寝息に合わせて、掛け布団がゆっくり上下している。",
    bedsideTable: "照明台の明かりは落とされ、コップの水だけが小さく光っている。",
    bookshelf: "読みかけの本が、棚から少しだけ引き出されたままになっている。",
  },
  sleepingWithTatsuo: {
    bed: "タツヲの大きな手が、ベッドの縁にそっと添えられている。",
    bedsideTable: "枕元の水は、タツヲが持ってきてくれたものかもしれない。",
    sofa: "タツヲにはソファーより、エトキチのそばのほうが落ち着くらしい。",
  },
  tatsuoAtWindow: {
    window: "雨に濡れた窓に、雷が光るたび何かの影が浮かぶ。",
    bed: "エトキチは布団を鼻まで引き上げ、窓のほうをちらちら見ている。",
    bookshelf: "雷が鳴るたび、棚の写真立てがかたかたと鳴っている。",
  },
  kickedBlanket: {
    bed: "布団は足元から床へずり落ち、エトキチは大の字で眠っている。",
    window: "窓が少しだけ開いていて、冷たい夜風が入ってくる。",
    bedsideTable: "照明台の上には、まだ半分残った水のコップがある。",
  },
  watchingStars: {
    window: "窓の向こうで、小さな星がひとつずつ瞬いている。",
    bed: "ベッドは空っぽで、枕だけが窓辺の主を待っている。",
    bookshelf: "星座の本が、棚の一番手前に移されている。",
    bedsideTable: "照明は消してある。星を見るには暗いほうがいいらしい。",
  },
  almostAwake: {
    window: "カーテンの隙間から、細い朝日が布団の上へ伸びている。",
    bed: "布団の中で何度ももぞもぞ動いている。もうすぐ起きそうだ。",
    bedsideTable: "枕元の帽子に手が伸びかけて、また布団へ戻った。",
  },
  morningStretch: {
    window: "朝の空気を吸い込むたび、窓の外が少し明るくなる気がする。",
    bed: "起きたばかりのベッドは、掛け布団がめくれたままだ。",
    bedsideTable: "窓のそばに、小さな水のコップが用意されている。",
  },
  planningDay: {
    bookshelf: "棚の手帳置き場が空いている。今日の分は絨毯の上だ。",
    diningSet: "食卓ではなく絨毯の上で書くのが、エトキチ流らしい。",
    window: "静かな朝の光が、開いた手帳のページを照らしている。",
  },
  tatsuoWakeUp: {
    bed: "タツヲの手がベッドの縁にあるのに、エトキチはまだ布団の中だ。",
    bedsideTable: "枕元に朝の水が届いている。タツヲが運んできたらしい。",
    window: "タツヲが来るのは、いつも空が白み始めたころだ。",
  },
  mimizouFarewell: {
    window: "窓台に灰色の小さな羽が一枚残っている。",
    bed: "ベッドは空っぽ。エトキチは窓辺で手を振っている。",
    bookshelf: "棚の上のフクロウの置き物が、窓のほうを向いている。",
  },
  tooMuchBreakfast: {
    diningSet: "食卓には、どう見ても二人では食べきれない量の朝食が並んでいる。",
    stove: "コンロはまだ温かい。作りすぎた理由がここにある。",
    fridge: "冷蔵庫の中身が、今朝だけでだいぶ減った気がする。",
    sink: "流し台には、朝食に使ったボウルとフライパンが積まれている。",
  },
  overslept: {
    bed: "布団が飛ばされたように乱れている。飛び起きたらしい。",
    diningSet: "食卓の椅子に、なぜか帽子が掛かっている。",
    bookshelf: "鞄の中身を探した跡が、棚の前に散らばっている。",
    window: "窓の外はもうすっかり明るい。急がないと。",
  },
  morningTea: {
    diningSet: "湯気の立つ黄色いカップを、両手で包んで飲んでいる。",
    window: "窓から差す光が、お茶の湯気を照らしている。",
    stove: "やかんを火にかけた跡が、コンロにまだ残っている。",
    sink: "茶葉の缶が、流し台の脇に出しっぱなしになっている。",
  },
  brushingMaineCoon: {
    sofa: "ソファーの上に、抜け毛がふわふわと集まっている。",
    window: "朝の光で、クーンちゃんのしま模様までつやつやに見える。",
  },
  foundOldToy: {
    bookshelf: "棚の奥から出てきた箱が、床に開けたまま置かれている。",
    diningSet: "掃除の途中のはずが、雑巾は食卓の上で止まっている。",
    sofa: "ソファーの下から、昔描いた絵が出てきた。",
  },
  windowNap: {
    window: "窓から差す日なたが、ちょうど座布団の上に落ちている。",
    bed: "ベッドではなく、日なたの座布団を選んだらしい。",
    bookshelf: "読みかけの本は、胸の上で開いたままだ。",
  },
  nappingOnMaineCoon: {
    sofa: "ソファーは空いているのに、今日の枕はクーンちゃんだ。",
    window: "昼の光が、二人の寝息に合わせてゆらいで見える。",
  },
  wateringPlants: {
    floorPlant: "大きな葉が、今もらった水できらきら光っている。",
    diningSet: "食卓の鉢には小さな芽が出ていて、一口ぶんの水をもらった。",
    window: "窓辺の緑が、水をもらって少し背伸びしたように見える。",
    sink: "じょうろに水を汲んだ跡が、流し台に残っている。",
  },
  muddyReturn: {
    window: "夕焼けの帰り道で、水たまりに落ちたらしい。",
    sink: "泥だらけの手をこれから洗うのか、流し台が待っている。",
    bed: "泥のついたまま、ベッドに飛び込まないでほしい。",
    sofa: "ソファーにも泥がつきそうで、ちょっとひやひやする。",
  },
  simmeringDinner: {
    stove: "鍋がことこと音を立てて、いい匂いが部屋いっぱいに広がっている。",
    fridge: "星形に切ったにんじんの残りが、冷蔵庫にしまってある。",
    sink: "切り終えたまな板と包丁が、流し台で出番を終えている。",
    diningSet: "食卓にはもう二人分の器が並べてある。",
  },
  foldingLaundry: {
    sofa: "ソファーの座面は、今日はクーンちゃんが占領している。",
    bed: "たたんだタオルは、あとでベッド脇へしまうつもりらしい。",
    window: "夕方の風で乾いた洗濯物は、太陽の匂いがする。",
  },
  tatsuoTooComfortable: {
    sofa: "二人掛けのソファーは、タツヲひとりで満席だ。",
    bed: "タツヲにはベッドも狭そうだけれど、ソファーよりはましかもしれない。",
    window: "夕焼けが、眠るタツヲの背中をオレンジに染めている。",
  },
  comfortingMaineCoon: {
    window: "稲光が走るたび、雨粒が窓を強く叩く。",
    sofa: "いつもの丸まり場所は空っぽ。クーンちゃんはエトキチの腕の中だ。",
    bed: "雷の夜は、ベッドより絨毯の上のほうが安心らしい。",
  },
  packingTomorrow: {
    bookshelf: "棚の前に鞄を広げ、地図とおやつを出したり入れたりしている。",
    diningSet: "食卓に、明日の持ち物リストが置いてある。",
    fridge: "冷蔵庫から出したおやつが、鞄の半分を占めている。",
  },
  littleNightSnack: {
    fridge: "冷蔵庫の扉を開けた回数が、今夜はいつもより多い気がする。",
    stove: "温めたミルクの鍋が、コンロで静かに冷めている。",
    diningSet: "食卓の上に、小さなプリンの空き容器がひとつ。",
  },
  readingComics: {
    sofa: "ソファーの脇に、読み終えた巻が積まれている。",
    bookshelf: "棚の漫画の並びに、一冊分の隙間が空いている。",
    bedsideTable: "照明台の明かりが、ページの上だけを照らしている。",
    window: "夜の窓に、漫画に夢中なエトキチが映っている。",
  },
  mimizouVisit: {
    window: "窓ガラスの向こうで、大きな目がゆっくり瞬いた。",
    diningSet: "飲みかけのお茶が、食卓の上で湯気を立てている。",
    bookshelf: "フクロウの図鑑が、棚の一番上に置いてある。",
  },
};

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
  const observationOverrides: ObservationOverrides = {
    ...SCENE_OBSERVATION_OVERRIDES[visit.scene.id],
    ...character.observationOverrides,
  };
  return {
    kind: "layered",
    baseAssetName: "room-base-empty-daytime-pixel.webp",
    windowAssetName: TIME_WINDOW_ASSET_NAMES[visit.assignment.band],
    tint,
    ...character,
    furnitureAssetNames,
    observationOverrides,
    windowObservation: observationOverrides.window ?? WINDOW_OBSERVATIONS[visit.assignment.band],
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
      observationOverrides: covered
        ? { bed: "そっと掛け直した布団の中で、エトキチは安心した寝顔になっている。" }
        : undefined,
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
          // 素材160pxの55%=88pxを切り出すので、拡大率0.5になる44を表示高さにする。
          height: 44,
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
        x: 100,
        y: 126,
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

  if (visit.scene.id === "tooMuchBreakfast") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      // 鉢とマグを載せない天板で、6皿ぶんの朝食を置く場所を空ける。
      furnitureAssetNames: {
        diningSet: "furniture-dining-table-chair-bare-pixel.webp",
      },
      sceneProps: [
        {
          type: "furniture",
          assetName: "scene-breakfast-dishes-pixel.webp",
          height: 22,
          furnitureId: "diningSet",
          // 天板の中央。幅いっぱいに広げ、皿の下端を手前の縁へ揃える。
          offset: { x: -4, y: -41 },
          // 食卓の足元より1px手前に置き、天板の上へ載って見えるようにする。
          depthY: 265,
          revealAtWaypoint: 2,
        },
      ],
    });
  }

  if (visit.scene.id === "muddyReturn") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      sceneProps: [
        {
          type: "absolute",
          assetName: "scene-mud-footprints-pixel.webp",
          // エトキチの足(約8px)に対して自然な二歩になる大きさ。
          height: 17,
          // 玄関マットからエトキチの立ち位置へ向かう二歩。エトキチの右脇で止め、体で隠れないようにする。
          x: 162,
          y: 148,
          // 玄関の床装飾の直上、家具より奥へ描く。
          depthY: 81,
        },
      ],
    });
  }

  if (visit.scene.id === "foundOldToy") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      sceneProps: [
        {
          type: "absolute",
          assetName: "scene-toy-box-pixel.webp",
          height: 22,
          // 行動地点の右上寄り。手前の丸椅子と重ならない高さへ置く。
          x: 97,
          y: 208,
          depthY: 204,
        },
      ],
    });
  }

  if (visit.scene.id === "foldingLaundry") {
    return layeredPresentation(visit, {
      sleeperAssetName: "etokichi-sleep-pixel.webp",
      sleeperHeight: 42,
      sceneProps: [
        {
          type: "absolute",
          assetName: "scene-laundry-basket-pixel.webp",
          height: 33,
          // 行動地点の左下。エトキチより手前へ描き、たたんだ先へ積んでいるように見せる。
          x: 108,
          y: 193,
          depthY: 182,
        },
      ],
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
          // 素材142×104を整数比2で表示する(2倍解像度化と同じ基準)
          height: 52,
          x: 96,
          y: 326,
          depthOffset: 20,
          observation: "怖がるクーンちゃんを、エトキチが離さないようにやさしく抱きしめている。",
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
