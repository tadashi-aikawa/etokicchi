import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import "pixi.js/browser";
import type { SceneDefinition, SceneId, TimeBand, VisitView } from "../game/types.ts";

const WIDTH = 390;
const HEIGHT = 690;

const timeTints: Record<TimeBand, { color: number; alpha: number }> = {
  deepNight: { color: 0x15213f, alpha: 0.52 },
  earlyMorning: { color: 0xffb66d, alpha: 0.08 },
  daytime: { color: 0xfff3d1, alpha: 0.03 },
  evening: { color: 0xd8614f, alpha: 0.18 },
  night: { color: 0x263354, alpha: 0.42 },
};

const propColors: Record<SceneId, number> = {
  sleeping: 0x9aa7d4,
  kickedBlanket: 0xa799d1,
  tooMuchBreakfast: 0xf2bd62,
  overslept: 0xe98b58,
  foundOldToy: 0x69b58d,
  windowNap: 0x8ec67c,
  muddyReturn: 0x9b7052,
  simmeringDinner: 0xd66f4d,
  packingTomorrow: 0x6c769c,
  littleNightSnack: 0x64749b,
};

function interactive(graphics: Graphics, label: string, message: string, onObservation: (text: string) => void): void {
  graphics.eventMode = "static";
  graphics.cursor = "pointer";
  graphics.label = label;
  graphics.on("pointertap", () => onObservation(message));
}

function createHotspot(
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  message: string,
  onObservation: (text: string) => void,
): Graphics {
  const hotspot = new Graphics().roundRect(x, y, width, height, 12).fill({ color: 0xffffff, alpha: 0.001 });
  interactive(hotspot, label, message, onObservation);
  return hotspot;
}

function createSceneProp(visit: VisitView): Graphics {
  const prop = new Graphics();
  const color = propColors[visit.scene.id];

  if (visit.scene.id === "tooMuchBreakfast") {
    prop.ellipse(340, 271, 38, 10).fill(0xfff6df).circle(330, 264, 8).fill(color).circle(350, 261, 7).fill(color);
  } else if (visit.scene.id === "littleNightSnack") {
    prop.ellipse(330, 397, 38, 10).fill(0xfff6df).circle(320, 390, 8).fill(color).circle(340, 387, 7).fill(color);
  } else if (visit.scene.id === "foundOldToy") {
    prop.star(193, 303, 5, 20, 9).fill(color);
  } else if (visit.scene.id === "muddyReturn") {
    prop.ellipse(274, 317, 42, 17).fill({ color: 0x65402f, alpha: 0.46 });
  } else if (visit.scene.id === "simmeringDinner") {
    prop.roundRect(334, 245, 40, 22, 7).fill(color).rect(343, 236, 22, 6).fill(0x765045);
  } else if (visit.scene.id === "packingTomorrow") {
    prop.roundRect(246, 263, 48, 57, 8).fill(color).rect(258, 251, 24, 16).stroke({ color, width: 5 });
  } else if (visit.scene.id === "kickedBlanket") {
    prop.roundRect(44, 292, 112, 38, 16).fill({ color, alpha: 0.68 });
  }

  return prop;
}

function createRoom(backgroundTexture: Texture, visit: VisitView, onObservation: (text: string) => void): Container {
  const room = new Container();
  const background = new Sprite(backgroundTexture);
  background.width = WIDTH;
  background.height = HEIGHT;

  const tint = timeTints[visit.assignment.band];
  const timeOverlay = new Graphics().rect(0, 0, WIDTH, HEIGHT).fill({ color: tint.color, alpha: tint.alpha });
  const lampGlow = new Graphics();
  if (visit.assignment.band === "deepNight" || visit.assignment.band === "night") {
    lampGlow.circle(139, 260, 92).fill({ color: 0xffc66b, alpha: 0.14 });
  }

  const hotspots = [
    createHotspot(31, 74, 118, 174, "窓", "窓の外にも、同じ時間がゆっくり流れている。", onObservation),
    createHotspot(
      0,
      213,
      58,
      190,
      "本棚",
      "棚には、どこで見つけたのか分からない宝物が少しずつ増えている。",
      onObservation,
    ),
    createHotspot(
      18,
      253,
      153,
      160,
      "ベッド",
      "枕は少しへこんでいて、毎晩ここで眠っていることが分かる。",
      onObservation,
    ),
    createHotspot(296, 154, 94, 194, "台所", "台所には、エトキチが選んだ小さな食器が並んでいる。", onObservation),
    createHotspot(285, 354, 105, 172, "机", "机には、今日使ったものがそのまま残っている。", onObservation),
  ];

  room.addChild(background, timeOverlay, lampGlow, createSceneProp(visit), ...hotspots);
  return room;
}

async function loadCharacterTexture(pose: SceneDefinition["characterPose"]): Promise<Texture> {
  if (pose === "sleep") {
    return Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/etokichi-sleep.png`);
  }
  if (pose === "busy") {
    return Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/etokichi-busy.png`);
  }

  const sheet = await Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/etokichi-walk.webp`);
  return new Texture({ source: sheet.source, frame: new Rectangle(400, 0, 400, 400) });
}

function createCharacter(texture: Texture, visit: VisitView, onObservation: (text: string) => void): Sprite {
  const character = new Sprite(texture);
  character.anchor.set(0.5, 1);
  const hasChoices = (visit.scene.choices?.length ?? 0) > 0;

  if (visit.scene.characterPose === "sleep") {
    character.width = 172;
    character.height = 115;
    character.x = 97;
    character.y = hasChoices ? 325 : 391;
  } else if (visit.scene.characterPose === "busy") {
    character.width = 138;
    character.height = 148;
    character.x = 208;
    character.y = hasChoices ? 323 : 492;
  } else {
    character.width = 132;
    character.height = 132;
    character.x = visit.scene.id === "muddyReturn" ? 244 : 205;
    character.y = hasChoices ? 323 : 490;
  }

  character.eventMode = "static";
  character.cursor = "pointer";
  character.on("pointertap", () => onObservation(visit.line));
  return character;
}

export async function renderRoom(
  host: HTMLElement,
  visit: VisitView,
  onObservation: (text: string) => void,
): Promise<Application> {
  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: "webgl",
  });
  app.canvas.className = "room-canvas";
  app.canvas.setAttribute("aria-label", `${visit.scene.title}。${visit.scene.description}`);
  host.replaceChildren(app.canvas);

  const [backgroundTexture, characterTexture] = await Promise.all([
    Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/room-background.png`),
    loadCharacterTexture(visit.scene.characterPose),
  ]);
  const room = createRoom(backgroundTexture, visit, onObservation);
  const character = createCharacter(characterTexture, visit, onObservation);
  app.stage.addChild(room, character);
  return app;
}
