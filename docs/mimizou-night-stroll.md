# みみぞうの夜のおさんぽ

質問票 `q-20260912-223229-w91p1` でタダシが「夜のおさんぽで進める」を選択した。備考・別案・全体補足はない。

- 夜に登場し、`mimizouVisit` の発見で解禁する。
- ラグの上の4地点を周回する。速度は論理座標で毎秒8px。途中で短く休み、エトキチの前では右を向いて2.8秒立ち止まる。
- 歩行は3列4行の既存素材を使い、移動方向に合わせて行を選ぶ。160msごとに列0→1→2→1を送り、停止中は中央コマに固定する。
- 位置と足のコマは同じ経過時間から計算する。閉じた経路により周回時の瞬間移動を避ける。描画深度とタップ位置も移動に追従する。
- エトキチは右側で待つ。クーンはソファーで休み、歩行経路を空ける。
- 既存の訪問・見送り・星見の静止表示は変更しない。更新履歴は同日へ統合し、追加数だけを載せる。

描画更新の登録と解除は [PixiJS公式Tickerガイド](https://pixijs.com/8.x/guides/components/ticker) を確認した。経路の空床判定、休憩時の静止、両足のコマ送り、折り返し、周回境界、解禁条件をテストする。

## 図鑑絵の制作

組み込みimagegenで生成し、`cwebp -resize 512 512` で `public/assets/collection/mimizou-night-stroll.webp` へ保存した。参照は既存の `mimizou-visit.webp` と `docs/assets/mimizou-design-reference.png`。

生成プロンプト:

> Create a new square 512x512 collectible illustration for this cozy pixel art game. Use image 1 ONLY for the richly detailed pixel art style, warm wooden bedroom at night, and yellow star-headed character Etokichi design. Use image 2 as the strict design of Mimizou: huge vertically oval white eyes with small low black pupils, gray round body, huge face occupying upper body, small yellow beak, spotted pale belly and tiny yellow three-toed feet. New scene: INSIDE the room, Mimizou takes a tiny walking step on a blue patterned rug with one foot lifted, looking up at Etokichi standing a short distance to the right and watching warmly. Owl about 75 percent Etokichi height. Both full bodies visible with space between them. Moonlit window behind them, warm lamp, cozy wooden furniture. Clear crisp small pixel clusters consistent with image1. No letters, captions, speech bubbles or UI. Mimizou is on the rug, not at window. Preserve star character and owl identities.
