import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ACTION_ASSET_NAMES, WALK_ASSET_NAME } from "../src/rendering/scene-assets.ts";

const assetDirectory = new URL("../public/assets/", import.meta.url);
const sheets = [...new Set(Object.values(ACTION_ASSET_NAMES))].filter((name): name is string => Boolean(name));
const singleSprites = [
  "etokichi-comforting-maine-coon-pixel.webp",
  "mimizou-pixel.png",
  "etokichi-sleep-tucked-pixel.png",
  "etokichi-sleep-covered-pixel.png",
  "etokichi-sleep-kicked-pixel.png",
  "etokichi-window-nap-star-book-pixel.png",
  "decor-cat-sofa-curled-compact-pixel.webp",
  "etokichi-sleep-pixel.webp",
];

describe("character sprite transparency", () => {
  it.each([...sheets, WALK_ASSET_NAME, "mimizou-walk-pixel.webp", ...singleSprites])(
    "removes the backing and keeps each frame inside its cell: %s",
    async (name) => {
      const { data, info } = await sharp(decodeURIComponent(new URL(name, assetDirectory).pathname))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const columns = singleSprites.includes(name) ? 1 : 3;
      const isWalkSheet = name === WALK_ASSET_NAME || name === "mimizou-walk-pixel.webp";
      const rows = isWalkSheet ? 4 : name === "etokichi-watering-directions-pixel.webp" ? 2 : 1;
      if (isWalkSheet) expect([info.width, info.height]).toEqual([288, 416]);
      const width = info.width / columns;
      const height = info.height / rows;
      const visibleByCell = Array<number>(columns * rows).fill(0);
      let visibleBacking = 0;
      let boundaryPixels = 0;
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          const offset = (y * info.width + x) * info.channels;
          if ((data[offset + 3] ?? 0) <= 32) continue;
          const cell = Math.floor(y / height) * columns + Math.floor(x / width);
          visibleByCell[cell] = (visibleByCell[cell] ?? 0) + 1;
          // 単色背景の消し忘れや、隣のコマへはみ出した原画を検出する。
          if (x % width === 0 || x % width === width - 1 || y % height === 0 || y % height === height - 1) {
            boundaryPixels += 1;
          }
          if ((data[offset] ?? 0) > 180 && (data[offset + 1] ?? 0) < 80 && (data[offset + 2] ?? 0) > 180) {
            visibleBacking += 1;
          }
        }
      }
      expect(visibleBacking, "マゼンタ背景の残留").toBe(0);
      expect(boundaryPixels, "セル境界での切れ・隣接コマの混入").toBe(0);
      expect(
        visibleByCell.every((count) => count > width * height * 0.1),
        "空白や大きな欠けのあるコマ",
      ).toBe(true);
    },
  );
});
