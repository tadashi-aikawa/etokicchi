import { AnimatedSprite, Container, Graphics, Rectangle, Sprite, type Texture } from "pixi.js";
import type { VisitView } from "../game/types.ts";
import { createGridFrames } from "./room-character.ts";
import { resolveClockHandAngles, ROOM_CLOCK, type RoomDecoration, type RoomDepthDecoration } from "./room-decor.ts";
import { FIXTURE_DEFINITIONS, type FixtureLayout } from "./room-fixtures.ts";
import {
  FURNITURE_DEFINITIONS,
  type FurnitureId,
  type FurnitureLayout,
  resolveFurnitureSpriteHitArea,
} from "./room-furniture.ts";
import { getDepthZIndex, type RoomLayout } from "./room-layout.ts";
import { getRoomLights } from "./room-lighting.ts";
import type { BakeLitTexture } from "./room-lighting-bake.ts";
import {
  applyTintToColor,
  isScenePropInitiallyVisible,
  resolveScenePropDepthY,
  resolveScenePropPosition,
} from "./room-presentation.ts";
import type {
  AttachedSceneProp,
  ObservationOverrides,
  RoomPresentationCommon,
  RoomTint,
} from "./room-presentation-types.ts";
import type { RoomCallbacks } from "./room-types.ts";
import { ROOM_BACKGROUND_HEIGHT, ROOM_HEIGHT, ROOM_WIDTH } from "./scene-assets.ts";
import { WINDOW_FRAME, WINDOW_MULLION, WINDOW_SILL } from "./window-geometry.ts";

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

export function createDecorationLayer(
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

export function createDepthDecorationSprites(
  definitions: readonly RoomDepthDecoration[],
  textures: ReadonlyMap<string, Texture>,
  bake: BakeLitTexture,
  callbacks: RoomCallbacks,
  overrides: RoomPresentationCommon["depthDecorationOverrides"],
  furniture: FurnitureLayout,
  hiddenIds: RoomPresentationCommon["hiddenDepthDecorationIds"],
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

export interface RoomClockLayer {
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

export function createClockLayer(source: Texture, now: Date, tint: RoomTint, bake: BakeLitTexture): RoomClockLayer {
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

export function createTimeLightingLayer(visit: VisitView, sceneLayout: RoomLayout, lightsOff = false): Container {
  const layer = new Container();
  layer.label = "timeLighting";
  const lights = lightsOff
    ? []
    : getRoomLights(visit.assignment.band, visit.scene.characterPose === "sleep", sceneLayout);
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

const FRONT_EDGE_TOP_COLOR = 0x8b5331;
const FRONT_EDGE_BOTTOM_COLOR = 0x3a211b;

export function createLayeredBackground(baseTexture: Texture, tint: RoomTint, bake: BakeLitTexture): Container {
  const background = new Container();
  background.label = "timeNeutralBase";
  const outsideRoom = new Graphics()
    .rect(0, ROOM_BACKGROUND_HEIGHT, ROOM_WIDTH, ROOM_HEIGHT - ROOM_BACKGROUND_HEIGHT)
    .fill(0x171b25);
  const interior = new Container();
  const base = new Sprite(bake(baseTexture));
  base.width = ROOM_WIDTH;
  base.height = ROOM_BACKGROUND_HEIGHT;
  interior.addChild(base);
  const frontEdge = new Graphics()
    .rect(0, ROOM_BACKGROUND_HEIGHT - 3, ROOM_WIDTH, 3)
    .fill(applyTintToColor(FRONT_EDGE_TOP_COLOR, tint))
    .rect(0, ROOM_BACKGROUND_HEIGHT, ROOM_WIDTH, 5)
    .fill(applyTintToColor(FRONT_EDGE_BOTTOM_COLOR, tint));
  background.addChild(outsideRoom, interior, frontEdge);
  return background;
}

export function createWindowLayer(
  windowTexture: Texture,
  bake: BakeLitTexture,
  callbacks: RoomCallbacks,
  observation: string,
): Container {
  const windowLayer = new Container();
  windowLayer.label = "timeWindow";
  const window = new Sprite(bake(windowTexture));
  window.width = ROOM_WIDTH;
  window.height = ROOM_BACKGROUND_HEIGHT;
  const windowMask = new Graphics()
    .rect(WINDOW_FRAME.x, WINDOW_FRAME.y, WINDOW_FRAME.width, WINDOW_FRAME.height)
    .fill(0xffffff);
  window.mask = windowMask;
  window.eventMode = "static";
  window.cursor = "pointer";
  window.label = "窓";
  const scaleX = windowTexture.width / ROOM_WIDTH;
  const scaleY = windowTexture.height / ROOM_BACKGROUND_HEIGHT;
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

export function createWindowForeground(): Graphics {
  return new Graphics()
    .rect(WINDOW_MULLION.x, WINDOW_MULLION.y, WINDOW_MULLION.width, WINDOW_MULLION.height)
    .fill(0x4a3028)
    .rect(WINDOW_SILL.x, WINDOW_SILL.y, WINDOW_SILL.width, WINDOW_SILL.height)
    .fill(0x65402d);
}

export function createFurnitureSprites(
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

export function createFixtureLayer(
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
export interface ScenePropRevealBinding {
  enabled: boolean;
  onWaypointArrival: (listener: (waypointIndex: number) => void) => void;
}

export function createSceneProps(
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
    if (!isScenePropInitiallyVisible(presentation) && reveal.enabled) {
      sprite.visible = false;
      reveal.onWaypointArrival((arrivedIndex) => {
        if (arrivedIndex === revealAtWaypoint) sprite.visible = true;
      });
    }
    return sprite;
  });
}
