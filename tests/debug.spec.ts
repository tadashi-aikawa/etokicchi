import { describe, expect, it } from "vitest";
import { getDebugMimizouPresent, getDebugSceneId, isRandomDebugMode } from "../src/game/debug.ts";

describe("debug query", () => {
  it.each([
    ["debug=random&mimizou=true", true],
    ["debug=random&mimizou=false", false],
    ["mimizou=true", undefined],
    ["debug=true&mimizou=true", undefined],
    ["debug=random&mimizou=unknown", undefined],
    ["debug=random", undefined],
  ])("reads the companion override only in debug mode: %s", (query, expected) => {
    expect(getDebugMimizouPresent(new URLSearchParams(query))).toBe(expected);
  });

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
