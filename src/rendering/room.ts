import { AnimatedSprite, Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import "pixi.js/browser";
import type { SceneId, TimeBand, VisitView } from "../game/types.ts";

const WIDTH = 195;
const HEIGHT = 422;
const BACKGROUND_HEIGHT = 347;
const WALK_SPEED = 19;
const WALKER_FRAME_HEIGHT = 43;

type Direction = "down" | "left" | "right" | "up";

interface Waypoint {
  x: number;
  y: number;
  pauseMs: number;
}

interface RoomCallbacks {
  onObservation: (text: string) => void;
  onCharacterTap: () => void;
}

const directionRows: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

const timeTints: Record<TimeBand, { color: number; alpha: number }> = {
  deepNight: { color: 0x101a3b, alpha: 0.56 },
  earlyMorning: { color: 0xffc578, alpha: 0.08 },
  daytime: { color: 0xfff1c6, alpha: 0.02 },
  evening: { color: 0xc75b45, alpha: 0.08 },
  night: { color: 0x1d2a50, alpha: 0.36 },
};

const routes: Record<SceneId, readonly Waypoint[]> = {
  sleeping: [{ x: 29, y: 154, pauseMs: 5000 }],
  kickedBlanket: [{ x: 31, y: 156, pauseMs: 5000 }],
  tooMuchBreakfast: [
    { x: 103, y: 193, pauseMs: 1100 },
    { x: 132, y: 190, pauseMs: 2200 },
    { x: 98, y: 225, pauseMs: 1500 },
  ],
  overslept: [
    { x: 96, y: 220, pauseMs: 450 },
    { x: 123, y: 151, pauseMs: 650 },
    { x: 64, y: 193, pauseMs: 500 },
    { x: 116, y: 244, pauseMs: 550 },
  ],
  foundOldToy: [
    { x: 98, y: 224, pauseMs: 1800 },
    { x: 93, y: 242, pauseMs: 1300 },
    { x: 111, y: 194, pauseMs: 1100 },
  ],
  windowNap: [{ x: 54, y: 128, pauseMs: 5000 }],
  muddyReturn: [
    { x: 138, y: 149, pauseMs: 1800 },
    { x: 106, y: 205, pauseMs: 1200 },
    { x: 126, y: 174, pauseMs: 900 },
  ],
  simmeringDinner: [
    { x: 125, y: 211, pauseMs: 900 },
    { x: 133, y: 202, pauseMs: 2300 },
    { x: 112, y: 229, pauseMs: 1000 },
  ],
  packingTomorrow: [
    { x: 104, y: 222, pauseMs: 1300 },
    { x: 126, y: 150, pauseMs: 2100 },
    { x: 93, y: 241, pauseMs: 900 },
  ],
  littleNightSnack: [
    { x: 96, y: 218, pauseMs: 1000 },
    { x: 92, y: 242, pauseMs: 2600 },
    { x: 108, y: 205, pauseMs: 900 },
  ],
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
  const hotspot = new Graphics().rect(x, y, width, height).fill({ color: 0xffffff, alpha: 0.001 });
  interactive(hotspot, label, message, onObservation);
  return hotspot;
}

function createRoom(backgroundTexture: Texture, visit: VisitView, callbacks: RoomCallbacks): Container {
  backgroundTexture.source.scaleMode = "nearest";
  const room = new Container();
  const floorExtension = new Graphics().rect(0, BACKGROUND_HEIGHT, WIDTH, HEIGHT - BACKGROUND_HEIGHT).fill(0x6d361d);
  const background = new Sprite(backgroundTexture);
  background.width = WIDTH;
  background.height = BACKGROUND_HEIGHT;

  const tint = timeTints[visit.assignment.band];
  const timeOverlay = new Graphics().rect(0, 0, WIDTH, HEIGHT).fill({ color: tint.color, alpha: tint.alpha });
  const hotspots = [
    createHotspot(19, 25, 63, 58, "窓", "窓の外にも、同じ時間がゆっくり流れている。", callbacks.onObservation),
    createHotspot(
      80,
      55,
      44,
      61,
      "本棚",
      "棚には、どこで見つけたのか分からない宝物が少しずつ増えている。",
      callbacks.onObservation,
    ),
    createHotspot(
      0,
      82,
      54,
      87,
      "ベッド",
      "枕は少しへこんでいて、毎晩ここで眠っていることが分かる。",
      callbacks.onObservation,
    ),
    createHotspot(
      145,
      130,
      50,
      138,
      "台所",
      "台所には、エトキチが選んだ小さな食器が並んでいる。",
      callbacks.onObservation,
    ),
    createHotspot(17, 208, 67, 73, "机", "机には、今日使ったものがそのまま残っている。", callbacks.onObservation),
  ];

  room.addChild(floorExtension, background, timeOverlay, ...hotspots);
  return room;
}

function createDirectionFrames(sheet: Texture): Record<Direction, Texture[]> {
  sheet.source.scaleMode = "nearest";
  return Object.fromEntries(
    Object.entries(directionRows).map(([direction, row]) => [
      direction,
      [0, 1, 2].map((column) => {
        const left = Math.round((column * sheet.width) / 3);
        const top = Math.round((row * sheet.height) / 4);
        const right = Math.round(((column + 1) * sheet.width) / 3);
        const bottom = Math.round(((row + 1) * sheet.height) / 4);
        return new Texture({
          source: sheet.source,
          frame: new Rectangle(left, top, right - left, bottom - top),
        });
      }),
    ]),
  ) as Record<Direction, Texture[]>;
}

function directionTo(fromX: number, fromY: number, toX: number, toY: number): Direction {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

function createWalker(app: Application, sheet: Texture, visit: VisitView, callbacks: RoomCallbacks): Container {
  const route = routes[visit.scene.id];
  const frames = createDirectionFrames(sheet);
  const character = new AnimatedSprite(frames.down);
  const baseFrame = frames.down.at(0);
  if (!baseFrame) throw new Error("歩行アニメーションのフレームがありません");
  character.anchor.set(0.5, 1);
  character.scale.set(WALKER_FRAME_HEIGHT / baseFrame.height);
  character.roundPixels = true;
  character.animationSpeed = 0.13;
  character.loop = true;

  const actor = new Container();
  const shadow = new Graphics().ellipse(0, -2, 13, 4).fill({ color: 0x2a160d, alpha: 0.32 });
  actor.addChild(shadow, character);
  actor.position.set(route[0]?.x ?? 98, route[0]?.y ?? 220);
  actor.eventMode = "static";
  actor.cursor = "pointer";
  actor.on("pointertap", callbacks.onCharacterTap);

  let targetIndex = route.length > 1 ? 1 : 0;
  let pauseRemaining = route[0]?.pauseMs ?? 800;
  let direction: Direction = "down";

  app.ticker.add((ticker) => {
    if (route.length < 2) return;
    if (pauseRemaining > 0) {
      pauseRemaining -= ticker.deltaMS;
      if (character.playing) {
        character.stop();
        character.gotoAndStop(1);
      }
      return;
    }

    const target = route[targetIndex];
    if (!target) return;
    const dx = target.x - actor.x;
    const dy = target.y - actor.y;
    const distance = Math.hypot(dx, dy);
    const step = WALK_SPEED * (ticker.deltaMS / 1000);

    if (distance <= step) {
      actor.position.set(target.x, target.y);
      pauseRemaining = target.pauseMs;
      targetIndex = (targetIndex + 1) % route.length;
      character.stop();
      character.gotoAndStop(1);
      return;
    }

    const nextDirection = directionTo(actor.x, actor.y, target.x, target.y);
    if (nextDirection !== direction) {
      direction = nextDirection;
      character.textures = frames[direction];
    }
    if (!character.playing) character.play();
    actor.x += (dx / distance) * step;
    actor.y += (dy / distance) * step;
  });

  return actor;
}

function createSleeper(app: Application, texture: Texture, visit: VisitView, callbacks: RoomCallbacks): Sprite {
  texture.source.scaleMode = "nearest";
  const sleeper = new Sprite(texture);
  const position = routes[visit.scene.id][0] ?? { x: 30, y: 154 };
  sleeper.anchor.set(0.5, 1);
  sleeper.width = 63;
  sleeper.height = 42;
  sleeper.position.set(position.x, position.y);
  sleeper.eventMode = "static";
  sleeper.cursor = "pointer";
  sleeper.on("pointertap", callbacks.onCharacterTap);

  const baseScaleY = sleeper.scale.y;
  let elapsed = 0;
  app.ticker.add((ticker) => {
    elapsed += ticker.deltaMS;
    const breath = Math.sin(elapsed / 620);
    sleeper.scale.y = baseScaleY * (1 + breath * 0.015);
    sleeper.y = position.y + breath * 0.45;
  });
  return sleeper;
}

export async function renderRoom(host: HTMLElement, visit: VisitView, callbacks: RoomCallbacks): Promise<Application> {
  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    backgroundAlpha: 0,
    antialias: false,
    autoDensity: false,
    resolution: 1,
    roundPixels: true,
    preference: "webgl",
  });
  app.canvas.className = "room-canvas";
  app.canvas.setAttribute("aria-label", `${visit.scene.title}。${visit.scene.description}`);
  host.replaceChildren(app.canvas);

  const [backgroundTexture, characterTexture] = await Promise.all([
    Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/room-background-pixel.png`),
    Assets.load<Texture>(
      `${import.meta.env.BASE_URL}assets/${
        visit.scene.characterPose === "sleep" ? "etokichi-sleep-pixel.png" : "etokichi-walk-pixel.png"
      }`,
    ),
  ]);
  const room = createRoom(backgroundTexture, visit, callbacks);
  const character =
    visit.scene.characterPose === "sleep"
      ? createSleeper(app, characterTexture, visit, callbacks)
      : createWalker(app, characterTexture, visit, callbacks);
  app.stage.addChild(room, character);
  return app;
}
