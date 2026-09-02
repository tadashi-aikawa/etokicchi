import type { DiscoveryRecord, SceneDefinition, SceneId } from "./types.ts";

type Discoveries = Partial<Record<SceneId, DiscoveryRecord>>;

export function isSceneUnlocked(scene: SceneDefinition, discoveries: Discoveries): boolean {
  const requirement = scene.unlockRequirement;
  if (!requirement) return true;

  switch (requirement.kind) {
    case "sceneDiscovery":
      return Boolean(discoveries[requirement.sceneId]);
  }
}
