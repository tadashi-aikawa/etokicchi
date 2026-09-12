import type { SceneId, VisitView } from "../game/types.ts";
import type { FurnitureAnchors } from "../rendering/room-furniture.ts";
import type {
  DepthDecorationThoughts,
  ObservationOverrides,
  RoomPresentationCommon,
} from "../rendering/room-presentation-types.ts";
import { fixtureAction, furnitureAction, point, type SceneRoute } from "../rendering/route-definitions.ts";

/** 行動アニメーションの素材。向きを変えて2度使うシーンだけ rows が2になる。 */
export interface SceneActionAsset {
  assetName: string;
  rows?: number;
}

/**
 * 行動アニメーションを持たないシーンは "none" と明示する。
 * 省略は型で落ちるので、新しいシーンで指定を忘れることがない。
 */
export type SceneAction = SceneActionAsset | "none";

/** シーン1件の描画定義。経路・家具の置き直し・行動アニメ・観察文・図鑑絵・部屋の見た目をここへ集める。 */
export interface ScenePresentationDefinition {
  route: SceneRoute;
  /** このシーンのあいだだけ家具を置き直す。行動地点の見え方を優先し、そのシーンの経路と描画だけへ効かせる。 */
  furnitureAnchors?: Partial<FurnitureAnchors>;
  action: SceneAction;
  /** シーンごとの観察文。ここに無い対象は家具・設備・時間帯別の既定文をそのまま使う。 */
  observations?: ObservationOverrides;
  /** シーンごとの、クーンが頭の中で思っていること。ここに無いシーンは床上装飾の既定文を使う。 */
  thoughts?: DepthDecorationThoughts;
  collectionImage: string;
  /** 選択肢や同席者で見た目が変わるシーンだけ関数にする。 */
  room: RoomPresentationCommon | ((visit: VisitView) => RoomPresentationCommon);
}

/** 起きているシーンの既定。歩行シートで描くので sleeperAssetName はタップ判定の当たり判定用に留まる。 */
const DEFAULT_ROOM: RoomPresentationCommon = {
  sleeperAssetName: "etokichi-sleep-pixel.webp",
  sleeperHeight: 42,
};

/** 窓の外からみみぞうが覗くシーン。訪問と見送りで同じ絵を使い、セリフだけを変える。 */
function mimizouWindowRoom(speech: string): RoomPresentationCommon {
  return {
    ...DEFAULT_ROOM,
    visitor: {
      assetName: "mimizou-pixel.png",
      height: 48.5,
      speech,
      x: 51.25,
      y: 62.75,
    },
  };
}

export const SCENE_PRESENTATIONS: Readonly<Record<SceneId, ScenePresentationDefinition>> = {
  sleeping: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: furnitureAction("bed", "sleep"), pauseMs: 5000 }],
    },
    action: "none",
    observations: {
      bed: "エトキチの寝息に合わせて、掛け布団がゆっくり上下している。",
      bedsideTable: "照明台の明かりは落とされ、コップの水だけが小さく光っている。",
      bookshelf: "読みかけの本が、棚から少しだけ引き出されたままになっている。",
    },
    thoughts: { maineCoon: "夜はわたしの見回りの時間なの。……でも、眠いの。" },
    collectionImage: "assets/collection/sleeping.webp",
    room: {
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 30,
    },
  },
  sleepingWithTatsuo: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: furnitureAction("bed", "sleepTogether"), pauseMs: 5000 }],
    },
    action: "none",
    observations: {
      bed: "タツヲの大きな手が、ベッドの縁にそっと添えられている。",
      bedsideTable: "枕元の水は、タツヲが持ってきてくれたものかもしれない。",
      sofa: "タツヲにはソファーより、エトキチのそばのほうが落ち着くらしい。",
    },
    thoughts: { maineCoon: "大きいのが来た日は、床がちょっと揺れるの。" },
    collectionImage: "assets/collection/sleeping-with-tatsuo.webp",
    room: {
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 28,
      companion: {
        assetName: "tatsuo-sleeping-pixel.png",
        height: 80,
        x: 61,
        y: 170,
        depth: "scene",
        thought: "いい夢を見てるウホ……。",
      },
    },
  },
  tatsuoAtWindow: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: furnitureAction("bed", "sleep"), pauseMs: 5000 }],
    },
    action: "none",
    observations: {
      window: "雨に濡れた窓に、雷が光るたび何かの影が浮かぶ。",
      bed: "エトキチは布団を鼻まで引き上げ、窓のほうをちらちら見ている。",
      bookshelf: "雷が鳴るたび、棚の写真立てがかたかたと鳴っている。",
    },
    collectionImage: "assets/collection/tatsuo-at-window.webp",
    room: {
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 30,
      hiddenDepthDecorationIds: ["maineCoon"],
      thunderstorm: true,
      tatsuoWindow: {
        assetName: "tatsuo-awake-pixel.png",
        // 素材160pxの55%=88pxを切り出すので、拡大率0.5になる44を表示高さにする。
        height: 44,
        x: 69,
        y: 30,
      },
      tint: { color: 0x101a3b, alpha: 0.72 },
    },
  },
  kickedBlanket: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: furnitureAction("bed", "kickedBlanket"), pauseMs: 5000 }],
    },
    action: "none",
    observations: {
      bed: "布団は足元から床へずり落ち、エトキチは大の字で眠っている。",
      window: "窓が少しだけ開いていて、冷たい夜風が入ってくる。",
      bedsideTable: "照明台の上には、まだ半分残った水のコップがある。",
    },
    thoughts: { maineCoon: "蹴っちゃうなら、その布団わたしにちょうだいなの。" },
    collectionImage: "assets/collection/kicked-blanket.webp",
    room: (visit) => {
      const covered = visit.interaction?.choiceId === "cover";
      return {
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
      };
    },
  },
  watchingStars: {
    // 窓の下、ベッドと本棚のあいだの床に立って窓の外を見上げる。
    // 照明台はこのシーンだけベッドの足元へどける(furnitureAnchors)。
    // 望遠鏡の先がベッドへ隠れないよう、行動地点だけ深度を押し出す。
    route: {
      movement: "walking",
      waypoints: [
        { destination: point(70, 122), pauseMs: 4800, action: true, depthOffset: 45 },
        { destination: point(79, 140), pauseMs: 0, depthOffset: 40 },
        { destination: point(83, 184), pauseMs: 700 },
        { destination: point(68, 211), pauseMs: 650 },
        { destination: point(103, 238), pauseMs: 750 },
        { destination: point(79, 140), pauseMs: 0, depthOffset: 40 },
      ],
    },
    // 窓の下へ立つ星見では、ベッド脇の照明台が望遠鏡と重なるためベッドの足元へどける。
    furnitureAnchors: { bedsideTable: { x: 24, y: 180 } },
    action: { assetName: "etokichi-watching-stars-pixel.webp" },
    observations: {
      window: "窓の向こうで、小さな星がひとつずつ瞬いている。",
      bed: "ベッドは空っぽで、枕だけが窓辺の主を待っている。",
      bookshelf: "星座の本が、棚の一番手前に移されている。",
      bedsideTable: "照明は消してある。星を見るには暗いほうがいいらしい。",
    },
    thoughts: { maineCoon: "お星さまより、動くもののほうが気になるの。" },
    collectionImage: "assets/collection/watching-stars.webp",
    room: (visit) => ({
      ...DEFAULT_ROOM,
      lightsOff: true,
      ...(visit.mimizouPresent
        ? {
            companion: {
              assetName: "mimizou-pixel.png",
              height: 48.5,
              speech: "お星さま、きれいだホー。",
              x: 102.25,
              y: 117,
            },
          }
        : {}),
    }),
  },
  almostAwake: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: furnitureAction("bed", "sleep"), pauseMs: 5000 }],
    },
    action: "none",
    observations: {
      window: "カーテンの隙間から、細い朝日が布団の上へ伸びている。",
      bed: "布団の中で何度ももぞもぞ動いている。もうすぐ起きそうだ。",
      bedsideTable: "枕元の帽子に手が伸びかけて、また布団へ戻った。",
    },
    thoughts: { maineCoon: "そろそろ起きる音なの。ごはんの時間なの。" },
    collectionImage: "assets/collection/almost-awake.webp",
    room: {
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 30,
    },
  },
  morningStretch: {
    route: {
      movement: "walking",
      waypoints: [
        { destination: point(42, 128), pauseMs: 4600, action: true, depthOffset: 40 },
        { destination: point(44, 145), pauseMs: 0, depthOffset: 40 },
        { destination: point(44, 174), pauseMs: 0, depthOffset: 40 },
        { destination: point(88, 184), pauseMs: 700 },
        { destination: point(102, 226), pauseMs: 700 },
        { destination: point(44, 174), pauseMs: 0, depthOffset: 40 },
        { destination: point(44, 145), pauseMs: 0, depthOffset: 40 },
      ],
    },
    action: { assetName: "etokichi-morning-stretch-pixel.webp" },
    observations: {
      window: "朝の空気を吸い込むたび、窓の外が少し明るくなる気がする。",
      bed: "起きたばかりのベッドは、掛け布団がめくれたままだ。",
      bedsideTable: "窓のそばに、小さな水のコップが用意されている。",
    },
    thoughts: { maineCoon: "伸びはね、こうやるの。見てる？" },
    collectionImage: "assets/collection/morning-stretch.webp",
    room: DEFAULT_ROOM,
  },
  planningDay: {
    route: {
      movement: "walking",
      waypoints: [
        { destination: point(99, 292), pauseMs: 5200, action: true },
        { destination: point(112, 223), pauseMs: 750 },
        { destination: point(111, 190), pauseMs: 700 },
      ],
    },
    action: { assetName: "etokichi-planning-day-floor-pixel.webp" },
    observations: {
      bookshelf: "棚の手帳置き場が空いている。今日の分は絨毯の上だ。",
      diningSet: "食卓ではなく絨毯の上で書くのが、エトキチ流らしい。",
      window: "静かな朝の光が、開いた手帳のページを照らしている。",
    },
    thoughts: { maineCoon: "予定？ 寝て、食べて、また寝るの。" },
    collectionImage: "assets/collection/planning-day.webp",
    room: DEFAULT_ROOM,
  },
  tatsuoWakeUp: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: furnitureAction("bed", "sleepTogether"), pauseMs: 5000 }],
    },
    action: "none",
    observations: {
      bed: "タツヲの手がベッドの縁にあるのに、エトキチはまだ布団の中だ。",
      bedsideTable: "枕元に朝の水が届いている。タツヲが運んできたらしい。",
      window: "タツヲが来るのは、いつも空が白み始めたころだ。",
    },
    thoughts: { maineCoon: "起こすのは、わたしのお役目だったのに。" },
    collectionImage: "assets/collection/tatsuo-wake-up-v2.webp",
    room: {
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 28,
      companion: {
        assetName: "tatsuo-awake-pixel-v2.png",
        height: 80,
        x: 76,
        y: 170,
        depth: "scene",
        speech: "朝だウホ。そろそろ起きるウホ。",
      },
    },
  },
  mimizouFarewell: {
    route: {
      movement: "walking",
      waypoints: [
        { destination: point(42, 128), pauseMs: 5200, action: true, depthOffset: 40 },
        { destination: point(44, 145), pauseMs: 0, depthOffset: 40 },
        { destination: point(44, 174), pauseMs: 0, depthOffset: 40 },
        { destination: point(88, 184), pauseMs: 800 },
        { destination: point(107, 224), pauseMs: 700 },
        { destination: point(44, 174), pauseMs: 0, depthOffset: 40 },
        { destination: point(44, 145), pauseMs: 0, depthOffset: 40 },
      ],
    },
    action: { assetName: "etokichi-mimizou-farewell-pixel.webp" },
    observations: {
      window: "窓台に灰色の小さな羽が一枚残っている。",
      bed: "ベッドは空っぽ。エトキチは窓辺で手を振っている。",
      bookshelf: "棚の上のフクロウの置き物が、窓のほうを向いている。",
    },
    thoughts: { maineCoon: "いってらっしゃいなの。窓は閉めてほしいの。" },
    collectionImage: "assets/collection/mimizou-farewell.webp",
    room: mimizouWindowRoom("またあとで来るホー。"),
  },
  tooMuchBreakfast: {
    // 添字0のコンロ脇だけで料理の行動アニメーションを出し、添字2の食卓で
    // 朝食の皿(sceneProps)が現れる。順序を変えるときは room の revealAtWaypoint も合わせること。
    // 添字1・3は丸椅子と食卓の占有を避けるための中継点。
    route: {
      movement: "walking",
      waypoints: [
        { destination: fixtureAction("kitchenUnit", "stoveSide"), pauseMs: 3000, action: true },
        { destination: point(104, 269), pauseMs: 0 },
        { destination: furnitureAction("diningSet", "morningTea"), pauseMs: 1500 },
        { destination: point(104, 254), pauseMs: 0 },
      ],
    },
    action: { assetName: "etokichi-breakfast-pixel.webp" },
    observations: {
      diningSet: "食卓には、どう見ても二人では食べきれない量の朝食が並んでいる。",
      stove: "コンロはまだ温かい。作りすぎた理由がここにある。",
      fridge: "冷蔵庫の中身が、今朝だけでだいぶ減った気がする。",
      sink: "流し台には、朝食に使ったボウルとフライパンが積まれている。",
    },
    thoughts: { maineCoon: "そんなに多いなら、一皿はわたしのだと思うの。" },
    collectionImage: "assets/collection/too-much-breakfast.webp",
    room: {
      ...DEFAULT_ROOM,
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
    },
  },
  overslept: {
    route: {
      movement: "walking",
      waypoints: [
        { destination: point(96, 220), pauseMs: 1800, action: true },
        { destination: point(123, 151), pauseMs: 650 },
        { destination: point(64, 193), pauseMs: 500 },
        { destination: point(116, 244), pauseMs: 550 },
      ],
    },
    action: { assetName: "etokichi-overslept-pixel.webp" },
    observations: {
      bed: "布団が飛ばされたように乱れている。飛び起きたらしい。",
      diningSet: "食卓の椅子に、なぜか帽子が掛かっている。",
      bookshelf: "鞄の中身を探した跡が、棚の前に散らばっている。",
      window: "窓の外はもうすっかり明るい。急がないと。",
    },
    thoughts: { maineCoon: "そんなにあわてなくても、朝は逃げないの。" },
    collectionImage: "assets/collection/overslept.webp",
    room: DEFAULT_ROOM,
  },
  morningTea: {
    route: {
      movement: "walking",
      waypoints: [
        { destination: furnitureAction("diningSet", "morningTea"), pauseMs: 6800, action: true },
        { destination: point(105, 273), pauseMs: 0 },
        { destination: point(105, 220), pauseMs: 650 },
        { destination: point(105, 215), pauseMs: 900 },
        { destination: point(105, 252), pauseMs: 650 },
      ],
    },
    action: { assetName: "etokichi-morning-tea-pixel.webp" },
    observations: {
      diningSet: "湯気の立つ黄色いカップを、両手で包んで飲んでいる。",
      window: "窓から差す光が、お茶の湯気を照らしている。",
      stove: "やかんを火にかけた跡が、コンロにまだ残っている。",
      sink: "茶葉の缶が、流し台の脇に出しっぱなしになっている。",
    },
    thoughts: { maineCoon: "湯気はあったかそうなの。でも、飲まないの。" },
    collectionImage: "assets/collection/morning-tea.webp",
    room: DEFAULT_ROOM,
  },
  brushingMaineCoon: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: point(70, 320), pauseMs: 5000, action: true }],
    },
    action: { assetName: "etokichi-brushing-maine-coon-pixel.webp" },
    observations: {
      sofa: "ソファーの上に、抜け毛がふわふわと集まっている。",
      window: "朝の光で、クーンちゃんのしま模様までつやつやに見える。",
    },
    thoughts: { maineCoon: "そこなの、そこ。もうちょっとだけ右なの。" },
    collectionImage: "assets/collection/brushing-maine-coon.webp",
    room: {
      ...DEFAULT_ROOM,
      depthDecorationOverrides: {
        maineCoon: {
          type: "absolute",
          x: 108,
          y: 322,
          depthY: 320,
          width: 68,
          height: 54,
        },
      },
    },
  },
  foundOldToy: {
    route: {
      movement: "walking",
      waypoints: [
        { destination: point(110, 224), pauseMs: 3000, action: true },
        { destination: point(110, 260), pauseMs: 1300 },
        { destination: point(111, 194), pauseMs: 1100 },
      ],
    },
    action: { assetName: "etokichi-old-toy-pixel.webp" },
    observations: {
      bookshelf: "棚の奥から出てきた箱が、床に開けたまま置かれている。",
      diningSet: "掃除の途中のはずが、雑巾は食卓の上で止まっている。",
      sofa: "ソファーの下から、昔描いた絵が出てきた。",
    },
    thoughts: { maineCoon: "その紐、たぶん元はわたしのなの。" },
    collectionImage: "assets/collection/found-old-toy.webp",
    room: {
      ...DEFAULT_ROOM,
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
    },
  },
  windowNap: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: point(82, 184), pauseMs: 5000 }],
    },
    action: "none",
    observations: {
      window: "窓から差す日なたが、ちょうど座布団の上に落ちている。",
      bed: "ベッドではなく、日なたの座布団を選んだらしい。",
      bookshelf: "読みかけの本は、胸の上で開いたままだ。",
    },
    thoughts: { maineCoon: "日なたは早い者勝ちなの。ここは譲らないの。" },
    collectionImage: "assets/collection/window-nap.webp",
    room: {
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
        },
      },
    },
  },
  masaruSunbeam: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: point(117, 187), pauseMs: 5000 }],
    },
    action: "none",
    observations: {
      window: "窓から伸びる日だまりを、マサハルとエトキチが半分こしている。",
      bed: "今日はベッドより、マサハルの隣が気持ちよさそう。",
      bookshelf: "本は棚にしまったまま。今は二人でのんびりする時間。",
    },
    thoughts: { maineCoon: "半分こするなら、わたしにもくれていいと思うの。" },
    collectionImage: "assets/collection/masaharu-sunbeam.webp",
    room: {
      ...DEFAULT_ROOM,
      sleeperAssetName: "etokichi-sleep-leaning-pixel.webp",
      sleeperHeight: 42,
      sleeperBreathing: "none",
      companion: {
        assetName: "masaharu-sleep-pixel.webp",
        height: 56,
        x: 72,
        y: 190,
        depth: "position",
        speech: "すぅ……すぅ……",
      },
      depthDecorationOverrides: {
        maineCoon: {
          type: "absolute",
          x: 66,
          y: 300,
          depthY: 300,
        },
      },
    },
  },
  nappingOnMaineCoon: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: point(88, 340), pauseMs: 5000 }],
    },
    action: "none",
    observations: {
      sofa: "ソファーは空いているのに、今日の枕はクーンちゃんだ。",
      window: "昼の光が、二人の寝息に合わせてゆらいで見える。",
    },
    collectionImage: "assets/collection/napping-on-maine-coon.webp",
    room: {
      sleeperAssetName: "etokichi-window-nap-star-book-pixel.png",
      sleeperHeight: 72,
      sleeperRotation: 0,
      sleeperBreathing: "alternating",
      sleeperBase: {
        assetName: "maine-coon-pillow-pixel.webp",
        height: 32,
        offset: { x: 10, y: -34 },
      },
      hiddenDepthDecorationIds: ["maineCoon"],
    },
  },
  wateringPlants: {
    route: {
      movement: "walking",
      waypoints: [
        {
          destination: furnitureAction("diningSet", "watering"),
          pauseMs: 2700,
          action: true,
          actionVariant: 1,
          actionOffsetY: 14,
          actionScale: 1.18,
        },
        { destination: point(105, 235), pauseMs: 0, depthOffset: 40 },
        { destination: point(105, 279), pauseMs: 0, depthOffset: 40 },
        {
          destination: furnitureAction("floorPlant", "watering"),
          pauseMs: 2700,
          action: true,
          actionFacing: "right",
        },
        { destination: point(104, 198), pauseMs: 650 },
      ],
    },
    action: { assetName: "etokichi-watering-directions-pixel.webp", rows: 2 },
    observations: {
      floorPlant: "大きな葉が、今もらった水できらきら光っている。",
      diningSet: "食卓の鉢には小さな芽が出ていて、一口ぶんの水をもらった。",
      window: "窓辺の緑が、水をもらって少し背伸びしたように見える。",
      sink: "じょうろに水を汲んだ跡が、流し台に残っている。",
    },
    thoughts: { maineCoon: "お水の音がするの。ちょっとだけ気になるの。" },
    collectionImage: "assets/collection/watering-plants.webp",
    room: DEFAULT_ROOM,
  },
  muddyReturn: {
    route: {
      movement: "walking",
      waypoints: [
        { destination: point(138, 149), pauseMs: 3000, action: true },
        { destination: point(106, 205), pauseMs: 1200 },
        { destination: point(126, 174), pauseMs: 900 },
      ],
    },
    action: { assetName: "etokichi-muddy-return-pixel.webp" },
    observations: {
      window: "夕焼けの帰り道で、水たまりに落ちたらしい。",
      sink: "泥だらけの手をこれから洗うのか、流し台が待っている。",
      bed: "泥のついたまま、ベッドに飛び込まないでほしい。",
      sofa: "ソファーにも泥がつきそうで、ちょっとひやひやする。",
    },
    thoughts: { maineCoon: "泥のにおいなの。毛づくろいが増えちゃうの。" },
    collectionImage: "assets/collection/muddy-return.webp",
    room: {
      ...DEFAULT_ROOM,
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
    },
  },
  simmeringDinner: {
    route: {
      movement: "nonWalking",
      waypoints: [
        {
          destination: fixtureAction("kitchenUnit", "stoveStool"),
          pauseMs: 5000,
          action: true,
          depthOffset: 33,
        },
      ],
    },
    action: { assetName: "etokichi-watching-pot-up-right-pixel.webp" },
    observations: {
      stove: "鍋がことこと音を立てて、いい匂いが部屋いっぱいに広がっている。",
      fridge: "星形に切ったにんじんの残りが、冷蔵庫にしまってある。",
      sink: "切り終えたまな板と包丁が、流し台で出番を終えている。",
      diningSet: "食卓にはもう二人分の器が並べてある。",
    },
    thoughts: { maineCoon: "いいにおいなの。……これ、お肉なの。" },
    collectionImage: "assets/collection/simmering-dinner.webp",
    room: {
      ...DEFAULT_ROOM,
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
    },
  },
  sunagimoGrill: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: point(146, 284), pauseMs: 5000, action: true }],
    },
    action: { assetName: "etokichi-watching-sunagimo-pixel.webp" },
    observations: {
      stove: "夕食の鍋がことこと煮えている。隣ではsunagimoが串の焼き色を真剣に確かめている。",
      diningSet: "二人分のお皿が、焼きたての串を待っている。",
    },
    thoughts: { maineCoon: "焼けるまで、ここで待つの。動かないの。" },
    collectionImage: "assets/collection/sunagimo-grill.webp",
    room: {
      ...DEFAULT_ROOM,
      hiddenFurnitureIds: ["roundStool"],
      companion: {
        assetName: "sunagimo-grill-pixel.webp",
        height: 48,
        x: 96,
        y: 283,
        depth: "position",
        animation: {
          columns: 2,
          rows: 2,
          frames: [
            { durationMs: 3000, speech: "まだ早いギモ" },
            { durationMs: 2200, speech: "裏も確かめるギモ" },
            { durationMs: 2000, speech: "今が食べごろギモ！" },
            { durationMs: 3000, speech: "いっしょに食べるギモ！" },
          ],
        },
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
      ],
    },
  },
  foldingLaundry: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: point(98, 176), pauseMs: 5000, action: true }],
    },
    action: { assetName: "etokichi-folding-laundry-pixel.webp" },
    observations: {
      sofa: "ソファーの座面は、今日はクーンちゃんが占領している。",
      bed: "たたんだタオルは、あとでベッド脇へしまうつもりらしい。",
      window: "夕方の風で乾いた洗濯物は、太陽の匂いがする。",
    },
    thoughts: { maineCoon: "たたんだ上に乗るのが、いちばん気持ちいいの。" },
    collectionImage: "assets/collection/folding-laundry.webp",
    room: {
      ...DEFAULT_ROOM,
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
        },
      },
    },
  },
  tatsuoTooComfortable: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: point(76, 271), pauseMs: 5000, action: true }],
    },
    action: { assetName: "etokichi-troubled-pixel.webp" },
    observations: {
      sofa: "二人掛けのソファーは、タツヲひとりで満席だ。",
      bed: "タツヲにはベッドも狭そうだけれど、ソファーよりはましかもしれない。",
      window: "夕焼けが、眠るタツヲの背中をオレンジに染めている。",
    },
    thoughts: { maineCoon: "あの大きさで寝られたら、譲るしかないの。" },
    collectionImage: "assets/collection/tatsuo-too-comfortable.webp",
    room: {
      ...DEFAULT_ROOM,
      companion: {
        assetName: "tatsuo-too-comfortable-pixel.png",
        height: 88,
        furnitureId: "sofa",
        actionPointId: "sitRear",
        offset: { x: -2, y: 34 },
        depthActionPointId: "sit",
        depthOffset: 30,
        thought: "このソファー、身体にちょうどいいウホ……。",
      },
    },
  },
  comfortingMaineCoon: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: point(96, 326), pauseMs: 5000 }],
    },
    // 抱き合う姿は専用スプライトで描くので、行動アニメーションを持たない。
    action: "none",
    observations: {
      window: "稲光が走るたび、雨粒が窓を強く叩く。",
      sofa: "いつもの丸まり場所は空っぽ。クーンちゃんはエトキチの腕の中だ。",
      bed: "雷の夜は、ベッドより絨毯の上のほうが安心らしい。",
    },
    collectionImage: "assets/collection/comforting-maine-coon.webp",
    room: {
      ...DEFAULT_ROOM,
      hiddenDepthDecorationIds: ["maineCoon"],
      comfortingMaineCoon: {
        assetName: "etokichi-comforting-maine-coon-pixel.webp",
        // 素材142×104を整数比2で表示する(2倍解像度化と同じ基準)
        height: 52,
        x: 96,
        y: 326,
        depthOffset: 20,
        thought: "こわいの。……でも、この腕の中はあったかいの。",
      },
      thunderstorm: true,
      tint: { color: 0x364963, alpha: 0.32 },
    },
  },
  packingTomorrow: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: furnitureAction("bookshelf", "packing"), pauseMs: 5000, action: true }],
    },
    action: { assetName: "etokichi-packing-pixel.webp" },
    observations: {
      bookshelf: "棚の前に鞄を広げ、地図とおやつを出したり入れたりしている。",
      diningSet: "食卓に、明日の持ち物リストが置いてある。",
      fridge: "冷蔵庫から出したおやつが、鞄の半分を占めている。",
    },
    thoughts: { maineCoon: "かばんの中も、ちゃんと見ておきたいの。" },
    collectionImage: "assets/collection/packing-tomorrow.webp",
    room: DEFAULT_ROOM,
  },
  littleNightSnack: {
    route: {
      movement: "walking",
      waypoints: [
        { destination: fixtureAction("kitchenUnit", "fridgeFront"), pauseMs: 5000, action: true },
        { destination: point(105, 183), pauseMs: 0 },
        { destination: point(126, 174), pauseMs: 600 },
        { destination: point(105, 153), pauseMs: 750 },
        { destination: point(70, 174), pauseMs: 850 },
        { destination: point(91, 205), pauseMs: 600 },
        { destination: point(117, 244), pauseMs: 800 },
        { destination: point(137, 226), pauseMs: 550 },
      ],
    },
    action: { assetName: "etokichi-night-snack-pixel.webp" },
    observations: {
      fridge: "冷蔵庫の扉を開けた回数が、今夜はいつもより多い気がする。",
      stove: "温めたミルクの鍋が、コンロで静かに冷めている。",
      diningSet: "食卓の上に、小さなプリンの空き容器がひとつ。",
    },
    thoughts: { maineCoon: "見てるの。まばたきのあいだも、ずっと見てるの。" },
    collectionImage: "assets/collection/little-night-snack.webp",
    room: {
      ...DEFAULT_ROOM,
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
        },
      },
    },
  },
  readingComics: {
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: furnitureAction("sofa", "sit"), pauseMs: 5000, action: true, depthOffset: 30 }],
    },
    action: { assetName: "etokichi-reading-comics-sofa-right-pixel.webp" },
    observations: {
      sofa: "ソファーの脇に、読み終えた巻が積まれている。",
      bookshelf: "棚の漫画の並びに、一冊分の隙間が空いている。",
      bedsideTable: "照明台の明かりが、ページの上だけを照らしている。",
      window: "夜の窓に、漫画に夢中なエトキチが映っている。",
    },
    thoughts: { maineCoon: "ページをめくる音って、眠くなるの。" },
    collectionImage: "assets/collection/reading-comics.webp",
    room: {
      ...DEFAULT_ROOM,
      depthDecorationOverrides: {
        maineCoon: {
          type: "furniture",
          furnitureId: "bed",
          offset: { x: -3, y: -18 },
          width: 54,
          height: 43,
          depthOffset: 1,
        },
      },
    },
  },
  mimizouVisit: {
    // お茶を飲むシーンなので、家具の無い床ではなく食卓の椅子へ座らせる。
    route: {
      movement: "nonWalking",
      waypoints: [{ destination: furnitureAction("diningSet", "morningTea"), pauseMs: 5000, action: true }],
    },
    action: { assetName: "etokichi-morning-tea-pixel.webp" },
    observations: {
      window: "窓ガラスの向こうで、大きな目がゆっくり瞬いた。",
      diningSet: "飲みかけのお茶が、食卓の上で湯気を立てている。",
      bookshelf: "フクロウの図鑑が、棚の一番上に置いてある。",
    },
    thoughts: { maineCoon: "窓の外に、知ってるにおいの子がいるの。" },
    collectionImage: "assets/collection/mimizou-visit.webp",
    room: mimizouWindowRoom("こんばんはホー。のぞいてるホー。"),
  },
};

const SCENE_IDS = Object.keys(SCENE_PRESENTATIONS) as SceneId[];

/** そのシーンの部屋の見た目を解決する。visitに依存しないシーンは定義をそのまま返す。 */
export function resolveScenePresentationRoom(visit: VisitView): RoomPresentationCommon {
  const { room } = SCENE_PRESENTATIONS[visit.scene.id];
  return typeof room === "function" ? room(visit) : room;
}

export function getSceneActionAsset(sceneId: SceneId): SceneActionAsset | undefined {
  const { action } = SCENE_PRESENTATIONS[sceneId];
  return action === "none" ? undefined : action;
}

function collectSceneEntries<T>(
  pick: (definition: ScenePresentationDefinition) => T | undefined,
): Partial<Record<SceneId, T>> {
  const entries: Partial<Record<SceneId, T>> = {};
  for (const sceneId of SCENE_IDS) {
    const value = pick(SCENE_PRESENTATIONS[sceneId]);
    if (value !== undefined) entries[sceneId] = value;
  }
  return entries;
}

export const SCENE_ROUTES: Readonly<Record<SceneId, SceneRoute>> = Object.fromEntries(
  SCENE_IDS.map((sceneId) => [sceneId, SCENE_PRESENTATIONS[sceneId].route]),
) as Record<SceneId, SceneRoute>;

export const SCENE_FURNITURE_ANCHORS: Partial<Record<SceneId, Partial<FurnitureAnchors>>> = collectSceneEntries(
  ({ furnitureAnchors }) => furnitureAnchors,
);

export const SCENE_ACTION_ASSET_NAMES: Partial<Record<SceneId, string>> = collectSceneEntries(({ action }) =>
  action === "none" ? undefined : action.assetName,
);

export const SCENE_ACTION_ROW_COUNTS: Partial<Record<SceneId, number>> = collectSceneEntries(({ action }) =>
  action === "none" ? undefined : action.rows,
);

export const SCENE_OBSERVATION_OVERRIDES: Partial<Record<SceneId, ObservationOverrides>> = collectSceneEntries(
  ({ observations }) => observations,
);

export const SCENE_DEPTH_DECORATION_THOUGHTS: Partial<Record<SceneId, DepthDecorationThoughts>> = collectSceneEntries(
  ({ thoughts }) => thoughts,
);

export const SCENE_COLLECTION_IMAGE_PATHS: Readonly<Record<SceneId, string>> = Object.fromEntries(
  SCENE_IDS.map((sceneId) => [sceneId, SCENE_PRESENTATIONS[sceneId].collectionImage]),
) as Record<SceneId, string>;
