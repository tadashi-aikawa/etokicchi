import { getScene, SCENES } from "../../src/content/scenes.ts";
import { TIME_BANDS } from "../../src/game/time.ts";
import type { SceneId, TimeBand, VisitView } from "../../src/game/types.ts";
import { getRoomPresentation } from "../../src/rendering/room-presentation.ts";

interface VisitOptions {
  band?: TimeBand;
  mimizouPresent?: boolean;
  choiceId?: string;
}

export function visitFor(sceneId: SceneId, options: VisitOptions = {}): VisitView {
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

// 分岐で差し替わる素材も拾うため、選択後の部屋・みみぞうの同席・全時間帯の窓を回す。
export const VISITS: readonly VisitView[] = [
  ...SCENES.map((scene) => visitFor(scene.id)),
  visitFor("kickedBlanket", { choiceId: "cover" }),
  visitFor("watchingStars", { mimizouPresent: true }),
  visitFor("watchingStars", { mimizouPresent: false }),
  ...TIME_BANDS.map((band) => visitFor("sleeping", { band })),
];

export function presentationAssetNames(visit: VisitView): string[] {
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
