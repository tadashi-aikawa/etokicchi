import { SCENES } from "../content/scenes.ts";
import type { DiscoveryRecord, SceneDefinition, SceneId } from "./types.ts";

export interface CollectionEntry {
  scene: SceneDefinition;
  discovery?: DiscoveryRecord;
}

export function getCollectionEntries(discoveries: Partial<Record<SceneId, DiscoveryRecord>>): CollectionEntry[] {
  return SCENES.map((scene) => ({ scene, discovery: discoveries[scene.id] }));
}

export function countDiscoveries(discoveries: Partial<Record<SceneId, DiscoveryRecord>>): number {
  return SCENES.reduce((count, scene) => count + (discoveries[scene.id] ? 1 : 0), 0);
}
