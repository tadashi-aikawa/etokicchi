# エトキチのドット密度

歩行・日常動作には、部屋やクーンちゃんより太い輪郭と大きな陰影の段差が残っていた。配信素材の寸法は既に表示論理寸法の2倍で揃っており、表示倍率ではなく原画の描き込みの差だった。

組み込みimagegenで19素材を描き直した。星の形・表情・行動・腰の輪っかを参照し、輪郭を細い茶色へ、陰影を細かな粒度へ揃えた。ゲーム内の表示寸法・配置・アニメーションのコマ数と速度は変更していない。図鑑の一枚絵は今回の対象に含めない。

## 保存先と変換

原画は `assets-src/`、配信素材は同名の `public/assets/` に保存する。

| ファイル | コマ割り |
| --- | --- |
| `etokichi-walk-pixel-v2.webp` | 3列×4行 |
| `etokichi-breakfast-pixel.webp` | 3列×1行 |
| `etokichi-brushing-maine-coon-pixel.webp` | 3列×1行 |
| `etokichi-folding-laundry-pixel.webp` | 3列×1行 |
| `etokichi-mimizou-farewell-pixel.webp` | 3列×1行 |
| `etokichi-morning-stretch-pixel.webp` | 3列×1行 |
| `etokichi-morning-tea-pixel.webp` | 3列×1行 |
| `etokichi-muddy-return-pixel.webp` | 3列×1行 |
| `etokichi-night-snack-pixel.webp` | 3列×1行 |
| `etokichi-old-toy-pixel.webp` | 3列×1行 |
| `etokichi-overslept-pixel.webp` | 3列×1行 |
| `etokichi-packing-pixel.webp` | 3列×1行 |
| `etokichi-planning-day-floor-pixel.webp` | 3列×1行 |
| `etokichi-reading-comics-sofa-right-pixel.webp` | 3列×1行 |
| `etokichi-troubled-pixel.webp` | 3列×1行 |
| `etokichi-watching-pot-up-right-pixel.webp` | 3列×1行 |
| `etokichi-watching-stars-pixel.webp` | 3列×1行 |
| `etokichi-watering-directions-pixel.webp` | 3列×2行 |
| `etokichi-comforting-maine-coon-pixel.webp` | 単体 |

初回の透明背景指定は市松模様を生成したため不採用。マゼンタの単色背景へ修正し、原画をロスレスWebPとして保存した。`pnpm assets:normalize` は縮小前に背景を透過してからLanczosで配信寸法へ変換する。歩行も透過後に12コマを検出し、従来の足元補正とセル境界検査を適用する。

## 生成プロンプト

画像1は差し替え前の同名原画、画像2は `public/assets/decor-cat-loaf-pixel.webp`。お茶の初回は `public/assets/etokichi-sleep-leaning-pixel.webp` を画風参照にした。

### 日常動作の共通指定

```text
Use case: style-transfer. Image 1 is EDIT TARGET, a THREE-frame game sprite sheet. Image 2 is only fine pixel density and thin warm brown contour reference. Redraw target into fine detailed pixel art: delicate warm brown outlines, smaller pixel steps and subtle golden shading replacing chunky black edges and large flat blocks. NOT just an upscale. Preserve all THREE poses, gestures, expressions, proportions, identity, original props and exact layout within three equal cells, SAME relative character SIZE and foot baseline as target, no cropping. Yellow five-point STAR Etokichi with pink cheeks, small yellow body and hands and feet and golden Saturn-like WAIST RING projecting sideways in EVERY frame, also where partly hidden. Keep original action, orientation, props, no additions. Cat reference is STYLE ONLY, do not add a cat. Landscape 3:1 high resolution sheet, exactly 3 columns 1 row. ALL backdrop must be uniform pure RGB(255,0,255) #ff00ff magenta for chroma key, INCLUDING gaps inside rings and between limbs. NO checkerboard, no gradients on backdrop, no ground shadow, no text or grid.
```

水やりは上記の3コマを6コマ、3:1を3:2、1行を2行へ変更して以下を追加した。

```text
Preserve EXACT TWO orientations: top row facing LEFT pouring toward lower left, bottom row facing FRONT pouring down. Preserve SIX frames and watering can and blue water droplets, every relative center and baseline.
```

### 歩行

```text
Use case: style-transfer. Edit image 1 walk sprite sheet for game. Reference 2 and 3 are ONLY desired fine pixel density and delicate thin warm brown contours; do NOT include cat or sleeping pose. Preserve exact Etokichi yellow five-point star identity, pink cheeks, expressive eyes, proportions, golden Saturn-like WAIST RING projecting on both sides in EVERY frame, all TWELVE poses in 3 columns by 4 rows: front, left, right, back. Alternate steps, middle standing. Same composition, full body positions, consistent character size and baseline per row, generous separated empty padding, no clipping. Redraw chunky black stair-step contours as thin nuanced brown outlines and much finer pixel steps; subtle finely detailed golden shading, NOT a simple upscale, NOT thick blocky retro pixels. Fine coherent pixel art matching detailed furniture and cat. Portrait 2:3 canvas at high resolution. No text, no grid, no extra elements. Keep front wink expressions and all original poses.
```

画像3は `public/assets/etokichi-sleep-leaning-pixel.webp`。歩行とお茶で生じた市松背景は、キャラと小物を保持し、外側と輪っか・手足の隙間を単色 `#ff00ff` に置換する追加編集で除去した。

### クーンちゃんを抱きしめる

```text
Use case: style-transfer. Image 1 is edit target, a SINGLE game sprite of yellow star Etokichi comforting brown Maine coon cat, arms holding cat exactly as reference. Image 2 is ONLY fine pixel density and thin warm brown outline reference for cat. Keep SINGLE sprite composition, identical poses and eyes and proportions, little star character behind LEFT and curled brown cat facing front at RIGHT, same bounding box, waist ring, all limbs, ear tufts and fluffy striped cat tail. Redraw in much finer pixel steps and delicate warm brown contours, fine gold shading, fine nuanced brown fur, eliminate chunky blocks and thick black outlines. Preserve the frightened cat's expression and Etokichi reassuring expression. High resolution landscape with same 142:104 aspect ratio. All backdrop is pure uniform RGB(255,0,255) #ff00ff magenta for chroma key, no checkerboard, shadows, new props or text. No other characters, no sheet or variants.
```

初回で輪っかが白い襟になったため、歩行シートを参照して追加修正した。

```text
Precise correction to image 1 only. Etokichi's broad WHITE collar is wrong. Change it into his thin GOLDEN YELLOW Saturn-like orbit ring, matching the waist ring in reference 2, around his body at waist height with front arc across lower belly and sides projecting out. Cat partly occludes its right side. No white collar, no scarf, no clothing, gold highlight only. Preserve entire image otherwise EXACTLY: finely drawn pixel art, Etokichi star shape and face, hands reassuring cat, cat identity and fur and pose, whole composition and framing and all coordinates and size and magenta background. Do not include any other sprites or alter pixel density.
```

## 検証

- 歩行の正面中央コマで、星上側の暗い外縁の水平幅を同じ条件で計測。平均4.83pxから1.75pxへ減少した。輪郭の太さを比較する指標であり、全素材のドット密度を一律に表す数値ではない。[^outline]
- 19素材・計67コマを配信寸法で検分。
- 全29シーンを390px幅で撮影。お茶・水やり・ブラシ・抱擁・漫画・星見は360pxと1280pxでも撮影し、実行時例外なし。
- `tests/character-asset-quality.spec.ts` で背景色の残留、セル境界の切れ、空白コマを検査。既存の素材寸法テストとあわせて511テスト・型検査・整形・本番ビルドが成功。既存Lint警告3件。
- 素材変換を再実行し、エトキチの配信WebPのSHA-256が全件一致。みみぞうのPNGは既存の変換でも再圧縮差分が出るが、デコード後の画素は同一のため差分を除外した。

撮影にはChrome DevTools Protocolを使用した。APIは公式の [Page.captureScreenshot](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot) と [Runtime.evaluate](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-evaluate) で確認した。Context7はライブラリを解決できたが、続くドキュメント取得でネットワークエラーとなったため公式ドキュメントを参照した。

[^outline]: 配信画像の正面中央セル96×104内で、上端から12〜47行目の左右計72本を走査。アルファ128以上の外縁から、輝度 `0.2126R + 0.7152G + 0.0722B` が100未満の連続画素数を集計した。水平幅には斜辺の角度と陰影も影響する。
