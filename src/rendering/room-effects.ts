import { type Application, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import type { TatsuoWindowPresentation } from "./room-presentation-types.ts";
import { TATSUO_WINDOW_FACE_RATIO } from "./room-presentation-types.ts";
import { ROOM_BACKGROUND_HEIGHT, ROOM_WIDTH } from "./scene-assets.ts";
import {
  getRainDropPosition,
  getThunderComfortFrame,
  RAIN_DROP_SEEDS,
  THUNDER_FLASH_COLOR,
  type ThunderComfortFrame,
} from "./thunder-comfort.ts";
import { getThunderWindowFrame, type ThunderWindowFrame } from "./thunder-window.ts";
import { WINDOW_GLASS, WINDOW_GLASS_PANES } from "./window-geometry.ts";

export type ThunderComfortFrameProvider = () => ThunderComfortFrame;
export type ThunderWindowFrameProvider = () => ThunderWindowFrame;
export type ThunderFlashFrameProvider = () => Pick<ThunderComfortFrame, "flashAlpha">;

export function createThunderComfortFrameProvider(app: Application): ThunderComfortFrameProvider {
  let elapsedMs = 0;
  let frame = getThunderComfortFrame(elapsedMs);
  app.ticker.add((ticker) => {
    elapsedMs += ticker.deltaMS;
    frame = getThunderComfortFrame(elapsedMs);
  });
  return () => frame;
}

export function createThunderWindowFrameProvider(app: Application): ThunderWindowFrameProvider {
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

export function createRainWindowLayer(app: Application): Container {
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

export function createThunderFlashLayer(app: Application, getFrame: ThunderFlashFrameProvider): Graphics {
  const flash = new Graphics().rect(0, 0, ROOM_WIDTH, ROOM_BACKGROUND_HEIGHT).fill(THUNDER_FLASH_COLOR);
  flash.label = "thunderFlash";
  flash.blendMode = "screen";
  flash.eventMode = "none";
  flash.alpha = 0;
  app.ticker.add(() => {
    flash.alpha = getFrame().flashAlpha;
  });
  return flash;
}

export function createTatsuoWindowFaceLayer(
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
