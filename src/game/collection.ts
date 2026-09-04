import { SCENES } from "../content/scenes.ts";
import { isSceneUnlocked } from "./scene-unlock.ts";
import type { DiscoveryRecord, SceneDefinition, SceneId } from "./types.ts";

export const ACHIEVEMENT_THRESHOLDS = [1, 2, 3, 5, 10, 25, 50, 100] as const;

export type CollectionEntryStatus = "discovered" | "available" | "locked";

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
  achievement: SceneAchievement;
}

const COLLECTION_IMAGE_PATHS: Record<SceneId, string> = {
  sleeping: "assets/collection/sleeping.webp",
  sleepingWithTatsuo: "assets/collection/sleeping-with-tatsuo.webp",
  kickedBlanket: "assets/collection/kicked-blanket.webp",
  watchingStars: "assets/collection/watching-stars.webp",
  almostAwake: "assets/collection/almost-awake.webp",
  morningStretch: "assets/collection/morning-stretch.webp",
  planningDay: "assets/collection/planning-day.webp",
  tatsuoWakeUp: "assets/collection/tatsuo-wake-up-v2.webp",
  mimizouFarewell: "assets/collection/mimizou-farewell.webp",
  tooMuchBreakfast: "assets/collection/too-much-breakfast.webp",
  overslept: "assets/collection/overslept.webp",
  morningTea: "assets/collection/morning-tea.webp",
  brushingMaineCoon: "assets/collection/brushing-maine-coon.webp",
  foundOldToy: "assets/collection/found-old-toy.webp",
  windowNap: "assets/collection/window-nap.webp",
  nappingOnMaineCoon: "assets/collection/napping-on-maine-coon.webp",
  wateringPlants: "assets/collection/watering-plants.webp",
  muddyReturn: "assets/collection/muddy-return.webp",
  simmeringDinner: "assets/collection/simmering-dinner.webp",
  foldingLaundry: "assets/collection/folding-laundry.webp",
  tatsuoTooComfortable: "assets/collection/tatsuo-too-comfortable.webp",
  comfortingMaineCoon: "assets/collection/comforting-maine-coon.webp",
  packingTomorrow: "assets/collection/packing-tomorrow.webp",
  littleNightSnack: "assets/collection/little-night-snack.webp",
  readingComics: "assets/collection/reading-comics.webp",
  mimizouVisit: "assets/collection/mimizou-visit.webp",
};

export const SCENE_COUNT = SCENES.length;

export function getCollectionImagePath(sceneId: SceneId): string {
  return COLLECTION_IMAGE_PATHS[sceneId];
}

export function getSceneAchievement(seenCount: number): SceneAchievement {
  const level = ACHIEVEMENT_THRESHOLDS.filter((threshold) => seenCount >= threshold).length;
  return {
    level,
    totalLevels: ACHIEVEMENT_THRESHOLDS.length,
    nextThreshold: ACHIEVEMENT_THRESHOLDS[level],
  };
}

export function getCollectionEntries(discoveries: Partial<Record<SceneId, DiscoveryRecord>>): CollectionEntry[] {
  return SCENES.map((scene) => {
    const discovery = discoveries[scene.id];
    return {
      scene,
      discovery,
      imagePath: getCollectionImagePath(scene.id),
      status: discovery ? "discovered" : isSceneUnlocked(scene, discoveries) ? "available" : "locked",
      achievement: getSceneAchievement(discovery?.seenCount ?? 0),
    };
  });
}

export function countDiscoveries(discoveries: Partial<Record<SceneId, DiscoveryRecord>>): number {
  return SCENES.reduce((count, scene) => count + (discoveries[scene.id] ? 1 : 0), 0);
}
