import { SCENES } from "../content/scenes.ts";
import type { DiscoveryRecord, SceneDefinition, SceneId } from "./types.ts";

export interface CollectionEntry {
  scene: SceneDefinition;
  discovery?: DiscoveryRecord;
  imagePath: string;
}

const COLLECTION_IMAGE_PATHS: Record<SceneId, string> = {
  sleeping: "assets/collection/sleeping.webp",
  kickedBlanket: "assets/collection/kicked-blanket.webp",
  tooMuchBreakfast: "assets/collection/too-much-breakfast.webp",
  overslept: "assets/collection/overslept.webp",
  foundOldToy: "assets/collection/found-old-toy.webp",
  windowNap: "assets/collection/window-nap.webp",
  muddyReturn: "assets/collection/muddy-return.webp",
  simmeringDinner: "assets/collection/simmering-dinner.webp",
  packingTomorrow: "assets/collection/packing-tomorrow.webp",
  littleNightSnack: "assets/collection/little-night-snack.webp",
};

export function getCollectionEntries(discoveries: Partial<Record<SceneId, DiscoveryRecord>>): CollectionEntry[] {
  return SCENES.map((scene) => ({
    scene,
    discovery: discoveries[scene.id],
    imagePath: COLLECTION_IMAGE_PATHS[scene.id],
  }));
}

export function countDiscoveries(discoveries: Partial<Record<SceneId, DiscoveryRecord>>): number {
  return SCENES.reduce((count, scene) => count + (discoveries[scene.id] ? 1 : 0), 0);
}
