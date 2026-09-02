import { getScene, getScenesForBand } from "../content/scenes.ts";
import { indexFromSeed } from "./random.ts";
import { addDays, formatSlotDate, getTimeBand, makeSlotKey, nextChronologicalSlot, TIME_BANDS } from "./time.ts";
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
}

function chooseScene(
  band: TimeBand,
  localDate: string,
  history: readonly SceneId[],
  discoveries: GameState["discoveries"],
  randomSeed?: string,
): SceneDefinition {
  const candidates = getScenesForBand(band).filter(
    (scene) => scene.id !== "mimizouFarewell" || Boolean(discoveries.mimizouVisit),
  );
  const seed = randomSeed ? `${randomSeed}:scene` : `${localDate}:${band}:scene`;
  let candidate = candidates[indexFromSeed(seed, candidates.length)];
  if (!candidate) throw new Error(`No scenes registered for ${band}`);

  const lastTwo = history.slice(-2);
  const candidateId = candidate.id;
  if (lastTwo.length === 2 && lastTwo.every((sceneId) => sceneId === candidateId)) {
    const alternative = candidates.find((scene) => scene.id !== candidateId);
    if (alternative) candidate = alternative;
  }
  return candidate;
}

function createAssignment(now: Date, state: GameState, randomSeed?: string): SlotAssignment {
  const localDate = formatSlotDate(now);
  const band = getTimeBand(now);
  const slotKey = makeSlotKey(localDate, band);
  const scene = chooseScene(band, localDate, state.histories[band], state.discoveries, randomSeed);
  const variantSeed = randomSeed ?? slotKey;
  return {
    slotKey,
    localDate,
    band,
    sceneId: scene.id,
    lineIndex: indexFromSeed(`${variantSeed}:${scene.id}:line`, scene.lines.length),
    detailIndex: indexFromSeed(`${variantSeed}:${scene.id}:detail`, scene.details.length),
    createdAt: now.toISOString(),
  };
}

function recordNewAssignment(state: GameState, assignment: SlotAssignment): boolean {
  state.assignments[assignment.slotKey] = assignment;
  const history = state.histories[assignment.band];
  history.push(assignment.sceneId);
  if (history.length > 8) history.splice(0, history.length - 8);

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
  let assignment = options.randomSeed ? undefined : state.assignments[slotKey];
  let discoveredNow = false;

  if (!assignment) {
    assignment = createAssignment(now, state, options.randomSeed);
    discoveredNow = recordNewAssignment(state, assignment);
  }

  const scene = getScene(assignment.sceneId);
  const line = scene.lines[assignment.lineIndex];
  const detail = scene.details[assignment.detailIndex];
  if (line === undefined || detail === undefined) throw new Error(`Invalid variants for ${scene.id}`);
  const mimizouPresent =
    scene.id === "watchingStars" &&
    Boolean(state.discoveries.mimizouVisit) &&
    // 4択のシーン抽選と同じ法を使うと、FNVハッシュの下位ビットが相関して同時成立しない。
    indexFromSeed(`${slotKey}:mimizou-companion`, 3) === 0;

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
  state.echoes = state.echoes.filter((echo) => echo.targetSlotKey.slice(0, 10) >= oldest);
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

type LegacyTimeBand = Exclude<TimeBand, "morning">;

interface LegacyGameState {
  dataVersion: 1;
  assignments: Record<string, SlotAssignment>;
  histories: Record<LegacyTimeBand, SceneId[]>;
  interactions: Record<string, InteractionRecord>;
  echoes: EchoRecord[];
  discoveries: Partial<Record<SceneId, { firstSeenAt: string; seenCount: number }>>;
}

function isLegacyGameState(value: unknown): value is LegacyGameState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LegacyGameState>;
  const legacyBands: readonly LegacyTimeBand[] = ["deepNight", "earlyMorning", "daytime", "evening", "night"];
  return (
    candidate.dataVersion === 1 &&
    typeof candidate.assignments === "object" &&
    typeof candidate.histories === "object" &&
    typeof candidate.interactions === "object" &&
    Array.isArray(candidate.echoes) &&
    typeof candidate.discoveries === "object" &&
    legacyBands.every((band) => Array.isArray(candidate.histories?.[band]))
  );
}

function parseLegacySlotKey(slotKey: string): { localDate: string; band: LegacyTimeBand } | undefined {
  const match = /^(\d{4}-\d{2}-\d{2}):(deepNight|earlyMorning|daytime|evening|night)$/.exec(slotKey);
  if (!match) return undefined;
  const localDate = match[1];
  const band = match[2] as LegacyTimeBand | undefined;
  return localDate && band ? { localDate, band } : undefined;
}

function migrateLegacySlotKey(slotKey: string): string {
  const parsed = parseLegacySlotKey(slotKey);
  if (!parsed) return slotKey;
  if (parsed.band === "earlyMorning") return makeSlotKey(parsed.localDate, "morning");
  if (parsed.band === "deepNight") return makeSlotKey(addDays(parsed.localDate, -1), "deepNight");
  return slotKey;
}

function migrateLegacyEcho(echo: EchoRecord): EchoRecord {
  const source = parseLegacySlotKey(echo.sourceSlotKey);
  const sourceSlotKey = migrateLegacySlotKey(echo.sourceSlotKey);
  let targetSlotKey = echo.targetSlotKey;

  if (source && echo.kind === "later" && source.band === "night") {
    const target = parseLegacySlotKey(echo.targetSlotKey);
    if (target?.band === "deepNight") {
      targetSlotKey = makeSlotKey(addDays(target.localDate, -1), "deepNight");
    }
  } else if (source && echo.kind === "nextDay") {
    targetSlotKey = migrateLegacySlotKey(echo.targetSlotKey);
  }

  return {
    ...echo,
    id: echo.id.startsWith(`${echo.sourceSlotKey}:`)
      ? `${sourceSlotKey}${echo.id.slice(echo.sourceSlotKey.length)}`
      : echo.id,
    sourceSlotKey,
    targetSlotKey,
  };
}

function migrateLegacyState(state: LegacyGameState): GameState {
  const assignments: Record<string, SlotAssignment> = {};
  for (const assignment of Object.values(state.assignments)) {
    const slotKey = migrateLegacySlotKey(assignment.slotKey);
    const parsed = slotKey.split(":");
    const localDate = parsed[0] ?? assignment.localDate;
    const band = (parsed[1] ?? assignment.band) as TimeBand;
    assignments[slotKey] = { ...assignment, slotKey, localDate, band };
  }

  const interactions: Record<string, InteractionRecord> = {};
  for (const interaction of Object.values(state.interactions)) {
    const slotKey = migrateLegacySlotKey(interaction.slotKey);
    interactions[slotKey] = { ...interaction, slotKey };
  }

  return {
    dataVersion: 2,
    assignments,
    histories: {
      earlyMorning: [],
      morning: [...state.histories.earlyMorning],
      daytime: [...state.histories.daytime],
      evening: [...state.histories.evening],
      night: [...state.histories.night],
      deepNight: [...state.histories.deepNight],
    },
    interactions,
    echoes: state.echoes.map(migrateLegacyEcho),
    discoveries: structuredClone(state.discoveries),
  };
}

export function migrateGameState(value: unknown): GameState {
  if (isGameState(value)) return structuredClone(value);
  if (isLegacyGameState(value)) return migrateLegacyState(value);
  return createInitialState();
}
