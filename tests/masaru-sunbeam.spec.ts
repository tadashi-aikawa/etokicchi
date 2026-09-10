import { describe, expect, it } from "vitest";
import { getScene } from "../src/content/scenes.ts";
import { isSceneUnlocked } from "../src/game/scene-unlock.ts";
import { getRoomPresentation } from "../src/rendering/room-presentation.ts";
import { SCENE_PRESENTATIONS } from "../src/content/scene-presentations.ts";
import { visitFor } from "./helpers/asset-references.ts";

describe("マサルとひなたを半分こ", () => {
  it("最初から昼に出会える観察のみのシーン", () => {
    const scene = getScene("masaruSunbeam");
    expect(scene.band).toBe("daytime");
    expect(scene.choices).toBeUndefined();
    expect(isSceneUnlocked(scene, {})).toBe(true);
  });

  it("最初から二人の寝姿を静止表示し、起きるコマや呼吸の伸縮を使わない", () => {
    expect(getScene("masaruSunbeam").characterPose).toBe("sleep");
    const presentation = getRoomPresentation(visitFor("masaruSunbeam"));
    expect(presentation.sleeperAssetName).toBe("etokichi-masaru-sleep-pixel.webp");
    expect(presentation.sleeperBreathing).toBe("none");
    expect(presentation.companion).toBeUndefined();
    expect(SCENE_PRESENTATIONS.masaruSunbeam.action).toBe("none");
  });
});
