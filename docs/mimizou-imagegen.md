# みみぞうの画像生成記録

## 現行素材: 細かな輪郭と羽の陰影

組み込みimagegenで描き直し、丸い頭・大きな白い目・灰白の体・黄色いくちばしと足を保った。旧素材の太い輪郭と大きな陰影の段差を、細かな羽の陰影へ置き換えた。

- 原画: `assets-src/mimizou-pixel.png`。1254×1254px、マゼンタ単色背景。
- 配信素材: `public/assets/mimizou-pixel.png`。従来と同じ93×97pxの透過PNG。
- `pnpm assets:normalize` で左111・上109から1030×1039pxを切り出し、既存のマゼンタ透過処理を適用してからLanczosで縮小する。キャラの外接矩形は左123・上121〜右1128・下1135で、切り出しには境界保護用の余白を含めた。
- 表示高さ48.5と窓辺・星見の配置、フキダシの位置計算は変更しない。
- 初回の透過指定は市松模様を生成したため、背景だけをマゼンタへ再編集した。モデル名はツールから公開されていない。

### 描き直しプロンプト

画像1は旧みみぞう、画像2は `decor-cat-loaf-pixel.webp`、画像3は `etokichi-walk-pixel-v2.webp`。

```text
Use case: style-transfer. Image 1 is EDIT TARGET, the Mimizou owl single game sprite. Images 2 and 3 are ONLY fine pixel density and delicate contour style references, do not add cat or star. Redraw the owl with much finer pixel-art feather shading and thin nuanced dark grey contours, replacing thick black stepped edges and large flat feather blobs. Preserve its identity EXACTLY: round smooth head WITHOUT ear tufts or sticking-up hair, round compact grey-and-white body, two very large circular white eyes with tiny black pupils looking ahead, tiny yellow beak, grey wings at sides, pale belly with sparse darker feather marks, tiny yellow feet, front-facing upright neutral curious pose. Keep same proportions, circular eye size, overall silhouette and greys/white/yellow palette. Fine cozy pixel art matching the reference cat, not realistic, not smooth vector, not simply enlarged chunky pixels. ONE full-body owl centered on near-square canvas, minimal clear padding, feet and all edges fully visible. Genuine transparent alpha background, no checkerboard pattern, no shadow, no scenery, no text. High-resolution master suitable for downsampling into a small game sprite.
```

### 背景の再編集プロンプト

```text
Precise background edit only. Keep owl EXACTLY unchanged, every feather, eyes, pupils, shape, size, position, grey palette, yellow beak and feet. Replace ALL grey and white checkerboard surrounding owl with perfectly uniform solid RGB(255,0,255) #ff00ff magenta background for game chroma key. Include gaps between and under feet. Do not replace white feathers or white eyes. No checkerboard, no shadow, no additional elements. Keep same square framing and resolution.
```

### 検証

- みみぞうを使う訪問・見送り・星見を390px幅と1280px幅で撮影し、輪郭・透過・配置を確認。実行時例外なし。
- 素材品質テストへみみぞうを追加し、マゼンタの残留・端での切れ・大きな欠けを検査。`pnpm check` は516テスト、型検査、整形、本番ビルドが成功。既存Lint警告3件。
- 素材変換を再実行し、みみぞうの配信PNGのSHA-256が一致した。
- 撮影APIは公式の [Page.captureScreenshot](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot) と [Runtime.evaluate](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-evaluate) で確認した。

### 他素材の描き直し候補

配信画像の目視比較による優先度。以下の画像は今回変更していない。

| 優先度 | 素材 | 理由 |
| --- | --- | --- |
| 高 | `etokichi-sleep-tucked-pixel.png`、`etokichi-sleep-covered-pixel.png`、`etokichi-sleep-kicked-pixel.png` | 布団まわりの寝姿3点。輪郭の段差が大きく、陰影が平坦。 |
| 中 | `etokichi-window-nap-star-book-pixel.png` | 窓辺・クーンちゃん枕で共用する寝姿。本や輪郭が粗い。 |
| 中 | `decor-cat-sofa-curled-compact-pixel.webp` | ソファーのクーン。原素材60×75pxを120×150pxへ拡大しており、通常姿より輪郭が粗くぼやける。 |
| 低 | `etokichi-sleep-pixel.webp` | 既定の寝姿。新しい寄りかかり寝姿より輪郭が太いが、上記ほど目立たない。 |

タツヲ4点・マサハル・sunagimo・通常のクーンは十分に細かな描き込みがあり、優先的な描き直しは不要と判断した。

## 旧素材の制作記録

組み込みimagegenで旧画像を外見参照に描き直した。モデル名はツールから公開されていない。

- 原素材: `assets-src/mimizou-pixel.png`
- 配信素材: `public/assets/mimizou-pixel.png`
- どちらも承認済み画像の透明な外周余白を除いた93×97px透過PNG。表示高さは48.5。
- imagegenの出力には市松模様が焼き込まれていたため、ユーザーの許可を得てPillowで外周につながる背景を除去し、本体から離れたドットと明るい縁のノイズを除去した。白い目・羽は保持した。
- 承認時は144×144px画像を表示高さ72で使用していた。後から透明部分だけを切り取り、本体のピクセル・表示サイズ・位置を維持した。元画像へ戻した画素データとの完全一致を検証済み。
- 切り取り範囲は左30・上29・右123・下126。夜空の足元を(102.25, 117)、窓辺の中心を(51.25, 62.75)へ合わせ直した。吹き出し専用の余白補正は不要になった。

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
