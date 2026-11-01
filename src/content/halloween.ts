import type { SceneDefinition } from "../game/types.ts";

// 毎年の行事ではない。11月1日〜7日の特例抽選はscenes.tsで判定する。
const EVENT_DATE = "2026-10-31";

export const HALLOWEEN_GHOST_REACTIONS = {
  curious: "いま、布団が動いたキチ……？",
  surprise: "うわあっ！ タツヲ！？",
  relief: "タツヲだったキチ！ びっくりしたあ。",
} as const;

export const HALLOWEEN_SCENES: readonly SceneDefinition[] = [
  {
    id: "halloweenGarland",
    band: "earlyMorning",
    eventDate: EVENT_DATE,
    title: "かぼちゃ、ひとつずつ",
    description: "早起きしたエトキチが、紙のかぼちゃをひもへ通している。今日の飾りつけは、まだ内緒。",
    lines: [
      "笑ってる顔と、びっくりした顔……みんな違うかぼちゃにするキチ！",
      "まだだれも起きてないね。起きたら、びっくりするかな？",
    ],
    details: [
      "最後のかぼちゃだけ、エトキチそっくりの丸いほっぺがついている",
      "ひもを持ち上げるたび、紙のかぼちゃが三つ並んで揺れている",
    ],
    characterPose: "active",
    accent: "#d58b39",
  },
  {
    id: "halloweenWitchCat",
    band: "morning",
    eventDate: EVENT_DATE,
    title: "魔女の帽子はお耳しだい",
    description: "クーンちゃんが魔女の帽子をかぶっている。片耳へずり落ちるたび、前足でちょいと直す。",
    lines: [
      "クーンちゃん、その帽子ぴったり！ ……あ、お耳が片っぽ隠れちゃった。",
      "魔法をかける前に、帽子を直すんだね。待ってるキチ。",
    ],
    details: [
      "紫の帽子から、ふさふさの耳が片方だけのぞいている",
      "帽子を直すと胸を張るけれど、すぐにまた少し傾いてしまう",
    ],
    characterPose: "active",
    accent: "#9664a6",
  },
  {
    id: "halloweenPumpkinPup",
    band: "daytime",
    eventDate: EVENT_DATE,
    title: "マサハルとかぼちゃころころ",
    description: "飾りのかぼちゃを運ぶはずのマサハルが、鼻先でころころ転がして遊んでいる。",
    lines: [
      "マサハル、そこに置いて……あっ、また転がった！",
      "おててで止められた！ それ、お片づけより上手かもしれないキチ。",
    ],
    details: [
      "かぼちゃを前足で止めるたび、しっぽがうれしそうに揺れる",
      "転がるかぼちゃを追う鼻先が、床すれすれまで下がっている",
    ],
    characterPose: "active",
    accent: "#c58c42",
  },
  {
    id: "halloweenPumpkinSkewer",
    band: "evening",
    eventDate: EVENT_DATE,
    title: "今夜の串はかぼちゃギモ",
    description: "砂肝が、かぼちゃの串をくるりと返す。三つの焼き目まで、おばけの顔になっている。",
    lines: [
      "砂肝、今日の串はオレンジ色だ！ かぼちゃも焼けるんだね。",
      "三つとも笑ってる！ 食べる前に、もうちょっと見てたいキチ。",
    ],
    details: [
      "串を返すたび、三つのかぼちゃの顔が順番にこちらを向く",
      "食べごろを確かめた砂肝が、目をきらきらさせて串を差し出した",
    ],
    characterPose: "active",
    accent: "#d47b3f",
  },
  {
    id: "halloweenCandyOwl",
    band: "night",
    eventDate: EVENT_DATE,
    title: "みみぞうのお菓子便",
    description: "かぼちゃのバケツを提げたみみぞうが、一粒ずつお菓子を選んで渡してくれる。",
    lines: [
      "トリック・オア・トリート！ ……言う前に選んでくれてたの？",
      "みみぞうの分も、ちゃんと取っておこうね。半分こするキチ！",
    ],
    details: [
      "みみぞうはバケツをのぞき込み、一番大きな包みを取り出した",
      "差し出した羽の先で、キャンディーの包みがきらりと光る",
    ],
    characterPose: "active",
    accent: "#bb8749",
  },
  {
    id: "halloweenGentleGhost",
    band: "deepNight",
    eventDate: EVENT_DATE,
    title: "おばけの正体はウホ",
    description:
      "ふくらんだ布団をのぞきに行くと、おばけ姿のタツヲがばあっ！ エトキチが跳び退いたあと、ふたりで笑っている。",
    lines: [
      "あれ？ 布団が動いた……うわあっ！ タツヲだったキチ！？",
      "びっくりしたあ！ ……もう一回？ 次はびっくりしないよ。たぶん！",
    ],
    details: [
      "エトキチがベッドへ顔を寄せるまで、タツヲは布団の中でじっと待っている",
      "白いおばけが飛び出すと、エトキチの両足が床からぴょんと離れる",
    ],
    characterPose: "active",
    accent: "#aaa4c1",
  },
];
