# sunagimoの画像制作

エトキチの外見では、腰を囲んで左右へ張り出す金色の輪っかを必ず保持する。新しい表情・ポーズを作る場合も全コマと図鑑で確認する。基準画像は `assets-src/etokichi-walk-pixel-v2.webp`。

- 方式: imagegenスキルの組み込みツール
- 参照: [sunagimo](https://minerva.mamansoft.net/Notes/sunagimo)
- 原画: `assets-src/sunagimo-grill-pixel.webp`
- 部屋用: `public/assets/sunagimo-grill-pixel.webp`、192×192、2列×2行、1コマ論理48×48
- 図鑑用: `public/assets/collection/sunagimo-grill.webp`、1024×1024

透明背景を依頼した初回出力は、アルファのない市松模様だった。原画にはマゼンタ背景を使う。現在は素材変換時に背景を透過してからLanczosで縮小し、白い顔や灰紫色を保持したアルファ付きWebPを保存する。

## エトキチのリアクションへの差し替え

### 画質の確認と改善

2026-09-11に部屋表示と図鑑の拡大表示を確認した。部屋用は大きな原画をnearestで縮小しており、とくにエトキチの星の輪郭にギザつきがある。細かなマサハルの寝姿と比べると粗さが残る。

旧図鑑は512×512で、スマホ360px・PC506px表示では細部を判別できたが、キャラクターの太い線と平坦な陰影に画風差があった。タダシの改善指示を受け、部屋用の2素材と図鑑を組み込みimagegenで再制作した。細い茶色の輪郭と細かな陰影へ揃え、部屋用は縮小前に透過してLanczos縮小、図鑑は1024×1024で保存する。ポーズ・コマ割り・串の3片・エトキチの腰の輪っかを保持した。
### 部屋用エトキチの画質改善プロンプト

参照: `assets-src/etokichi-watching-sunagimo-pixel.webp`、`public/assets/etokichi-sleep-leaning-pixel.webp`

```text
Edit image 1 sprite sheet. Preserve all THREE cells and poses, exact placement, scale, baseline, yellow five-point star identity, hands, feet, pink cheeks, and GOLDEN WAIST ORBIT RING in every frame. Refine rendering to the fine detailed small-pixel shading and thin warm brown contour of reference 2. Eliminate chunky black outlines and large flat pixel blocks; delicate gold shading with restrained fine pixel texture. Retain leftward gaze and empty hands, curious / delighted / closed eyes applauding reactions in same order. Canvas 3:1 horizontal, exactly three equal cells, no clipping. Keep pure flat #ff00ff background, no checkerboard, no text or other characters.
```


### 部屋用sunagimoの画質改善プロンプト

参照: `assets-src/sunagimo-grill-pixel.webp`、`public/assets/masaharu-sleep-pixel.webp`

```text
Edit image 1 sprite sheet. Preserve exact sunagimo identity, round gray lavender grooved body, ivory face, brown eyes, blush cheeks, yellow feet and skewer with THREE meat pieces. Preserve all FOUR poses, same positions, baseline and size in 2x2 equal cells. Reference 2 is only fine pixel density and thin warm brown outline guidance; do not add the dog. Refine chunky outlines to thin nuanced contours, subtle small-pixel shading, finely shaded meat and body, no large flat pixel blocks. Keep all expressions and gestures and symbols as source. 1:1 square canvas, pure uniform #ff00ff background, no checkerboard or grid lines.
```


### 図鑑の画質改善プロンプト

参照: `public/assets/collection/sunagimo-grill.webp`、`public/assets/collection/window-nap.webp`

```text
Refine image 1 collectible illustration into finely detailed pixel art at 1024x1024. Reference 2 shows desired small pixel grain and detailed room rendering. Preserve exact scene composition, characters, evening kitchen, stove, pot, furniture and lighting. Sunagimo gray lavender grooved round body and ivory face proudly shows a skewer with exactly THREE pieces, yellow star Etokichi looking toward friend applauding with EMPTY hands and complete GOLDEN WAIST ORBIT RING. Thin nuanced dark brown outlines matching background, fine small-pixel shading on characters and furnishings, eliminate large stair-step blocks and thick black character outlines. Match character rendering detail to the room. No text, no added characters or utensils. Do not just upscale chunky source; reconstruct finer details.
```

### リアクション

調理アニメーションを専用の3コマへ差し替えた。sunagimoが串を確かめる間は見守り、目を輝かせると喜び、串を見せると手を合わせて笑う。sunagimoの現在コマを参照して同期する。図鑑のスプーンも除き、同じ役割へ揃えた。

- 方式: 組み込みimagegen
- 原画: `assets-src/etokichi-watching-sunagimo-pixel.webp`
- 部屋用: `public/assets/etokichi-watching-sunagimo-pixel.webp`、360×120
- 図鑑用: `public/assets/collection/sunagimo-grill.webp`

### 専用リアクションのプロンプト

```text
Use case: stylized-concept. Make a NEW dedicated Etokichi reaction sprite sheet, using reference only for exact character identity and pixel art style. Horizontal 3:1 canvas, 1536x512, exactly THREE equal square cells. In every cell Etokichi stands at same scale, same feet baseline near bottom and same center, facing three-quarter LEFT toward a shorter friend just offscreen left. Etokichi is the yellow FIVE POINT STAR-headed little character with small yellow body, rounded tiny hands and feet, black eyes and orange pink cheeks. All three poses have EMPTY HANDS. Frame 1: quietly looking down-left at friend's skewer, attentive curious smile, arms relaxed. Frame 2: delighted surprised smile, leans slightly toward friend, hands near chest. Frame 3: eyes smiling closed, laughing warmly at friend, hands together in a small happy applause. Simple subtle reaction, NOT cooking. NO cookware, NO utensils, NO food, NO other character, NO table, NO letters, NO speech bubbles, NO symbols. Match reference's chunky crisp restrained pixel shading, no new accessories. Background uniform flat pure #ff00ff magenta for runtime chroma key, no checkerboard, no gradient. Leave clear padding around every sprite, no grid lines. Character occupies about 85% height in each square cell.
```

### 図鑑修正のプロンプト

```text
Use case: precise-object-edit. Edit this collectible pixel art illustration ONLY the yellow star Etokichi character: remove the wooden spoon from his hands, show him with empty hands together in delighted applause, turn his star face and joyful gaze toward sunagimo on his LEFT. Etokichi is watching his friend and reacting, not cooking. Preserve sunagimo exactly, its skewer with three meat pieces, whole room, pot, furniture, warm evening lighting, composition and pixel art style. No other changes, no text.
```

## 輪っかの復元

専用リアクションの初回生成で欠けた腰の輪っかを、歩行シートを参照して全3コマと図鑑へ戻した。組み込みimagegenで修正し、同じ原画・部屋用・図鑑用パスへ反映した。

### スプライト修正のプロンプト

```text
Use case: precise-object-edit. Image 1 is the EDIT TARGET, a three-cell Etokichi reaction sprite sheet. Image 2 is the REFERENCE for Etokichi's missing signature WAIST RING. Add the same thin golden yellow oval Saturn-like hoop encircling Etokichi horizontally around the WAIST in ALL THREE cells of image 1. The ring has a pale cream highlight and dark brown pixel outline, extends beyond both sides of torso, its front arc passes in front of lower belly and back arc behind body, exactly as shown in reference image 2. This is a waist orbit ring, NOT a halo above the head and NOT a belt tight against body. Keep ALL existing poses, leftward gaze, expressions, hands, feet, character size, cell layout, canvas aspect ratio and flat magenta #ff00ff background unchanged. Only add the missing waist ring. No other additions, no cookware, no text. Crisp matching pixel art.
```

### 図鑑修正のプロンプト

```text
Use case: precise-object-edit. Image 1 is the EDIT TARGET. Image 2 is reference for the yellow star Etokichi character's signature WAIST RING. Add ONLY the missing thin golden yellow oval ring encircling Etokichi's waist horizontally, as reference image 2: a Saturn-like hoop projecting beyond torso on both sides, creamy golden highlight and dark outline, front arc across lower belly, back arc behind body. NOT a head halo, not a tight belt. Preserve image 1 absolutely everywhere else: joyful Etokichi looking left and clapping with empty hands, sunagimo with 3-piece skewer, all furniture and pot and room lighting and pixel-art style. Do not reposition or resize characters. No other changes or text.
```

## 初回制作のプロンプト

### スプライト

```text
Use case: stylized-concept. Create a game pixel-art sprite sheet of sunagimo, faithful to reference image 1. Square 1024x1024 canvas divided into exactly 2 columns and 2 rows of equal 512x512 cells. Four full-body poses in reading order: 1 seriously inspecting handheld skewer; 2 rotating the skewer horizontally checking its other side; 3 sparkling happy eyes at perfect doneness; 4 proudly presenting the skewer toward viewer right to a friend outside the image. Maintain exact character identity: squat round grey lavender gizzard body with shallow vertical grooves, ivory face, dark glossy brown eyes, blush cheeks, tiny mouth, short arms, two yellow oval feet, wooden skewer with exactly THREE glossy brown meat pieces. NO ears, tail, clothes or additional character. Restrained crisp pixel art appropriate to a 48px game sprite with dark outlines, same body scale and foot baseline in all 4 equal cells, plenty of padding. No text, logos, borders, hearts or extraneous floating symbols. Background genuinely transparent with alpha, no checkerboard.
```

### 背景修正

```text
Use case: precise-object-edit. Preserve all FOUR sunagimo character poses and their exact geometry, same 2x2 grid layout, same colors, positions and scale. Replace only ALL checkerboard background with a uniform flat solid pure magenta RGB(255,0,255), hex #ff00ff. No checker pattern anywhere, no gradients, no shadows outside character silhouettes. Do NOT change any character or skewer pixels. This magenta is a game sprite color-key backing.
```

### 図鑑イラスト

```text
Use case: illustration-story. Create a square pixel-art collectible illustration for a cozy room game. Image 1 is exact sunagimo character reference, image 2 is room mood and exact yellow star Etokichi character style. Evening warm light in the small apartment kitchen. Sunagimo and Etokichi stand side by side preparing dinner. Sunagimo proudly holds up its skewer with exactly THREE browned meat pieces, bright delighted eyes, Etokichi laughs warmly at the earnest cooking inspector. Sunagimo retains round grey lavender grooved gizzard body, cream face, brown eyes, pink cheeks, yellow oval feet, short arms, no ears/tail/clothing. Etokichi retains yellow five-point STAR head, small yellow body, orange cheeks, no ears, no hat. Coherent pixel art matching room reference; make both characters equally legible in center foreground, sunagimo slightly smaller than Etokichi. Existing kitchen stove and simmering pot at right; no new fire or grill in room. Warm sunset window, wooden furniture, comfortable domestic mood. No text or speech bubbles, no logo. 1024x1024.
```
