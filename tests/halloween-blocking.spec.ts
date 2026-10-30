import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { HALLOWEEN_PRESENTATIONS } from "../src/content/halloween-presentations.ts";
import { getRoomPresentation } from "../src/rendering/room-presentation.ts";
import { DEFAULT_ROOM_LAYOUT } from "../src/rendering/room-layout.ts";
import { visitFor } from "./helpers/asset-references.ts";

async function visibleSize(name: string, columns: number, displayHeight: number, frame = 0) {
  const { data, info } = await sharp(decodeURIComponent(new URL(`../public/assets/${name}`, import.meta.url).pathname))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width / columns;
  let left = width,
    right = 0,
    top = info.height,
    bottom = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < width; x++) {
      if ((data[(y * info.width + frame * width + x) * info.channels + 3] ?? 0) <= 32) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  const scale = displayHeight / info.height;
  return { width: (right - left + 1) * scale, height: (bottom - top + 1) * scale };
}

describe("Halloween conversations", () => {
  it("varies the places and walks while pausing within reach of each protagonist", () => {
    const scenes = ["halloweenWitchCat", "halloweenPumpkinPup", "halloweenPumpkinSkewer", "halloweenCandyOwl"] as const;
    const places = new Set<string>();
    const actions = new Set<string>();
    for (const id of scenes) {
      const presentation = HALLOWEEN_PRESENTATIONS[id];
      const first = presentation.route.waypoints[0];
      expect(first?.destination.type).toBe("point");
      if (first?.destination.type !== "point") throw new Error("contact point missing");
      const guest = getRoomPresentation(visitFor(id)).companion;
      if (!guest || !("x" in guest)) throw new Error("guest missing");
      expect(Math.hypot(first.destination.x - guest.x, first.destination.y - guest.y), id).toBeLessThan(55);
      expect(first.actionFacing, id).toBe(guest.x < first.destination.x ? "left" : "right");
      expect(first.pauseMs, id).toBeGreaterThanOrEqual(3000);
      expect(presentation.route.movement, id).toBe("walking");
      expect(presentation.route.waypoints.length, id).toBeGreaterThanOrEqual(3);
      places.add(`${first.destination.x},${first.destination.y}`);
      actions.add(presentation.action.assetName);
    }
    expect(places.size).toBe(4);
    expect(actions.size).toBe(4);
  });

  it("keeps all guest poses at the existing visible height, excluding transparent margins", async () => {
    const usualOwl = await visibleSize("mimizou-pixel.png", 1, 48.5);
    const usualPup = await visibleSize("masaharu-sleep-pixel.webp", 1, 56);
    for (let frame = 0; frame < 3; frame++) {
      const owl = await visibleSize("mimizou-halloween-candy-pixel.webp", 3, 64, frame);
      expect(owl.height).toBeGreaterThanOrEqual(usualOwl.height * 0.95);
      expect(owl.height).toBeLessThanOrEqual(usualOwl.height * 1.25);
      const pup = await visibleSize("masaharu-halloween-pumpkin-pixel.webp", 3, 61, frame);
      expect(pup.height).toBeGreaterThanOrEqual(usualPup.height * 0.95);
      expect(pup.height / 61, "透明余白で吹き出しを頭から遠ざけない").toBeGreaterThan(0.8);
    }
  });

  it("draws Tatsuo in front of the bed so the hiding and burst are visible", () => {
    const presentation = getRoomPresentation(visitFor("halloweenGentleGhost"));
    const guest = presentation.companion;
    expect(presentation.furnitureAssetNames?.bed).toBe("furniture-bed-bare-pixel.webp");
    if (!guest || !("y" in guest)) throw new Error("Tatsuo missing");
    expect(guest.depth).toBe("position");
    expect(guest.y).toBeGreaterThan(DEFAULT_ROOM_LAYOUT.furniture.bed.footY);
  });

  it("raises only the existing quilt, with enough volume to conceal Tatsuo", async () => {
    const presentation = getRoomPresentation(visitFor("halloweenGentleGhost"));
    const [quilt] = presentation.sceneProps ?? [];
    if (quilt?.type !== "furniture") throw new Error("bed quilt missing");
    expect(quilt.furnitureId).toBe("bed");
    expect(quilt.depthY).toBeGreaterThan(DEFAULT_ROOM_LAYOUT.furniture.bed.footY);
    const size = await visibleSize(quilt.assetName, 1, quilt.height);
    expect(size.width).toBeGreaterThan(65);
    expect(size.height).toBeGreaterThan(65);
    // 全段階で同じベッドを使い、枠が変形する画像へ差し替えない。
    expect(presentation.furnitureAssetNames?.bed).toBe("furniture-bed-bare-pixel.webp");
  });
});
