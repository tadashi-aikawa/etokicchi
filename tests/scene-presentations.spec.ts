import { describe, expect, it } from "vitest";
import {
  resolveScenePresentationRoom,
  SCENE_ACTION_ASSET_NAMES,
  SCENE_ACTION_ROW_COUNTS,
  SCENE_COLLECTION_IMAGE_PATHS,
  SCENE_FURNITURE_ANCHORS,
  SCENE_OBSERVATION_OVERRIDES,
  SCENE_PRESENTATIONS,
  SCENE_ROUTES,
} from "../src/content/scene-presentations.ts";
import { SCENES } from "../src/content/scenes.ts";
import type { SceneId } from "../src/game/types.ts";
import { visitFor } from "./helpers/asset-references.ts";

const SCENE_IDS = SCENES.map(({ id }) => id);

describe("scene presentation table", () => {
  it("defines every scene exactly once, in the order the scenes are written", () => {
    expect(Object.keys(SCENE_PRESENTATIONS)).toEqual(SCENE_IDS);
  });

  it("gives every scene a route whose waypoints all have a destination", () => {
    for (const sceneId of SCENE_IDS) {
      const { route } = SCENE_PRESENTATIONS[sceneId];
      expect(route.waypoints.length, sceneId).toBeGreaterThan(0);
      for (const waypoint of route.waypoints) {
        expect(waypoint.destination.type, sceneId).toMatch(/^(point|furnitureAction|fixtureAction)$/);
      }
    }
  });

  it("states an action asset or an explicit none for every scene", () => {
    for (const sceneId of SCENE_IDS) {
      const { action } = SCENE_PRESENTATIONS[sceneId];
      if (action === "none") continue;
      expect(action.assetName, sceneId).toMatch(/^etokichi-.+\.webp$/);
    }
  });

  it("leaves out the action animation only where a dedicated sprite draws the character", () => {
    const activeWithoutAction = SCENES.filter(
      ({ id, characterPose }) => characterPose === "active" && SCENE_PRESENTATIONS[id].action === "none",
    ).map(({ id }) => id);
    // 抱き合う姿は専用スプライトで描くので、行動アニメーションを持たない唯一の起きているシーン。
    expect(activeWithoutAction).toEqual(["comfortingMaineCoon"]);

    const sleepingWithAction = SCENES.filter(
      ({ id, characterPose }) => characterPose === "sleep" && SCENE_PRESENTATIONS[id].action !== "none",
    ).map(({ id }) => id);
    expect(sleepingWithAction).toEqual([]);
  });

  it("gives every scene its own collection image", () => {
    const paths = SCENE_IDS.map((sceneId) => SCENE_PRESENTATIONS[sceneId].collectionImage);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(path).toMatch(/^assets\/collection\/[a-z0-9-]+\.webp$/);
  });

  it("resolves the room from the visit only where the look depends on it", () => {
    const visitDependent = SCENE_IDS.filter((sceneId) => typeof SCENE_PRESENTATIONS[sceneId].room === "function");
    expect(visitDependent).toEqual(["kickedBlanket", "watchingStars"]);
  });

  it("swaps the kicked blanket for a tucked-in sleeper once the blanket is put back", () => {
    const kicked = resolveScenePresentationRoom(visitFor("kickedBlanket"));
    const covered = resolveScenePresentationRoom(visitFor("kickedBlanket", { choiceId: "cover" }));
    expect(kicked.sleeperAssetName).toBe("etokichi-sleep-kicked-pixel.png");
    expect(kicked.sceneProps).toHaveLength(1);
    expect(covered.sleeperAssetName).toBe("etokichi-sleep-covered-pixel.png");
    expect(covered.sceneProps).toBeUndefined();
  });

  it("seats mimizou beside the stargazer only when she is present", () => {
    expect(resolveScenePresentationRoom(visitFor("watchingStars")).companion).toBeUndefined();
    expect(resolveScenePresentationRoom(visitFor("watchingStars", { mimizouPresent: true })).companion).toMatchObject({
      assetName: "mimizou-pixel.png",
    });
  });
});

describe("values derived from the scene presentation table", () => {
  it("keeps a route for every scene", () => {
    expect(Object.keys(SCENE_ROUTES)).toEqual(SCENE_IDS);
  });

  it("moves furniture only for the stargazing scene", () => {
    expect(SCENE_FURNITURE_ANCHORS).toEqual({ watchingStars: { bedsideTable: { x: 24, y: 180 } } });
  });

  it("lists the action sheet of every scene that has one", () => {
    expect(SCENE_ACTION_ASSET_NAMES).toEqual({
      watchingStars: "etokichi-watching-stars-pixel.webp",
      morningStretch: "etokichi-morning-stretch-pixel.webp",
      planningDay: "etokichi-planning-day-floor-pixel.webp",
      mimizouFarewell: "etokichi-mimizou-farewell-pixel.webp",
      tooMuchBreakfast: "etokichi-breakfast-pixel.webp",
      overslept: "etokichi-overslept-pixel.webp",
      morningTea: "etokichi-morning-tea-pixel.webp",
      brushingMaineCoon: "etokichi-brushing-maine-coon-pixel.webp",
      foundOldToy: "etokichi-old-toy-pixel.webp",
      wateringPlants: "etokichi-watering-directions-pixel.webp",
      muddyReturn: "etokichi-muddy-return-pixel.webp",
      simmeringDinner: "etokichi-watching-pot-up-right-pixel.webp",
      foldingLaundry: "etokichi-folding-laundry-pixel.webp",
      tatsuoTooComfortable: "etokichi-troubled-pixel.webp",
      packingTomorrow: "etokichi-packing-pixel.webp",
      littleNightSnack: "etokichi-night-snack-pixel.webp",
      readingComics: "etokichi-reading-comics-sofa-right-pixel.webp",
      mimizouVisit: "etokichi-morning-tea-pixel.webp",
    });
  });

  it("counts two action rows only where the pose is drawn facing both ways", () => {
    expect(SCENE_ACTION_ROW_COUNTS).toEqual({ wateringPlants: 2 });
  });

  it("keeps the collection image of every scene", () => {
    expect(SCENE_COLLECTION_IMAGE_PATHS).toEqual({
      sleeping: "assets/collection/sleeping.webp",
      sleepingWithTatsuo: "assets/collection/sleeping-with-tatsuo.webp",
      tatsuoAtWindow: "assets/collection/tatsuo-at-window.webp",
      kickedBlanket: "assets/collection/kicked-blanket.webp",
      watchingStars: "assets/collection/watching-stars.webp",
      almostAwake: "assets/collection/almost-awake.webp",
      morningStretch: "assets/collection/morning-stretch.webp",
      planningDay: "assets/collection/planning-day.webp",
      tatsuoWakeUp: "assets/collection/tatsuo-wake-up-v2.webp",
      mimizouFarewell: "assets/collection/mimizou-farewell.webp",
      tooMuchBreakfast: "assets/collection/too-much-breakfast.webp",
      overslept: "assets/collection/overslept.webp",
      morningTea: "assets/collection/morning-tea.webp",
      brushingMaineCoon: "assets/collection/brushing-maine-coon.webp",
      foundOldToy: "assets/collection/found-old-toy.webp",
      windowNap: "assets/collection/window-nap.webp",
      nappingOnMaineCoon: "assets/collection/napping-on-maine-coon.webp",
      wateringPlants: "assets/collection/watering-plants.webp",
      muddyReturn: "assets/collection/muddy-return.webp",
      simmeringDinner: "assets/collection/simmering-dinner.webp",
      foldingLaundry: "assets/collection/folding-laundry.webp",
      tatsuoTooComfortable: "assets/collection/tatsuo-too-comfortable.webp",
      comfortingMaineCoon: "assets/collection/comforting-maine-coon.webp",
      packingTomorrow: "assets/collection/packing-tomorrow.webp",
      littleNightSnack: "assets/collection/little-night-snack.webp",
      readingComics: "assets/collection/reading-comics.webp",
      mimizouVisit: "assets/collection/mimizou-visit.webp",
    });
  });

  it("carries the per-scene observations of every scene that overrides one", () => {
    const scenesWithObservations = Object.keys(SCENE_OBSERVATION_OVERRIDES) as SceneId[];
    expect(scenesWithObservations).toEqual(SCENE_IDS);
    expect(SCENE_OBSERVATION_OVERRIDES.sleeping?.bed).toBe(
      "エトキチの寝息に合わせて、掛け布団がゆっくり上下している。",
    );
  });
});
