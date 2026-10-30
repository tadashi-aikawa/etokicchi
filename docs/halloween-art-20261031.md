# 2026年ハロウィンのシーン素材

組み込みの `image_gen` で生成した。スプライトと図鑑イラストは別々に生成している。

## 参照画像

| 主役 | キャラクターと画風の参照 |
|---|---|
| エトキチ | `public/assets/collection/folding-laundry.webp` |
| クーンちゃん | `public/assets/collection/brushing-maine-coon.webp` |
| マサハル | `public/assets/collection/masaharu-sunbeam.webp` |
| 砂肝 | `public/assets/collection/sunagimo-grill.webp` |
| みみぞう | `public/assets/collection/mimizou-night-stroll.webp` |
| タツヲ | `public/assets/collection/tatsuo-too-comfortable.webp` |

## 共通プロンプト

```text
Use case: illustration-story.
Style: warm cozy pixel art, crisp chunky pixels, dark brown outlines,
limited warm palette. Match the reference character identity.
No text, lettering, labels, numbers, logos, UI, borders or panels.

Sprite: landscape 3:1 sheet, exactly three equal square cells in one row.
Actual transparent background, no room, furniture, floor or extra characters.
One repeating Halloween activity, three keyframes, constant size and foot baseline.
Full body with transparent padding; keep all props within each cell.

Collection: square full-bleed illustration in a wooden one-room home,
green quilt, bookshelves, plants, window and small pumpkin decorations.
The protagonist and their activity are the main focus at thumbnail size.
Use a distinct composition and lighting matching the time band.
```

## キャラクターと動作の指定

| 語幹 | 外見と動作 | 図鑑の構図 |
|---|---|---|
| `garland` | 黄色い五芒星のエトキチ。茶色い目、ピンクの頬、小さな手足、腰のひも。帽子なし。紙のかぼちゃを持つ→ひもへ通す→三つの飾りを持ち上げる | 早朝。はさみと紙くず越しに、飾りを通す手元を見る |
| `witch-cat` | 茶色いしま模様のメインクーン。緑の目、耳の飾り毛、ふさふさの胸毛。オレンジの帯の紫の魔女帽子が傾く→前足で直す→胸を張る | 朝。帽子を直すクーンと、同程度の背丈で横で喜ぶエトキチを大きく描く |
| `pumpkin-pup` | オレンジと白のマサハル。立ち耳、巻いたしっぽ、赤い首輪。鼻でかぼちゃを押す→転がるのを追う→前足で止める | 昼。床すれすれから、転がるかぼちゃとマサハルを見る |
| `pumpkin-skewer` | 灰紫の丸い砂肝。白い顔、茶色い目、ピンクの頬、黄色い足、柔らかな継ぎ目。くちばしなし。三つのかぼちゃの串を確認→返す→目を輝かせて見せる | 夕方。キッチンで串と砂肝を大きく、後ろで喜ぶエトキチを描く |
| `candy-owl` | 丸い灰色のみみぞう。大きな白い目の周り、小さな瞳、黄色いくちばしと足、お腹の丸い斑点。耳の飾り毛なし。かぼちゃバケツをのぞく→キャンディーを選ぶ→羽で渡す | 夜。エトキチの側から、キャンディーを差し出すみみぞうを見る |
| `gentle-ghost` | 長い腕と赤茶色の毛のオランウータンのタツヲ。青い作業着。緑の布団に隠れる→白いおばけ姿で飛び出す→顔を見せて笑う | 深夜。ベッドの布団からタツヲが飛び出し、エトキチが跳び退く |

## 保存先と変換

- 原本: `assets-src/*-halloween-*-pixel.webp`。
    - 形式: 可逆WebP。
    - 理由: 生成画像のアルファと、再変換前の画素を維持する。
- 配信用スプライト: `public/assets/*-halloween-*-pixel.webp`。
    - 形式: 非可逆WebP、品質90、アルファ維持。
    - エトキチは60×60の3コマ。
    - クーンは64×64、マサハルは87×61、砂肝は54×54、みみぞうは64×64、タツヲは72×72の3コマ。
    - ファイルのピクセル寸法は上記論理寸法の2倍。
    - 再変換: `pnpm assets:normalize`。
- 図鑑イラスト: `public/assets/collection/halloween-*.webp`。
    - 形式: 非可逆WebP、品質90。
    - 全6件を512×512へ縮小し、非可逆WebPで配信する。
- 砂肝を見守る姿だけ `etokichi-watching-sunagimo-pixel.webp` を再利用する。

マサハルは隣のコマへの混入を避けるため、初稿を次の指示で編集した。

- マサハルの体格を維持し、各セルの共通範囲を切り出して87×61で表示する。
    - 目的: 過剰な透明余白で吹き出しとタップ範囲が体から離れるのを防ぐ。

```text
Preserve the same puppy identity, red collar, pumpkin, pixel style, colors
and three poses. Change only scale and padding within each equal cell.
Shrink each puppy and pumpkin group to about 75% of its cell width.
Keep at least 10% completely transparent space on both sides of every cell.
All nontransparent pixels, including motion strokes, must stay inside its cell.
No pixels touching cell edges. Actual transparent background.
```

## 検分後の画像修正

クーンとマサハルの図鑑絵は、元の図鑑絵を編集対象、通常シーンの図鑑絵を体格の参照として再生成した。

```text
Etokichi is a normal full-size living yellow FIVE-POINT STAR, not a baby.
Exactly five star points, brown oval eyes, rosy cheeks, normal short golden arms
and boots, thin golden oval waist ring. Keep both friends large in the foreground.
Cat: star-tip-to-boot height roughly equals the cat's ear-to-paw height.
Dog: dog's ear-to-paw height is only about 1.25 times the star's height.
Both characters fill around 85-90% width and 70% height, same depth and close together.
Preserve warm detailed pixel art, room, Halloween props and character identity.
```

マサハルの図鑑絵のエトキチは、`halloween-candy-owl.webp` を目の参照として修正した。

```text
Edit only Etokichi's eye region. Match his normal large vertical dark-brown
oval eyes, light cream/white surrounds and small white highlights.
Look attentively toward the pumpkin and puppy. Preserve composition, full-size
body, pose, puppy, pumpkin, room, lighting and warm detailed pixel art.
```

エトキチの新しいアクションは、左へ向く3コマとして生成した。右向きは表示時に反転する。

| 原本名 | 動作 |
|---|---|
| `etokichi-halloween-cat-chat-pixel.webp` | 帽子を見上げる→手を差し伸べる→笑う。星だけを描き、帽子を焼き込まない |
| `etokichi-halloween-pumpkin-play-pixel.webp` | 空の両手でかぼちゃを待つ→押し返す→拍手する。かぼちゃはマサハルの素材にだけ持たせる |
| `etokichi-halloween-candy-receive-pixel.webp` | 両手を出す→キャンディーを受け取る→お辞儀する |
| `etokichi-halloween-ghost-reaction-pixel.webp` | 不思議がる→両手を上げて驚く→安心して笑う。ジャンプは描画側で付ける |

```text
Landscape 3:1 sheet, exactly three equal square cells, transparent background.
Only Etokichi, looking LEFT toward a friend immediately beside him.
Normal five-point star identity, full body, consistent size and foot baseline,
fine pixel art and subtle brown outline. Keep all pixels inside each cell.
No other characters, furniture, floor, letters or UI.
```

新しいタツヲの原本は `tatsuo-halloween-ambush-pixel.webp`。旧シーツ姿のシートは使わない。

```text
Three equal square cells in a horizontal transparent sprite sheet.
Frame 1: a low teal quilt mound with double cream stripes, no visible face, hands or feet.
Frame 2: the orange-brown orangutan suddenly rises wearing a white ghost sheet,
both long arms up, the same teal quilt with double cream stripes gathered at his feet.
Frame 3: reveals his friendly face and blue work shirt, sheet over shoulders.
Same center and quilt baseline in all frames, no bed frame or room baked in.
```

## 配置とルーチン

| シーン | エトキチと主役の位置関係 | 歩行と反応 |
|---|---|---|
| 朝 | 手前の絨毯のクーンの左で、右を向く | 帽子を見上げて会話し、食卓側を一周して戻る |
| 昼 | 奥の絨毯のマサハルの右で、左を向く | かぼちゃを受ける姿と、周りへ回る歩行を交互に行う |
| 夕方 | 手前の絨毯の右にいる砂肝の左で、右を向く | 串を見て喜び、食卓側へ寄ってから戻る |
| 夜 | 窓辺のみみぞうの右で、左を向く | お菓子を受け取り、絨毯側へ歩いて戻る |
| 深夜 | ベッドの右から布団へ近づく | 不思議がる→タツヲが飛び出す→跳び退く→笑う→離れる→タツヲが隠れ直す |

深夜の動きは `src/rendering/halloween-ghost.ts` の共通時計を使う。布団へ到着して1.6秒不思議がったあと、タツヲの飛び出しとエトキチのジャンプを同時に始める。

- ベッド枠は全段階で `furniture-bed-bare-pixel.webp` の同じスプライトを使う。
- 隠れている間だけ `scene-halloween-raised-quilt-pixel.webp` をベッドへ重ねる。
    - 表現: 既存の青緑の掛け布団が、大柄なタツヲより幅・高さとも大きく盛り上がる。
    - 飛び出すと掛け布団の重ね描画を消す。ベッド枠は移動・拡縮・差し替えをしない。
    - 足元: タツヲが引き下ろした布団も、青緑色と2本のクリーム帯を維持する。
    - 原本: `assets-src/scene-halloween-raised-quilt-pixel.webp`。配信用は144×156の非可逆WebP。
- タツヲのシートの小さな布団の山は表示せず、隠れている間はゲストのタップも無効にする。
- 昼のエトキチはアクションの透明余白を補うため、1.12倍にして歩行時の体格へ合わせる。

```text
Draw only the existing teal quilt with two cream stripes, no bed frame or pillow.
Raise it into an enormous tall rounded dome overflowing the entire mattress,
with enough volume for a broad-shouldered curled orangutan and his long arms.
Keep the same teal color and double cream stripe on the quilt at Tatsuo's feet.
No separate small blanket pile or visible character. Transparent background.
```

APIの確認: [PixiJS AnimatedSprite](https://pixijs.download/release/docs/scene.AnimatedSprite.html)、[sharp WebP](https://sharp.pixelplumbing.com/api-output/#webp)。
