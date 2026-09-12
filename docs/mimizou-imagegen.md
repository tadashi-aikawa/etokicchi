# みみぞうの画像生成記録

## 現行素材: 歩行用12コマと静止コマ

外見の基準はタダシが新たに指定した [デザイン参照](assets/mimizou-design-reference.png)。大きな縦長の白目、下寄りの小さな瞳、丸い体、灰色の腹部の斑点、短い黄色の足を保持し、組み込みimagegenで4方向の歩行素材を制作した。

| ファイル | 用途 |
| --- | --- |
| `assets-src/mimizou-pixel.png` | 1086×1448pxの原画。3列×4行、単色マゼンタ背景 |
| `public/assets/mimizou-walk-pixel.webp` | 夜のおさんぽの歩行用。288×416px、各コマ96×104px |
| `public/assets/mimizou-pixel.png` | 現行シーン用の正面静止コマ。93×97px |

- 行は正面・左・右・後ろ。列は左足の一歩・静止・右足の一歩。
- 歩行ループは列0→1→2→1。プレビューでは1コマ160ms。停止は各行の中央コマ。
- 足元アンカーは中央下。歩行シートの足元はセル下端から4px上を基準とし、歩幅の差を残して行ごとに整列する。
- `pnpm assets:normalize` は透過後に列ごとの4つの不透明帯を検出し、全12コマ共通倍率でセルへ収める。既存エトキチの変換倍率は変えない。
- 静止PNGは同じ原画の正面中央コマから、左394・上41・幅298・高さ300を切り出して生成する。
- 訪問・見送り・星見は静止PNGを継続使用する。新しい「みみぞうの夜のおさんぽ」では歩行WebPを使い、未使用素材チェックの例外から外した。

[歩行プレビュー](http://127.0.0.1:4173/etokicchi/docs/mimizou-walk-preview.html) は開発サーバー上で開く。4方向の歩行と各方向の静止を比較できる。

### 生成プロンプト

検証は12コマの境界・空白・透過検査と歩行プレビューの全方向全コマ、訪問・見送り・星見・ソファーのクーンを390px幅と1280px幅で確認した。星見のみみぞうのタップで本人のフキダシが出ることも確認。523テスト・型検査・整形・ビルド成功、既存Lint警告3件。素材変換を再実行して対象3素材と既存エトキチ歩行シートのSHA-256が一致した。

画像1が新しいデザイン参照、画像2は `decor-cat-loaf-pixel.webp` を画風参照として使用。

```text
Use case: identity-preserve, game sprite sheet. Image 1 is the ONLY character design reference: Mimizou the grey round owl. Image 2 is ONLY desired fine pixel-art texture/density, not a subject. Create a production WALK CYCLE sheet of Mimizou: EXACTLY 3 equal COLUMNS by 4 equal ROWS, TWELVE full-body sprites, portrait 3:4 sheet. Row 1 facing FRONT/down. Row 2 pure LEFT side profile. Row 3 pure RIGHT side profile. Row 4 BACK view facing away. In EACH row columns are left-foot step, neutral standing with both feet level, right-foot step. Compact waddling terrestrial walk, wings stay folded against sides, slight alternating foot lift and tiny body sway, no flying or hopping. Keep consistent body size, proportions, center and foot baseline in every cell; generous equal clear margins within cells, no touching cell edges. Reference design MUST remain identifiable: broad near-round grey body with large charcoal-grey head/face, TWO BIG VERTICAL OVAL off-white eyes with very small black pupils low/inward, small leaf-shaped yellow beak, light-grey lower belly with sparse dark blue-grey oval feather spots, folded grey side wings, tiny yellow three-toed feet. Head/belly proportions, eye shape and placement, expression, grey palette and broad round outline MUST match image 1, not a generic owl. Back and side views use the same body proportions, dark grey back with subtle feathers, folded wings, no extra tail or accessories. Crown has only reference's small flat feather tips, no horns/ear tufts. Deliberate FINE PIXEL ART with tiny nuanced grey shade clusters and thin subtle charcoal contour matching detailed game assets; not smooth vector, not painterly blur, not chunky black borders. Single sprite sheet only, no text, labels, grid lines, shadows or extra characters. Every backdrop/gap is uniform pure RGB(255,0,255) #ff00ff MAGENTA for chroma key, including between toes. Front CENTER neutral sprite will also be used as the current static game character. Make that sprite especially faithful to the reference.
```

### 横向きの方向修正

最初の生成では横向きの3列目が逆を向いたため修正した。

```text
Precise sprite sheet correction. Keep entire existing 3-column 4-row sheet EXACTLY unchanged except TWO cells: row 2 column 3 and row 3 column 3. Row 2 column 3 incorrectly faces RIGHT: redraw it facing LEFT, matching row 2 columns 1 and 2, as opposite walking foot phase to row 2 column 1. Row 3 column 3 incorrectly faces LEFT: redraw it facing RIGHT, matching row 3 columns 1 and 2, opposite walking foot phase to row 3 column 1. Every sprite in row 2 must look LEFT (beak on left). Every sprite in row 3 must look RIGHT (beak on right). Keep all other TEN cells exactly unchanged. Preserve the owl design, pixel art, body size, magenta background, all grid positions and margins. No added cells/text, no layout shifts. This is a WALK LOOP, each row's direction must stay constant through three frames.
```

### 左右の足の位相修正

横向きの1列目と3列目が同じ足を上げていたため、3列目では反対側の足を上げるよう修正した。

```text
Surgical correction to FEET ONLY of two sprites in this 3-column, 4-row sheet. Row 2 column 3 faces LEFT: its LEFTMOST foot by beak must now be firmly planted LOWER on the shared floor baseline, while its RIGHTMOST foot near rump must be lifted UP visibly by about one foot-height. Row 3 column 3 faces RIGHT: its RIGHTMOST foot by beak must now be firmly planted LOWER on baseline, while its LEFTMOST foot by rump must be lifted UP visibly. These two cells currently repeat the first column's step and need the OPPOSITE foot lifted. DO NOT change bodies, eyes, wings, size, orientation, positions, spacing, colors or any pixels in other TEN cells. Keep pure #ff00ff background and exact 3x4 layout. The two corrected poses must clearly lift the BACK foot instead of the FRONT foot, without adding feet. Keep both feet attached beneath body, no shadows.
```

## 旧版: 小さいオリジナルからフォルムを復元

前回は既存ドット絵を外見参照にしたため、オリジナルから形が離れていた。タダシから提供された [オリジナル画像](assets/mimizou-original.png) を外見の正本に切り替え、組み込みimagegenで描き直した。

- 縦長の白目と下寄りの小さい瞳、大きな顔、浅い灰色のお腹、体の輪郭に沿った羽を優先した。
- 丸い目、大きな白い胸、左右へ張り出す羽、目の光沢を加えない。
- 原画は `assets-src/mimizou-pixel.png`。1254×1254px、マゼンタ背景。
- 左108・上102から1038×1048pxを切り出し、既存処理で透過して93×97pxへLanczos縮小する。表示寸法と位置は維持する。
- 最初にオリジナルの輪郭・目・腹部の比率を指定して形を再現し、その出力へ次の細密化を施した。

### 最終の細密化プロンプト

```text
Style refinement of this EXACT sprite, preserve its geometry pixel-for-pixel in proportion: same compact egg silhouette, same two tall white eyes with small low pupils, tiny yellow beak, same shallow speckled grey belly and tiny flat yellow feet. Do not change any landmark, pose, expression, anatomy, placement or relative sizes. Replace the large coarse blocky pixel stair steps with MUCH FINER pixel-art clusters and thin subtle grey edges, delicately shaded grey feathers. The drawing should have fine detail at roughly six times current pixel density. NOT a generic owl redesign, not big circular eyes, no large white chest, no wing protrusions or ear tufts, no shiny eye highlights. Keep the muted greys, original small sparse belly spots, and uniform pure #ff00ff magenta background exactly. No grain, no blur, no added features. Same near-square composition and padding.
```

先に挙げた他素材の候補6点もタダシの依頼で対応した。詳細は [寝姿とソファーのクーンの細密化](sleep-sprite-density.md)。

## 不採用版: 既存ドット絵を参照した細密化

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

当初の配信画像の目視比較による優先度。候補報告後に全6点の描き直しが承認され、別途対応した。

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
