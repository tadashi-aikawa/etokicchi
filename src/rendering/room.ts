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
  TextureSource,
  type Ticker,
} from "pixi.js";
import "pixi.js/browser";
import type { VisitView } from "../game/types.ts";
import { getMimizouVisitFrame } from "./mimizou-visit.ts";
import {
  DEPTH_DECORATIONS,
  FLOOR_DECORATIONS,
  resolveClockHandAngles,
  ROOM_CLOCK,
  type RoomDecoration,
  type RoomDepthDecoration,
} from "./room-decor.ts";
import {
  FURNITURE_DEFINITIONS,
  type FurnitureId,
  type FurnitureLayout,
  resolveFurnitureSpriteHitArea,
} from "./room-furniture.ts";
import { FIXTURE_DEFINITIONS, type FixtureLayout } from "./room-fixtures.ts";
import {
  DEFAULT_ROOM_LAYOUT,
  getDepthZIndex,
  isMovementSegmentValid,
  resolveSceneInitialDepthY,
  resolveSceneLayout,
  resolveSceneRoute,
  type ResolvedWaypoint,
  type RoomLayout,
  validateRoomLayout,
} from "./room-layout.ts";
import { getRoomLights } from "./room-lighting.ts";
import { resolveSpeechBubblePlacement } from "./room-speech.ts";
import {
  applyTintToColor,
  getLightingColorMatrix,
  getRoomPresentation,
  resolveGuestDepthY,
  resolveGuestPosition,
  resolveScenePropDepthY,
  resolveScenePropPosition,
  TATSUO_WINDOW_FACE_RATIO,
  type AttachedSceneProp,
  type CharacterBubblePresentation,
  type ComfortingMaineCoonPresentation,
  type ObservationOverrides,
  type RoomTint,
  type TatsuoWindowPresentation,
} from "./room-presentation.ts";
import {
  getRainDropPosition,
  getThunderComfortFrame,
  RAIN_DROP_SEEDS,
  THUNDER_FLASH_COLOR,
  type ThunderComfortFrame,
} from "./thunder-comfort.ts";
import { WINDOW_FRAME, WINDOW_GLASS, WINDOW_GLASS_PANES, WINDOW_MULLION, WINDOW_SILL } from "./window-geometry.ts";
import {
  ACTION_ASSET_NAMES,
  ACTION_FRAME_COLUMNS,
  ACTION_FRAME_HEIGHT,
  ACTION_ROW_COUNTS,
  ASSET_PIXEL_RATIO,
  ROOM_BACKGROUND_HEIGHT,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  WALK_ASSET_NAME,
  WALK_FRAME_COLUMNS,
  WALK_FRAME_HEIGHT,
  WALK_FRAME_ROWS,
} from "./scene-assets.ts";
import { getThunderWindowFrame, type ThunderWindowFrame } from "./thunder-window.ts";

// ドット絵はどの素材も等倍で出したいので、補間の既定をここで一度だけ切り替える。
// このモジュールはAssets.loadを呼ぶより前に評価されるため、読み込んだテクスチャにも効く。
TextureSource.defaultOptions.scaleMode = "nearest";

const WIDTH = ROOM_WIDTH;
const HEIGHT = ROOM_HEIGHT;
const BACKGROUND_HEIGHT = ROOM_BACKGROUND_HEIGHT;
const WALK_SPEED = 19;

type Direction = "down" | "left" | "right" | "up";

interface RoomCallbacks {
  onObservation: (text: string, targetName: string) => void;
  onCharacterTap: () => void;
}

const directionRows: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

/**
 * 時間帯の照明を素材へ焼き込んだテクスチャを作る。
 * 照明は時間帯とシーンで決まる静的な色変換なので、毎フレームのフィルタ描画にはしない。
 */
function createLitTexture(app: Application, texture: Texture, tint: RoomTint): Texture {
  if (tint.alpha === 0) return texture;
  const filter = new ColorMatrixFilter();
  filter.matrix = getLightingColorMatrix(tint);
  // フィルターの既定解像度は1で、昼以外は中間テクスチャが論理座標のまま作られて2倍化が打ち消される。
  filter.resolution = ASSET_PIXEL_RATIO;
  const target = new Sprite(texture);
  target.filters = [filter];
  // フィルターの余白まで焼くと素材より大きくなるので、範囲は素材そのものに固定する。
  const lit = app.renderer.generateTexture({
    target,
    frame: new Rectangle(0, 0, texture.width, texture.height),
    resolution: ASSET_PIXEL_RATIO,
    antialias: false,
  });
  // generateTextureで作るテクスチャはTextureSource.defaultOptionsを引き継がないので、ここだけ個別に指定する。
  lit.source.scaleMode = "nearest";
  target.destroy();
  return lit;
}

type BakeLitTexture = (texture: Texture) => Texture;

interface RoomLighting {
  bake: BakeLitTexture;
  destroy: () => void;
}

// 同じ素材を複数のスプライトが使うので、焼き込みは部屋ごとに一度だけにする。
function createRoomLighting(app: Application, tint: RoomTint): RoomLighting {
  const baked = new Map<Texture, Texture>();
  return {
    bake: (texture) => {
      const cached = baked.get(texture);
      if (cached) return cached;
      const lit = createLitTexture(app, texture, tint);
      baked.set(texture, lit);
      return lit;
    },
    destroy: () => {
      for (const [source, lit] of baked) {
        if (lit !== source) lit.destroy(true);
      }
      baked.clear();
    },
  };
}

function createDecorationSprites(
  definitions: readonly RoomDecoration[],
  textures: ReadonlyMap<string, Texture>,
  bake: BakeLitTexture,
): readonly Sprite[] {
  return definitions.map((definition) => {
    const source = textures.get(definition.assetName);
    if (!source) throw new Error(`${definition.assetName}の装飾素材がありません`);
    const texture = bake(source);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.width = definition.width;
    sprite.height = definition.height;
    sprite.rotation = definition.rotation ?? 0;
    sprite.position.set(definition.x, definition.y);
    return sprite;
  });
}

function createDecorationLayer(
  definitions: readonly RoomDecoration[],
  textures: ReadonlyMap<string, Texture>,
  label: string,
  bake: BakeLitTexture,
): Container {
  const layer = new Container();
  layer.label = label;
  const sprites = createDecorationSprites(definitions, textures, bake);
  if (sprites.length > 0) {
    layer.addChild(...sprites);
  }
  return layer;
}

function createDepthDecorationSprites(
  definitions: readonly RoomDepthDecoration[],
  textures: ReadonlyMap<string, Texture>,
  bake: BakeLitTexture,
  callbacks: RoomCallbacks,
  overrides: ReturnType<typeof getRoomPresentation>["depthDecorationOverrides"],
  furniture: FurnitureLayout,
  hiddenIds: ReturnType<typeof getRoomPresentation>["hiddenDepthDecorationIds"],
): readonly Sprite[] {
  const visibleDefinitions = definitions.filter((definition) => !hiddenIds?.includes(definition.id));
  return visibleDefinitions.map((definition, tieBreak) => {
    const override = overrides?.[definition.id];
    const assetName = override?.assetName ?? definition.assetName;
    const source = textures.get(assetName);
    if (!source) throw new Error(`${assetName}の床上装飾素材がありません`);
    const texture = bake(source);
    let x = definition.x;
    let y = definition.y;
    let depthY = y;
    if (override?.type === "furniture") {
      const attachment = furniture[override.furnitureId];
      x = attachment.anchor.x + override.offset.x;
      y = attachment.anchor.y + override.offset.y;
      depthY = attachment.footY + (override.depthOffset ?? 0);
    } else if (override?.type === "absolute") {
      x = override.x;
      y = override.y;
      depthY = override.depthY ?? y;
    }
    let sprite: Sprite;
    if (override?.animation) {
      const frames = createGridFrames(texture, override.animation.columns, 1)[0] ?? [];
      if (frames.length !== override.animation.frameDurationsMs.length) {
        throw new Error(`${assetName}のコマ数と再生時間の数が一致しません`);
      }
      const animated = new AnimatedSprite(
        frames.map((frame, index) => ({ texture: frame, time: override.animation?.frameDurationsMs[index] ?? 100 })),
      );
      animated.loop = true;
      animated.play();
      sprite = animated;
    } else {
      sprite = new Sprite(texture);
    }
    sprite.anchor.set(0.5, 1);
    sprite.width = override?.width ?? definition.width;
    sprite.height = override?.height ?? definition.height;
    sprite.position.set(x, y);
    sprite.zIndex = getDepthZIndex(depthY, 20 + tieBreak);
    sprite.label = definition.displayName;
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    sprite.on("pointertap", () =>
      callbacks.onObservation(override?.observation ?? definition.observation, definition.displayName),
    );
    return sprite;
  });
}

interface RoomClockLayer {
  container: Container;
  update: (now: Date) => void;
}

const CLOCK_HAND_COLOR = 0x3b241b;

function drawClockHands(hands: Graphics, now: Date, color: number): void {
  const angles = resolveClockHandAngles(now);
  hands
    .clear()
    .moveTo(ROOM_CLOCK.x, ROOM_CLOCK.y)
    .lineTo(ROOM_CLOCK.x + Math.sin(angles.hour) * 4.4, ROOM_CLOCK.y - Math.cos(angles.hour) * 4.4)
    .stroke({ color, width: 1.4, pixelLine: true })
    .moveTo(ROOM_CLOCK.x, ROOM_CLOCK.y)
    .lineTo(ROOM_CLOCK.x + Math.sin(angles.minute) * 6.6, ROOM_CLOCK.y - Math.cos(angles.minute) * 6.6)
    .stroke({ color, width: 1, pixelLine: true })
    .circle(ROOM_CLOCK.x, ROOM_CLOCK.y, 1)
    .fill(color);
}

function createClockLayer(source: Texture, now: Date, tint: RoomTint, bake: BakeLitTexture): RoomClockLayer {
  const layer = new Container();
  layer.label = "roomClock";
  const face = new Sprite(bake(source));
  face.anchor.set(0.5);
  face.width = ROOM_CLOCK.size;
  face.height = ROOM_CLOCK.size;
  face.position.set(ROOM_CLOCK.x, ROOM_CLOCK.y);

  const handColor = applyTintToColor(CLOCK_HAND_COLOR, tint);
  const hands = new Graphics();
  drawClockHands(hands, now, handColor);
  layer.addChild(face, hands);
  return {
    container: layer,
    update: (nextNow) => drawClockHands(hands, nextNow, handColor),
  };
}

function createTimeLightingLayer(visit: VisitView, sceneLayout: RoomLayout): Container {
  const layer = new Container();
  layer.label = "timeLighting";
  const lights = getRoomLights(visit.assignment.band, visit.scene.characterPose === "sleep", sceneLayout);
  for (const light of lights) {
    const graphic = new Graphics();
    if (light.kind === "circle") {
      graphic.circle(light.x, light.y, light.radius).fill({ color: light.color, alpha: light.alpha });
    } else {
      graphic.poly([...light.points], true).fill({ color: light.color, alpha: light.alpha });
    }
    graphic.blendMode = "screen";
    layer.addChild(graphic);
  }
  return layer;
}

type ThunderComfortFrameProvider = () => ThunderComfortFrame;
type ThunderWindowFrameProvider = () => ThunderWindowFrame;
type ThunderFlashFrameProvider = () => Pick<ThunderComfortFrame, "flashAlpha">;

function createThunderComfortFrameProvider(app: Application): ThunderComfortFrameProvider {
  let elapsedMs = 0;
  let frame = getThunderComfortFrame(elapsedMs);
  app.ticker.add((ticker) => {
    elapsedMs += ticker.deltaMS;
    frame = getThunderComfortFrame(elapsedMs);
  });
  return () => frame;
}

function createThunderWindowFrameProvider(app: Application): ThunderWindowFrameProvider {
  let elapsedMs = 0;
  let frame = getThunderWindowFrame(elapsedMs);
  app.ticker.add((ticker) => {
    elapsedMs += ticker.deltaMS;
    frame = getThunderWindowFrame(elapsedMs);
  });
  return () => frame;
}

// ガラスは中央の桟で左右に割れているので、覆う図形も2枚へ分ける。
function drawGlassPanes(graphics: Graphics): Graphics {
  for (const pane of WINDOW_GLASS_PANES) {
    graphics.rect(pane.x, WINDOW_GLASS.y, pane.width, WINDOW_GLASS.height);
  }
  return graphics;
}

function createRainWindowLayer(app: Application): Container {
  const layer = new Container();
  layer.label = "rainWindow";
  const rain = new Container();
  const stormShade = drawGlassPanes(new Graphics()).fill({ color: 0x243a56, alpha: 0.58 });
  const drops = RAIN_DROP_SEEDS.map((seed) => {
    const drop = new Graphics()
      .moveTo(0, 0)
      .lineTo(-1.4, seed.length)
      .stroke({ color: 0xbdd9ef, alpha: seed.alpha, width: 0.8, pixelLine: true });
    rain.addChild(drop);
    return drop;
  });
  const mask = drawGlassPanes(new Graphics()).fill(0xffffff);
  rain.mask = mask;
  layer.addChild(stormShade, rain, mask);

  let elapsedMs = 0;
  app.ticker.add((ticker) => {
    elapsedMs += ticker.deltaMS;
    drops.forEach((drop, index) => {
      const seed = RAIN_DROP_SEEDS[index];
      if (!seed) return;
      const position = getRainDropPosition(seed, elapsedMs);
      drop.position.set(position.x, position.y);
    });
  });
  return layer;
}

function createThunderFlashLayer(app: Application, getFrame: ThunderFlashFrameProvider): Graphics {
  const flash = new Graphics().rect(0, 0, WIDTH, BACKGROUND_HEIGHT).fill(THUNDER_FLASH_COLOR);
  flash.label = "thunderFlash";
  flash.blendMode = "screen";
  flash.eventMode = "none";
  flash.alpha = 0;
  app.ticker.add(() => {
    flash.alpha = getFrame().flashAlpha;
  });
  return flash;
}

function createTatsuoWindowFaceLayer(
  app: Application,
  texture: Texture,
  presentation: TatsuoWindowPresentation,
  getFrame: ThunderWindowFrameProvider,
): Container {
  const layer = new Container();
  layer.label = "tatsuoWindowFace";
  const faceHeight = Math.floor(texture.frame.height * TATSUO_WINDOW_FACE_RATIO);
  const faceTexture = new Texture({
    source: texture.source,
    frame: new Rectangle(texture.frame.x, texture.frame.y, texture.frame.width, faceHeight),
  });
  const face = new Sprite(faceTexture);
  face.anchor.set(0.5, 0);
  face.scale.set(presentation.height / faceTexture.height);
  face.position.set(presentation.x, presentation.y);
  face.tint = 0xd8b470;

  const mask = drawGlassPanes(new Graphics()).fill(0xffffff);
  face.mask = mask;
  layer.addChild(face, mask);
  layer.alpha = 0;
  app.ticker.add(() => {
    layer.alpha = getFrame().tatsuoVisibility;
  });
  return layer;
}

const FRONT_EDGE_TOP_COLOR = 0x8b5331;
const FRONT_EDGE_BOTTOM_COLOR = 0x3a211b;

function createLayeredBackground(baseTexture: Texture, tint: RoomTint, bake: BakeLitTexture): Container {
  const background = new Container();
  background.label = "timeNeutralBase";
  const outsideRoom = new Graphics().rect(0, BACKGROUND_HEIGHT, WIDTH, HEIGHT - BACKGROUND_HEIGHT).fill(0x171b25);
  const interior = new Container();
  const base = new Sprite(bake(baseTexture));
  base.width = WIDTH;
  base.height = BACKGROUND_HEIGHT;
  interior.addChild(base);
  const frontEdge = new Graphics()
    .rect(0, BACKGROUND_HEIGHT - 3, WIDTH, 3)
    .fill(applyTintToColor(FRONT_EDGE_TOP_COLOR, tint))
    .rect(0, BACKGROUND_HEIGHT, WIDTH, 5)
    .fill(applyTintToColor(FRONT_EDGE_BOTTOM_COLOR, tint));
  background.addChild(outsideRoom, interior, frontEdge);
  return background;
}

function createWindowLayer(
  windowTexture: Texture,
  bake: BakeLitTexture,
  callbacks: RoomCallbacks,
  observation: string,
): Container {
  const windowLayer = new Container();
  windowLayer.label = "timeWindow";
  const window = new Sprite(bake(windowTexture));
  window.width = WIDTH;
  window.height = BACKGROUND_HEIGHT;
  const windowMask = new Graphics()
    .rect(WINDOW_FRAME.x, WINDOW_FRAME.y, WINDOW_FRAME.width, WINDOW_FRAME.height)
    .fill(0xffffff);
  window.mask = windowMask;
  window.eventMode = "static";
  window.cursor = "pointer";
  window.label = "窓";
  const scaleX = windowTexture.width / WIDTH;
  const scaleY = windowTexture.height / BACKGROUND_HEIGHT;
  window.hitArea = new Rectangle(
    WINDOW_FRAME.x * scaleX,
    WINDOW_FRAME.y * scaleY,
    WINDOW_FRAME.width * scaleX,
    WINDOW_FRAME.height * scaleY,
  );
  window.on("pointertap", () => callbacks.onObservation(observation, "窓"));
  windowLayer.addChild(window, windowMask);
  return windowLayer;
}

function createFurnitureSprites(
  textures: ReadonlyMap<string, Texture>,
  furniture: FurnitureLayout,
  bake: BakeLitTexture,
  callbacks: RoomCallbacks,
  observationOverrides: ObservationOverrides,
  hiddenFurnitureIds: readonly FurnitureId[] = [],
): readonly Sprite[] {
  const hiddenIds = new Set(hiddenFurnitureIds);
  return FURNITURE_DEFINITIONS.filter(({ id }) => !hiddenIds.has(id)).map((definition, tieBreak) => {
    const source = textures.get(definition.id);
    if (!source) throw new Error(`${definition.id}の家具素材がありません`);
    const texture = bake(source);
    const placed = furniture[definition.id];
    const sprite = new Sprite(texture);
    const scale = definition.displayHeight / texture.height;
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(scale);
    sprite.width = definition.displayWidth;
    sprite.position.set(placed.anchor.x, placed.anchor.y);
    sprite.zIndex = getDepthZIndex(placed.footY, tieBreak);
    sprite.label = definition.displayName;
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    const hitArea = resolveFurnitureSpriteHitArea(definition, texture.height);
    sprite.hitArea = new Rectangle(hitArea.x, hitArea.y, hitArea.width, hitArea.height);
    const observation = observationOverrides[definition.id] ?? definition.observation;
    sprite.on("pointertap", () => callbacks.onObservation(observation, definition.displayName));
    return sprite;
  });
}

function createFixtureLayer(
  textures: ReadonlyMap<string, Texture>,
  fixtures: FixtureLayout,
  bake: BakeLitTexture,
  callbacks: RoomCallbacks,
  observationOverrides: ObservationOverrides,
): Container {
  const layer = new Container();
  layer.label = "fixedFixtures";
  for (const definition of FIXTURE_DEFINITIONS) {
    const source = textures.get(definition.id);
    if (!source) throw new Error(`${definition.id}の固定設備素材がありません`);
    const placed = fixtures[definition.id];
    const sprite = new Sprite(bake(source));
    sprite.anchor.set(1, 1);
    sprite.width = definition.displayWidth;
    sprite.height = definition.displayHeight;
    sprite.position.set(placed.anchor.x, placed.anchor.y);
    sprite.label = definition.displayName;
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    const fixtureObservation = observationOverrides[definition.id] ?? definition.observation;
    sprite.on("pointertap", () => callbacks.onObservation(fixtureObservation, definition.displayName));
    layer.addChild(sprite);

    for (const hotspot of placed.hotspots) {
      const target = new Graphics()
        .rect(hotspot.area.x, hotspot.area.y, hotspot.area.width, hotspot.area.height)
        .fill({ color: 0xffffff, alpha: 0.001 });
      target.label = hotspot.displayName;
      target.eventMode = "static";
      target.cursor = "pointer";
      const hotspotObservation = observationOverrides[hotspot.id] ?? hotspot.observation;
      target.on("pointertap", () => callbacks.onObservation(hotspotObservation, hotspot.displayName));
      layer.addChild(target);
    }
  }
  return layer;
}

// 経路の到着通知は歩行キャラクターの生成時にしか用意できないため、購読の登録口だけを小物生成へ渡す。
interface ScenePropRevealBinding {
  enabled: boolean;
  onWaypointArrival: (listener: (waypointIndex: number) => void) => void;
}

function createSceneProps(
  textures: readonly Texture[],
  presentations: readonly AttachedSceneProp[],
  layout: RoomLayout,
  bake: BakeLitTexture,
  reveal: ScenePropRevealBinding,
): readonly Sprite[] {
  return presentations.map((presentation, index) => {
    const source = textures[index];
    if (!source) throw new Error(`${presentation.assetName}のシーン小物素材がありません`);
    const texture = bake(source);
    const position = resolveScenePropPosition(presentation, layout);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(presentation.height / texture.height);
    sprite.position.set(position.x, position.y);
    sprite.zIndex = getDepthZIndex(resolveScenePropDepthY(presentation, position), presentation.depthOffset ?? 20);
    const { revealAtWaypoint } = presentation;
    if (revealAtWaypoint !== undefined && reveal.enabled) {
      sprite.visible = false;
      reveal.onWaypointArrival((arrivedIndex) => {
        if (arrivedIndex === revealAtWaypoint) sprite.visible = true;
      });
    }
    return sprite;
  });
}

function createComfortingMaineCoon(
  app: Application,
  source: Texture,
  presentation: ComfortingMaineCoonPresentation,
  bake: BakeLitTexture,
  callbacks: RoomCallbacks,
  getFrame: ThunderComfortFrameProvider,
): Sprite {
  const texture = bake(source);
  const pair = new Sprite(texture);
  const baseScale = presentation.height / texture.height;
  pair.anchor.set(0.5, 1);
  pair.position.set(presentation.x, presentation.y);
  pair.scale.set(baseScale);
  pair.zIndex = getDepthZIndex(presentation.y, presentation.depthOffset);
  pair.label = "抱き合うエトキチとクーンちゃん";
  pair.eventMode = "static";
  pair.cursor = "pointer";
  // 抱き合う姿はエトキチ本体でもあるので、クーンの観察文とセリフのフキダシを同時に出す
  pair.on("pointertap", () => {
    callbacks.onObservation(presentation.observation, "クーン");
    callbacks.onCharacterTap();
  });

  app.ticker.add(() => {
    const frame = getFrame();
    pair.x = presentation.x + frame.trembleX;
    pair.scale.set(baseScale * frame.embraceScale);
  });
  return pair;
}

function createCharacterBubbleElement(
  app: Application,
  character: Container,
  presentation: CharacterBubblePresentation,
): HTMLDivElement {
  const bubble = document.createElement("div");
  bubble.className = `room-character-bubble is-${presentation.kind}`;
  if (presentation.tailSide) bubble.classList.add(`tail-${presentation.tailSide}`);
  bubble.textContent = presentation.text;
  bubble.style.width = `${(presentation.width / WIDTH) * 100}%`;
  bubble.style.minHeight = `${(presentation.height / HEIGHT) * 100}%`;

  const updatePosition = (): void => {
    bubble.style.left = `${((character.x + presentation.offset.x) / WIDTH) * 100}%`;
    bubble.style.top = `${((character.y + presentation.offset.y) / HEIGHT) * 100}%`;
  };
  updatePosition();
  app.ticker.add(updatePosition);
  return bubble;
}

interface SpeechBubble {
  element: HTMLDivElement;
  show: (text: string, durationMs: number) => void;
  destroy: () => void;
}

function createSpeechBubble(
  app: Application,
  host: HTMLElement,
  target: Container,
  onVisibilityChange: (visible: boolean) => void,
): SpeechBubble {
  const element = document.createElement("div");
  element.className = "room-speech-bubble";
  const label = document.createElement("span");
  label.className = "room-speech-bubble-text";
  const tail = document.createElement("span");
  tail.className = "room-speech-bubble-tail";
  element.append(label, tail);

  let roomWidth = host.clientWidth;
  let roomHeight = host.clientHeight;
  const roomResize = new ResizeObserver(() => {
    roomWidth = host.clientWidth;
    roomHeight = host.clientHeight;
  });
  roomResize.observe(host);

  let visible = false;
  let bubbleWidth = 0;
  let bubbleHeight = 0;
  let characterTop = 0;
  let characterWidth = 0;
  let tailSide = "";
  let timerId: number | undefined;

  const update = (): void => {
    if (!visible) return;
    const scaleX = roomWidth / WIDTH;
    const scaleY = roomHeight / HEIGHT;
    const placement = resolveSpeechBubblePlacement({
      roomWidth,
      roomHeight,
      characterX: target.x * scaleX,
      characterTopY: (target.y + characterTop) * scaleY,
      characterWidth: characterWidth * scaleX,
      bubbleWidth,
      bubbleHeight,
    });
    element.style.left = `${placement.left}px`;
    element.style.top = `${placement.top}px`;
    element.style.setProperty("--tail-offset", `${placement.tailOffset}px`);
    if (tailSide !== placement.tail) {
      element.classList.remove(`tail-${tailSide}`);
      element.classList.add(`tail-${placement.tail}`);
      tailSide = placement.tail;
    }
  };

  const hide = (): void => {
    if (timerId !== undefined) window.clearTimeout(timerId);
    timerId = undefined;
    if (!visible) return;
    visible = false;
    element.classList.remove("is-visible");
    onVisibilityChange(false);
  };

  const show = (text: string, durationMs: number): void => {
    label.textContent = text;
    // 見かけの大きさは描画後の座標系で測る。歩行中も使えるよう、上端は基準点からの相対位置で持つ
    const bounds = target.getBounds();
    characterTop = bounds.y - target.y;
    characterWidth = bounds.width;
    roomWidth = host.clientWidth;
    roomHeight = host.clientHeight;
    element.classList.add("is-visible");
    bubbleWidth = element.offsetWidth;
    bubbleHeight = element.offsetHeight;
    visible = true;
    update();
    if (timerId !== undefined) window.clearTimeout(timerId);
    timerId = window.setTimeout(hide, durationMs);
    onVisibilityChange(true);
  };

  app.ticker.add(update);
  return {
    element,
    show,
    destroy: () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      roomResize.disconnect();
    },
  };
}

function createGridFrames(sheet: Texture, columns: number, rows: number): Texture[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const left = Math.round((column * sheet.width) / columns);
      const top = Math.round((row * sheet.height) / rows);
      const right = Math.round(((column + 1) * sheet.width) / columns);
      const bottom = Math.round(((row + 1) * sheet.height) / rows);
      return new Texture({
        source: sheet.source,
        frame: new Rectangle(left, top, right - left, bottom - top),
      });
    }),
  );
}

function createDirectionFrames(sheet: Texture): Record<Direction, Texture[]> {
  const grid = createGridFrames(sheet, WALK_FRAME_COLUMNS, WALK_FRAME_ROWS);
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
  layout: RoomLayout,
  callbacks: RoomCallbacks,
  hideShadow: boolean,
  onWaypointArrival: (waypointIndex: number) => void,
): Container {
  const frames = createDirectionFrames(sheet);
  const character = new AnimatedSprite(frames.down);
  const baseFrame = frames.down.at(0);
  if (!baseFrame) throw new Error("歩行アニメーションのフレームがありません");
  character.anchor.set(0.5, 1);
  character.scale.set(WALK_FRAME_HEIGHT / baseFrame.height);
  character.animationSpeed = 0.13;
  character.loop = true;

  const actionFrameRows = actionSheet
    ? createGridFrames(actionSheet, ACTION_FRAME_COLUMNS, ACTION_ROW_COUNTS[visit.scene.id] ?? 1)
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
    action.animationSpeed = 0.08;
    action.loop = true;
  }

  const actor = new Container();
  const shadow = new Graphics().ellipse(0, -2, 13, 4).fill({ color: 0x2a160d, alpha: 0.32 });
  shadow.visible = !hideShadow;
  actor.addChild(shadow, character);
  if (action) actor.addChild(action);
  actor.position.set(route[0]?.x ?? 98, route[0]?.y ?? 220);
  actor.zIndex = getDepthZIndex(actor.y + (route[0]?.depthOffset ?? 0), 50);
  actor.eventMode = "dynamic";
  actor.hitArea = new Rectangle(-30, -64, 60, 66);
  actor.cursor = "pointer";
  actor.on("pointertap", callbacks.onCharacterTap);

  let targetIndex = route.length > 1 ? 1 : 0;
  let pauseRemaining = route[0]?.pauseMs ?? 800;
  let direction: Direction = "down";

  const showAction = (
    enabled: boolean,
    facing?: "left" | "right",
    variant = 0,
    offsetY = 0,
    scaleMultiplier = 1,
  ): void => {
    const active = enabled && Boolean(action);
    character.visible = !active;
    if (!action) return;
    const nextActionLoop = actionLoops[variant] ?? initialActionLoop;
    if (action.textures !== nextActionLoop) action.textures = nextActionLoop;
    action.scale.set(
      Math.abs(baseActionScaleX) * scaleMultiplier * (facing === "right" ? -1 : 1),
      Math.abs(baseActionScaleX) * scaleMultiplier,
    );
    action.y = offsetY;
    action.visible = active;
    if (active) {
      if (!action.playing) action.gotoAndPlay(0);
    } else {
      action.stop();
    }
  };

  showAction(
    Boolean(route[0]?.action),
    route[0]?.actionFacing,
    route[0]?.actionVariant,
    route[0]?.actionOffsetY,
    route[0]?.actionScale,
  );

  if (visit.scene.id === "mimizouVisit") {
    const baseY = actor.y;
    let elapsed = 0;
    let lastDepthY = actor.y;
    app.ticker.add((ticker) => {
      elapsed += ticker.deltaMS;
      const frame = getMimizouVisitFrame(elapsed);
      showAction(!frame.reacting);
      actor.y = baseY - frame.reactionHop;
      if (actor.y !== lastDepthY) {
        lastDepthY = actor.y;
        actor.zIndex = getDepthZIndex(actor.y, 50);
      }
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
      if (!isMovementSegmentValid({ x: actor.x, y: actor.y }, target, layout)) return;
      actor.position.set(target.x, target.y);
      actor.zIndex = getDepthZIndex(actor.y + (target.depthOffset ?? 0), 50);
      pauseRemaining = target.pauseMs;
      onWaypointArrival(targetIndex);
      targetIndex = (targetIndex + 1) % route.length;
      character.stop();
      character.gotoAndStop(1);
      showAction(
        target.action ?? false,
        target.actionFacing,
        target.actionVariant,
        target.actionOffsetY,
        target.actionScale,
      );
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
    if (!isMovementSegmentValid({ x: actor.x, y: actor.y }, next, layout)) return;
    actor.position.set(next.x, next.y);
    actor.zIndex = getDepthZIndex(actor.y + (target.depthOffset ?? 0), 50);
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
  breathing: "smooth" | "subtle" | "alternating" = "smooth",
): Sprite {
  const sleeper = new Sprite(texture);
  sleeper.anchor.set(0.5, 1);
  sleeper.scale.set(height / texture.height);
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
    const breath =
      breathing === "alternating" ? (Math.floor(elapsed / 1200) % 2 === 0 ? 0.75 : 1) : Math.sin(elapsed / 620);
    const breathStrength = breathing === "subtle" ? 0.25 : 1;
    sleeper.scale.x = baseScaleX * (1 + breath * 0.018 * breathStrength);
    sleeper.scale.y = baseScaleY * (1 + breath * 0.045 * breathStrength);
    sleeper.y = position.y + breath * 0.8 * breathStrength;
  });
  return sleeper;
}

function createSleeperBase(
  texture: Texture,
  position: ResolvedWaypoint,
  depthY: number,
  presentation: NonNullable<ReturnType<typeof getRoomPresentation>["sleeperBase"]>,
): Sprite {
  const base = new Sprite(texture);
  base.anchor.set(0.5, 1);
  base.scale.set(presentation.height / texture.height);
  base.position.set(position.x, position.y);
  base.zIndex = getDepthZIndex(depthY, 40);
  return base;
}

function createCompanion(
  texture: Texture,
  presentation: NonNullable<ReturnType<typeof getRoomPresentation>["companion"]>,
  sceneDepthY: number,
  furniture: FurnitureLayout,
  callbacks: RoomCallbacks,
): Sprite {
  const companion = new Sprite(texture);
  companion.anchor.set(0.5, 1);
  companion.scale.set(presentation.height / texture.height);
  const position = resolveGuestPosition(presentation, furniture);
  companion.position.set(position.x, position.y);
  companion.zIndex = getDepthZIndex(resolveGuestDepthY(presentation, sceneDepthY, furniture), 45);
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
  const layer = new Container();
  layer.label = "windowVisitor";
  const visitor = new Container();
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.scale.set(presentation.height / texture.height);
  sprite.tint = 0x8791ad;
  visitor.addChild(sprite);
  visitor.position.set(presentation.x, presentation.y + 8);
  visitor.alpha = 0;
  visitor.eventMode = "none";
  visitor.hitArea = new Rectangle(-28, -28, 56, 56);
  visitor.cursor = "pointer";
  visitor.on("pointertap", callbacks.onCharacterTap);
  const mask = new Graphics()
    .rect(WINDOW_FRAME.x, WINDOW_FRAME.y, WINDOW_FRAME.width, WINDOW_FRAME.height)
    .fill(0xffffff);
  visitor.mask = mask;
  layer.addChild(visitor, mask);

  let elapsed = 0;
  app.ticker.add((ticker: Ticker) => {
    elapsed += ticker.deltaMS;
    const frame = getMimizouVisitFrame(elapsed);
    visitor.alpha = frame.visitorVisibility;
    visitor.y = presentation.y + frame.visitorYOffset;
    visitor.eventMode = frame.visitorInteractive ? "dynamic" : "none";
  });

  return layer;
}

function createWindowForeground(): Graphics {
  return new Graphics()
    .rect(WINDOW_MULLION.x, WINDOW_MULLION.y, WINDOW_MULLION.width, WINDOW_MULLION.height)
    .fill(0x4a3028)
    .rect(WINDOW_SILL.x, WINDOW_SILL.y, WINDOW_SILL.width, WINDOW_SILL.height)
    .fill(0x65402d);
}

export interface RenderedRoom {
  updateClock: (now: Date) => void;
  /** エトキチの頭上へセリフのフキダシを出し、`durationMs`後に自動で消す */
  showSpeech: (text: string, durationMs: number) => void;
  destroy: () => void;
}

export async function renderRoom(
  host: HTMLElement,
  visit: VisitView,
  callbacks: RoomCallbacks,
  now: Date,
  layout: RoomLayout = DEFAULT_ROOM_LAYOUT,
): Promise<RenderedRoom> {
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
    // 素材は表示する論理寸法のちょうどASSET_PIXEL_RATIO倍で持っているので、描画解像度も揃えてドットを1対1で出す。
    // autoDensityはCanvasのインラインstyleが .room-canvas のCSSに勝つため使わない。
    resolution: ASSET_PIXEL_RATIO,
    roundPixels: true,
    preference: "webgl",
  });
  app.canvas.className = "room-canvas";
  app.canvas.setAttribute("aria-label", `${visit.scene.title}。${visit.scene.description}`);

  const actionAssetName = ACTION_ASSET_NAMES[visit.scene.id];
  const presentation = getRoomPresentation(visit);
  const lighting = createRoomLighting(app, presentation.tint);
  const getThunderWindowFrame = presentation.tatsuoWindow ? createThunderWindowFrameProvider(app) : undefined;
  const getThunderComfortFrame =
    presentation.thunderstorm && !presentation.tatsuoWindow ? createThunderComfortFrameProvider(app) : undefined;
  const getThunderFlashFrame = getThunderWindowFrame ?? getThunderComfortFrame;
  const sceneLayout = resolveSceneLayout(visit.scene.id, layout);
  const route = resolveSceneRoute(visit.scene.id, sceneLayout);
  const initialPosition = route[0] ?? { x: 30, y: 154, pauseMs: 5000 };
  const initialDepthY = resolveSceneInitialDepthY(visit.scene.id, sceneLayout);
  const guestPresentation = presentation.visitor ?? presentation.companion;
  const [
    characterTexture,
    actionTexture,
    guestTexture,
    sleeperBaseTexture,
    comfortingMaineCoonTexture,
    tatsuoWindowTexture,
  ] = await Promise.all([
    Assets.load<Texture>(
      `${import.meta.env.BASE_URL}assets/${
        visit.scene.characterPose === "sleep" ? presentation.sleeperAssetName : WALK_ASSET_NAME
      }`,
    ),
    actionAssetName ? Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${actionAssetName}`) : undefined,
    guestPresentation
      ? Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${guestPresentation.assetName}`)
      : undefined,
    presentation.sleeperBase
      ? Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${presentation.sleeperBase.assetName}`)
      : undefined,
    presentation.comfortingMaineCoon
      ? Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${presentation.comfortingMaineCoon.assetName}`)
      : undefined,
    presentation.tatsuoWindow
      ? Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${presentation.tatsuoWindow.assetName}`)
      : undefined,
  ]);
  const companion =
    guestTexture && presentation.companion
      ? createCompanion(guestTexture, presentation.companion, initialDepthY, sceneLayout.furniture, callbacks)
      : undefined;
  const visitor =
    guestTexture && presentation.visitor
      ? createVisitor(app, guestTexture, presentation.visitor, callbacks)
      : undefined;
  const sleeperBase =
    sleeperBaseTexture && presentation.sleeperBase
      ? createSleeperBase(sleeperBaseTexture, initialPosition, initialDepthY, presentation.sleeperBase)
      : undefined;
  const waypointArrivalListeners: ((waypointIndex: number) => void)[] = [];
  const scenePropReveal: ScenePropRevealBinding = {
    enabled: visit.scene.characterPose !== "sleep" && route.length > 1,
    onWaypointArrival: (listener) => waypointArrivalListeners.push(listener),
  };
  const character =
    visit.scene.characterPose === "sleep"
      ? createSleeper(
          app,
          characterTexture,
          initialPosition,
          initialDepthY,
          presentation.sleeperHeight,
          callbacks,
          presentation.sleeperBreathing,
        )
      : createWalker(
          app,
          characterTexture,
          actionTexture,
          visit,
          route,
          sceneLayout,
          callbacks,
          presentation.hideCharacterShadow ?? false,
          (waypointIndex) => {
            for (const listener of waypointArrivalListeners) listener(waypointIndex);
          },
        );
  const comfortingMaineCoon =
    comfortingMaineCoonTexture && presentation.comfortingMaineCoon && getThunderComfortFrame
      ? createComfortingMaineCoon(
          app,
          comfortingMaineCoonTexture,
          presentation.comfortingMaineCoon,
          lighting.bake,
          callbacks,
          getThunderComfortFrame,
        )
      : undefined;
  const tatsuoWindowFace =
    tatsuoWindowTexture && presentation.tatsuoWindow && getThunderWindowFrame
      ? createTatsuoWindowFaceLayer(app, tatsuoWindowTexture, presentation.tatsuoWindow, getThunderWindowFrame)
      : undefined;
  if (comfortingMaineCoon) character.visible = false;

  const furnitureAssetNames = FURNITURE_DEFINITIONS.map(
    ({ id, assetName }) => presentation.furnitureAssetNames?.[id] ?? assetName,
  );
  const fixtureAssetNames = FIXTURE_DEFINITIONS.map(({ baseAssetName }) => baseAssetName);
  const decorationAssetNames = [
    ...new Set([
      ...FLOOR_DECORATIONS.map(({ assetName }) => assetName),
      ...DEPTH_DECORATIONS.map(({ assetName }) => assetName),
      ...Object.values(presentation.depthDecorationOverrides ?? {})
        .map((override) => override?.assetName)
        .filter((assetName): assetName is string => Boolean(assetName)),
    ]),
  ];
  const sceneProps = presentation.sceneProps ?? [];
  const [
    baseTexture,
    windowTexture,
    clockTexture,
    furnitureTextures,
    fixtureTextures,
    decorationTextures,
    scenePropTextures,
  ] = await Promise.all([
    Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${presentation.baseAssetName}`),
    Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${presentation.windowAssetName}`),
    Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${ROOM_CLOCK.assetName}`),
    Promise.all(
      furnitureAssetNames.map((assetName) => Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${assetName}`)),
    ),
    Promise.all(
      fixtureAssetNames.map((assetName) => Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${assetName}`)),
    ),
    Promise.all(
      decorationAssetNames.map((assetName) => Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${assetName}`)),
    ),
    Promise.all(
      sceneProps.map(({ assetName }) => Assets.load<Texture>(`${import.meta.env.BASE_URL}assets/${assetName}`)),
    ),
  ]);
  const textureByFurnitureId = new Map(
    FURNITURE_DEFINITIONS.map(({ id }, index) => [id, furnitureTextures[index] as Texture]),
  );
  const textureByFixtureId = new Map(
    FIXTURE_DEFINITIONS.map(({ id }, index) => [id, fixtureTextures[index] as Texture]),
  );
  const textureByDecorationAsset = new Map(
    decorationAssetNames.map((assetName, index) => [assetName, decorationTextures[index] as Texture]),
  );
  const base = createLayeredBackground(baseTexture, presentation.tint, lighting.bake);
  const windowLayer = createWindowLayer(windowTexture, lighting.bake, callbacks, presentation.windowObservation);
  const rainWindowLayer = presentation.thunderstorm ? createRainWindowLayer(app) : undefined;
  const fixtureLayer = createFixtureLayer(
    textureByFixtureId,
    sceneLayout.fixtures,
    lighting.bake,
    callbacks,
    presentation.observationOverrides,
  );
  const floorDecor = createDecorationLayer(FLOOR_DECORATIONS, textureByDecorationAsset, "floorDecor", lighting.bake);
  const clockLayer = createClockLayer(clockTexture, now, presentation.tint, lighting.bake);
  const depthContainer = new Container();
  depthContainer.label = "floorDepth";
  depthContainer.sortableChildren = true;
  depthContainer.addChild(
    ...createFurnitureSprites(
      textureByFurnitureId,
      sceneLayout.furniture,
      lighting.bake,
      callbacks,
      presentation.observationOverrides,
      presentation.hiddenFurnitureIds,
    ),
    ...createDepthDecorationSprites(
      DEPTH_DECORATIONS,
      textureByDecorationAsset,
      lighting.bake,
      callbacks,
      presentation.depthDecorationOverrides,
      sceneLayout.furniture,
      presentation.hiddenDepthDecorationIds,
    ),
    ...createSceneProps(scenePropTextures, sceneProps, sceneLayout, lighting.bake, scenePropReveal),
  );
  if (sleeperBase) depthContainer.addChild(sleeperBase);
  if (companion) depthContainer.addChild(companion);
  if (comfortingMaineCoon) depthContainer.addChild(comfortingMaineCoon);
  depthContainer.addChild(character);

  app.stage.addChild(base, windowLayer);
  if (rainWindowLayer && !tatsuoWindowFace) app.stage.addChild(rainWindowLayer);
  app.stage.addChild(floorDecor, fixtureLayer, clockLayer.container);
  if (visitor) app.stage.addChild(visitor);
  if (!tatsuoWindowFace) app.stage.addChild(createWindowForeground());
  app.stage.addChild(depthContainer, createTimeLightingLayer(visit, sceneLayout));
  if (getThunderFlashFrame) app.stage.addChild(createThunderFlashLayer(app, getThunderFlashFrame));
  if (tatsuoWindowFace) {
    app.stage.addChild(tatsuoWindowFace);
    if (rainWindowLayer) app.stage.addChild(rainWindowLayer);
    app.stage.addChild(createWindowForeground());
  }
  const characterBubble = presentation.characterBubble
    ? createCharacterBubbleElement(app, character, presentation.characterBubble)
    : undefined;
  const speechBubble = createSpeechBubble(app, host, comfortingMaineCoon ?? character, (speechVisible) => {
    characterBubble?.classList.toggle("is-muted", speechVisible);
  });
  host.replaceChildren(app.canvas, ...(characterBubble ? [characterBubble] : []), speechBubble.element);
  return {
    updateClock: clockLayer.update,
    showSpeech: speechBubble.show,
    destroy: () => {
      speechBubble.destroy();
      lighting.destroy();
      app.destroy({ removeView: true }, { children: true });
    },
  };
}
