import {
  AnimatedSprite,
  Application,
  Assets,
  ColorMatrixFilter,
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
import { FURNITURE_DEFINITIONS, type FurnitureLayout, resolveFurnitureSpriteHitArea } from "./room-furniture.ts";
import {
  DEFAULT_ROOM_LAYOUT,
  getDepthZIndex,
  isMovementSegmentValid,
  resolveSceneInitialDepthY,
  resolveSceneRoomLayout,
  resolveSceneRoute,
  type ResolvedWaypoint,
  type RoomLayout,
  validateRoomLayout,
} from "./room-layout.ts";
import {
  getLightingColorMatrix,
  getRoomPresentation,
  resolveGuestDepthY,
  type LegacyRoomPresentation,
  type RoomTint,
} from "./room-presentation.ts";

const WIDTH = 195;
const HEIGHT = 422;
const BACKGROUND_HEIGHT = 347;
const WALK_SPEED = 19;
const WALKER_FRAME_HEIGHT = 52;
const ACTION_FRAME_HEIGHT = 60;

type Direction = "down" | "left" | "right" | "up";

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

const actionAssetNames: Partial<Record<SceneId, string>> = {
  watchingStars: "etokichi-watching-stars-pixel.webp",
  morningStretch: "etokichi-morning-stretch-pixel.webp",
  planningDay: "etokichi-planning-day-floor-pixel.webp",
  mimizouFarewell: "etokichi-mimizou-farewell-pixel.webp",
  tooMuchBreakfast: "etokichi-breakfast-pixel.webp",
  overslept: "etokichi-overslept-pixel.webp",
  morningTea: "etokichi-morning-tea-pixel.webp",
  foundOldToy: "etokichi-old-toy-pixel.webp",
  wateringPlants: "etokichi-watering-directions-pixel.webp",
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

function createLegacyRoom(
  backgroundTexture: Texture,
  presentation: LegacyRoomPresentation,
  callbacks: RoomCallbacks,
): Container {
  backgroundTexture.source.scaleMode = "nearest";
  const room = new Container();
  const floorExtension = new Graphics().rect(0, BACKGROUND_HEIGHT, WIDTH, HEIGHT - BACKGROUND_HEIGHT).fill(0x6d361d);
  const background = new Sprite(backgroundTexture);
  background.width = WIDTH;
  background.height = BACKGROUND_HEIGHT;

  const timeOverlay = new Graphics()
    .rect(0, 0, WIDTH, HEIGHT)
    .fill({ color: presentation.tint.color, alpha: presentation.tint.alpha });
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

function applyLighting(displayObject: Container | Graphics | Sprite, tint: RoomTint): void {
  if (tint.alpha === 0) return;
  const filter = new ColorMatrixFilter();
  filter.matrix = getLightingColorMatrix(tint);
  displayObject.filters = [filter];
}

function createLayeredBackground(baseTexture: Texture, tint: RoomTint): Container {
  baseTexture.source.scaleMode = "nearest";
  const background = new Container();
  background.label = "timeNeutralBase";
  const floorExtension = new Graphics().rect(0, BACKGROUND_HEIGHT, WIDTH, HEIGHT - BACKGROUND_HEIGHT).fill(0x6d361d);
  const base = new Sprite(baseTexture);
  base.width = WIDTH;
  base.height = BACKGROUND_HEIGHT;
  background.addChild(floorExtension, base);
  applyLighting(background, tint);
  return background;
}

function createWindowLayer(windowTexture: Texture, tint: RoomTint, callbacks: RoomCallbacks): Container {
  windowTexture.source.scaleMode = "nearest";
  const windowLayer = new Container();
  windowLayer.label = "timeWindow";
  const window = new Sprite(windowTexture);
  window.width = WIDTH;
  window.height = BACKGROUND_HEIGHT;
  applyLighting(window, tint);
  const windowMask = new Graphics().rect(22, 25, 56, 54).fill(0xffffff);
  window.mask = windowMask;
  window.eventMode = "static";
  window.cursor = "pointer";
  window.label = "窓";
  const scaleX = windowTexture.width / WIDTH;
  const scaleY = windowTexture.height / BACKGROUND_HEIGHT;
  window.hitArea = new Rectangle(22 * scaleX, 25 * scaleY, 56 * scaleX, 54 * scaleY);
  window.on("pointertap", () => callbacks.onObservation("窓の外にも、同じ時間がゆっくり流れている。"));
  windowLayer.addChild(window, windowMask);
  return windowLayer;
}

function createFurnitureSprites(
  textures: ReadonlyMap<string, Texture>,
  furniture: FurnitureLayout,
  tint: RoomTint,
  callbacks: RoomCallbacks,
): readonly Sprite[] {
  return FURNITURE_DEFINITIONS.map((definition, tieBreak) => {
    const texture = textures.get(definition.id);
    if (!texture) throw new Error(`${definition.id}の家具素材がありません`);
    texture.source.scaleMode = "nearest";
    const placed = furniture[definition.id];
    const sprite = new Sprite(texture);
    const scale = definition.displayHeight / texture.height;
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(scale);
    sprite.position.set(placed.anchor.x, placed.anchor.y);
    sprite.roundPixels = true;
    applyLighting(sprite, tint);
    sprite.zIndex = getDepthZIndex(placed.footY, tieBreak);
    sprite.label = definition.displayName;
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    const hitArea = resolveFurnitureSpriteHitArea(definition, texture.height);
    sprite.hitArea = new Rectangle(hitArea.x, hitArea.y, hitArea.width, hitArea.height);
    sprite.on("pointertap", () => callbacks.onObservation(definition.observation));
    return sprite;
  });
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
  route: readonly ResolvedWaypoint[],
  furniture: FurnitureLayout,
  callbacks: RoomCallbacks,
): Container {
  const frames = createDirectionFrames(sheet);
  const character = new AnimatedSprite(frames.down);
  const baseFrame = frames.down.at(0);
  if (!baseFrame) throw new Error("歩行アニメーションのフレームがありません");
  character.anchor.set(0.5, 1);
  character.scale.set(WALKER_FRAME_HEIGHT / baseFrame.height);
  character.roundPixels = true;
  character.animationSpeed = 0.13;
  character.loop = true;

  const actionFrameRows = actionSheet
    ? createGridFrames(actionSheet, 3, visit.scene.id === "wateringPlants" ? 2 : 1)
    : [];
  const actionLoops = actionFrameRows.map((actionFrames) =>
    [
      actionFrames[0],
      actionFrames[0],
      actionFrames[1],
      actionFrames[1],
      actionFrames[2],
      actionFrames[2],
      actionFrames[2],
    ].filter((frame): frame is Texture => Boolean(frame)),
  );
  const initialActionLoop = actionLoops[0] ?? [];
  const action = initialActionLoop.length > 0 ? new AnimatedSprite(initialActionLoop) : undefined;
  let baseActionScaleX = 1;
  if (action) {
    const baseActionFrame = initialActionLoop[0];
    if (!baseActionFrame) throw new Error("行動アニメーションのフレームがありません");
    action.anchor.set(0.5, 1);
    action.scale.set(ACTION_FRAME_HEIGHT / baseActionFrame.height);
    baseActionScaleX = action.scale.x;
    action.roundPixels = true;
    action.animationSpeed = 0.08;
    action.loop = true;
  }

  const actor = new Container();
  const shadow = new Graphics().ellipse(0, -2, 13, 4).fill({ color: 0x2a160d, alpha: 0.32 });
  actor.addChild(shadow, character);
  if (action) actor.addChild(action);
  actor.position.set(route[0]?.x ?? 98, route[0]?.y ?? 220);
  actor.zIndex = getDepthZIndex(actor.y, 50);
  actor.eventMode = "dynamic";
  actor.hitArea = new Rectangle(-30, -64, 60, 66);
  actor.cursor = "pointer";
  actor.on("pointertap", callbacks.onCharacterTap);

  let targetIndex = route.length > 1 ? 1 : 0;
  let pauseRemaining = route[0]?.pauseMs ?? 800;
  let direction: Direction = "down";

  const showAction = (enabled: boolean, facing?: "left" | "right", variant = 0, offsetY = 0): void => {
    const active = enabled && Boolean(action);
    character.visible = !active;
    if (!action) return;
    const nextActionLoop = actionLoops[variant] ?? initialActionLoop;
    if (action.textures !== nextActionLoop) action.textures = nextActionLoop;
    action.scale.x = Math.abs(baseActionScaleX) * (facing === "right" ? -1 : 1);
    action.y = offsetY;
    action.visible = active;
    if (active) {
      if (!action.playing) action.gotoAndPlay(0);
    } else {
      action.stop();
    }
  };

  showAction(Boolean(route[0]?.action), route[0]?.actionFacing, route[0]?.actionVariant, route[0]?.actionOffsetY);

  if (visit.scene.id === "mimizouVisit") {
    const baseY = actor.y;
    let elapsed = 0;
    app.ticker.add((ticker) => {
      elapsed += ticker.deltaMS;
      const frame = getMimizouVisitFrame(elapsed);
      showAction(!frame.reacting);
      actor.y = baseY - frame.reactionHop;
      actor.zIndex = getDepthZIndex(actor.y, 50);
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
      if (!isMovementSegmentValid({ x: actor.x, y: actor.y }, target, furniture)) return;
      actor.position.set(target.x, target.y);
      actor.zIndex = getDepthZIndex(actor.y, 50);
      pauseRemaining = target.pauseMs;
      targetIndex = (targetIndex + 1) % route.length;
      character.stop();
      character.gotoAndStop(1);
      showAction(Boolean(target.action), target.actionFacing, target.actionVariant, target.actionOffsetY);
      return;
    }

    showAction(false);
    const nextDirection = directionTo(actor.x, actor.y, target.x, target.y);
    if (nextDirection !== direction) {
      direction = nextDirection;
      character.textures = frames[direction];
    }
    if (!character.playing) character.play();
    const next = {
      x: actor.x + (dx / distance) * step,
      y: actor.y + (dy / distance) * step,
    };
    if (!isMovementSegmentValid({ x: actor.x, y: actor.y }, next, furniture)) return;
    actor.position.set(next.x, next.y);
    actor.zIndex = getDepthZIndex(actor.y, 50);
  });

  return actor;
}

function createSleeper(
  app: Application,
  texture: Texture,
  position: ResolvedWaypoint,
  depthY: number,
  height: number,
  callbacks: RoomCallbacks,
): Sprite {
  texture.source.scaleMode = "nearest";
  const sleeper = new Sprite(texture);
  sleeper.anchor.set(0.5, 1);
  sleeper.scale.set(height / texture.height);
  sleeper.roundPixels = true;
  sleeper.position.set(position.x, position.y);
  sleeper.zIndex = getDepthZIndex(depthY, 50);
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
    sleeper.zIndex = getDepthZIndex(depthY, 50);
  });
  return sleeper;
}

function createSleeperBase(
  texture: Texture,
  position: ResolvedWaypoint,
  depthY: number,
  presentation: NonNullable<ReturnType<typeof getRoomPresentation>["sleeperBase"]>,
): Sprite {
  texture.source.scaleMode = "nearest";
  const base = new Sprite(texture);
  base.anchor.set(0.5, 1);
  base.scale.set(presentation.height / texture.height);
  base.roundPixels = true;
  base.position.set(position.x, position.y);
  base.zIndex = getDepthZIndex(depthY, 40);
  return base;
}

function createCompanion(
  texture: Texture,
  presentation: NonNullable<ReturnType<typeof getRoomPresentation>["companion"]>,
  sceneDepthY: number,
  callbacks: RoomCallbacks,
): Sprite {
  texture.source.scaleMode = "nearest";
  const companion = new Sprite(texture);
  companion.anchor.set(0.5, 1);
  companion.scale.set(presentation.height / texture.height);
  companion.roundPixels = true;
  companion.position.set(presentation.x, presentation.y);
  companion.zIndex = getDepthZIndex(resolveGuestDepthY(presentation, sceneDepthY), 45);
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

export async function renderRoom(
  host: HTMLElement,
  visit: VisitView,
  callbacks: RoomCallbacks,
  layout: RoomLayout = DEFAULT_ROOM_LAYOUT,
): Promise<Application> {
  const layoutErrors = validateRoomLayout(layout);
  if (layoutErrors.length > 0) {
    throw new Error(`不正な家具配置は描画できません: ${layoutErrors.map(({ message }) => message).join("、")}`);
  }
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
  // legacy背景にはベッドや布団が焼き込まれているため、模様替え後も旧座標を使う。
  const sceneLayout = resolveSceneRoomLayout(visit.scene.id, layout);
  const route = resolveSceneRoute(visit.scene.id, sceneLayout.furniture);
  const initialPosition = route[0] ?? { x: 30, y: 154, pauseMs: 5000 };
  const initialDepthY = resolveSceneInitialDepthY(visit.scene.id, sceneLayout.furniture);
  const guestPresentation = presentation.visitor ?? presentation.companion;
  const [characterTexture, actionTexture, guestTexture, sleeperBaseTexture] = await Promise.all([
    Assets.load<Texture>(
      `${import.meta.env.BASE_URL}assets/${
        visit.scene.characterPose === "sleep" ? presentation.sleeperAssetName : "etokichi-walk-pixel-v2.webp"
      }`,
    ),
    actionAssetName ? Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${actionAssetName}`) : undefined,
    guestPresentation
      ? Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${guestPresentation.assetName}`)
      : undefined,
    presentation.sleeperBase
      ? Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${presentation.sleeperBase.assetName}`)
      : undefined,
  ]);
  const companion =
    guestTexture && presentation.companion
      ? createCompanion(guestTexture, presentation.companion, initialDepthY, callbacks)
      : undefined;
  const visitor =
    guestTexture && presentation.visitor
      ? createVisitor(app, guestTexture, presentation.visitor, callbacks)
      : undefined;
  const windowForeground = visitor ? createWindowForeground() : undefined;
  const sleeperBase =
    sleeperBaseTexture && presentation.sleeperBase
      ? createSleeperBase(sleeperBaseTexture, initialPosition, initialDepthY, presentation.sleeperBase)
      : undefined;
  const character =
    visit.scene.characterPose === "sleep"
      ? createSleeper(app, characterTexture, initialPosition, initialDepthY, presentation.sleeperHeight, callbacks)
      : createWalker(app, characterTexture, actionTexture, visit, route, sceneLayout.furniture, callbacks);

  if (presentation.kind === "legacy") {
    const backgroundTexture = await Assets.load<Texture>(
      `${import.meta.env.BASE_URL}assets/${presentation.backgroundAssetName}`,
    );
    const room = createLegacyRoom(backgroundTexture, presentation, callbacks);
    app.stage.addChild(room);
    if (companion) app.stage.addChild(companion);
    if (visitor) app.stage.addChild(visitor);
    if (windowForeground) app.stage.addChild(windowForeground);
    if (sleeperBase) app.stage.addChild(sleeperBase);
    app.stage.addChild(character);
  } else {
    const [baseTexture, windowTexture, ...furnitureTextures] = await Promise.all([
      Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${presentation.baseAssetName}`),
      Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${presentation.windowAssetName}`),
      ...FURNITURE_DEFINITIONS.map(({ assetName }) =>
        Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${assetName}`),
      ),
    ]);
    const textureByFurnitureId = new Map(
      FURNITURE_DEFINITIONS.map(({ id }, index) => [id, furnitureTextures[index] as Texture]),
    );
    const base = createLayeredBackground(baseTexture, presentation.tint);
    const windowLayer = createWindowLayer(windowTexture, presentation.tint, callbacks);
    const depthContainer = new Container();
    depthContainer.label = "floorDepth";
    depthContainer.sortableChildren = true;
    depthContainer.addChild(
      ...createFurnitureSprites(textureByFurnitureId, layout.furniture, presentation.tint, callbacks),
    );
    if (sleeperBase) depthContainer.addChild(sleeperBase);
    if (companion) depthContainer.addChild(companion);
    depthContainer.addChild(character);

    app.stage.addChild(base, windowLayer);
    if (visitor) app.stage.addChild(visitor);
    app.stage.addChild(depthContainer, createWindowForeground());
  }
  host.replaceChildren(app.canvas);
  return app;
}
