import {
  AnimatedSprite,
  type Application,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
  type Ticker,
} from "pixi.js";
import type { VisitView } from "../game/types.ts";
import { getMimizouVisitFrame } from "./mimizou-visit.ts";
import type { ThunderComfortFrameProvider } from "./room-effects.ts";
import type { FurnitureLayout } from "./room-furniture.ts";
import { getDepthZIndex, isMovementSegmentValid, type RoomLayout } from "./room-layout.ts";
import type { BakeLitTexture } from "./room-lighting-bake.ts";
import { resolveGuestDepthY, resolveGuestPosition } from "./room-presentation.ts";
import type {
  ComfortingMaineCoonPresentation,
  GuestPresentation,
  PositionedGuestPresentation,
  RoomPresentationCommon,
} from "./room-presentation-types.ts";
import type { RoomCallbacks } from "./room-types.ts";
import type { ResolvedWaypoint } from "./route-definitions.ts";
import {
  ACTION_FRAME_COLUMNS,
  ACTION_FRAME_HEIGHT,
  ACTION_ROW_COUNTS,
  WALK_FRAME_COLUMNS,
  WALK_FRAME_HEIGHT,
  WALK_FRAME_ROWS,
} from "./scene-assets.ts";
import { WINDOW_GLASS } from "./window-geometry.ts";

const WALK_SPEED = 19;

type Direction = "down" | "left" | "right" | "up";

const directionRows: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

/** スプライトシートを行×列の等間隔で切り出す。端数はコマの境界を丸めて吸収する。 */
export function createGridFrames(sheet: Texture, columns: number, rows: number): Texture[][] {
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

export function createWalker(
  app: Application,
  sheet: Texture,
  actionSheet: Texture | undefined,
  visit: VisitView,
  route: readonly ResolvedWaypoint[],
  layout: RoomLayout,
  callbacks: RoomCallbacks,
  hideShadow: boolean,
  onWaypointArrival: (waypointIndex: number) => void,
  getReactionFrame?: () => number,
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

  if (action && getReactionFrame) {
    // 相手の姿を基準にすることで、別々のループの周期がずれるのを防ぐ。
    const reactionFrames = actionFrameRows[0] ?? [];
    action.stop();
    action.textures = reactionFrames;
    const updateReaction = (): void => {
      action.gotoAndStop(getReactionFrame());
    };
    updateReaction();
    app.ticker.add(updateReaction);
  }

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

export function createSleeper(
  app: Application,
  texture: Texture,
  position: ResolvedWaypoint,
  depthY: number,
  height: number,
  callbacks: RoomCallbacks,
  breathing: "smooth" | "subtle" | "alternating" | "none" = "smooth",
  rotation = 0,
): Sprite {
  const sleeper = new Sprite(texture);
  sleeper.anchor.set(0.5, 1);
  sleeper.scale.set(height / texture.height);
  sleeper.position.set(position.x, position.y);
  sleeper.rotation = rotation;
  sleeper.zIndex = getDepthZIndex(depthY, 50);
  sleeper.eventMode = "dynamic";
  sleeper.cursor = "pointer";
  sleeper.on("pointertap", callbacks.onCharacterTap);

  if (breathing === "none") return sleeper;

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

export function createSleeperBase(
  texture: Texture,
  position: ResolvedWaypoint,
  depthY: number,
  presentation: NonNullable<RoomPresentationCommon["sleeperBase"]>,
): Sprite {
  const base = new Sprite(texture);
  base.anchor.set(0.5, 1);
  base.scale.set(presentation.height / texture.height);
  base.position.set(position.x + (presentation.offset?.x ?? 0), position.y + (presentation.offset?.y ?? 0));
  base.zIndex = getDepthZIndex(depthY, 40);
  return base;
}

export function createCompanion(
  texture: Texture,
  presentation: GuestPresentation,
  sceneDepthY: number,
  furniture: FurnitureLayout,
  onTap: (target: Container) => void,
): Sprite {
  const animation = presentation.animation;
  const frames = animation ? createGridFrames(texture, animation.columns, animation.rows).flat() : [];
  if (animation && animation.frames.length !== frames.length) throw new Error("同席者のコマ数と台詞数が一致しません");
  const companion = animation
    ? new AnimatedSprite(
        frames.map((frame, index) => {
          const timing = animation.frames[index];
          if (!timing || timing.durationMs <= 0) throw new Error("同席者のコマ時間が不正です");
          return { texture: frame, time: timing.durationMs };
        }),
      )
    : new Sprite(texture);
  companion.anchor.set(0.5, 1);
  companion.scale.set(presentation.height / (frames[0]?.height ?? texture.height));
  if (companion instanceof AnimatedSprite) companion.play();
  companion.on("destroyed", () => {
    for (const frame of frames) frame.destroy();
  });
  const position = resolveGuestPosition(presentation, furniture);
  companion.position.set(position.x, position.y);
  companion.zIndex = getDepthZIndex(resolveGuestDepthY(presentation, sceneDepthY, furniture), 45);
  companion.eventMode = "dynamic";
  companion.cursor = "pointer";
  companion.on("pointertap", () => onTap(companion));
  return companion;
}

export function createVisitor(
  app: Application,
  texture: Texture,
  presentation: PositionedGuestPresentation,
  onTap: (target: Container) => void,
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
  const hitArea = new Rectangle(
    WINDOW_GLASS.x - visitor.x,
    WINDOW_GLASS.y - visitor.y,
    WINDOW_GLASS.width,
    WINDOW_GLASS.height,
  );
  visitor.hitArea = hitArea;
  visitor.cursor = "pointer";
  visitor.on("pointertap", () => onTap(visitor));
  const mask = new Graphics()
    .rect(WINDOW_GLASS.x, WINDOW_GLASS.y, WINDOW_GLASS.width, WINDOW_GLASS.height)
    .fill(0xffffff);
  visitor.mask = mask;
  layer.addChild(visitor, mask);

  let elapsed = 0;
  app.ticker.add((ticker: Ticker) => {
    elapsed += ticker.deltaMS;
    const frame = getMimizouVisitFrame(elapsed);
    visitor.alpha = frame.visitorVisibility;
    visitor.y = presentation.y + frame.visitorYOffset;
    hitArea.y = WINDOW_GLASS.y - visitor.y;
    visitor.eventMode = frame.visitorInteractive ? "dynamic" : "none";
  });

  return layer;
}

export function createComfortingMaineCoon(
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
