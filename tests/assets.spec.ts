import { describe, expect, it } from "vitest";
import { getScene, SCENES } from "../src/content/scenes.ts";
import { getCollectionImagePath } from "../src/game/collection.ts";
import { TIME_BANDS } from "../src/game/time.ts";
import type { SceneId, TimeBand, VisitView } from "../src/game/types.ts";
import { DEPTH_DECORATIONS, FLOOR_DECORATIONS, ROOM_CLOCK, WALL_DECORATIONS } from "../src/rendering/room-decor.ts";
import { FIXTURE_DEFINITIONS } from "../src/rendering/room-fixtures.ts";
import { FURNITURE_DEFINITIONS } from "../src/rendering/room-furniture.ts";
import { getRoomPresentation } from "../src/rendering/room-presentation.ts";
import { ACTION_ASSET_NAMES, WALK_ASSET_NAME } from "../src/rendering/scene-assets.ts";

// ロゴはfaviconやOGP向けで、部屋の描画からは参照しない。
const UNREFERENCED_ASSET_NAMES = new Set(["etokicchi-logo.png"]);

interface VisitOptions {
  band?: TimeBand;
  mimizouPresent?: boolean;
  choiceId?: string;
}

function visitFor(sceneId: SceneId, options: VisitOptions = {}): VisitView {
  const scene = getScene(sceneId);
  const band = options.band ?? scene.band;
  const slotKey = `2026-09-01:${band}`;
  return {
    assignment: {
      slotKey,
      localDate: "2026-09-01",
      band,
      sceneId,
      lineIndex: 0,
      detailIndex: 0,
      createdAt: "2026-08-31T15:20:00.000Z",
    },
    scene,
    line: "テスト用の台詞",
    detail: "テスト用の詳細",
    echoes: [],
    interaction: options.choiceId
      ? {
          slotKey,
          choiceId: options.choiceId,
          immediate: "テスト用の返事",
          selectedAt: "2026-08-31T15:21:00.000Z",
        }
      : undefined,
    discoveredNow: false,
    mimizouPresent: options.mimizouPresent,
  };
}

function presentationAssetNames(visit: VisitView): string[] {
  const presentation = getRoomPresentation(visit);
  const names = [
    presentation.baseAssetName,
    presentation.windowAssetName,
    presentation.sleeperAssetName,
    presentation.sleeperBase?.assetName,
    presentation.companion?.assetName,
    presentation.visitor?.assetName,
    presentation.comfortingMaineCoon?.assetName,
    presentation.tatsuoWindow?.assetName,
    ...Object.values(presentation.furnitureAssetNames ?? {}),
    ...Object.values(presentation.depthDecorationOverrides ?? {}).map((override) => override?.assetName),
    ...(presentation.sceneProps ?? []).map((prop) => prop.assetName),
  ];
  return names.filter((name): name is string => Boolean(name));
}

// 分岐で差し替わる素材も拾うため、選択後の部屋・みみぞうの同席・全時間帯の窓を回す。
const VISITS: readonly VisitView[] = [
  ...SCENES.map((scene) => visitFor(scene.id)),
  visitFor("kickedBlanket", { choiceId: "cover" }),
  visitFor("watchingStars", { mimizouPresent: true }),
  visitFor("watchingStars", { mimizouPresent: false }),
  ...TIME_BANDS.map((band) => visitFor("sleeping", { band })),
];

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
