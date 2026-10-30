import { SCENE_COLLECTION_IMAGE_PATHS } from "../content/scene-presentations.ts";
import { SCENES } from "../content/scenes.ts";
import { isSceneUnlocked } from "./scene-unlock.ts";
import { formatSlotDate, getTimeBand, TIME_BANDS } from "./time.ts";
import type { DiscoveryRecord, SceneDefinition, SceneId } from "./types.ts";

export const ACHIEVEMENT_THRESHOLDS = [1, 2, 3, 5, 10, 25, 50, 100] as const;

export type CollectionEntryStatus = "discovered" | "available" | "locked" | "unavailable" | "ended";

export interface SceneAchievement {
  level: number;
  totalLevels: number;
  nextThreshold?: number;
}

export interface CollectionEntry {
  scene: SceneDefinition;
  discovery?: DiscoveryRecord;
  imagePath: string;
  status: CollectionEntryStatus;
  unlockDepth: number;
  remainingUnlockSteps: number;
  achievement: SceneAchievement;
}

export const SCENE_COUNT = SCENES.length;
const SCENE_BY_ID = new Map(SCENES.map((scene) => [scene.id, scene]));

export function getCollectionImagePath(sceneId: SceneId): string {
  return SCENE_COLLECTION_IMAGE_PATHS[sceneId];
}

export function getSceneAchievement(
  seenCount: number,
  thresholds: readonly number[] = ACHIEVEMENT_THRESHOLDS,
): SceneAchievement {
  const level = thresholds.filter((threshold) => seenCount >= threshold).length;
  return {
    level,
    totalLevels: thresholds.length,
    nextThreshold: thresholds[level],
  };
}

export function getRemainingUnlockSteps(
  scene: SceneDefinition,
  discoveries: Partial<Record<SceneId, DiscoveryRecord>>,
): number {
  let current = scene;
  let steps = 0;
  const visited = new Set<SceneId>();

  while (current.unlockRequirement?.kind === "sceneDiscovery") {
    const requiredSceneId = current.unlockRequirement.sceneId;
    if (discoveries[requiredSceneId] || visited.has(requiredSceneId)) break;
    visited.add(requiredSceneId);
    steps += 1;
    const requiredScene = SCENE_BY_ID.get(requiredSceneId);
    if (!requiredScene) break;
    current = requiredScene;
  }

  return steps;
}

export function getUnlockDepth(scene: SceneDefinition): number {
  return getRemainingUnlockSteps(scene, {});
}

export function getCollectionEntries(
  discoveries: Partial<Record<SceneId, DiscoveryRecord>>,
  now: Date = new Date(),
): CollectionEntry[] {
  const localDate = formatSlotDate(now);
  const currentBandIndex = TIME_BANDS.indexOf(getTimeBand(now));
  return SCENES.map((scene) => {
    const discovery = discoveries[scene.id];
    const status = discovery
      ? "discovered"
      : scene.eventDate && scene.eventDate !== localDate
        ? "unavailable"
        : scene.eventDate && TIME_BANDS.indexOf(scene.band) < currentBandIndex
          ? "ended"
          : isSceneUnlocked(scene, discoveries)
            ? "available"
            : "locked";
    return {
      scene,
      discovery,
      imagePath: getCollectionImagePath(scene.id),
      status,
      unlockDepth: getUnlockDepth(scene),
      remainingUnlockSteps: status === "locked" ? getRemainingUnlockSteps(scene, discoveries) : 0,
      // 一度だけ出会える限定シーンは1段階で完了し、到達不能な再訪を目標にしない。
      achievement: getSceneAchievement(discovery?.seenCount ?? 0, scene.eventDate ? [1] : ACHIEVEMENT_THRESHOLDS),
    };
  });
}

export function countDiscoveries(discoveries: Partial<Record<SceneId, DiscoveryRecord>>): number {
  return SCENES.reduce((count, scene) => count + (discoveries[scene.id] ? 1 : 0), 0);
}
