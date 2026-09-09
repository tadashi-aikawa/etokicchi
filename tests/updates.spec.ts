import { describe, expect, it } from "vitest";
import { getUpdateMessages, UPDATES } from "../src/content/updates.ts";
import { SCENES } from "../src/content/scenes.ts";
import { createUpdateReadState } from "../src/persistence/update-read-state.ts";

describe("update history", () => {
  it("keeps entries unique and newest first", () => {
    expect(new Set(UPDATES.map((entry) => entry.id)).size).toBe(UPDATES.length);
    const dates = UPDATES.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("describes added scenes only by their count", () => {
    expect(getUpdateMessages({ id: "test", date: "2026-09-10", changes: [], addedScenes: 2 })).toEqual([
      "シーンを2件追加しました。",
    ]);
    for (const entry of UPDATES) {
      for (const message of getUpdateMessages(entry)) {
        for (const scene of SCENES) {
          expect(message).not.toContain(scene.title);
          expect(message).not.toContain(scene.id);
        }
      }
    }
  });
});

describe("update read state", () => {
  it("keeps unseen updates unread until opened, persists reads, and notifies again for a new update", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const firstVisit = createUpdateReadState(() => storage);
    expect(firstVisit.isUnread("first")).toBe(true);
    expect(firstVisit.isUnread("first")).toBe(true);
    firstVisit.markRead("first");
    expect(firstVisit.isUnread("first")).toBe(false);
    const nextVisit = createUpdateReadState(() => storage);
    expect(nextVisit.isUnread("first")).toBe(false);
    expect(nextVisit.isUnread("second")).toBe(true);
  });

  it("survives denied access to storage and keeps reads in memory", () => {
    const state = createUpdateReadState(() => {
      throw new Error("Access denied");
    });
    expect(state.isUnread("first")).toBe(true);
    expect(() => state.markRead("first")).not.toThrow();
    expect(state.isUnread("first")).toBe(false);
    expect(state.isUnread("second")).toBe(true);
  });

  it("survives a full storage quota", () => {
    const state = createUpdateReadState(() => ({
      getItem: () => null,
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    }));
    state.markRead("first");
    expect(state.isUnread("first")).toBe(false);
  });
});
