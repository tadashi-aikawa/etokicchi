import { describe, expect, it } from "vitest";
import {
  resolveSpeechBubblePlacement,
  type SpeechBubblePlacementInput,
  TOP_BAR_LIMIT,
} from "../src/rendering/room-speech.ts";

const BASE: SpeechBubblePlacementInput = {
  roomWidth: 390,
  roomHeight: 844,
  characterX: 195,
  characterTopY: 400,
  characterWidth: 60,
  bubbleWidth: 120,
  bubbleHeight: 34,
};

const place = (overrides: Partial<SpeechBubblePlacementInput> = {}) =>
  resolveSpeechBubblePlacement({ ...BASE, ...overrides });

describe("speech bubble placement", () => {
  it("centers the bubble above Etokichi with a downward tail", () => {
    const placement = place();
    expect(placement).toEqual({ left: 135, top: 358, tail: "down", tailOffset: 60 });
  });

  it("keeps the bubble inside the room and leaves only the tail above Etokichi", () => {
    const right = place({ characterX: 370 });
    expect(right.left).toBe(264);
    expect(right.tail).toBe("down");
    expect(right.left + right.tailOffset).toBe(370);

    const left = place({ characterX: 20 });
    expect(left.left).toBe(6);
    expect(left.left + left.tailOffset).toBe(20);
  });

  it("stops the tail before the rounded corner when Etokichi stands at the very edge", () => {
    const placement = place({ characterX: 2 });
    expect(placement.left).toBe(6);
    expect(placement.tailOffset).toBe(13);
  });

  it("keeps a bubble wider than the room at the left margin", () => {
    const placement = place({ bubbleWidth: 420 });
    expect(placement.left).toBe(6);
  });

  it("moves the bubble aside when it would reach into the top bar", () => {
    const placement = place({ characterTopY: TOP_BAR_LIMIT + 10 });
    expect(placement).toEqual({ left: 233, top: TOP_BAR_LIMIT + 10, tail: "left", tailOffset: 13 });
  });

  it("picks the roomier side and points the tail back at Etokichi", () => {
    const placement = place({ characterTopY: 20, characterX: 330 });
    expect(placement.tail).toBe("right");
    expect(placement.left).toBe(172);
    expect(placement.top).toBe(TOP_BAR_LIMIT);
  });

  it("never lets the aside bubble slip under the top bar or past the bottom", () => {
    expect(place({ characterTopY: -40 }).top).toBe(TOP_BAR_LIMIT);
    expect(place({ characterTopY: 119, roomHeight: 140 }).top).toBe(100);
  });
});
