import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type { SceneId } from "../src/game/types.ts";
import {
  DEPTH_DECORATIONS,
  FLOOR_DECORATIONS,
  ROOM_CLOCK,
  type RoomDepthDecorationId,
} from "../src/rendering/room-decor.ts";
import { FIXTURE_DEFINITIONS } from "../src/rendering/room-fixtures.ts";
import { SCENE_ROUTES } from "../src/rendering/room-layout.ts";
import { FURNITURE_DEFINITIONS, type FurnitureId } from "../src/rendering/room-furniture.ts";
import { getRoomPresentation, TATSUO_WINDOW_FACE_RATIO } from "../src/rendering/room-presentation.ts";
import {
  ACTION_ASSET_NAMES,
  ACTION_FRAME_COLUMNS,
  ACTION_FRAME_HEIGHT,
  ACTION_FRAME_WIDTH,
  ACTION_ROW_COUNTS,
  ASSET_PIXEL_RATIO,
  ROOM_BACKGROUND_HEIGHT,
  ROOM_WIDTH,
  WALK_ASSET_NAME,
  WALK_FRAME_COLUMNS,
  WALK_FRAME_HEIGHT,
  WALK_FRAME_ROWS,
  WALK_FRAME_WIDTH,
} from "../src/rendering/scene-assets.ts";
import { presentationAssetNames, visitFor, VISITS } from "./helpers/asset-references.ts";

const ASSET_DIR = decodeURIComponent(new URL("../public/assets/", import.meta.url).pathname);

// 描画時の拡大率が全素材で正確に 1/ASSET_PIXEL_RATIO になるよう、
// 素材のピクセル寸法は「描画コードが決める表示論理寸法 × ASSET_PIXEL_RATIO」に揃える。
// 素材の作り直しは pnpm assets:normalize が行う。

interface SizeRequirement {
  /** どの定義がこの寸法を要求しているか。衝突したときの正を選ぶ手掛かりにする。 */
  source: string;
  /** 幅を定義側が決めない素材(高さから縦横比で決まるもの)では省く。 */
  width?: number;
  height: number;
}

// 同じ素材を場面ごとに違う大きさで使うもの。既定の用途を正とし、ほかの場面では拡大率が0.5からずれる。
const PRIMARY_REQUIREMENT_SOURCES: Readonly<Record<string, string>> = {
  // ブラッシングと漫画読みでは、クーンを既定より大きく・小さく見せている。
  "decor-cat-loaf-pixel.webp": "床上装飾 maineCoon",
  // タツヲと並んで眠る場面だけ、エトキチを少し小さくして布団へ収めている。
  "etokichi-sleep-tucked-pixel.png": "sleeping の寝姿",
  // 煮込みの場面ではキッチンの手前へ大きめの丸椅子として置き直している。
  "furniture-round-stool-pixel.webp": "家具 roundStool",
  // 食卓の鉢へ向く姿だけ経路のactionScaleで1.18倍に見せている(拡大率0.59)。床の鉢は等倍。
  "etokichi-watering-directions-pixel.webp": "行動アニメ wateringPlants",
};

// 窓のタツヲは素材の上から切り出した顔だけを使うので、寸法の決まり方が他と違う。専用の検証を用意する。
const FACE_CROPPED_ASSET_NAME = "tatsuo-awake-pixel.png";

const furnitureById = new Map(FURNITURE_DEFINITIONS.map((definition) => [definition.id, definition]));
const depthDecorationById = new Map(DEPTH_DECORATIONS.map((definition) => [definition.id, definition]));

function collectRequirements(): Map<string, SizeRequirement[]> {
  const requirements = new Map<string, SizeRequirement[]>();
  const add = (assetName: string, requirement: SizeRequirement): void => {
    const list = requirements.get(assetName) ?? [];
    list.push(requirement);
    requirements.set(assetName, list);
  };

  for (const definition of FURNITURE_DEFINITIONS) {
    add(definition.assetName, {
      source: `家具 ${definition.id}`,
      width: definition.displayWidth * ASSET_PIXEL_RATIO,
      height: definition.displayHeight * ASSET_PIXEL_RATIO,
    });
  }
  for (const definition of FIXTURE_DEFINITIONS) {
    add(definition.baseAssetName, {
      source: `固定設備 ${definition.id}`,
      width: definition.displayWidth * ASSET_PIXEL_RATIO,
      height: definition.displayHeight * ASSET_PIXEL_RATIO,
    });
  }
  for (const decoration of FLOOR_DECORATIONS) {
    add(decoration.assetName, {
      source: `床の装飾 ${decoration.assetName}`,
      width: decoration.width * ASSET_PIXEL_RATIO,
      height: decoration.height * ASSET_PIXEL_RATIO,
    });
  }
  for (const decoration of DEPTH_DECORATIONS) {
    add(decoration.assetName, {
      source: `床上装飾 ${decoration.id}`,
      width: decoration.width * ASSET_PIXEL_RATIO,
      height: decoration.height * ASSET_PIXEL_RATIO,
    });
  }
  add(ROOM_CLOCK.assetName, {
    source: "壁時計",
    width: ROOM_CLOCK.size * ASSET_PIXEL_RATIO,
    height: ROOM_CLOCK.size * ASSET_PIXEL_RATIO,
  });
  add(WALK_ASSET_NAME, {
    source: "歩行シート",
    width: WALK_FRAME_WIDTH * ASSET_PIXEL_RATIO * WALK_FRAME_COLUMNS,
    height: WALK_FRAME_HEIGHT * ASSET_PIXEL_RATIO * WALK_FRAME_ROWS,
  });
  for (const [sceneId, assetName] of Object.entries(ACTION_ASSET_NAMES) as [SceneId, string | undefined][]) {
    if (!assetName) continue;
    const rows = ACTION_ROW_COUNTS[sceneId] ?? 1;
    const sheetSize = (actionScale: number): Pick<SizeRequirement, "width" | "height"> => ({
      width: ACTION_FRAME_WIDTH * actionScale * ASSET_PIXEL_RATIO * ACTION_FRAME_COLUMNS,
      height: ACTION_FRAME_HEIGHT * actionScale * ASSET_PIXEL_RATIO * rows,
    });
    add(assetName, { source: `行動アニメ ${sceneId}`, ...sheetSize(1) });
    // 経路のwaypointが行動アニメを拡大していると、そのwaypointでは拡大率が0.5からずれる。
    // 意図した拡大かどうかを PRIMARY_REQUIREMENT_SOURCES で申告させるため、要求として並べる。
    for (const [index, waypoint] of SCENE_ROUTES[sceneId].waypoints.entries()) {
      if (waypoint.actionScale === undefined) continue;
      add(assetName, { source: `行動アニメ ${sceneId} の経路${index}`, ...sheetSize(waypoint.actionScale) });
    }
  }

  for (const visit of VISITS) {
    const sceneId = visit.scene.id;
    const presentation = getRoomPresentation(visit);
    const background = {
      width: ROOM_WIDTH * ASSET_PIXEL_RATIO,
      height: ROOM_BACKGROUND_HEIGHT * ASSET_PIXEL_RATIO,
    };
    add(presentation.baseAssetName, { source: "部屋の下地", ...background });
    add(presentation.windowAssetName, { source: "時間帯の窓", ...background });
    add(presentation.sleeperAssetName, {
      source: `${sceneId} の寝姿`,
      height: presentation.sleeperHeight * ASSET_PIXEL_RATIO,
    });
    if (presentation.sleeperBase) {
      add(presentation.sleeperBase.assetName, {
        source: `${sceneId} の寝床`,
        height: presentation.sleeperBase.height * ASSET_PIXEL_RATIO,
      });
    }
    if (presentation.companion) {
      add(presentation.companion.assetName, {
        source: `${sceneId} の同席者`,
        height: presentation.companion.height * ASSET_PIXEL_RATIO * (presentation.companion.animation?.rows ?? 1),
      });
    }
    if (presentation.visitor) {
      add(presentation.visitor.assetName, {
        source: `${sceneId} の来訪者`,
        height: presentation.visitor.height * ASSET_PIXEL_RATIO,
      });
    }
    if (presentation.comfortingMaineCoon) {
      add(presentation.comfortingMaineCoon.assetName, {
        source: `${sceneId} の抱きしめ`,
        height: presentation.comfortingMaineCoon.height * ASSET_PIXEL_RATIO,
      });
    }
    for (const prop of presentation.sceneProps ?? []) {
      add(prop.assetName, {
        source: `${sceneId} の小物 ${prop.assetName}`,
        height: prop.height * ASSET_PIXEL_RATIO,
      });
    }
    for (const [furnitureId, assetName] of Object.entries(presentation.furnitureAssetNames ?? {})) {
      const definition = furnitureById.get(furnitureId as FurnitureId);
      if (!definition || !assetName) continue;
      add(assetName, {
        source: `家具 ${definition.id}`,
        width: definition.displayWidth * ASSET_PIXEL_RATIO,
        height: definition.displayHeight * ASSET_PIXEL_RATIO,
      });
    }
    for (const [decorationId, override] of Object.entries(presentation.depthDecorationOverrides ?? {})) {
      const definition = depthDecorationById.get(decorationId as RoomDepthDecorationId);
      if (!definition || !override) continue;
      const columns = override.animation?.columns ?? 1;
      add(override.assetName ?? definition.assetName, {
        source: `${sceneId} の床上装飾 ${decorationId}`,
        width: (override.width ?? definition.width) * ASSET_PIXEL_RATIO * columns,
        height: (override.height ?? definition.height) * ASSET_PIXEL_RATIO,
      });
    }
  }
  return requirements;
}

const requirementsByAsset = collectRequirements();

function isSameSize(a: SizeRequirement, b: SizeRequirement): boolean {
  return a.width === b.width && a.height === b.height;
}

/** 場面ごとに寸法が食い違う素材は、既定の用途の寸法を正とする。 */
function resolveRequirement(assetName: string, candidates: readonly SizeRequirement[]): SizeRequirement {
  const primarySource = PRIMARY_REQUIREMENT_SOURCES[assetName];
  if (!primarySource) {
    const [first] = candidates;
    if (!first) throw new Error(`${assetName}の表示寸法が集まりませんでした`);
    return first;
  }
  const primary = candidates.find((candidate) => candidate.source === primarySource);
  if (!primary) throw new Error(`${assetName}の正とする用途「${primarySource}」が見つかりません`);
  return primary;
}

const assetNames = [...requirementsByAsset.keys()].sort();
const actualSizes = new Map(
  await Promise.all(
    [...assetNames, FACE_CROPPED_ASSET_NAME].map(async (assetName) => {
      const { width, height } = await sharp(`${ASSET_DIR}${assetName}`).metadata();
      return [assetName, { width, height }] as const;
    }),
  ),
);

describe("asset pixel scale", () => {
  it.each(assetNames)("sizes %s at exactly twice its display size", (assetName) => {
    const candidates = requirementsByAsset.get(assetName) ?? [];
    const expected = resolveRequirement(assetName, candidates);
    const actual = actualSizes.get(assetName);
    expect(actual?.height, `${assetName} / ${expected.source}`).toBe(expected.height);
    if (expected.width !== undefined) {
      expect(actual?.width, `${assetName} / ${expected.source}`).toBe(expected.width);
    }
  });

  it("crops Tatsuo's window face to exactly twice its display height", () => {
    const tatsuoWindow = getRoomPresentation(visitFor("tatsuoAtWindow")).tatsuoWindow;
    if (!tatsuoWindow) throw new Error("窓のタツヲの表示定義がありません");
    expect(tatsuoWindow.assetName).toBe(FACE_CROPPED_ASSET_NAME);
    const actual = actualSizes.get(FACE_CROPPED_ASSET_NAME);
    const faceHeight = Math.floor((actual?.height ?? 0) * TATSUO_WINDOW_FACE_RATIO);
    expect(faceHeight).toBe(tatsuoWindow.height * ASSET_PIXEL_RATIO);
  });

  it("covers every asset the room references", () => {
    const referenced = new Set([
      ...Object.values(ACTION_ASSET_NAMES).filter((name): name is string => Boolean(name)),
      WALK_ASSET_NAME,
      ...VISITS.flatMap(presentationAssetNames),
      ...FURNITURE_DEFINITIONS.map(({ assetName }) => assetName),
      ...FIXTURE_DEFINITIONS.map(({ baseAssetName }) => baseAssetName),
      ...FLOOR_DECORATIONS.map(({ assetName }) => assetName),
      ...DEPTH_DECORATIONS.map(({ assetName }) => assetName),
      ROOM_CLOCK.assetName,
    ]);
    for (const assetName of referenced) {
      if (assetName === FACE_CROPPED_ASSET_NAME) continue;
      expect(assetNames, assetName).toContain(assetName);
    }
  });

  it("names the primary use of every asset drawn at more than one size", () => {
    for (const [assetName, candidates] of requirementsByAsset) {
      const [first] = candidates;
      if (!first) continue;
      const conflicting = candidates.some((candidate) => !isSameSize(candidate, first));
      expect(conflicting, `${assetName}: ${candidates.map(({ source }) => source).join(", ")}`).toBe(
        assetName in PRIMARY_REQUIREMENT_SOURCES,
      );
    }
  });
});
