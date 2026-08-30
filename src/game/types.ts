export type TimeBand = "deepNight" | "earlyMorning" | "daytime" | "evening" | "night";

export type SceneId =
  | "sleeping"
  | "kickedBlanket"
  | "tooMuchBreakfast"
  | "overslept"
  | "foundOldToy"
  | "windowNap"
  | "muddyReturn"
  | "simmeringDinner"
  | "packingTomorrow"
  | "littleNightSnack";

export interface ChoiceDefinition {
  id: string;
  label: string;
  immediate: string;
  later: string;
  nextDay: string;
}

export interface SceneDefinition {
  id: SceneId;
  band: TimeBand;
  title: string;
  description: string;
  lines: readonly string[];
  details: readonly string[];
  choices?: readonly ChoiceDefinition[];
  characterPose: "stand" | "sleep" | "busy";
  accent: string;
}

export interface SlotAssignment {
  slotKey: string;
  localDate: string;
  band: TimeBand;
  sceneId: SceneId;
  lineIndex: number;
  detailIndex: number;
  createdAt: string;
}

export interface InteractionRecord {
  slotKey: string;
  choiceId: string;
  immediate: string;
  selectedAt: string;
}

export interface EchoRecord {
  id: string;
  sourceSlotKey: string;
  targetSlotKey: string;
  text: string;
  kind: "later" | "nextDay";
}

export interface DiscoveryRecord {
  firstSeenAt: string;
  seenCount: number;
}

export interface GameState {
  dataVersion: 1;
  assignments: Record<string, SlotAssignment>;
  histories: Record<TimeBand, SceneId[]>;
  interactions: Record<string, InteractionRecord>;
  echoes: EchoRecord[];
  discoveries: Partial<Record<SceneId, DiscoveryRecord>>;
}

export interface VisitView {
  assignment: SlotAssignment;
  scene: SceneDefinition;
  line: string;
  detail: string;
  echoes: EchoRecord[];
  interaction?: InteractionRecord;
  discoveredNow: boolean;
}

export interface StateRepository {
  load(): Promise<GameState>;
  save(state: GameState): Promise<void>;
}
