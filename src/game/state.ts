import { findScene, getScene, getScenesForBand } from "../content/scenes.ts";
import { indexFromSeed } from "./random.ts";
import { isSceneUnlocked } from "./scene-unlock.ts";
import {
  addDays,
  formatSlotDate,
  getTimeBand,
  makeSlotKey,
  nextChronologicalSlot,
  parseSlotKey,
  TIME_BANDS,
} from "./time.ts";
import type {
  ChoiceDefinition,
  EchoRecord,
  GameState,
  InteractionRecord,
  SceneDefinition,
  SceneId,
  SlotAssignment,
  TimeBand,
  VisitView,
} from "./types.ts";

// 同じシーンの3連続を避ける判定は直近2件しか見ないので、それより長い履歴は持たない。
const SCENE_HISTORY_LIMIT = 2;

export function createInitialState(): GameState {
  return {
    dataVersion: 2,
    assignments: {},
    histories: {
      earlyMorning: [],
      morning: [],
      daytime: [],
      evening: [],
      night: [],
      deepNight: [],
    },
    interactions: {},
    echoes: [],
    discoveries: {},
  };
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

interface ResolveVisitOptions {
  randomSeed?: string;
  sceneId?: SceneId;
}

function chooseScene(
  band: TimeBand,
  localDate: string,
  history: readonly SceneId[],
  discoveries: GameState["discoveries"],
  randomSeed?: string,
  forcedSceneId?: SceneId,
): SceneDefinition {
  if (forcedSceneId) {
    const forcedScene = getScene(forcedSceneId);
    if (forcedScene.band !== band) {
      throw new Error(`${forcedSceneId} is registered for ${forcedScene.band}, not ${band}`);
    }
    return forcedScene;
  }
  // 抽選と図鑑で同じ解放判定を使い、表示上の「出会える」と実際の候補を食い違わせない。
  const candidates = getScenesForBand(band).filter((scene) => isSceneUnlocked(scene, discoveries));
  const seed = randomSeed ? `${randomSeed}:scene` : `${localDate}:${band}:scene`;
  let candidate = candidates[indexFromSeed(seed, candidates.length)];
  if (!candidate) throw new Error(`No scenes registered for ${band}`);

  const lastTwo = history.slice(-2);
  const candidateId = candidate.id;
  if (lastTwo.length === 2 && lastTwo.every((sceneId) => sceneId === candidateId)) {
    // 先頭から選ぶとリスト前方のシーンへ偏るため、残りからも抽選し直す。
    const alternatives = candidates.filter((scene) => scene.id !== candidateId);
    const alternative = alternatives[indexFromSeed(`${seed}:alternative`, alternatives.length || 1)];
    if (alternative) candidate = alternative;
  }
  return candidate;
}

function chooseMimizouPresent(sceneId: SceneId, slotKey: string, discoveries: GameState["discoveries"]): boolean {
  return (
    sceneId === "watchingStars" &&
    Boolean(discoveries.mimizouVisit) &&
    indexFromSeed(`${slotKey}:mimizou-companion`, 3) === 0
  );
}

function createAssignment(now: Date, state: GameState, randomSeed?: string, forcedSceneId?: SceneId): SlotAssignment {
  const localDate = formatSlotDate(now);
  const band = getTimeBand(now);
  const slotKey = makeSlotKey(localDate, band);
  const scene = chooseScene(band, localDate, state.histories[band], state.discoveries, randomSeed, forcedSceneId);
  const variantSeed = randomSeed ?? slotKey;
  return {
    slotKey,
    localDate,
    band,
    sceneId: scene.id,
    lineIndex: indexFromSeed(`${variantSeed}:${scene.id}:line`, scene.lines.length),
    detailIndex: indexFromSeed(`${variantSeed}:${scene.id}:detail`, scene.details.length),
    mimizouPresent: chooseMimizouPresent(scene.id, slotKey, state.discoveries),
    createdAt: now.toISOString(),
  };
}

function recordNewAssignment(state: GameState, assignment: SlotAssignment): boolean {
  state.assignments[assignment.slotKey] = assignment;
  const history = state.histories[assignment.band];
  history.push(assignment.sceneId);
  if (history.length > SCENE_HISTORY_LIMIT) history.splice(0, history.length - SCENE_HISTORY_LIMIT);

  const discovery = state.discoveries[assignment.sceneId];
  if (discovery) {
    discovery.seenCount += 1;
    return false;
  }
  state.discoveries[assignment.sceneId] = {
    firstSeenAt: assignment.createdAt,
    seenCount: 1,
  };
  return true;
}

export function resolveVisit(
  now: Date,
  sourceState: GameState,
  options: ResolveVisitOptions = {},
): { state: GameState; visit: VisitView } {
  const state = cloneState(sourceState);
  const localDate = formatSlotDate(now);
  const band = getTimeBand(now);
  const slotKey = makeSlotKey(localDate, band);
  let assignment = options.randomSeed || options.sceneId ? undefined : state.assignments[slotKey];
  let discoveredNow = false;

  if (!assignment) {
    assignment = createAssignment(now, state, options.randomSeed, options.sceneId);
    discoveredNow = recordNewAssignment(state, assignment);
  }

  const scene = getScene(assignment.sceneId);
  const line = scene.lines[assignment.lineIndex];
  const detail = scene.details[assignment.detailIndex];
  if (line === undefined || detail === undefined) throw new Error(`Invalid variants for ${scene.id}`);
  // 抽選し直すと再読み込みで同席が変わる。決めた値を持たないのは古いセーブだけ。
  const mimizouPresent = assignment.mimizouPresent ?? chooseMimizouPresent(scene.id, slotKey, state.discoveries);

  return {
    state,
    visit: {
      assignment,
      scene,
      line,
      detail,
      echoes: state.echoes.filter((echo) => echo.targetSlotKey === slotKey),
      interaction: state.interactions[slotKey],
      discoveredNow,
      mimizouPresent,
    },
  };
}

function getChoice(scene: SceneDefinition, choiceId: string): ChoiceDefinition {
  const choice = scene.choices?.find((candidate) => candidate.id === choiceId);
  if (!choice) throw new Error(`Unknown choice ${choiceId} for ${scene.id}`);
  return choice;
}

function createEchoes(assignment: SlotAssignment, choice: ChoiceDefinition): EchoRecord[] {
  const laterTarget = nextChronologicalSlot(assignment.localDate, assignment.band);
  const nextDayDate = addDays(assignment.localDate, 1);
  return [
    {
      id: `${assignment.slotKey}:${choice.id}:later`,
      sourceSlotKey: assignment.slotKey,
      targetSlotKey: makeSlotKey(laterTarget.localDate, laterTarget.band),
      text: choice.later,
      kind: "later",
    },
    {
      id: `${assignment.slotKey}:${choice.id}:nextDay`,
      sourceSlotKey: assignment.slotKey,
      targetSlotKey: makeSlotKey(nextDayDate, assignment.band),
      text: choice.nextDay,
      kind: "nextDay",
    },
  ];
}

export function applyInteraction(
  sourceState: GameState,
  slotKey: string,
  choiceId: string,
  now: Date,
): { state: GameState; interaction: InteractionRecord } {
  const state = cloneState(sourceState);
  const existing = state.interactions[slotKey];
  if (existing) return { state, interaction: existing };

  const assignment = state.assignments[slotKey];
  if (!assignment) throw new Error(`Unknown slot: ${slotKey}`);
  const choice = getChoice(getScene(assignment.sceneId), choiceId);
  const interaction: InteractionRecord = {
    slotKey,
    choiceId,
    immediate: choice.immediate,
    selectedAt: now.toISOString(),
  };
  state.interactions[slotKey] = interaction;
  state.echoes.push(...createEchoes(assignment, choice));
  return { state, interaction };
}

export function pruneOldSlots(sourceState: GameState, today: string, retentionDays = 14): GameState {
  const state = cloneState(sourceState);
  const oldest = addDays(today, -retentionDays);
  for (const [key, assignment] of Object.entries(state.assignments)) {
    if (assignment.localDate < oldest) {
      delete state.assignments[key];
      delete state.interactions[key];
    }
  }
  // 読めないキーは形式が分からないので、消さずに残す。
  state.echoes = state.echoes.filter((echo) => (parseSlotKey(echo.targetSlotKey)?.localDate ?? oldest) >= oldest);
  return state;
}

export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GameState>;
  return (
    candidate.dataVersion === 2 &&
    typeof candidate.assignments === "object" &&
    typeof candidate.histories === "object" &&
    typeof candidate.interactions === "object" &&
    Array.isArray(candidate.echoes) &&
    typeof candidate.discoveries === "object" &&
    TIME_BANDS.every((band) => Array.isArray(candidate.histories?.[band]))
  );
}

function wrapVariantIndex(index: number, length: number): number {
  if (length <= 0 || !Number.isFinite(index)) return 0;
  const whole = Math.trunc(index);
  return ((whole % length) + length) % length;
}

// セリフを減らしたりシーンを改名したりすると、保存済みのスロットがコンテンツを指せなくなる。
// 起動を止めずに済むよう、指せなくなった分だけ落として残りは範囲内へ丸める。
export function sanitizeGameState(state: GameState): GameState {
  const sanitized = cloneState(state);
  const droppedSlotKeys = new Set<string>();

  for (const [slotKey, assignment] of Object.entries(sanitized.assignments)) {
    const scene = findScene(assignment.sceneId);
    if (!scene) {
      delete sanitized.assignments[slotKey];
      delete sanitized.interactions[slotKey];
      droppedSlotKeys.add(slotKey);
      continue;
    }
    // 発見回数を二重に数えないよう、範囲外のindexは削除ではなく丸めて残す。
    assignment.lineIndex = wrapVariantIndex(assignment.lineIndex, scene.lines.length);
    assignment.detailIndex = wrapVariantIndex(assignment.detailIndex, scene.details.length);
  }

  if (droppedSlotKeys.size > 0) {
    sanitized.echoes = sanitized.echoes.filter((echo) => !droppedSlotKeys.has(echo.sourceSlotKey));
  }

  for (const band of TIME_BANDS) {
    // 保存済みの長い履歴は、判定に使う末尾だけ残して切り詰める。
    sanitized.histories[band] = sanitized.histories[band]
      .filter((sceneId) => findScene(sceneId))
      .slice(-SCENE_HISTORY_LIMIT);
  }

  for (const sceneId of Object.keys(sanitized.discoveries)) {
    if (!findScene(sceneId)) delete sanitized.discoveries[sceneId as SceneId];
  }

  return sanitized;
}

export function migrateGameState(value: unknown): GameState {
  if (isGameState(value)) return sanitizeGameState(value);
  return createInitialState();
}
