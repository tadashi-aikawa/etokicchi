import { describe, expect, it } from "vitest";
import { getScene } from "../src/content/scenes.ts";
import { isSceneUnlocked } from "../src/game/scene-unlock.ts";
import { getRoomPresentation } from "../src/rendering/room-presentation.ts";
import { visitFor } from "./helpers/asset-references.ts";

describe("sunagimoの初登場", () => {
  it("夕食をことこと煮込む場面の発見後に、夕方の見守りシーンとして解放する", () => {
    const scene = getScene("sunagimoGrill");
    expect(scene.band).toBe("evening");
    expect(scene.choices).toBeUndefined();
    expect(isSceneUnlocked(scene, {})).toBe(false);
    expect(isSceneUnlocked(scene, { muddyReturn: { firstSeenAt: "2026-09-10T07:00:00Z", seenCount: 1 } })).toBe(false);
    expect(isSceneUnlocked(scene, { simmeringDinner: { firstSeenAt: "2026-09-10T07:00:00Z", seenCount: 1 } })).toBe(
      true,
    );
  });

  it("4つの姿に対応する台詞をすべてギモで終える", () => {
    const animation = getRoomPresentation(visitFor("sunagimoGrill")).companion?.animation;
    if (!animation) throw new Error("sunagimoのアニメーションがありません");
    expect(animation.frames).toHaveLength(animation.columns * animation.rows);
    expect(animation.frames.map((frame) => frame.speech)).toEqual([
      "まだ早いギモ",
      "裏も確かめるギモ",
      "今が食べごろギモ！",
      "いっしょに食べるギモ！",
    ]);
    for (const frame of animation.frames) {
      expect(frame.speech).toMatch(/ギモ[！!。]?$/u);
      expect(frame.durationMs).toBeGreaterThan(0);
    }
  });
});
