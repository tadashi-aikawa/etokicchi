# 寝姿とソファーのクーンの細密化

組み込みimagegenでエトキチの寝姿5点とソファーのクーン1点を描き直した。形・寝相・表情・小物を参照し、輪郭と陰影を細かくした。生成された余白を切り出し設定で調整し、既存の表示寸法と配置を維持する。

原画は `assets-src/`、配信素材は同名の `public/assets/`。背景をマゼンタ単色で生成し、既存の透過処理後にLanczosで縮小する。WebP原画はロスレス保存。

| 素材 | 配信寸法 | 用途 |
| --- | --- | --- |
| `etokichi-sleep-tucked-pixel.png` | 84×60 | 布団から出る寝顔 |
| `etokichi-sleep-covered-pixel.png` | 106×78 | 布団を掛け直した寝姿 |
| `etokichi-sleep-kicked-pixel.png` | 112×78 | 布団を蹴った寝姿 |
| `etokichi-window-nap-star-book-pixel.png` | 144×144 | 窓辺とクーン枕で共用 |
| `decor-cat-sofa-curled-compact-pixel.webp` | 120×150 | ソファーで丸まるクーン |
| `etokichi-sleep-pixel.webp` | 126×84 | 既定の寝姿素材。現行の各寝姿シーンでは専用素材を使用 |

外周の切れを避けるため、元絵が端まで達していた寝顔と掛け直しには約1pxの余白を確保した。ソファーのクーンは60×75pxの拡大から、高解像度原画の縮小へ切り替えた。

## 生成プロンプト

検証では、みみぞう3シーンと寝姿・クーン6シーンを390px幅と1280px幅で撮影した。布団を掛け直す操作後の差し替えも別途確認し、実行時例外なし。既定の寝姿素材は配信画像で検分した。`pnpm check` は522テスト・型検査・整形・ビルド成功、既存Lint警告3件。7素材の変換を再実行してSHA-256が一致した。

画像1は差し替え前の同名配信素材。画像2は `etokichi-sleep-leaning-pixel.webp` を画風参照にした。クーンの画像2だけ `decor-cat-loaf-pixel.webp`。輪っか修正では画像1が直前の生成結果、画像2が `etokichi-walk-pixel-v2.webp`。

### 布団から出る寝顔

```text
Use case: style-transfer. Image 1 is the EDIT TARGET single small game sprite; image 2 is ONLY fine pixel density, golden shading and delicate brown contour reference. Redraw target with much finer clean pixel clusters and thin nuanced warm brown outlines, replace chunky edges and flat yellow areas with delicate golden shading. Preserve target EXACTLY: same five-point yellow star head, pink cheeks, closed sleepy eyes and mouth, same tilted lying pose, same little visible hand, same full silhouette, original proportions and relative placement and empty padding. This is ONLY the head/hand peeking above a separately-rendered blanket: DO NOT add a body, legs, blanket, pillow, bed, waist ring or other parts absent from target. Do not import the pose or anatomy from image 2. Keep target canvas aspect ratio 84:60, character same relative width/height and position, no crop. Background entirely uniform pure RGB(255,0,255) #ff00ff magenta for chroma key, no checkerboard, no ground shadow, no text. One sprite only, high resolution master.
```

### 布団の掛け直し

```text
Use case: style-transfer. Image 1 is EDIT TARGET, one Etokichi game sprite. Image 2 is fine pixel density/shading reference ONLY. Redraw target in fine clean pixel art with delicate warm brown outlines, small golden shade transitions. Preserve EXACT pose and full silhouette: yellow five-point star character lying on back diagonally, closed eyes and relaxed smile, pink cheeks, SAME positions of both little arms and feet, SAME small teal blue blanket draped only across waist, SAME golden Saturn ring at waist wherever visible. Keep cloth shape, color, folds and coverage exactly as target, do not turn it into clothing. Preserve original head/body proportions, pose angle, placement, relative size and canvas aspect ratio 106:78. Do not add bed, pillow, props or characters. No chunky outlines, no large flat blocks, no redesign. High-resolution single sprite. Entire background pure RGB(255,0,255) #ff00ff magenta for chroma key including gaps inside ring/limbs, no checkerboard, ground shadows or text.
```

### 布団を蹴った寝姿

```text
Use case: style-transfer. Image 1 is EDIT TARGET single Etokichi sprite, image 2 is ONLY fine pixel density and warm golden shading reference. Redraw target in fine clean pixel art with delicate thin brown edges, nuanced small golden shading steps. Preserve the exact original star-shaped yellow character, pink cheeks, CLOSED sleeping eyes, mouth, head angle, same lying-on-back spread-limb pose, body proportions and ALL arms and feet, especially the GOLDEN SATURN-LIKE WAIST RING wrapped around belly and projecting sideways. Keep ring, same pose, original silhouette and position. Do not add blanket, pillow, bed, clothing or extra limbs. Do not copy reference 2 pose. Match target canvas aspect ratio 112:78 and original relative character size/margins, no cropping. One high-resolution sprite, uniform pure #ff00ff RGB(255,0,255) magenta backdrop including ring holes and limb gaps, no checkerboard, ground shadows, text or new props. Not a redesign or enlargement of chunky pixel blocks.
```

### 腰の輪っかの修正

```text
Precise correction of image 1 only. Restore Etokichi's essential golden Saturn-like waist ring, matching reference image 2: thin elliptical GOLD ring encircles his small belly below face, projects a little sideways, visible curved front arc, no white collar, not clothing. Keep the sleeping star's current closed eyes, small open mouth, five-point head, pink cheeks, spread arms and legs, original lying pose, size and all coordinates. Fine thin warm brown contours and finely shaded gold, same magenta background, no other changes or subjects. Reference 2 is identity/ring reference only, do not copy its standing poses.
```

### 本を抱えた寝姿

```text
Use case: style-transfer. Image 1 is edit target, a SINGLE game sprite of yellow star Etokichi asleep while holding an open book. Image 2 is ONLY fine pixel density, delicate brown contour, golden shading reference. Preserve image 1 EXACT pose, star head shape and tilt, closed eyes, pink cheeks, relaxed mouth, hands holding the same open brown/tan book across lap, leg positions, small gold Saturn-like waist ring wherever visible, silhouette and overall proportions. Redraw fine clean pixel-art details with thin nuanced warm brown outlines, subtle golden shading and finer book pages/cover edges; eliminate chunky stair steps and harsh thick borders, no blur. Do not introduce cushion, cat, chair or other subjects. Same square canvas, same original relative size and positioning within generous empty margins. Do not copy image 2 pose. Entire background uniform pure RGB(255,0,255) #ff00ff magenta including book/limb gaps, no checkerboard, shadows, text or new props. Single high resolution sprite, no redesign.
```

### ソファーのクーン

```text
Use case: style-transfer. Image 1 is EDIT TARGET a SINGLE brown Maine coon cat sprite curled sleeping on its side diagonally, long fluffy striped tail wraps around body, head at upper right, body/tail extending lower left. Image 2 is ONLY the fine fur detail, clear small pixel clusters and subtle dark brown contour reference of the SAME cat. Redraw image 1 in fine detailed coherent pixel art with crisp finely shaded brown/tan tabby fur, thin nuanced contours instead of blurry enlarged blocks. Preserve EXACT original sleeping pose, head/ear positions, CLOSED eyes, mane, paws, tail path, silhouette, longhaired Maine coon identity, warm tabby colors and original perspective and anatomy. No accessories, blue edge lines, sofa or floor, no different pose. Entire cat fully visible centered at same relative size/location within original portrait aspect ratio 4:5 canvas. Background entirely uniform pure RGB(255,0,255) #ff00ff magenta including all fur gaps, no checkerboard, ground shadow or text. Do not copy image 2 loaf pose. High-resolution single game sprite.
```

### 既定の寝姿

```text
Use case: style-transfer. Image 1 is the EDIT TARGET a SINGLE Etokichi sprite curled sleeping sideways. Image 2 is ONLY fine pixel density, thin warm brown contour and delicate golden shading reference. Redraw image 1 in finely detailed clean pixel art while preserving EXACT pose, star head angle and shape, CLOSED eyes and peaceful smile, pink cheeks, head resting on folded hands, small body curled toward right, feet at far right, original golden Saturn-like ring around waist, body/head proportions and all relative positions. Keep lying SIDEWAYS rather than sitting, keep closed mouth as original, no raised arms or extra limbs. Thin nuanced warm brown outlines, smaller shade steps and finer golden highlights, no coarse blocks or heavy black contours. Preserve canvas aspect ratio 126:84 and target's original relative character scale/margins. No pillow, bed, blanket, text, new props or extra character. Entire background uniform pure RGB(255,0,255) #ff00ff magenta including ring and limb gaps, no checkerboard or ground shadows. High-resolution master, one sprite only.
```
