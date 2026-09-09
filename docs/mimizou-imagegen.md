# みみぞうの画像生成記録

組み込みimagegenで旧画像を外見参照に描き直した。モデル名はツールから公開されていない。

- 原素材: `assets-src/mimizou-pixel.png`
- 配信素材: `public/assets/mimizou-pixel.png`
- どちらも承認済みの144×144px透過PNG。表示高さは72。
- imagegenの出力には市松模様が焼き込まれていたため、ユーザーの許可を得てPillowで外周につながる背景を除去し、本体から離れたドットと明るい縁のノイズを除去した。白い目・羽は保持した。
- 旧画像と本体の高さ・足元を合わせた新旧比較で採用を承認された画像を、そのまま両方の素材パスへ保存した。

## 描き直しに使ったプロンプト

参照画像は変更前の `public/assets/mimizou-pixel.png`。

```text
Redraw the provided Mimizou owl game sprite at much higher clean pixel-art quality. This reference is the identity reference: preserve this exact cute round grey-and-white owl character, front-facing standing full-body pose, two very large round white eyes with tiny black pupils looking ahead, small yellow beak centered between the eyes, dark grey head and wings, white/light-grey belly with a few distinct dark grey feather spots, tiny yellow feet. Keep the same compact round silhouette, proportions, neutral curious expression and restrained grey/white/yellow palette. Do not add ear tufts, accessories, eyebrows, props, background, text or extra characters. Replace the muddy tiny original pixels with deliberate crisp dark outlines, tidy pixel clusters, symmetrical clearly separated eyes and readable simple feather markings. Cozy 16-bit pixel-art game style, not a smooth vector, not realistic feather texture, no blur or grain. One isolated character, genuine transparent alpha background, no drop shadow or checkerboard. Square PNG canvas. Match the reference composition: character approximately 65% of canvas width and 68% of height, horizontally centered near x=53%, its feet end at y=87% of the canvas. This padding and feet position are important for existing sprite anchors. Supply a high-resolution master suitable for clean downsampling to a 144x144 game texture and displaying at 72 logical pixels.
```

## 透過を再依頼したプロンプト

参照画像は最初の生成結果。この再生成結果をPillowで仕上げた。

```text
Edit this image only to remove the checkerboard background. Keep the owl itself EXACTLY unchanged, same shape, pixel art, eyes, belly spots, colors, size, position and square canvas. Every checkerboard pixel surrounding the owl must become actual transparent alpha=0 pixels, not a drawn transparency grid, not white, not grey, no texture. Output RGBA PNG with genuine transparent background. Preserve all white feathers and white eyes as opaque. Clean edge with no checkerboard residue or halo. This is a production transparent sprite cutout, not a preview of transparency.
```
