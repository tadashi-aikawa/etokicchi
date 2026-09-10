import { describe, expect, it } from "vitest";
import { getScene } from "../src/content/scenes.ts";
import { isSceneUnlocked } from "../src/game/scene-unlock.ts";
import { getMasaruSunbeamFrame } from "../src/rendering/masaru-sunbeam.ts";

describe("マサルとひなたを半分こ", () => {
  it("最初から昼に出会える観察のみのシーン", () => {
    const scene = getScene("masaruSunbeam");
    expect(scene.band).toBe("daytime");
    expect(scene.choices).toBeUndefined();
    expect(isSceneUnlocked(scene, {})).toBe(true);
  });

  it("隣を空けてから寄り添い、長く眠り、小さく伸びて元へ戻る", () => {
    expect(getMasaruSunbeamFrame(0).frame).toBe(0);
    expect(getMasaruSunbeamFrame(0).dogOffsetX).toBeCloseTo(0);
    expect(getMasaruSunbeamFrame(0).characterOffsetX).toBeCloseTo(0);
    expect(getMasaruSunbeamFrame(1500).dogOffsetX).toBeLessThan(0);
    expect(getMasaruSunbeamFrame(3000)).toMatchObject({ frame: 1, dogOffsetX: -6, characterOffsetX: -12 });
    for (const elapsed of [6000, 10000, 15999]) expect(getMasaruSunbeamFrame(elapsed).frame).toBe(2);
    expect(getMasaruSunbeamFrame(16500).stretchScale).toBeGreaterThan(1);
    expect(getMasaruSunbeamFrame(18000)).toEqual(getMasaruSunbeamFrame(0));
  });

  it("長時間後も同じ周期で、位置がループ境界を飛び越えない", () => {
    for (const time of [1, 1500, 5999, 14000, 17000]) {
      expect(getMasaruSunbeamFrame(time + 18000 * 1000)).toEqual(getMasaruSunbeamFrame(time));
    }
    expect(Math.abs(getMasaruSunbeamFrame(17999).characterOffsetX)).toBeLessThan(0.001);
  });
});
