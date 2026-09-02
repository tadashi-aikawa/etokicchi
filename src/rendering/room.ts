import {
  AnimatedSprite,
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
  type Ticker,
} from "pixi.js";
import "pixi.js/browser";
import type { SceneId, VisitView } from "../game/types.ts";
import { getMimizouVisitFrame } from "./mimizou-visit.ts";
import { getRoomPresentation, getRoomTint } from "./room-presentation.ts";

const WIDTH = 195;
const HEIGHT = 422;
const BACKGROUND_HEIGHT = 347;
const WALK_SPEED = 19;
const WALKER_FRAME_HEIGHT = 52;
const ACTION_FRAME_HEIGHT = 60;

type Direction = "down" | "left" | "right" | "up";

interface Waypoint {
  x: number;
  y: number;
  pauseMs: number;
  action?: boolean;
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

const routes: Record<SceneId, readonly Waypoint[]> = {
  sleeping: [{ x: 29, y: 124, pauseMs: 5000 }],
  sleepingWithTatsuo: [{ x: 28, y: 126, pauseMs: 5000 }],
  kickedBlanket: [{ x: 31, y: 156, pauseMs: 5000 }],
  watchingStars: [
    { x: 54, y: 128, pauseMs: 4800, action: true },
    { x: 83, y: 164, pauseMs: 700 },
    { x: 68, y: 211, pauseMs: 650 },
    { x: 103, y: 238, pauseMs: 750 },
  ],
  almostAwake: [{ x: 29, y: 124, pauseMs: 5000 }],
  morningStretch: [
    { x: 58, y: 137, pauseMs: 4600, action: true },
    { x: 88, y: 184, pauseMs: 700 },
    { x: 102, y: 226, pauseMs: 700 },
  ],
  planningDay: [
    { x: 99, y: 292, pauseMs: 5200, action: true },
    { x: 85, y: 223, pauseMs: 750 },
    { x: 111, y: 190, pauseMs: 700 },
  ],
  tatsuoWakeUp: [{ x: 28, y: 126, pauseMs: 5000 }],
  mimizouFarewell: [
    { x: 58, y: 137, pauseMs: 5200, action: true },
    { x: 88, y: 184, pauseMs: 800 },
    { x: 107, y: 224, pauseMs: 700 },
  ],
  tooMuchBreakfast: [
    { x: 103, y: 193, pauseMs: 1100 },
    { x: 132, y: 190, pauseMs: 3000, action: true },
    { x: 98, y: 225, pauseMs: 1500 },
  ],
  overslept: [
    { x: 96, y: 220, pauseMs: 1800, action: true },
    { x: 123, y: 151, pauseMs: 650 },
    { x: 64, y: 193, pauseMs: 500 },
    { x: 116, y: 244, pauseMs: 550 },
  ],
  morningTea: [
    { x: 68, y: 272, pauseMs: 6800, action: true },
    { x: 91, y: 220, pauseMs: 650 },
    { x: 126, y: 202, pauseMs: 900 },
    { x: 82, y: 252, pauseMs: 650 },
  ],
  foundOldToy: [
    { x: 98, y: 224, pauseMs: 3000, action: true },
    { x: 93, y: 242, pauseMs: 1300 },
    { x: 111, y: 194, pauseMs: 1100 },
  ],
  windowNap: [{ x: 54, y: 128, pauseMs: 5000 }],
  wateringPlants: [
    { x: 70, y: 112, pauseMs: 2700, action: true },
    { x: 161, y: 287, pauseMs: 2700, action: true },
    { x: 136, y: 230, pauseMs: 2200, action: true },
    { x: 104, y: 198, pauseMs: 650 },
  ],
  muddyReturn: [
    { x: 138, y: 149, pauseMs: 3000, action: true },
    { x: 106, y: 205, pauseMs: 1200 },
    { x: 126, y: 174, pauseMs: 900 },
  ],
  simmeringDinner: [
    { x: 125, y: 211, pauseMs: 900 },
    { x: 133, y: 202, pauseMs: 3200, action: true },
    { x: 112, y: 229, pauseMs: 1000 },
  ],
  foldingLaundry: [
    { x: 40, y: 157, pauseMs: 4700, action: true },
    { x: 65, y: 191, pauseMs: 700 },
    { x: 93, y: 221, pauseMs: 650 },
    { x: 70, y: 248, pauseMs: 800 },
  ],
  packingTomorrow: [
    { x: 93, y: 241, pauseMs: 4800, action: true },
    { x: 118, y: 250, pauseMs: 500 },
    { x: 130, y: 222, pauseMs: 650 },
    { x: 116, y: 186, pauseMs: 700 },
    { x: 83, y: 166, pauseMs: 850 },
    { x: 66, y: 190, pauseMs: 650 },
    { x: 87, y: 219, pauseMs: 600 },
  ],
  littleNightSnack: [
    { x: 132, y: 202, pauseMs: 5000, action: true },
    { x: 126, y: 174, pauseMs: 600 },
    { x: 105, y: 153, pauseMs: 750 },
    { x: 70, y: 174, pauseMs: 850 },
    { x: 91, y: 205, pauseMs: 600 },
    { x: 117, y: 244, pauseMs: 800 },
    { x: 137, y: 226, pauseMs: 550 },
  ],
  readingComics: [
    { x: 63, y: 242, pauseMs: 4900, action: true },
    { x: 92, y: 219, pauseMs: 700 },
    { x: 116, y: 186, pauseMs: 700 },
    { x: 87, y: 166, pauseMs: 800 },
  ],
  mimizouVisit: [{ x: 60, y: 140, pauseMs: 5000, action: true }],
};

const actionAssetNames: Partial<Record<SceneId, string>> = {
  watchingStars: "etokichi-watching-stars-pixel.webp",
  morningStretch: "etokichi-morning-stretch-pixel.webp",
  planningDay: "etokichi-planning-day-floor-pixel.webp",
  mimizouFarewell: "etokichi-mimizou-farewell-pixel.webp",
  tooMuchBreakfast: "etokichi-breakfast-pixel.webp",
  overslept: "etokichi-overslept-pixel.webp",
  morningTea: "etokichi-morning-tea-pixel.webp",
  foundOldToy: "etokichi-old-toy-pixel.webp",
  wateringPlants: "etokichi-watering-plants-pixel.webp",
  muddyReturn: "etokichi-muddy-return-pixel.webp",
  simmeringDinner: "etokichi-simmering-dinner-pixel.webp",
  foldingLaundry: "etokichi-folding-laundry-pixel.webp",
  packingTomorrow: "etokichi-packing-pixel.webp",
  littleNightSnack: "etokichi-night-snack-pixel.webp",
  readingComics: "etokichi-reading-comics-pixel.webp",
  mimizouVisit: "etokichi-morning-tea-pixel.webp",
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

  const tint = getRoomTint(visit);
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

function createGridFrames(
  sheet: Texture,
  columns: number,
  rows: number,
  bottomTrimByRow: readonly number[] = [],
  topBleedByRow: readonly number[] = [],
): Texture[][] {
  sheet.source.scaleMode = "nearest";
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const left = Math.round((column * sheet.width) / columns);
      const baseTop = Math.round((row * sheet.height) / rows);
      const top = baseTop - (topBleedByRow[row] ?? 0);
      const right = Math.round(((column + 1) * sheet.width) / columns);
      const fullBottom = Math.round(((row + 1) * sheet.height) / rows);
      const bottomTrim = bottomTrimByRow[row] ?? 0;
      const frameWidth = right - left;
      const frameHeight = fullBottom - top - bottomTrim;
      return new Texture({
        source: sheet.source,
        frame: new Rectangle(left, top, frameWidth, frameHeight),
        orig: bottomTrim > 0 ? new Rectangle(0, 0, frameWidth, fullBottom - top) : undefined,
        trim: bottomTrim > 0 ? new Rectangle(0, 0, frameWidth, frameHeight) : undefined,
      });
    }),
  );
}

function createDirectionFrames(sheet: Texture): Record<Direction, Texture[]> {
  const grid = createGridFrames(sheet, 3, 4, [0, 2, 17, 0], [0, 0, 0, 17]);
  return Object.fromEntries(
    Object.entries(directionRows).map(([direction, row]) => [direction, grid[row] ?? []]),
  ) as Record<Direction, Texture[]>;
}

function directionTo(fromX: number, fromY: number, toX: number, toY: number): Direction {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

function createWalker(
  app: Application,
  sheet: Texture,
  actionSheet: Texture | undefined,
  visit: VisitView,
  callbacks: RoomCallbacks,
): Container {
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

  const actionFrames = actionSheet ? createGridFrames(actionSheet, 3, 1)[0] : undefined;
  const actionLoop = actionFrames
    ? [
        actionFrames[0],
        actionFrames[0],
        actionFrames[1],
        actionFrames[1],
        actionFrames[2],
        actionFrames[2],
        actionFrames[2],
      ].filter((frame): frame is Texture => Boolean(frame))
    : [];
  const action = actionLoop.length > 0 ? new AnimatedSprite(actionLoop) : undefined;
  if (action) {
    const baseActionFrame = actionLoop[0];
    if (!baseActionFrame) throw new Error("行動アニメーションのフレームがありません");
    action.anchor.set(0.5, 1);
    action.scale.set(ACTION_FRAME_HEIGHT / baseActionFrame.height);
    action.roundPixels = true;
    action.animationSpeed = 0.08;
    action.loop = true;
  }

  const actor = new Container();
  const shadow = new Graphics().ellipse(0, -2, 13, 4).fill({ color: 0x2a160d, alpha: 0.32 });
  actor.addChild(shadow, character);
  if (action) actor.addChild(action);
  actor.position.set(route[0]?.x ?? 98, route[0]?.y ?? 220);
  actor.eventMode = "dynamic";
  actor.hitArea = new Rectangle(-30, -64, 60, 66);
  actor.cursor = "pointer";
  actor.on("pointertap", callbacks.onCharacterTap);

  let targetIndex = route.length > 1 ? 1 : 0;
  let pauseRemaining = route[0]?.pauseMs ?? 800;
  let direction: Direction = "down";

  const showAction = (enabled: boolean): void => {
    const active = enabled && Boolean(action);
    character.visible = !active;
    if (!action) return;
    action.visible = active;
    if (active) {
      if (!action.playing) action.gotoAndPlay(0);
    } else {
      action.stop();
    }
  };

  showAction(Boolean(route[0]?.action));

  if (visit.scene.id === "mimizouVisit") {
    const baseY = actor.y;
    let elapsed = 0;
    app.ticker.add((ticker) => {
      elapsed += ticker.deltaMS;
      const frame = getMimizouVisitFrame(elapsed);
      showAction(!frame.reacting);
      actor.y = baseY - frame.reactionHop;
      if (!frame.reacting) return;

      character.textures = frames.up;
      character.gotoAndStop(1);
    });
  }

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
      showAction(Boolean(target.action));
      return;
    }

    showAction(false);
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

function createSleeper(
  app: Application,
  texture: Texture,
  visit: VisitView,
  height: number,
  callbacks: RoomCallbacks,
): Sprite {
  texture.source.scaleMode = "nearest";
  const sleeper = new Sprite(texture);
  const position = routes[visit.scene.id][0] ?? { x: 30, y: 154 };
  sleeper.anchor.set(0.5, 1);
  sleeper.scale.set(height / texture.height);
  sleeper.roundPixels = true;
  sleeper.position.set(position.x, position.y);
  sleeper.eventMode = "dynamic";
  sleeper.cursor = "pointer";
  sleeper.on("pointertap", callbacks.onCharacterTap);

  const baseScaleX = sleeper.scale.x;
  const baseScaleY = sleeper.scale.y;
  let elapsed = 0;
  app.ticker.add((ticker) => {
    elapsed += ticker.deltaMS;
    const breath = Math.sin(elapsed / 620);
    sleeper.scale.x = baseScaleX * (1 + breath * 0.018);
    sleeper.scale.y = baseScaleY * (1 + breath * 0.045);
    sleeper.y = position.y + breath * 0.8;
  });
  return sleeper;
}

function createCompanion(
  texture: Texture,
  presentation: NonNullable<ReturnType<typeof getRoomPresentation>["companion"]>,
  callbacks: RoomCallbacks,
): Sprite {
  texture.source.scaleMode = "nearest";
  const companion = new Sprite(texture);
  companion.anchor.set(0.5, 1);
  companion.scale.set(presentation.height / texture.height);
  companion.roundPixels = true;
  companion.position.set(presentation.x, presentation.y);
  companion.eventMode = "dynamic";
  companion.cursor = "pointer";
  companion.on("pointertap", callbacks.onCharacterTap);
  return companion;
}

function createVisitor(
  app: Application,
  texture: Texture,
  presentation: NonNullable<ReturnType<typeof getRoomPresentation>["visitor"]>,
  callbacks: RoomCallbacks,
): Container {
  texture.source.scaleMode = "nearest";
  const visitor = new Container();
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.scale.set(presentation.height / texture.height);
  sprite.tint = 0x8791ad;
  sprite.roundPixels = true;
  visitor.addChild(sprite);
  visitor.position.set(presentation.x, presentation.y + 8);
  visitor.alpha = 0;
  visitor.eventMode = "none";
  visitor.hitArea = new Rectangle(-28, -28, 56, 56);
  visitor.cursor = "pointer";
  visitor.on("pointertap", callbacks.onCharacterTap);

  let elapsed = 0;
  app.ticker.add((ticker: Ticker) => {
    elapsed += ticker.deltaMS;
    const frame = getMimizouVisitFrame(elapsed);
    visitor.alpha = frame.visitorVisibility;
    visitor.y = presentation.y + frame.visitorYOffset;
    visitor.eventMode = frame.visitorInteractive ? "dynamic" : "none";
  });

  return visitor;
}

function createWindowForeground(): Graphics {
  return new Graphics().rect(49, 29, 2, 49).fill(0x4a3028).rect(22, 77, 56, 2).fill(0x65402d);
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

  const actionAssetName = actionAssetNames[visit.scene.id];
  const presentation = getRoomPresentation(visit);
  const guestPresentation = presentation.visitor ?? presentation.companion;
  const [backgroundTexture, characterTexture, actionTexture, guestTexture] = await Promise.all([
    Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${presentation.backgroundAssetName}`),
    Assets.load<Texture>(
      `${import.meta.env.BASE_URL}assets/${
        visit.scene.characterPose === "sleep" ? presentation.sleeperAssetName : "etokichi-walk-pixel-v2.webp"
      }`,
    ),
    actionAssetName ? Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${actionAssetName}`) : undefined,
    guestPresentation
      ? Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${guestPresentation.assetName}`)
      : undefined,
  ]);
  const room = createRoom(backgroundTexture, visit, callbacks);
  const companion =
    guestTexture && presentation.companion
      ? createCompanion(guestTexture, presentation.companion, callbacks)
      : undefined;
  const visitor =
    guestTexture && presentation.visitor
      ? createVisitor(app, guestTexture, presentation.visitor, callbacks)
      : undefined;
  const windowForeground = visitor ? createWindowForeground() : undefined;
  const character =
    visit.scene.characterPose === "sleep"
      ? createSleeper(app, characterTexture, visit, presentation.sleeperHeight, callbacks)
      : createWalker(app, characterTexture, actionTexture, visit, callbacks);
  app.stage.addChild(room);
  if (companion) app.stage.addChild(companion);
  if (visitor) app.stage.addChild(visitor);
  if (windowForeground) app.stage.addChild(windowForeground);
  app.stage.addChild(character);
  host.replaceChildren(app.canvas);
  return app;
}
