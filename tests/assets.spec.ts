import { describe, expect, it } from "vitest";
import { SCENES } from "../src/content/scenes.ts";
import { getCollectionImagePath } from "../src/game/collection.ts";
import { DEPTH_DECORATIONS, FLOOR_DECORATIONS, ROOM_CLOCK, WALL_DECORATIONS } from "../src/rendering/room-decor.ts";
import { FIXTURE_DEFINITIONS } from "../src/rendering/room-fixtures.ts";
import { FURNITURE_DEFINITIONS } from "../src/rendering/room-furniture.ts";
import { ACTION_ASSET_NAMES, WALK_ASSET_NAME } from "../src/rendering/scene-assets.ts";
import { presentationAssetNames, VISITS } from "./helpers/asset-references.ts";

// ロゴはfaviconやOGP向けで、部屋の描画からは参照しない。
const UNREFERENCED_ASSET_NAMES = new Set(["etokicchi-logo.png"]);

const referencedAssetNames = new Set<string>([
  ...Object.values(ACTION_ASSET_NAMES).filter((name): name is string => Boolean(name)),
  WALK_ASSET_NAME,
  ...VISITS.flatMap(presentationAssetNames),
  ...FURNITURE_DEFINITIONS.map(({ assetName }) => assetName),
  ...FIXTURE_DEFINITIONS.map(({ baseAssetName }) => baseAssetName),
  ...FLOOR_DECORATIONS.map(({ assetName }) => assetName),
  ...DEPTH_DECORATIONS.map(({ assetName }) => assetName),
  ...WALL_DECORATIONS.map(({ assetName }) => assetName),
  ROOM_CLOCK.assetName,
]);

const referencedCollectionNames = new Set(
  SCENES.map((scene) => {
    const path = getCollectionImagePath(scene.id);
    return path.slice(path.lastIndexOf("/") + 1);
  }),
);

function fileNames(paths: Record<string, unknown>): string[] {
  return Object.keys(paths)
    .map((path) => path.slice(path.lastIndexOf("/") + 1))
    .filter((name) => name.includes("."));
}

const bundledAssetNames = new Set(fileNames(import.meta.glob("../public/assets/*")));
const bundledCollectionNames = new Set(fileNames(import.meta.glob("../public/assets/collection/*")));

describe("asset references", () => {
  it("points every room asset reference at a file under public/assets", () => {
    expect(referencedAssetNames.size).toBeGreaterThan(20);
    for (const assetName of referencedAssetNames) {
      expect(bundledAssetNames, assetName).toContain(assetName);
    }
  });

  it("points every collection image at a file under public/assets/collection", () => {
    expect(referencedCollectionNames.size).toBe(SCENES.length);
    for (const assetName of referencedCollectionNames) {
      expect(bundledCollectionNames, assetName).toContain(assetName);
    }
  });

  it("keeps no unused file under public/assets", () => {
    for (const assetName of bundledAssetNames) {
      if (UNREFERENCED_ASSET_NAMES.has(assetName)) continue;
      expect(referencedAssetNames, assetName).toContain(assetName);
    }
  });

  it("keeps no unused file under public/assets/collection", () => {
    for (const assetName of bundledCollectionNames) {
      expect(referencedCollectionNames, assetName).toContain(assetName);
    }
  });
});
