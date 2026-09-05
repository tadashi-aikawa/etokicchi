import type { SceneId } from "../game/types.ts";

// pixi.jsを読み込まずに素材名だけを参照できるよう、描画側から切り出している。
export const ACTION_ASSET_NAMES: Partial<Record<SceneId, string>> = {
  watchingStars: "etokichi-watching-stars-pixel.webp",
  morningStretch: "etokichi-morning-stretch-pixel.webp",
  planningDay: "etokichi-planning-day-floor-pixel.webp",
  mimizouFarewell: "etokichi-mimizou-farewell-pixel.webp",
  tooMuchBreakfast: "etokichi-breakfast-pixel.webp",
  overslept: "etokichi-overslept-pixel.webp",
  morningTea: "etokichi-morning-tea-pixel.webp",
  brushingMaineCoon: "etokichi-brushing-maine-coon-pixel.webp",
  foundOldToy: "etokichi-old-toy-pixel.webp",
  wateringPlants: "etokichi-watering-directions-pixel.webp",
  muddyReturn: "etokichi-muddy-return-pixel.webp",
  simmeringDinner: "etokichi-watching-pot-up-right-pixel.webp",
  foldingLaundry: "etokichi-folding-laundry-pixel.webp",
  tatsuoTooComfortable: "etokichi-troubled-pixel.webp",
  packingTomorrow: "etokichi-packing-pixel.webp",
  littleNightSnack: "etokichi-night-snack-pixel.webp",
  readingComics: "etokichi-reading-comics-sofa-right-pixel.webp",
  mimizouVisit: "etokichi-morning-tea-pixel.webp",
};

export const WALK_ASSET_NAME = "etokichi-walk-pixel-v2.webp";
