import { AnimatedSprite, Application, Assets, Container, Graphics, type Texture, TextureSource } from "pixi.js";
import "pixi.js/browser";
import type { VisitView } from "../game/types.ts";
import { createChromaKeyTexture } from "./chroma-key-texture.ts";
import { createCharacterBubbleElement, createSpeechBubble } from "./room-bubbles.ts";
import {
  createComfortingMaineCoon,
  createCompanion,
  createSleeper,
  createSleeperBase,
  createVisitor,
  createWalker,
} from "./room-character.ts";
import { DEPTH_DECORATIONS, FLOOR_DECORATIONS, ROOM_CLOCK } from "./room-decor.ts";
import {
  createRainWindowLayer,
  createTatsuoWindowFaceLayer,
  createThunderComfortFrameProvider,
  createThunderFlashLayer,
  createThunderWindowFrameProvider,
} from "./room-effects.ts";
import { FIXTURE_DEFINITIONS } from "./room-fixtures.ts";
import { FURNITURE_DEFINITIONS } from "./room-furniture.ts";
import {
  createClockLayer,
  createDecorationLayer,
  createDepthDecorationSprites,
  createFixtureLayer,
  createFurnitureSprites,
  createLayeredBackground,
  createSceneProps,
  createTimeLightingLayer,
  createWindowForeground,
  createWindowLayer,
  type ScenePropRevealBinding,
} from "./room-layers.ts";
import {
  DEFAULT_ROOM_LAYOUT,
  resolveSceneInitialDepthY,
  resolveSceneLayout,
  resolveSceneRoute,
  type RoomLayout,
  validateRoomLayout,
} from "./room-layout.ts";
import { createRoomLighting } from "./room-lighting-bake.ts";
import { getRoomPresentation } from "./room-presentation.ts";
import type { RoomCallbacks, RoomHostCallbacks } from "./room-types.ts";
import { SPEECH_DURATION_MS } from "./room-speech.ts";
import { ACTION_ASSET_NAMES, ASSET_PIXEL_RATIO, ROOM_HEIGHT, ROOM_WIDTH, WALK_ASSET_NAME } from "./scene-assets.ts";

// ドット絵はどの素材も等倍で出したいので、補間の既定をここで一度だけ切り替える。
// このモジュールはAssets.loadを呼ぶより前に評価されるため、読み込んだテクスチャにも、
// generateTextureで焼いたテクスチャにも効く。
TextureSource.defaultOptions.scaleMode = "nearest";

export interface RenderedRoom {
  updateClock: (now: Date) => void;
  /** エトキチの頭上へセリフのフキダシを出し、`durationMs`後に自動で消す */
  showSpeech: (text: string, durationMs: number) => void;
  destroy: () => void;
}

export async function renderRoom(
  host: HTMLElement,
  visit: VisitView,
  hostCallbacks: RoomHostCallbacks,
  now: Date,
  layout: RoomLayout = DEFAULT_ROOM_LAYOUT,
): Promise<RenderedRoom> {
  const callbacks: RoomCallbacks = {
    ...hostCallbacks,
    onThought: (text, target) => speechBubble.show(text, SPEECH_DURATION_MS, target, "thought"),
  };
  const layoutErrors = validateRoomLayout(layout);
  if (layoutErrors.length > 0) {
    throw new Error(`不正な家具配置は描画できません: ${layoutErrors.map(({ message }) => message).join("、")}`);
  }
  const app = new Application();
  await app.init({
    width: ROOM_WIDTH,
    height: ROOM_HEIGHT,
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
  const onGuestTap = (target: Container): void => {
    const speech =
      target instanceof AnimatedSprite
        ? (guestPresentation?.animation?.frames[target.currentFrame]?.speech ?? guestPresentation?.speech)
        : guestPresentation?.speech;
    if (speech) {
      speechBubble.show(speech, SPEECH_DURATION_MS, target);
    } else if (guestPresentation?.observation) {
      callbacks.onObservation(guestPresentation.observation.text, guestPresentation.observation.targetName);
    } else {
      callbacks.onCharacterTap();
    }
  };
  const usesChromaKey = visit.scene.id === "sunagimoGrill";
  const keyedGuestTexture = usesChromaKey && guestTexture ? createChromaKeyTexture(app, guestTexture) : undefined;
  const reactionTexture = usesChromaKey && actionTexture ? createChromaKeyTexture(app, actionTexture) : undefined;
  const companion =
    guestTexture && presentation.companion
      ? createCompanion(
          keyedGuestTexture ?? guestTexture,
          presentation.companion,
          initialDepthY,
          sceneLayout.furniture,
          onGuestTap,
        )
      : undefined;
  const visitor =
    guestTexture && presentation.visitor
      ? createVisitor(app, guestTexture, presentation.visitor, onGuestTap)
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
          presentation.sleeperRotation,
        )
      : createWalker(
          app,
          characterTexture,
          reactionTexture ?? actionTexture,
          visit,
          route,
          sceneLayout,
          callbacks,
          presentation.hideCharacterShadow ?? false,
          (waypointIndex) => {
            for (const listener of waypointArrivalListeners) listener(waypointIndex);
          },
          visit.scene.id === "sunagimoGrill" && companion instanceof AnimatedSprite
            ? () => Math.max(0, companion.currentFrame - 1)
            : undefined,
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
      presentation.depthDecorationThoughts,
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
  if (visit.scene.id === "masaruSunbeam") {
    const sunbeam = new Graphics().poly([39, 166, 102, 156, 137, 199, 64, 216]).fill({ color: 0xffde87, alpha: 0.2 });
    sunbeam.eventMode = "none";
    app.stage.addChild(sunbeam);
  }
  if (visitor) app.stage.addChild(visitor);
  if (!tatsuoWindowFace) app.stage.addChild(createWindowForeground());
  app.stage.addChild(depthContainer, createTimeLightingLayer(visit, sceneLayout, presentation.lightsOff));
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
      keyedGuestTexture?.destroy(true);
      reactionTexture?.destroy(true);
    },
  };
}
