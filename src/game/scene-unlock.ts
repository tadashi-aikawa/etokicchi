import type { DiscoveryRecord, SceneDefinition, SceneId } from "./types.ts";

type Discoveries = Partial<Record<SceneId, DiscoveryRecord>>;

export function isSceneUnlocked(scene: SceneDefinition, discoveries: Discoveries): boolean {
  // 条件導入前に発見済みのシーンは再ロックせず、既存セーブの進行を維持する。
  if (discoveries[scene.id]) return true;

  const requirement = scene.unlockRequirement;
  if (!requirement) return true;

  switch (requirement.kind) {
    case "sceneDiscovery":
      return Boolean(discoveries[requirement.sceneId]);
  }
}
