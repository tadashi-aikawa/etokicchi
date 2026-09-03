import { SCENES } from "../content/scenes.ts";
import type { SceneId } from "./types.ts";

const sceneIds = new Set<SceneId>(SCENES.map((scene) => scene.id));

export function isRandomDebugMode(parameters: URLSearchParams): boolean {
  return parameters.get("debug") === "random";
}

export function getDebugSceneId(parameters: URLSearchParams): SceneId | undefined {
  if (!isRandomDebugMode(parameters)) return undefined;
  const requested = parameters.get("scene") as SceneId | null;
  return requested && sceneIds.has(requested) ? requested : undefined;
}
