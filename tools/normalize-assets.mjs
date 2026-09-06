// assets-src/ の原素材を「表示する論理寸法のちょうど2倍」へ機械変換し、public/assets/ を生成する。
//
// 描画解像度が2なので、Spriteの拡大率が全素材で正確に0.5になるとドットが1対1で画面へ乗る。
// そのため各素材の目標寸法は「描画コードが決める表示論理寸法 × 2」に固定する。
// 表示論理寸法の出どころは TARGETS の note に書いてある。
//
//   pnpm assets:normalize
//
// 図鑑イラスト(public/assets/collection/)とロゴ・faviconは論理座標を持たないので対象外。

import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "assets-src");
const outputDir = path.join(root, "public", "assets");

/**
 * @typedef {object} Target
 * @property {string} name 素材のファイル名(入出力で共通)
 * @property {number} width 目標のピクセル幅
 * @property {number} height 目標のピクセル高さ
 * @property {"lanczos" | "nearest"} kernel 拡大はnearestの整数倍、縮小と非整数倍はlanczos
 * @property {string} note 表示論理寸法の出どころ
 */

/** @type {readonly Target[]} */
const TARGETS = [
  // 背景と窓。room.ts が 195×347 へ引き伸ばして描く。
  { name: "room-base-empty-daytime-pixel.webp", width: 390, height: 694, kernel: "lanczos", note: "背景 195×347" },
  { name: "room-background-early-morning-pixel.webp", width: 390, height: 694, kernel: "lanczos", note: "窓 195×347" },
  { name: "room-background-morning-pixel.webp", width: 390, height: 694, kernel: "lanczos", note: "窓 195×347" },
  { name: "room-background-daytime-pixel.webp", width: 390, height: 694, kernel: "lanczos", note: "窓 195×347" },
  { name: "room-background-evening-pixel.webp", width: 390, height: 694, kernel: "lanczos", note: "窓 195×347" },
  { name: "room-background-night-pixel.webp", width: 390, height: 694, kernel: "lanczos", note: "窓 195×347" },
  { name: "room-background-deep-night-pixel.webp", width: 390, height: 694, kernel: "lanczos", note: "窓 195×347" },

  // 家具。FURNITURE_DEFINITIONS の displayWidth × displayHeight。
  { name: "furniture-bed-pixel.webp", width: 108, height: 160, kernel: "lanczos", note: "bed 54×80" },
  { name: "furniture-bed-bare-pixel.webp", width: 108, height: 160, kernel: "lanczos", note: "bed 54×80" },
  { name: "furniture-bookshelf-pixel.webp", width: 94, height: 134, kernel: "lanczos", note: "bookshelf 47×67" },
  { name: "furniture-dining-table-chair-pixel.webp", width: 194, height: 148, kernel: "lanczos", note: "diningSet 97×74" },
  {
    name: "furniture-dining-table-chair-bare-pixel.webp",
    width: 194,
    height: 148,
    kernel: "lanczos",
    note: "diningSet 97×74",
  },
  { name: "furniture-round-stool-pixel.webp", width: 34, height: 44, kernel: "lanczos", note: "roundStool 17×22" },
  { name: "furniture-floor-plant-pixel.webp", width: 126, height: 132, kernel: "lanczos", note: "floorPlant 63×66" },
  { name: "furniture-sofa-right-two-seat-pixel.webp", width: 80, height: 160, kernel: "lanczos", note: "sofa 40×80" },
  { name: "furniture-bedside-table-pixel.webp", width: 48, height: 84, kernel: "lanczos", note: "bedsideTable 24×42" },

  // 固定設備。FIXTURE_DEFINITIONS の displayWidth × displayHeight。
  { name: "fixture-kitchen-wall-unit-pixel.webp", width: 88, height: 260, kernel: "lanczos", note: "kitchenUnit 44×130" },

  // 床・壁の装飾。FLOOR_DECORATIONS / DEPTH_DECORATIONS / ROOM_CLOCK の width×height。
  { name: "decor-genkan-pixel.webp", width: 120, height: 48, kernel: "lanczos", note: "玄関マット 60×24" },
  { name: "decor-rug-back-pixel.webp", width: 128, height: 84, kernel: "lanczos", note: "奥の絨毯 64×42" },
  { name: "decor-rug-front-pixel.webp", width: 168, height: 164, kernel: "lanczos", note: "手前の絨毯 84×82" },
  { name: "decor-wall-clock-pixel.webp", width: 38, height: 38, kernel: "lanczos", note: "壁時計 19×19" },
  { name: "decor-cat-loaf-pixel.webp", width: 120, height: 96, kernel: "lanczos", note: "クーン 60×48" },
  {
    name: "decor-cat-loaf-blink-pixel.webp",
    width: 480,
    height: 96,
    kernel: "lanczos",
    note: "まばたきクーン 60×48 の4コマ",
  },
  {
    name: "decor-cat-sofa-curled-compact-pixel.webp",
    width: 120,
    height: 150,
    kernel: "lanczos",
    note: "ソファーのクーン 60×75",
  },

  // シーン小物。sceneProps の height と、素材の縦横比から決まる表示幅。
  { name: "scene-blanket-floor-pixel.webp", width: 93, height: 60, kernel: "lanczos", note: "床の布団 46.5×30" },
  { name: "scene-breakfast-dishes-pixel.webp", width: 110, height: 44, kernel: "lanczos", note: "朝食の皿 55×22" },
  { name: "scene-mud-footprints-pixel.webp", width: 42, height: 34, kernel: "lanczos", note: "泥の足跡 21×17" },
  { name: "scene-laundry-basket-pixel.webp", width: 88, height: 66, kernel: "lanczos", note: "洗濯かご 44×33" },
  { name: "scene-simmering-pot-pixel.webp", width: 54, height: 48, kernel: "lanczos", note: "煮込み鍋 27×24" },
  { name: "scene-toy-box-pixel.webp", width: 57, height: 44, kernel: "lanczos", note: "おもちゃ箱 28.5×22" },

  // 寝姿・同席者。sleeperHeight / companion.height / visitor.height。
  { name: "etokichi-sleep-pixel.webp", width: 126, height: 84, kernel: "lanczos", note: "既定の寝姿 63×42" },
  { name: "etokichi-sleep-tucked-pixel.png", width: 84, height: 60, kernel: "nearest", note: "布団の寝姿 42×30" },
  { name: "etokichi-sleep-covered-pixel.png", width: 106, height: 78, kernel: "nearest", note: "掛け直し 53×39" },
  { name: "etokichi-sleep-kicked-pixel.png", width: 112, height: 78, kernel: "nearest", note: "布団蹴り 56×39" },
  {
    name: "etokichi-window-nap-star-book-pixel.png",
    width: 144,
    height: 144,
    kernel: "lanczos",
    note: "窓辺の昼寝 72×72",
  },
  {
    name: "etokichi-window-nap-cushion-base-pixel.png",
    width: 144,
    height: 144,
    kernel: "lanczos",
    note: "窓辺の座布団 72×72",
  },
  {
    name: "etokichi-napping-on-maine-coon-pixel.webp",
    width: 200,
    height: 112,
    kernel: "lanczos",
    note: "横たわるクーン枕の昼寝 100×56",
  },
  {
    name: "etokichi-comforting-maine-coon-pixel.webp",
    width: 142,
    height: 104,
    kernel: "nearest",
    note: "抱きしめ 71×52(原素材が既に2倍)",
  },
  { name: "mimizou-pixel.png", width: 80, height: 80, kernel: "lanczos", note: "みみぞう 40×40" },
  { name: "tatsuo-sleeping-pixel.png", width: 112, height: 160, kernel: "nearest", note: "眠るタツヲ 56×80" },
  { name: "tatsuo-awake-pixel-v2.png", width: 180, height: 160, kernel: "nearest", note: "起こしにくるタツヲ 90×80" },
  {
    name: "tatsuo-too-comfortable-pixel.png",
    width: 128,
    height: 176,
    kernel: "nearest",
    note: "ソファーのタツヲ 64×88",
  },
  // 窓のタツヲは上から55%を切り出して使う。切り出し高さ floor(160×0.55)=88 が表示44の2倍になる。
  { name: "tatsuo-awake-pixel.png", width: 154, height: 160, kernel: "nearest", note: "窓のタツヲ 77×80" },

  // 行動アニメーション。3コマ×1行、1コマの表示は60×60。
  ...[
    "etokichi-breakfast-pixel.webp",
    "etokichi-brushing-maine-coon-pixel.webp",
    "etokichi-folding-laundry-pixel.webp",
    "etokichi-mimizou-farewell-pixel.webp",
    "etokichi-morning-stretch-pixel.webp",
    "etokichi-morning-tea-pixel.webp",
    "etokichi-muddy-return-pixel.webp",
    "etokichi-night-snack-pixel.webp",
    "etokichi-old-toy-pixel.webp",
    "etokichi-overslept-pixel.webp",
    "etokichi-packing-pixel.webp",
    "etokichi-planning-day-floor-pixel.webp",
    "etokichi-reading-comics-sofa-right-pixel.webp",
    "etokichi-troubled-pixel.webp",
    "etokichi-watching-pot-up-right-pixel.webp",
    "etokichi-watching-stars-pixel.webp",
  ].map((name) => ({
    name,
    width: 360,
    height: 120,
    kernel: /** @type {const} */ ("lanczos"),
    note: "行動アニメ 60×60 の3コマ",
  })),
  // 水やりだけは向き違いの2行。
  {
    name: "etokichi-watering-directions-pixel.webp",
    width: 360,
    height: 240,
    kernel: "lanczos",
    note: "行動アニメ 60×60 の3コマ×2行",
  },
];

// 歩行シートは1コマ幅が非整数で、行ごとに素材のズレを描画側で吸収していた。
// 12コマを等サイズのセルへ組み直し、向きが変わっても足元が動かないようにする。
const WALK_SOURCE_NAME = "etokichi-walk-pixel-v2.webp";
const WALK_COLUMNS = 3;
const WALK_ROWS = 4;
/** 行の並び。room.ts の directionRows と同じ順で、はみ出しの報告に使う。 */
const WALK_ROW_DIRECTIONS = ["下向き", "左向き", "右向き", "上向き"];
/** セル寸法(px)。論理48×52の2倍。 */
const WALK_CELL_WIDTH = 96;
const WALK_CELL_HEIGHT = 104;
/** 足元をセル下端から浮かせる余白(px)。影の中心(論理-2)へ足を置く。 */
const WALK_FOOT_PADDING = 4;
const ALPHA_THRESHOLD = 8;

/**
 * 列ごとに縦方向の不透明な帯を数え、行の境界をまたいだ素材でも1コマずつ切り出す。
 * @param {Buffer} data
 * @param {{ width: number; height: number; channels: number }} info
 * @param {number} left
 * @param {number} right
 */
function findVerticalRuns(data, info, left, right) {
  const runs = [];
  let current;
  for (let y = 0; y < info.height; y += 1) {
    let x0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    for (let x = left; x < right; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] <= ALPHA_THRESHOLD) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
    if (x1 < x0) {
      current = undefined;
      continue;
    }
    if (current) {
      current.y1 = y;
      current.x0 = Math.min(current.x0, x0);
      current.x1 = Math.max(current.x1, x1);
    } else {
      current = { x0, y0: y, x1, y1: y };
      runs.push(current);
    }
  }
  return runs;
}

async function buildWalkSheet() {
  const source = sharp(path.join(sourceDir, WALK_SOURCE_NAME)).ensureAlpha();
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const scale = WALK_CELL_HEIGHT / (info.height / WALK_ROWS);

  /** @type {{ row: number; column: number; box: { x0: number; y0: number; x1: number; y1: number }; centerX: number }[]} */
  const frames = [];
  for (let column = 0; column < WALK_COLUMNS; column += 1) {
    const left = Math.round((column * info.width) / WALK_COLUMNS);
    const right = Math.round(((column + 1) * info.width) / WALK_COLUMNS);
    const runs = findVerticalRuns(data, info, left, right);
    if (runs.length !== WALK_ROWS) {
      throw new Error(`${WALK_SOURCE_NAME}の列${column}から${WALK_ROWS}コマを切り出せません(検出${runs.length})`);
    }
    for (const [row, box] of runs.entries()) {
      frames.push({ row, column, box, centerX: (left + right) / 2 });
    }
  }

  const footByRow = new Map();
  for (const frame of frames) {
    footByRow.set(frame.row, Math.max(footByRow.get(frame.row) ?? 0, frame.box.y1));
  }

  const placements = await Promise.all(
    frames.map(async ({ row, column, box, centerX }) => {
      const sourceWidth = box.x1 - box.x0 + 1;
      const sourceHeight = box.y1 - box.y0 + 1;
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const input = await sharp(path.join(sourceDir, WALK_SOURCE_NAME))
        .ensureAlpha()
        .extract({ left: box.x0, top: box.y0, width: sourceWidth, height: sourceHeight })
        .resize({ width, height, kernel: "lanczos3", fit: "fill" })
        .png()
        .toBuffer();
      // コマ内の横揺れは残し、足元だけを行ごとの最下段へ揃える。
      const offsetX = ((box.x0 + box.x1 + 1) / 2 - centerX) * scale;
      const liftY = Math.round((footByRow.get(row) - box.y1) * scale);
      return {
        row,
        column,
        width,
        height,
        input,
        left: column * WALK_CELL_WIDTH + Math.round(WALK_CELL_WIDTH / 2 + offsetX - width / 2),
        top: row * WALK_CELL_HEIGHT + (WALK_CELL_HEIGHT - WALK_FOOT_PADDING - liftY - height),
      };
    }),
  );

  // 隣のセルへはみ出すと歩行アニメーションに他の向きの断片が混ざるので、四辺すべてを検査する。
  for (const { row, column, left, top, width, height } of placements) {
    const cellLeft = column * WALK_CELL_WIDTH;
    const cellTop = row * WALK_CELL_HEIGHT;
    const overflow = [
      left < cellLeft ? `左へ${cellLeft - left}px` : undefined,
      top < cellTop ? `上へ${cellTop - top}px` : undefined,
      left + width > cellLeft + WALK_CELL_WIDTH ? `右へ${left + width - cellLeft - WALK_CELL_WIDTH}px` : undefined,
      top + height > cellTop + WALK_CELL_HEIGHT ? `下へ${top + height - cellTop - WALK_CELL_HEIGHT}px` : undefined,
    ].filter(Boolean);
    if (overflow.length === 0) continue;
    throw new Error(
      `${WALK_SOURCE_NAME}の${WALK_ROW_DIRECTIONS[row]}${column}コマ目が` +
        `${WALK_CELL_WIDTH}x${WALK_CELL_HEIGHT}のセルからはみ出します: ${overflow.join("、")}`,
    );
  }

  const composites = placements.map(({ input, left, top }) => ({ input, left, top }));
  const sheet = await sharp({
    create: {
      width: WALK_COLUMNS * WALK_CELL_WIDTH,
      height: WALK_ROWS * WALK_CELL_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ lossless: true })
    .toBuffer();
  await writeFile(path.join(outputDir, WALK_SOURCE_NAME), sheet);
  return `${WALK_SOURCE_NAME}: ${info.width}x${info.height} -> ${WALK_COLUMNS * WALK_CELL_WIDTH}x${WALK_ROWS * WALK_CELL_HEIGHT}(12コマ組み直し)`;
}

/** @param {Target} target */
async function convert(target) {
  const input = path.join(sourceDir, target.name);
  const image = sharp(input).ensureAlpha();
  const { width, height } = await image.metadata();
  const resized = image.resize({
    width: target.width,
    height: target.height,
    kernel: target.kernel === "nearest" ? "nearest" : "lanczos3",
    fit: "fill",
  });
  const encoded = target.name.endsWith(".png")
    ? await resized.png({ compressionLevel: 9 }).toBuffer()
    : await resized.webp({ lossless: true }).toBuffer();
  await writeFile(path.join(outputDir, target.name), encoded);
  return `${target.name}: ${width}x${height} -> ${target.width}x${target.height} (${target.kernel}) ${target.note}`;
}

await mkdir(outputDir, { recursive: true });

const declared = new Set([...TARGETS.map(({ name }) => name), WALK_SOURCE_NAME]);
const available = (await readdir(sourceDir)).filter((name) => /\.(png|webp)$/.test(name));
const missing = available.filter((name) => !declared.has(name));
if (missing.length > 0) throw new Error(`目標寸法が未定義の素材があります: ${missing.join(", ")}`);

const lines = await Promise.all(TARGETS.map(convert));
lines.push(await buildWalkSheet());
for (const line of lines.sort()) console.log(line);
console.log(`\n${lines.length}件を ${path.relative(root, outputDir)} へ書き出しました。`);
