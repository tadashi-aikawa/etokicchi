import { type Application, ColorMatrixFilter, Rectangle, Sprite, type Texture } from "pixi.js";
import { getLightingColorMatrix } from "./room-presentation.ts";
import type { RoomTint } from "./room-presentation-types.ts";

/**
 * 時間帯の照明を素材へ焼き込んだテクスチャを作る。
 * 照明は時間帯とシーンで決まる静的な色変換なので、毎フレームのフィルタ描画にはしない。
 */
function createLitTexture(app: Application, texture: Texture, tint: RoomTint): Texture {
  if (tint.alpha === 0) return texture;
  const filter = new ColorMatrixFilter();
  filter.matrix = getLightingColorMatrix(tint);
  // 焼き込み先は素材と等倍なので、色変換も焼き上がりも解像度1で足りる。
  // 画面の描画解像度2はここには関係せず、上げても画素数が増えるだけで情報は増えない。
  filter.resolution = 1;
  const target = new Sprite(texture);
  target.filters = [filter];
  // フィルターの余白まで焼くと素材より大きくなるので、範囲は素材そのものに固定する。
  const lit = app.renderer.generateTexture({
    target,
    frame: new Rectangle(0, 0, texture.width, texture.height),
    resolution: 1,
    antialias: false,
  });
  target.destroy();
  filter.destroy();
  return lit;
}

export type BakeLitTexture = (texture: Texture) => Texture;

export interface RoomLighting {
  bake: BakeLitTexture;
  destroy: () => void;
}

// 同じ素材を複数のスプライトが使うので、焼き込みは部屋ごとに一度だけにする。
export function createRoomLighting(app: Application, tint: RoomTint): RoomLighting {
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
