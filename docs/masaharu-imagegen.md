# マサハル「ひなたを半分こ」の画像制作

組み込みimagegenで制作したマサハルとエトキチの独立した寝姿を重ね、寄り添って眠るシーンを作る。承認済みの細かな画風と、茶白の毛並み・巻きしっぽ・赤い首輪、エトキチの星形と腰の輪っかを保持する。

- マサハル原画: `assets-src/masaharu-sleep-pixel.webp`
- エトキチ原画: `assets-src/etokichi-sleep-leaning-pixel.webp`
- 部屋用マサハル: `public/assets/masaharu-sleep-pixel.webp`、144×112、論理72×56
- 部屋用エトキチ: `public/assets/etokichi-sleep-leaning-pixel.webp`、86×84、論理43×42
- 図鑑: `public/assets/collection/masaharu-sunbeam.webp`、1024×1024

原画からの機械変換は `pnpm assets:normalize` を使う。背景を透過してから余白を除き、Lanczosで縮小する。部屋用WebPはアルファ付きで、そのまま他シーンへ流用できる。描画時はnearestでゲーム全体のドットを揃える。

初版の3コマは太い輪郭と大きなドットで生成し、nearestで縮小したため、家具やクーンちゃんより粗く見えた。細かな毛並みと控えめな輪郭で寝姿を再制作し、旧3コマと18秒の動きを撤去した。位置・姿・大きさは変化させない。

独立したSpriteを既存の寝姿と同席者の仕組みで配置する。それぞれのタップと吹き出しの基準を分け、一枚絵の中央から両方のセリフが出る問題を解消した。保存済みの遭遇記録との互換性のため、シーンIDは `masaruSunbeam` を維持する。

## 単体への分離

承認済みの一枚絵を編集対象とし、相手だけを除去した。隠れていた輪郭を補完している。以下の旧制作プロンプト中のMasaruは改名前の記録。

マサハルのプロンプト:

```text
Use case: precise-object-edit. Input image is the EDIT TARGET, the approved detailed pixel art of sleeping dog Masaharu and yellow star Etokichi. Preserve the exact fine pixel texture, small pixels, colors, thin brown outline, sleeping pose, proportions and identity of the retained character. This is separation into reusable game layers, not redesign. Keep the 1536x1024 canvas and retained character at EXACTLY the same coordinates and size as source. Restore only anatomy hidden behind the removed character so the retained character is complete and reusable. Background must be flat solid pure #ff00ff magenta, no checkerboard, no shadow outside silhouette, no other props, no text. REMOVE the yellow star Etokichi completely. Retain ONLY the brown and white sleeping dog with red collar and curled tail. Complete the small occluded right contour of dog's sleeping face and paw. The dog stays in the left two thirds; the right third formerly occupied by star is empty magenta.
```

エトキチのプロンプト:

```text
Use case: precise-object-edit. Input image is the EDIT TARGET, the approved detailed pixel art of sleeping dog Masaharu and yellow star Etokichi. Preserve the exact fine pixel texture, small pixels, colors, thin brown outline, sleeping pose, proportions and identity of the retained character. This is separation into reusable game layers, not redesign. Keep the 1536x1024 canvas and retained character at EXACTLY the same coordinates and size as source. Restore only anatomy hidden behind the removed character so the retained character is complete and reusable. Background must be flat solid pure #ff00ff magenta, no checkerboard, no shadow outside silhouette, no other props, no text. REMOVE the brown and white dog completely. Retain ONLY the sleeping yellow FIVE POINT STAR Etokichi with tiny hands, feet, rosy cheeks and GOLDEN WAIST ORBIT RING. Complete the hidden left upper star point and left face edge. The star remains on the right, same tilt and position; left half formerly occupied by dog is empty magenta. The ring around the waist stays complete.
```

## 寝姿のプロンプト

参照1は図鑑画像の二人の外見と寄り添う構図、参照2は `decor-cat-loaf-pixel.webp` の画風と粒度。

```text
Use case: stylized-concept. Create ONE stationary game sprite showing BOTH friends already sleeping cuddled together. Reference 1 identifies Masaru the tan and white dog and Etokichi the yellow five-point star, and their close sleeping composition. Reference 2 is the EXACT desired fine detailed game pixel-art rendering density and subtle brown contour style, NOT a character to add. Render at same refined pixel art fidelity as reference 2: small fine pixels, delicate fur shading, thin nuanced brown contours, avoid chunky black stair-step outline or large pixel blocks. Masaru on LEFT lies belly down with eyes fully CLOSED, cream white muzzle and paws, tan fur, triangular ears, curled fluffy tail, RED collar. Etokichi on RIGHT sleeps with eyes fully CLOSED and a small closed relaxed smile, head leaning against Masaru's shoulder; preserve yellow FIVE POINT STAR silhouette, pink cheeks, small yellow hands and feet, thin golden Saturn-like oval WAIST RING extending beyond both sides of body. No open mouth or wide smile. They TOUCH naturally and are already asleep; no animation frames, no panels, no grid. One coherent full-body pair, 3:2 wide canvas, comfortable padding, whole pair occupies 88 percent width and 85 percent height, feet baseline consistent, subtle 3/4 elevated RPG view. No room, furniture, cushion, floor, cast shadow, text, letters, Z symbols or other characters. Background absolutely flat pure solid #ff00ff magenta for chroma key, no checkerboard or texture. Don't put magenta into the characters. Do not imitate the coarse outline of reference 1, use fine rendering of reference 2.
```

## 図鑑イラストのプロンプト

### 画質の改善

初版は他の図鑑と同じ512×512だったが、元絵のドットと輪郭が大きく、毛並みと顔が粗く見えていた。窓辺の昼寝を粒度の基準にし、承認済みの単体寝姿を外見の基準にして組み込みimagegenで再制作した。細かな毛並み・輪郭・陰影を描き直し、図鑑は1024×1024で保存する。エトキチの口も閉じ、二人の静かな寝顔と腰の輪っかを保持する。
### 図鑑の画質改善プロンプト

参照: `public/assets/collection/masaharu-sunbeam.webp`、`public/assets/collection/window-nap.webp`、`assets-src/masaharu-sleep-pixel.webp`、`assets-src/etokichi-sleep-leaning-pixel.webp`

```text
Refine image 1 collectible illustration at 1024x1024. Reference 2 defines fine small-pixel grain and detailed cozy room rendering. References 3 and 4 define approved character appearances and closed sleeping expressions. Preserve image 1 warm midday room composition, green curtains, window light on wooden floor, bookshelf, dog LEFT and star RIGHT cuddled close. Draw BOTH peacefully sleeping with CLOSED eyes and small CLOSED relaxed smiles, no laughing open mouth. Masaharu tan and cream white dog with RED collar and curled fluffy tail, tiny detailed fur shading. Etokichi yellow FIVE POINT STAR, pink cheeks, little hands and feet, complete GOLDEN WAIST ORBIT RING. Refine coarse blocks and heavy outlines into small fine pixels, delicate fur, thin warm brown contours, subtle shading matching background detail. Full bodies, pillow retained. No text, no Z symbols, no added characters. Reconstruct fine details, not a simple enlargement of chunky source.
```

### 初版

```text
Use case: illustration-story. Square collectible pixel art illustration for cozy room game, no text. Image 1 references ONLY LEFT dog Masaru: tan white Akita-like plush dog, white face muzzle chest paws, triangular ears, curled fluffy tail, RED collar. Do not include owl. Image 2 defines exact Etokichi yellow FIVE POINT STAR character, orange pink cheeks, tiny yellow limbs and thin golden oval SATURN WAIST RING extending outside both sides of torso; must visibly preserve waist ring. Image 3 room mood reference only; replace its book-reading action with requested moment. Scene: warm midday sun streams from a wooden window into a cozy wooden-floor room. Masaru is lying belly down on LEFT, closed gentle eyes, forepaws extended. Etokichi sits RIGHT closely beside Masaru, leaning slightly against fluffy shoulder, closed sleepy smiling eyes. They share one broad patch of sunshine, feeling safe and peaceful. Both full bodies readable, roughly equal importance, characters central foreground. Soft green cushion under Etokichi optional, no book, no toy, no food, no other characters, no speech bubbles, no Z symbols. Crisp coherent chunky pixel art with dark outlines and restrained warm shading. Warm green curtains, bookshelf in background, enough breathing space. Ring around waist, NOT halo.
```

## 描画の参照資料

- [PixiJS Sprite](https://pixijs.download/release/docs/scene.Sprite.html): 単体テクスチャと独立した描画・タップ対象。
- [Sharp resizing](https://sharp.pixelplumbing.com/api-resize/): 原画の切り出しとLanczos縮小。
