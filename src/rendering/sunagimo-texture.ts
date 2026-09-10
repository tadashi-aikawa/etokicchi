import { type Application, Filter, GlProgram, Rectangle, Sprite, type Texture } from "pixi.js";

/** 原画のマゼンタ背景を一度だけ透過へ焼き込み、4コマで共有する。 */
export function createSunagimoTexture(app: Application, source: Texture): Texture {
  const filter = new Filter({
    resolution: 1,
    glProgram: GlProgram.from({
      vertex: `
        in vec2 aPosition;
        out vec2 vTextureCoord;
        uniform vec4 uInputSize;
        uniform vec4 uOutputFrame;
        uniform vec4 uOutputTexture;
        void main() {
          vec2 p = aPosition * uOutputFrame.zw + uOutputFrame.xy;
          p.x = p.x * (2.0 / uOutputTexture.x) - 1.0;
          p.y = p.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
          gl_Position = vec4(p, 0.0, 1.0);
          vTextureCoord = aPosition * uOutputFrame.zw * uInputSize.zw;
        }`,
      fragment: `
        in vec2 vTextureCoord;
        uniform sampler2D uTexture;
        void main() {
          vec4 color = texture2D(uTexture, vTextureCoord);
          float magenta = min(color.r, color.b) - color.g;
          gl_FragColor = magenta > 0.18 ? vec4(0.0) : color;
        }`,
    }),
  });
  const target = new Sprite(source);
  target.filters = [filter];
  const result = app.renderer.generateTexture({
    target,
    frame: new Rectangle(0, 0, source.width, source.height),
    resolution: 1,
    antialias: false,
  });
  target.destroy();
  filter.destroy();
  return result;
}
