# マサル「ひなたを半分こ」の画像制作

組み込みimagegenで制作した。写真の左の犬を外見の参照とし、右のフクロウは登場させない。マサルの茶白の毛並み、白い口元、巻きしっぽ、赤い首輪を保持する。エトキチは星形の輪郭と腰から左右へ張り出す金色の輪っかを全コマで確認する。

- マサル原画: `assets-src/masaru-sunbeam-pixel.webp`
- エトキチ原画: `assets-src/etokichi-with-masaru-pixel.webp`
- 部屋用: `public/assets/masaru-sunbeam-pixel.webp`、`public/assets/etokichi-with-masaru-pixel.webp`
- 図鑑: `public/assets/collection/masaru-sunbeam.webp`

部屋用は各360×120、横3コマ、1コマの論理サイズ60×60。図鑑は512×512。原画の機械変換は `pnpm assets:normalize`、図鑑はcwebpのlossless変換を使用した。

マサルへの透過指定はアルファを持たない市松模様になったため、画像ツールで背景だけをマゼンタに直した。エトキチも同じ単色背景に統一し、既存のGPU透過処理を `chroma-key-texture.ts` へ改名して共有する。生成時に一度だけ透過へ焼き込み、部屋の破棄時に解放する。

## マサルの3コマ

```text
Use case: stylized-concept. Game pixel art sprite sheet, wide 3:1 canvas with exactly THREE equal square cells in one row. Image 1 references ONLY the dog on the LEFT, Masaru: plush-like tan-and-white Akita dog, triangular ears, white forehead blaze and muzzle, black small eyes and nose, white chest and paws, curled fluffy tail, red collar. Ignore owl entirely. Image 2 reference for crisp chunky outlined pixel art style only. Draw ONLY Masaru in all three cells, three-quarter facing RIGHT toward a friend offscreen. Same scale and bottom baseline, dog occupies 80 percent cell width and 70 percent height. Frame 1 sits upright looking gently right, slightly shifted toward left to make space. Frame 2 lying comfortably belly down, forepaws forward, gentle half-closed eyes, looking right. Frame 3 same lying position, fully sleepy closed eyes and relaxed head resting lower on paws, curled tail visible. Maintain tan white markings and red collar in ALL frames. True transparent alpha background, no checkerboard, no furniture, no floor, no text, no symbols, no props. Full silhouette padding inside each equal cell.
```

## 背景の修正

```text
Use case: precise-object-edit. Keep all three Masaru dog sprites EXACTLY as reference, same canvas and equal three-cell layout, poses, markings, scale, red collars and pixel edges. Replace ONLY the entire gray checkerboard backing with uniform pure solid #ff00ff magenta. No checkerboard remaining, no gradients or shadows on background. Do not change dog pixels. This is a chroma-key sprite sheet.
```

## エトキチの3コマ

```text
Use case: stylized-concept. Create NEW Etokichi pixel art reaction sprite sheet. Wide 3:1 canvas, exactly THREE equal square cells in one horizontal row. Reference image only defines exact character identity: yellow FIVE POINT STAR shaped head/body, black eyes, pink orange cheeks, tiny yellow arms and feet, thin golden oval SATURN WAIST RING extending beyond both sides of lower body. Ring MUST be visible in ALL three cells; NOT halo above head, NOT belt. Etokichi seated on floor, three-quarter facing LEFT to dog friend offscreen. Frame 1: sitting upright smiling softly at friend, hands resting by legs. Frame 2: seated, relaxed, gently leaning left toward friend, eyes half closed. Frame 3: same seat, closed eyes with head nodding sleepily, hands relaxed. EMPTY HANDS. Keep same size and bottom baseline, 80 percent cell height, ample padding. Crisp chunky restrained pixel shading dark brown outlines as reference. Background flat solid pure #ff00ff magenta for chroma key, absolutely no checkerboard. No dog, owl, furniture, floor, books, accessories, text, symbols, speech bubbles.
```

## 図鑑イラスト

```text
Use case: illustration-story. Square collectible pixel art illustration for cozy room game, no text. Image 1 references ONLY LEFT dog Masaru: tan white Akita-like plush dog, white face muzzle chest paws, triangular ears, curled fluffy tail, RED collar. Do not include owl. Image 2 defines exact Etokichi yellow FIVE POINT STAR character, orange pink cheeks, tiny yellow limbs and thin golden oval SATURN WAIST RING extending outside both sides of torso; must visibly preserve waist ring. Image 3 room mood reference only; replace its book-reading action with requested moment. Scene: warm midday sun streams from a wooden window into a cozy wooden-floor room. Masaru is lying belly down on LEFT, closed gentle eyes, forepaws extended. Etokichi sits RIGHT closely beside Masaru, leaning slightly against fluffy shoulder, closed sleepy smiling eyes. They share one broad patch of sunshine, feeling safe and peaceful. Both full bodies readable, roughly equal importance, characters central foreground. Soft green cushion under Etokichi optional, no book, no toy, no food, no other characters, no speech bubbles, no Z symbols. Crisp coherent chunky pixel art with dark outlines and restrained warm shading. Warm green curtains, bookshelf in background, enough breathing space. Ring around waist, NOT halo.
```

## 描画の参照資料

- [PixiJS AnimatedSprite](https://pixijs.download/release/docs/scene.AnimatedSprite.html): フレーム停止・選択と破棄を確認。Context7ではPixiJS本体の該当資料を取得できなかったため、公式APIと導入済みの型定義を参照した。
