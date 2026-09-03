import { describe, expect, it } from "vitest";
import { getDebugSceneId, isRandomDebugMode } from "../src/game/debug.ts";

describe("debug query", () => {
  it("enables reload randomization only for debug=random", () => {
    expect(isRandomDebugMode(new URLSearchParams("debug=random"))).toBe(true);
    expect(isRandomDebugMode(new URLSearchParams("debug=true"))).toBe(false);
    expect(isRandomDebugMode(new URLSearchParams(""))).toBe(false);
  });

  it("accepts a valid scene only in random debug mode", () => {
    expect(getDebugSceneId(new URLSearchParams("debug=random&scene=nappingOnMaineCoon"))).toBe("nappingOnMaineCoon");
    expect(getDebugSceneId(new URLSearchParams("scene=nappingOnMaineCoon"))).toBeUndefined();
    expect(getDebugSceneId(new URLSearchParams("debug=random&scene=unknown"))).toBeUndefined();
  });
});
