import { getScene, getScenesForBand } from "../content/scenes.ts";
import { indexFromSeed } from "./random.ts";
import { addDays, formatLocalDate, getTimeBand, makeSlotKey, nextChronologicalSlot, TIME_BANDS } from "./time.ts";
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
    dataVersion: 1,
    assignments: {},
    histories: {
      deepNight: [],
      earlyMorning: [],
      daytime: [],
      evening: [],
      night: [],
    },
    interactions: {},
    echoes: [],
    discoveries: {},
  };
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function chooseScene(band: TimeBand, localDate: string, history: readonly SceneId[]): SceneDefinition {
  const candidates = getScenesForBand(band);
  let candidate = candidates[indexFromSeed(`${localDate}:${band}:scene`, candidates.length)];
  if (!candidate) throw new Error(`No scenes registered for ${band}`);

  const lastTwo = history.slice(-2);
  const candidateId = candidate.id;
  if (lastTwo.length === 2 && lastTwo.every((sceneId) => sceneId === candidateId)) {
    const alternative = candidates.find((scene) => scene.id !== candidateId);
    if (alternative) candidate = alternative;
  }
  return candidate;
}

function createAssignment(now: Date, state: GameState): SlotAssignment {
  const localDate = formatLocalDate(now);
  const band = getTimeBand(now);
  const slotKey = makeSlotKey(localDate, band);
  const scene = chooseScene(band, localDate, state.histories[band]);
  return {
    slotKey,
    localDate,
    band,
    sceneId: scene.id,
    lineIndex: indexFromSeed(`${slotKey}:${scene.id}:line`, scene.lines.length),
    detailIndex: indexFromSeed(`${slotKey}:${scene.id}:detail`, scene.details.length),
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

export function resolveVisit(now: Date, sourceState: GameState): { state: GameState; visit: VisitView } {
  const state = cloneState(sourceState);
  const localDate = formatLocalDate(now);
  const band = getTimeBand(now);
  const slotKey = makeSlotKey(localDate, band);
  let assignment = state.assignments[slotKey];
  let discoveredNow = false;

  if (!assignment) {
    assignment = createAssignment(now, state);
    discoveredNow = recordNewAssignment(state, assignment);
  }

  const scene = getScene(assignment.sceneId);
  const line = scene.lines[assignment.lineIndex];
  const detail = scene.details[assignment.detailIndex];
  if (line === undefined || detail === undefined) throw new Error(`Invalid variants for ${scene.id}`);

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
    candidate.dataVersion === 1 &&
    typeof candidate.assignments === "object" &&
    typeof candidate.histories === "object" &&
    typeof candidate.interactions === "object" &&
    Array.isArray(candidate.echoes) &&
    typeof candidate.discoveries === "object" &&
    TIME_BANDS.every((band) => Array.isArray(candidate.histories?.[band]))
  );
}
