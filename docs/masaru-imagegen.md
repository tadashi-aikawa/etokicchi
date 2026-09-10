# マサル「ひなたを半分こ」の画像制作

組み込みimagegenで制作した、最初から二人が寄り添って眠る一枚絵。マサルの茶白の毛並み、白い口元、巻きしっぽ、赤い首輪、エトキチの星形と腰の輪っかを保持する。

- 原画: `assets-src/etokichi-masaru-sleep-pixel.webp`
- 部屋用: `public/assets/etokichi-masaru-sleep-pixel.webp`
- 図鑑: `public/assets/collection/masaru-sunbeam.webp`

部屋用は216×144、論理108×72。図鑑は512×512。原画からの機械変換は `pnpm assets:normalize` を使う。部屋用の縮小は周囲の素材と同じLanczosにし、描画時はnearestでゲーム全体のドットを揃える。

初版の3コマは太い輪郭と大きなドットで生成し、nearestで縮小したため、家具やクーンちゃんより粗く見えた。細かな毛並みと控えめな輪郭で寝姿を再制作し、旧3コマと18秒の動きを撤去した。位置・姿・大きさは変化させない。

原画の背景はマゼンタ。 `chroma-key-texture.ts` で部屋生成時に一度だけ透過へ焼き込み、部屋の破棄時に解放する。

## 寝姿のプロンプト

参照1は図鑑画像の二人の外見と寄り添う構図、参照2は `decor-cat-loaf-pixel.webp` の画風と粒度。

```text
Use case: stylized-concept. Create ONE stationary game sprite showing BOTH friends already sleeping cuddled together. Reference 1 identifies Masaru the tan and white dog and Etokichi the yellow five-point star, and their close sleeping composition. Reference 2 is the EXACT desired fine detailed game pixel-art rendering density and subtle brown contour style, NOT a character to add. Render at same refined pixel art fidelity as reference 2: small fine pixels, delicate fur shading, thin nuanced brown contours, avoid chunky black stair-step outline or large pixel blocks. Masaru on LEFT lies belly down with eyes fully CLOSED, cream white muzzle and paws, tan fur, triangular ears, curled fluffy tail, RED collar. Etokichi on RIGHT sleeps with eyes fully CLOSED and a small closed relaxed smile, head leaning against Masaru's shoulder; preserve yellow FIVE POINT STAR silhouette, pink cheeks, small yellow hands and feet, thin golden Saturn-like oval WAIST RING extending beyond both sides of body. No open mouth or wide smile. They TOUCH naturally and are already asleep; no animation frames, no panels, no grid. One coherent full-body pair, 3:2 wide canvas, comfortable padding, whole pair occupies 88 percent width and 85 percent height, feet baseline consistent, subtle 3/4 elevated RPG view. No room, furniture, cushion, floor, cast shadow, text, letters, Z symbols or other characters. Background absolutely flat pure solid #ff00ff magenta for chroma key, no checkerboard or texture. Don't put magenta into the characters. Do not imitate the coarse outline of reference 1, use fine rendering of reference 2.
```

## 図鑑イラストのプロンプト

```text
Use case: illustration-story. Square collectible pixel art illustration for cozy room game, no text. Image 1 references ONLY LEFT dog Masaru: tan white Akita-like plush dog, white face muzzle chest paws, triangular ears, curled fluffy tail, RED collar. Do not include owl. Image 2 defines exact Etokichi yellow FIVE POINT STAR character, orange pink cheeks, tiny yellow limbs and thin golden oval SATURN WAIST RING extending outside both sides of torso; must visibly preserve waist ring. Image 3 room mood reference only; replace its book-reading action with requested moment. Scene: warm midday sun streams from a wooden window into a cozy wooden-floor room. Masaru is lying belly down on LEFT, closed gentle eyes, forepaws extended. Etokichi sits RIGHT closely beside Masaru, leaning slightly against fluffy shoulder, closed sleepy smiling eyes. They share one broad patch of sunshine, feeling safe and peaceful. Both full bodies readable, roughly equal importance, characters central foreground. Soft green cushion under Etokichi optional, no book, no toy, no food, no other characters, no speech bubbles, no Z symbols. Crisp coherent chunky pixel art with dark outlines and restrained warm shading. Warm green curtains, bookshelf in background, enough breathing space. Ring around waist, NOT halo.
```

## 描画の参照資料

- [PixiJS FederatedMouseEvent](https://pixijs.download/release/docs/events.FederatedMouseEvent.html): 一枚絵のローカル座標で左右のキャラへのタップを分ける。
