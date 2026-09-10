# sunagimoの画像制作

- 方式: imagegenスキルの組み込みツール
- 参照: [sunagimo](https://minerva.mamansoft.net/Notes/sunagimo)
- 原画: `assets-src/sunagimo-grill-pixel.webp`
- 部屋用: `public/assets/sunagimo-grill-pixel.webp`、192×192、2列×2行、1コマ論理48×48
- 図鑑用: `public/assets/collection/sunagimo-grill.webp`、512×512

透明背景を依頼した初回出力は、アルファのない市松模様だった。組み込みツールで背景だけをマゼンタへ変更した原画を保存し、部屋の生成時にGPUで背景を透過へ一度焼き込む。キャラクターの白い顔や灰紫色は保持する。4コマはこのテクスチャを共有し、部屋を閉じると破棄する。

## プロンプト

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

