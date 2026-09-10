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
import { visitFor } from "./helpers/asset-references.ts";

const SCENE_IDS = SCENES.map(({ id }) => id);

describe("scene presentation table", () => {
  it("defines every scene exactly once, in the order the scenes are written", () => {
    expect(Object.keys(SCENE_PRESENTATIONS)).toEqual(SCENE_IDS);
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
  // 経路はwaypointの順序・行き先・停止時間・行動の指定・描画深度まで、集約前の SCENE_ROUTES と同じ値で固定する。
  it("keeps every scene route down to each waypoint value", () => {
    expect(Object.keys(SCENE_ROUTES)).toEqual(SCENE_IDS);
    expect(SCENE_ROUTES).toMatchInlineSnapshot(`
      {
        "almostAwake": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "destination": {
                "actionPointId": "sleep",
                "furnitureId": "bed",
                "type": "furnitureAction",
              },
              "pauseMs": 5000,
            },
          ],
        },
        "brushingMaineCoon": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "type": "point",
                "x": 70,
                "y": 320,
              },
              "pauseMs": 5000,
            },
          ],
        },
        "comfortingMaineCoon": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "destination": {
                "type": "point",
                "x": 96,
                "y": 326,
              },
              "pauseMs": 5000,
            },
          ],
        },
        "foldingLaundry": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "type": "point",
                "x": 98,
                "y": 176,
              },
              "pauseMs": 5000,
            },
          ],
        },
        "foundOldToy": {
          "movement": "walking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "type": "point",
                "x": 110,
                "y": 224,
              },
              "pauseMs": 3000,
            },
            {
              "destination": {
                "type": "point",
                "x": 110,
                "y": 260,
              },
              "pauseMs": 1300,
            },
            {
              "destination": {
                "type": "point",
                "x": 111,
                "y": 194,
              },
              "pauseMs": 1100,
            },
          ],
        },
        "kickedBlanket": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "destination": {
                "actionPointId": "kickedBlanket",
                "furnitureId": "bed",
                "type": "furnitureAction",
              },
              "pauseMs": 5000,
            },
          ],
        },
        "littleNightSnack": {
          "movement": "walking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "actionPointId": "fridgeFront",
                "fixtureId": "kitchenUnit",
                "type": "fixtureAction",
              },
              "pauseMs": 5000,
            },
            {
              "destination": {
                "type": "point",
                "x": 105,
                "y": 183,
              },
              "pauseMs": 0,
            },
            {
              "destination": {
                "type": "point",
                "x": 126,
                "y": 174,
              },
              "pauseMs": 600,
            },
            {
              "destination": {
                "type": "point",
                "x": 105,
                "y": 153,
              },
              "pauseMs": 750,
            },
            {
              "destination": {
                "type": "point",
                "x": 70,
                "y": 174,
              },
              "pauseMs": 850,
            },
            {
              "destination": {
                "type": "point",
                "x": 91,
                "y": 205,
              },
              "pauseMs": 600,
            },
            {
              "destination": {
                "type": "point",
                "x": 117,
                "y": 244,
              },
              "pauseMs": 800,
            },
            {
              "destination": {
                "type": "point",
                "x": 137,
                "y": 226,
              },
              "pauseMs": 550,
            },
          ],
        },
        "masaruSunbeam": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "type": "point",
                "x": 117,
                "y": 194,
              },
              "pauseMs": 5000,
            },
          ],
        },
        "mimizouFarewell": {
          "movement": "walking",
          "waypoints": [
            {
              "action": true,
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 42,
                "y": 128,
              },
              "pauseMs": 5200,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 44,
                "y": 145,
              },
              "pauseMs": 0,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 44,
                "y": 174,
              },
              "pauseMs": 0,
            },
            {
              "destination": {
                "type": "point",
                "x": 88,
                "y": 184,
              },
              "pauseMs": 800,
            },
            {
              "destination": {
                "type": "point",
                "x": 107,
                "y": 224,
              },
              "pauseMs": 700,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 44,
                "y": 174,
              },
              "pauseMs": 0,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 44,
                "y": 145,
              },
              "pauseMs": 0,
            },
          ],
        },
        "mimizouVisit": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "actionPointId": "morningTea",
                "furnitureId": "diningSet",
                "type": "furnitureAction",
              },
              "pauseMs": 5000,
            },
          ],
        },
        "morningStretch": {
          "movement": "walking",
          "waypoints": [
            {
              "action": true,
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 42,
                "y": 128,
              },
              "pauseMs": 4600,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 44,
                "y": 145,
              },
              "pauseMs": 0,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 44,
                "y": 174,
              },
              "pauseMs": 0,
            },
            {
              "destination": {
                "type": "point",
                "x": 88,
                "y": 184,
              },
              "pauseMs": 700,
            },
            {
              "destination": {
                "type": "point",
                "x": 102,
                "y": 226,
              },
              "pauseMs": 700,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 44,
                "y": 174,
              },
              "pauseMs": 0,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 44,
                "y": 145,
              },
              "pauseMs": 0,
            },
          ],
        },
        "morningTea": {
          "movement": "walking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "actionPointId": "morningTea",
                "furnitureId": "diningSet",
                "type": "furnitureAction",
              },
              "pauseMs": 6800,
            },
            {
              "destination": {
                "type": "point",
                "x": 105,
                "y": 273,
              },
              "pauseMs": 0,
            },
            {
              "destination": {
                "type": "point",
                "x": 105,
                "y": 220,
              },
              "pauseMs": 650,
            },
            {
              "destination": {
                "type": "point",
                "x": 105,
                "y": 215,
              },
              "pauseMs": 900,
            },
            {
              "destination": {
                "type": "point",
                "x": 105,
                "y": 252,
              },
              "pauseMs": 650,
            },
          ],
        },
        "muddyReturn": {
          "movement": "walking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "type": "point",
                "x": 138,
                "y": 149,
              },
              "pauseMs": 3000,
            },
            {
              "destination": {
                "type": "point",
                "x": 106,
                "y": 205,
              },
              "pauseMs": 1200,
            },
            {
              "destination": {
                "type": "point",
                "x": 126,
                "y": 174,
              },
              "pauseMs": 900,
            },
          ],
        },
        "nappingOnMaineCoon": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "destination": {
                "type": "point",
                "x": 88,
                "y": 340,
              },
              "pauseMs": 5000,
            },
          ],
        },
        "overslept": {
          "movement": "walking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "type": "point",
                "x": 96,
                "y": 220,
              },
              "pauseMs": 1800,
            },
            {
              "destination": {
                "type": "point",
                "x": 123,
                "y": 151,
              },
              "pauseMs": 650,
            },
            {
              "destination": {
                "type": "point",
                "x": 64,
                "y": 193,
              },
              "pauseMs": 500,
            },
            {
              "destination": {
                "type": "point",
                "x": 116,
                "y": 244,
              },
              "pauseMs": 550,
            },
          ],
        },
        "packingTomorrow": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "actionPointId": "packing",
                "furnitureId": "bookshelf",
                "type": "furnitureAction",
              },
              "pauseMs": 5000,
            },
          ],
        },
        "planningDay": {
          "movement": "walking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "type": "point",
                "x": 99,
                "y": 292,
              },
              "pauseMs": 5200,
            },
            {
              "destination": {
                "type": "point",
                "x": 112,
                "y": 223,
              },
              "pauseMs": 750,
            },
            {
              "destination": {
                "type": "point",
                "x": 111,
                "y": 190,
              },
              "pauseMs": 700,
            },
          ],
        },
        "readingComics": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "action": true,
              "depthOffset": 30,
              "destination": {
                "actionPointId": "sit",
                "furnitureId": "sofa",
                "type": "furnitureAction",
              },
              "pauseMs": 5000,
            },
          ],
        },
        "simmeringDinner": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "action": true,
              "depthOffset": 33,
              "destination": {
                "actionPointId": "stoveStool",
                "fixtureId": "kitchenUnit",
                "type": "fixtureAction",
              },
              "pauseMs": 5000,
            },
          ],
        },
        "sleeping": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "destination": {
                "actionPointId": "sleep",
                "furnitureId": "bed",
                "type": "furnitureAction",
              },
              "pauseMs": 5000,
            },
          ],
        },
        "sleepingWithTatsuo": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "destination": {
                "actionPointId": "sleepTogether",
                "furnitureId": "bed",
                "type": "furnitureAction",
              },
              "pauseMs": 5000,
            },
          ],
        },
        "sunagimoGrill": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "type": "point",
                "x": 146,
                "y": 284,
              },
              "pauseMs": 5000,
            },
          ],
        },
        "tatsuoAtWindow": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "destination": {
                "actionPointId": "sleep",
                "furnitureId": "bed",
                "type": "furnitureAction",
              },
              "pauseMs": 5000,
            },
          ],
        },
        "tatsuoTooComfortable": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "type": "point",
                "x": 76,
                "y": 271,
              },
              "pauseMs": 5000,
            },
          ],
        },
        "tatsuoWakeUp": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "destination": {
                "actionPointId": "sleepTogether",
                "furnitureId": "bed",
                "type": "furnitureAction",
              },
              "pauseMs": 5000,
            },
          ],
        },
        "tooMuchBreakfast": {
          "movement": "walking",
          "waypoints": [
            {
              "action": true,
              "destination": {
                "actionPointId": "stoveSide",
                "fixtureId": "kitchenUnit",
                "type": "fixtureAction",
              },
              "pauseMs": 3000,
            },
            {
              "destination": {
                "type": "point",
                "x": 104,
                "y": 269,
              },
              "pauseMs": 0,
            },
            {
              "destination": {
                "actionPointId": "morningTea",
                "furnitureId": "diningSet",
                "type": "furnitureAction",
              },
              "pauseMs": 1500,
            },
            {
              "destination": {
                "type": "point",
                "x": 104,
                "y": 254,
              },
              "pauseMs": 0,
            },
          ],
        },
        "watchingStars": {
          "movement": "walking",
          "waypoints": [
            {
              "action": true,
              "depthOffset": 45,
              "destination": {
                "type": "point",
                "x": 70,
                "y": 122,
              },
              "pauseMs": 4800,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 79,
                "y": 140,
              },
              "pauseMs": 0,
            },
            {
              "destination": {
                "type": "point",
                "x": 83,
                "y": 184,
              },
              "pauseMs": 700,
            },
            {
              "destination": {
                "type": "point",
                "x": 68,
                "y": 211,
              },
              "pauseMs": 650,
            },
            {
              "destination": {
                "type": "point",
                "x": 103,
                "y": 238,
              },
              "pauseMs": 750,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 79,
                "y": 140,
              },
              "pauseMs": 0,
            },
          ],
        },
        "wateringPlants": {
          "movement": "walking",
          "waypoints": [
            {
              "action": true,
              "actionOffsetY": 14,
              "actionScale": 1.18,
              "actionVariant": 1,
              "destination": {
                "actionPointId": "watering",
                "furnitureId": "diningSet",
                "type": "furnitureAction",
              },
              "pauseMs": 2700,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 105,
                "y": 235,
              },
              "pauseMs": 0,
            },
            {
              "depthOffset": 40,
              "destination": {
                "type": "point",
                "x": 105,
                "y": 279,
              },
              "pauseMs": 0,
            },
            {
              "action": true,
              "actionFacing": "right",
              "destination": {
                "actionPointId": "watering",
                "furnitureId": "floorPlant",
                "type": "furnitureAction",
              },
              "pauseMs": 2700,
            },
            {
              "destination": {
                "type": "point",
                "x": 104,
                "y": 198,
              },
              "pauseMs": 650,
            },
          ],
        },
        "windowNap": {
          "movement": "nonWalking",
          "waypoints": [
            {
              "destination": {
                "type": "point",
                "x": 82,
                "y": 184,
              },
              "pauseMs": 5000,
            },
          ],
        },
      }
    `);
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
      masaruSunbeam: "etokichi-with-masaru-pixel.webp",
      wateringPlants: "etokichi-watering-directions-pixel.webp",
      muddyReturn: "etokichi-muddy-return-pixel.webp",
      simmeringDinner: "etokichi-watching-pot-up-right-pixel.webp",
      sunagimoGrill: "etokichi-watching-sunagimo-pixel.webp",
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
      masaruSunbeam: "assets/collection/masaru-sunbeam.webp",
      nappingOnMaineCoon: "assets/collection/napping-on-maine-coon.webp",
      wateringPlants: "assets/collection/watering-plants.webp",
      muddyReturn: "assets/collection/muddy-return.webp",
      simmeringDinner: "assets/collection/simmering-dinner.webp",
      sunagimoGrill: "assets/collection/sunagimo-grill.webp",
      foldingLaundry: "assets/collection/folding-laundry.webp",
      tatsuoTooComfortable: "assets/collection/tatsuo-too-comfortable.webp",
      comfortingMaineCoon: "assets/collection/comforting-maine-coon.webp",
      packingTomorrow: "assets/collection/packing-tomorrow.webp",
      littleNightSnack: "assets/collection/little-night-snack.webp",
      readingComics: "assets/collection/reading-comics.webp",
      mimizouVisit: "assets/collection/mimizou-visit.webp",
    });
  });

  // 観察文は集約前の SCENE_OBSERVATION_OVERRIDES と全件一致で固定する。
  it("keeps the per-scene observations of every scene word for word", () => {
    expect(Object.keys(SCENE_OBSERVATION_OVERRIDES)).toEqual(SCENE_IDS);
    expect(SCENE_OBSERVATION_OVERRIDES).toMatchInlineSnapshot(`
      {
        "almostAwake": {
          "bed": "布団の中で何度ももぞもぞ動いている。もうすぐ起きそうだ。",
          "bedsideTable": "枕元の帽子に手が伸びかけて、また布団へ戻った。",
          "window": "カーテンの隙間から、細い朝日が布団の上へ伸びている。",
        },
        "brushingMaineCoon": {
          "sofa": "ソファーの上に、抜け毛がふわふわと集まっている。",
          "window": "朝の光で、クーンちゃんのしま模様までつやつやに見える。",
        },
        "comfortingMaineCoon": {
          "bed": "雷の夜は、ベッドより絨毯の上のほうが安心らしい。",
          "sofa": "いつもの丸まり場所は空っぽ。クーンちゃんはエトキチの腕の中だ。",
          "window": "稲光が走るたび、雨粒が窓を強く叩く。",
        },
        "foldingLaundry": {
          "bed": "たたんだタオルは、あとでベッド脇へしまうつもりらしい。",
          "sofa": "ソファーの座面は、今日はクーンちゃんが占領している。",
          "window": "夕方の風で乾いた洗濯物は、太陽の匂いがする。",
        },
        "foundOldToy": {
          "bookshelf": "棚の奥から出てきた箱が、床に開けたまま置かれている。",
          "diningSet": "掃除の途中のはずが、雑巾は食卓の上で止まっている。",
          "sofa": "ソファーの下から、昔描いた絵が出てきた。",
        },
        "kickedBlanket": {
          "bed": "布団は足元から床へずり落ち、エトキチは大の字で眠っている。",
          "bedsideTable": "照明台の上には、まだ半分残った水のコップがある。",
          "window": "窓が少しだけ開いていて、冷たい夜風が入ってくる。",
        },
        "littleNightSnack": {
          "diningSet": "食卓の上に、小さなプリンの空き容器がひとつ。",
          "fridge": "冷蔵庫の扉を開けた回数が、今夜はいつもより多い気がする。",
          "stove": "温めたミルクの鍋が、コンロで静かに冷めている。",
        },
        "masaruSunbeam": {
          "bed": "今日はベッドより、マサルの隣が気持ちよさそう。",
          "bookshelf": "本は棚にしまったまま。今は二人でのんびりする時間。",
          "window": "窓から伸びる日だまりを、マサルとエトキチが半分こしている。",
        },
        "mimizouFarewell": {
          "bed": "ベッドは空っぽ。エトキチは窓辺で手を振っている。",
          "bookshelf": "棚の上のフクロウの置き物が、窓のほうを向いている。",
          "window": "窓台に灰色の小さな羽が一枚残っている。",
        },
        "mimizouVisit": {
          "bookshelf": "フクロウの図鑑が、棚の一番上に置いてある。",
          "diningSet": "飲みかけのお茶が、食卓の上で湯気を立てている。",
          "window": "窓ガラスの向こうで、大きな目がゆっくり瞬いた。",
        },
        "morningStretch": {
          "bed": "起きたばかりのベッドは、掛け布団がめくれたままだ。",
          "bedsideTable": "窓のそばに、小さな水のコップが用意されている。",
          "window": "朝の空気を吸い込むたび、窓の外が少し明るくなる気がする。",
        },
        "morningTea": {
          "diningSet": "湯気の立つ黄色いカップを、両手で包んで飲んでいる。",
          "sink": "茶葉の缶が、流し台の脇に出しっぱなしになっている。",
          "stove": "やかんを火にかけた跡が、コンロにまだ残っている。",
          "window": "窓から差す光が、お茶の湯気を照らしている。",
        },
        "muddyReturn": {
          "bed": "泥のついたまま、ベッドに飛び込まないでほしい。",
          "sink": "泥だらけの手をこれから洗うのか、流し台が待っている。",
          "sofa": "ソファーにも泥がつきそうで、ちょっとひやひやする。",
          "window": "夕焼けの帰り道で、水たまりに落ちたらしい。",
        },
        "nappingOnMaineCoon": {
          "sofa": "ソファーは空いているのに、今日の枕はクーンちゃんだ。",
          "window": "昼の光が、二人の寝息に合わせてゆらいで見える。",
        },
        "overslept": {
          "bed": "布団が飛ばされたように乱れている。飛び起きたらしい。",
          "bookshelf": "鞄の中身を探した跡が、棚の前に散らばっている。",
          "diningSet": "食卓の椅子に、なぜか帽子が掛かっている。",
          "window": "窓の外はもうすっかり明るい。急がないと。",
        },
        "packingTomorrow": {
          "bookshelf": "棚の前に鞄を広げ、地図とおやつを出したり入れたりしている。",
          "diningSet": "食卓に、明日の持ち物リストが置いてある。",
          "fridge": "冷蔵庫から出したおやつが、鞄の半分を占めている。",
        },
        "planningDay": {
          "bookshelf": "棚の手帳置き場が空いている。今日の分は絨毯の上だ。",
          "diningSet": "食卓ではなく絨毯の上で書くのが、エトキチ流らしい。",
          "window": "静かな朝の光が、開いた手帳のページを照らしている。",
        },
        "readingComics": {
          "bedsideTable": "照明台の明かりが、ページの上だけを照らしている。",
          "bookshelf": "棚の漫画の並びに、一冊分の隙間が空いている。",
          "sofa": "ソファーの脇に、読み終えた巻が積まれている。",
          "window": "夜の窓に、漫画に夢中なエトキチが映っている。",
        },
        "simmeringDinner": {
          "diningSet": "食卓にはもう二人分の器が並べてある。",
          "fridge": "星形に切ったにんじんの残りが、冷蔵庫にしまってある。",
          "sink": "切り終えたまな板と包丁が、流し台で出番を終えている。",
          "stove": "鍋がことこと音を立てて、いい匂いが部屋いっぱいに広がっている。",
        },
        "sleeping": {
          "bed": "エトキチの寝息に合わせて、掛け布団がゆっくり上下している。",
          "bedsideTable": "照明台の明かりは落とされ、コップの水だけが小さく光っている。",
          "bookshelf": "読みかけの本が、棚から少しだけ引き出されたままになっている。",
        },
        "sleepingWithTatsuo": {
          "bed": "タツヲの大きな手が、ベッドの縁にそっと添えられている。",
          "bedsideTable": "枕元の水は、タツヲが持ってきてくれたものかもしれない。",
          "sofa": "タツヲにはソファーより、エトキチのそばのほうが落ち着くらしい。",
        },
        "sunagimoGrill": {
          "diningSet": "二人分のお皿が、焼きたての串を待っている。",
          "stove": "夕食の鍋がことこと煮えている。隣ではsunagimoが串の焼き色を真剣に確かめている。",
        },
        "tatsuoAtWindow": {
          "bed": "エトキチは布団を鼻まで引き上げ、窓のほうをちらちら見ている。",
          "bookshelf": "雷が鳴るたび、棚の写真立てがかたかたと鳴っている。",
          "window": "雨に濡れた窓に、雷が光るたび何かの影が浮かぶ。",
        },
        "tatsuoTooComfortable": {
          "bed": "タツヲにはベッドも狭そうだけれど、ソファーよりはましかもしれない。",
          "sofa": "二人掛けのソファーは、タツヲひとりで満席だ。",
          "window": "夕焼けが、眠るタツヲの背中をオレンジに染めている。",
        },
        "tatsuoWakeUp": {
          "bed": "タツヲの手がベッドの縁にあるのに、エトキチはまだ布団の中だ。",
          "bedsideTable": "枕元に朝の水が届いている。タツヲが運んできたらしい。",
          "window": "タツヲが来るのは、いつも空が白み始めたころだ。",
        },
        "tooMuchBreakfast": {
          "diningSet": "食卓には、どう見ても二人では食べきれない量の朝食が並んでいる。",
          "fridge": "冷蔵庫の中身が、今朝だけでだいぶ減った気がする。",
          "sink": "流し台には、朝食に使ったボウルとフライパンが積まれている。",
          "stove": "コンロはまだ温かい。作りすぎた理由がここにある。",
        },
        "watchingStars": {
          "bed": "ベッドは空っぽで、枕だけが窓辺の主を待っている。",
          "bedsideTable": "照明は消してある。星を見るには暗いほうがいいらしい。",
          "bookshelf": "星座の本が、棚の一番手前に移されている。",
          "window": "窓の向こうで、小さな星がひとつずつ瞬いている。",
        },
        "wateringPlants": {
          "diningSet": "食卓の鉢には小さな芽が出ていて、一口ぶんの水をもらった。",
          "floorPlant": "大きな葉が、今もらった水できらきら光っている。",
          "sink": "じょうろに水を汲んだ跡が、流し台に残っている。",
          "window": "窓辺の緑が、水をもらって少し背伸びしたように見える。",
        },
        "windowNap": {
          "bed": "ベッドではなく、日なたの座布団を選んだらしい。",
          "bookshelf": "読みかけの本は、胸の上で開いたままだ。",
          "window": "窓から差す日なたが、ちょうど座布団の上に落ちている。",
        },
      }
    `);
  });
});
