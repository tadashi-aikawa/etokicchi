import { describe, expect, it } from "vitest";
import { isRandomDebugMode } from "../src/game/debug.ts";

describe("debug query", () => {
  it("enables reload randomization only for debug=random", () => {
    expect(isRandomDebugMode(new URLSearchParams("debug=random"))).toBe(true);
    expect(isRandomDebugMode(new URLSearchParams("debug=true"))).toBe(false);
    expect(isRandomDebugMode(new URLSearchParams(""))).toBe(false);
  });
});
