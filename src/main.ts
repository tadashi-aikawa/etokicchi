import "./styles.css";
import { countDiscoveries, getCollectionImagePath, SCENE_COUNT } from "./game/collection.ts";
import { getDebugSceneId, isRandomDebugMode } from "./game/debug.ts";
import { applyInteraction, createInitialState, pruneOldSlots, resolveVisit } from "./game/state.ts";
import { formatLocalDate, getSlotKey, millisecondsUntilNextMinute, TIME_BAND_LABELS } from "./game/time.ts";
import type { GameState, SceneId, StateRepository, VisitView } from "./game/types.ts";
import { IndexedDbStateRepository, MemoryStateRepository } from "./persistence/indexed-db-repository.ts";
import { renderRoom, type RenderedRoom } from "./rendering/room.ts";
import { createCollectionLayer } from "./ui/collection.ts";

interface LaunchOptions {
  getNow: () => Date;
  liveTime: boolean;
  debugRandom: boolean;
  debugSceneId?: SceneId;
}

interface ShellElements {
  roomHost: HTMLElement;
  summarySpeech: HTMLElement;
  sheetSpeech: HTMLElement;
  choices: HTMLElement;
  result: HTMLElement;
  toast: HTMLElement;
  openButton: HTMLButtonElement;
  openSheet: () => void;
  updateClock: (now: Date) => void;
  dispose: () => void;
}

function getLaunchOptions(): LaunchOptions {
  const parameters = new URLSearchParams(window.location.search);
  const requested = parameters.get("time");
  const parsed = requested ? new Date(requested) : undefined;
  const fixedNow = parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
  return {
    getNow: fixedNow ? () => new Date(fixedNow) : () => new Date(),
    liveTime: !fixedNow,
    debugRandom: isRandomDebugMode(parameters),
    debugSceneId: getDebugSceneId(parameters),
  };
}

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(date);
}

function createParagraph(className: string, text: string): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.className = className;
  paragraph.textContent = text;
  return paragraph;
}

function focusWithoutScroll(element: HTMLElement): void {
  element.focus({ preventScroll: true });
}

function createShell(
  root: HTMLElement,
  visit: VisitView,
  now: Date,
  debugRandom: boolean,
  state: GameState,
): ShellElements {
  const shell = document.createElement("section");
  shell.className = "game-shell";
  shell.style.setProperty("--scene-accent", visit.scene.accent);

  const roomHost = document.createElement("div");
  roomHost.className = "room-host";

  const topBar = document.createElement("header");
  topBar.className = "top-bar";
  const brand = document.createElement("div");
  brand.className = "brand";
  const brandSmall = document.createElement("small");
  brandSmall.textContent = debugRandom ? "DEBUG RANDOM" : "ETO LIFE";
  const brandName = document.createElement("strong");
  brandName.textContent = "エトキっち";
  brand.append(brandSmall, brandName);
  const collectionButton = document.createElement("button");
  collectionButton.className = "collection-button";
  collectionButton.type = "button";
  collectionButton.textContent = `図鑑 ${countDiscoveries(state.discoveries)}/${SCENE_COUNT}`;
  collectionButton.setAttribute("aria-haspopup", "dialog");
  const topMenu = document.createElement("div");
  topMenu.className = "top-menu";
  topMenu.append(brand, collectionButton);

  const clock = document.createElement("div");
  clock.className = "clock";
  const dateLabel = document.createElement("small");
  dateLabel.textContent = formatDateLabel(now);
  const time = document.createElement("time");
  clock.append(dateLabel, time);
  topBar.append(topMenu, clock);

  const hud = document.createElement("article");
  hud.className = "scene-hud";
  const hudText = document.createElement("div");
  hudText.className = "hud-text";
  const kicker = createParagraph("scene-kicker", `${TIME_BAND_LABELS[visit.assignment.band]}の暮らし`);
  const title = document.createElement("h1");
  title.className = "scene-title";
  title.textContent = visit.scene.title;
  const summarySpeech = createParagraph("summary-speech", visit.line);
  hudText.append(kicker, title, summarySpeech);
  const openButton = document.createElement("button");
  openButton.className = "hud-action";
  openButton.type = "button";
  openButton.textContent = visit.scene.choices?.length ? "関わる" : "見る";
  openButton.setAttribute("aria-haspopup", "dialog");
  hud.append(hudText, openButton);

  const sheetLayer = document.createElement("div");
  sheetLayer.className = "sheet-layer";
  sheetLayer.hidden = true;
  const scrim = document.createElement("button");
  scrim.className = "sheet-scrim";
  scrim.type = "button";
  scrim.setAttribute("aria-label", "閉じる");
  const sheet = document.createElement("article");
  sheet.className = "scene-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "scene-sheet-title");
  const sheetHeader = document.createElement("header");
  sheetHeader.className = "sheet-header";
  const sheetHeading = document.createElement("div");
  const sheetKicker = createParagraph("scene-kicker", `${TIME_BAND_LABELS[visit.assignment.band]}の暮らし`);
  const sheetTitle = document.createElement("h2");
  sheetTitle.id = "scene-sheet-title";
  sheetTitle.className = "sheet-title";
  sheetTitle.textContent = visit.scene.title;
  sheetHeading.append(sheetKicker, sheetTitle);
  const closeButton = document.createElement("button");
  closeButton.className = "sheet-close";
  closeButton.type = "button";
  closeButton.textContent = "閉じる";
  sheetHeader.append(sheetHeading, closeButton);

  const description = createParagraph("scene-description", visit.scene.description);
  const detail = createParagraph("scene-detail", visit.detail);
  const sheetSpeech = createParagraph("speech", visit.line);
  const echoBox = document.createElement("div");
  echoBox.className = "echo-list";
  for (const echo of visit.echoes) {
    echoBox.append(createParagraph("echo", echo.text));
  }
  const choices = document.createElement("div");
  choices.className = "choice-list";
  const result = createParagraph("interaction-result", "");
  result.hidden = true;
  sheet.append(sheetHeader, description, detail, sheetSpeech, echoBox, choices, result);
  sheetLayer.append(scrim, sheet);

  const collection = createCollectionLayer(state);

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.hidden = true;

  const openSheet = (): void => {
    sheetLayer.hidden = false;
    shell.classList.add("sheet-open");
    focusWithoutScroll(closeButton);
  };
  const closeSheet = (): void => {
    sheetLayer.hidden = true;
    shell.classList.remove("sheet-open");
    focusWithoutScroll(openButton);
  };
  const openCollection = (): void => {
    sheetLayer.hidden = true;
    shell.classList.remove("sheet-open");
    collection.layer.hidden = false;
    focusWithoutScroll(collection.closeButton);
  };
  const closeCollection = (): void => {
    collection.closeViewer(false);
    collection.layer.hidden = true;
    focusWithoutScroll(collectionButton);
  };
  openButton.addEventListener("click", openSheet);
  closeButton.addEventListener("click", closeSheet);
  scrim.addEventListener("click", closeSheet);
  collectionButton.addEventListener("click", openCollection);
  collection.closeButton.addEventListener("click", closeCollection);
  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    if (collection.closeViewer()) return;
    if (!collection.layer.hidden) closeCollection();
    else if (!sheetLayer.hidden) closeSheet();
  };
  document.addEventListener("keydown", handleKeydown);

  const updateClock = (nextNow: Date): void => {
    dateLabel.textContent = formatDateLabel(nextNow);
    time.dateTime = nextNow.toISOString();
    time.textContent = formatClock(nextNow);
  };
  updateClock(now);

  shell.append(roomHost, topBar, hud, sheetLayer, collection.layer, toast);
  root.replaceChildren(shell);
  return {
    roomHost,
    summarySpeech,
    sheetSpeech,
    choices,
    result,
    toast,
    openButton,
    openSheet,
    updateClock,
    dispose: () => document.removeEventListener("keydown", handleKeydown),
  };
}

async function loadRepository(): Promise<{ repository: StateRepository; state: GameState; persistent: boolean }> {
  const repository = new IndexedDbStateRepository();
  try {
    return { repository, state: await repository.load(), persistent: true };
  } catch (error) {
    console.warn("IndexedDBを利用できないため、このタブだけの保存へ切り替えます。", error);
    const fallback = new MemoryStateRepository();
    return { repository: fallback, state: await fallback.load(), persistent: false };
  }
}

async function loadDebugRepository(): Promise<{ repository: StateRepository; state: GameState; persistent: boolean }> {
  const repository = new MemoryStateRepository(createInitialState());
  return { repository, state: await repository.load(), persistent: true };
}

async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("Application root is missing");
  root.innerHTML = '<p class="loading">エトキチの暮らしを見に行っています……</p>';

  const options = getLaunchOptions();
  const loaded = options.debugRandom ? await loadDebugRepository() : await loadRepository();
  const initialNow = options.getNow();
  let state = pruneOldSlots(loaded.state, formatLocalDate(initialNow));
  const resolved = resolveVisit(initialNow, state, {
    randomSeed: options.debugRandom ? crypto.randomUUID() : undefined,
    sceneId: options.debugSceneId,
  });
  state = resolved.state;
  await loaded.repository.save(state);

  let currentVisit: VisitView | undefined;
  let currentElements: ShellElements | undefined;
  let currentRoom: RenderedRoom | undefined;
  let operationQueue = Promise.resolve();

  const enqueue = (operation: () => Promise<void>): Promise<void> => {
    operationQueue = operationQueue.then(operation).catch((error: unknown) => {
      console.error("時刻との同期に失敗しました。", error);
    });
    return operationQueue;
  };

  const showAchievement = (elements: ShellElements, visit: VisitView): void => {
    if (!visit.discoveredNow || options.debugRandom) return;
    const illustration = document.createElement("img");
    illustration.className = "achievement-illustration";
    illustration.src = `${import.meta.env.BASE_URL}${getCollectionImagePath(visit.scene.id)}`;
    illustration.alt = "";
    const label = createParagraph("achievement-label", "実績解除");
    const title = document.createElement("strong");
    title.textContent = "新しい暮らしを発見！";
    const scene = createParagraph("achievement-scene", visit.scene.title);
    const progress = createParagraph(
      "achievement-progress",
      `暮らし図鑑 ${countDiscoveries(state.discoveries)} / ${SCENE_COUNT}`,
    );
    const body = document.createElement("div");
    body.className = "achievement-body";
    body.append(label, title, scene, progress);
    elements.toast.replaceChildren(illustration, body);
    elements.toast.hidden = false;
    window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 4500);
  };

  const mountVisit = async (now: Date, visit: VisitView): Promise<void> => {
    currentRoom?.destroy();
    currentElements?.dispose();
    currentVisit = visit;
    const elements = createShell(root, visit, now, options.debugRandom, state);
    currentElements = elements;
    const showObservation = (text: string): void => {
      elements.summarySpeech.textContent = text;
      elements.sheetSpeech.textContent = text;
    };
    const roomCallbacks = {
      onObservation: showObservation,
      onCharacterTap: elements.openSheet,
    };
    currentRoom = await renderRoom(elements.roomHost, visit, roomCallbacks, now);

    if (!loaded.persistent) {
      const warning = createParagraph(
        "storage-warning",
        "ブラウザ保存を利用できないため、このタブを閉じると記録が消えます。",
      );
      elements.roomHost.parentElement?.append(warning);
    }

    showAchievement(elements, visit);
    const existingInteraction = visit.interaction;
    if (existingInteraction) {
      elements.result.textContent = existingInteraction.immediate;
      elements.result.hidden = false;
      elements.openButton.textContent = "結果";
      return;
    }

    for (const choice of visit.scene.choices ?? []) {
      const button = document.createElement("button");
      button.className = "choice-button";
      button.type = "button";
      button.textContent = choice.label;
      button.addEventListener("click", () => {
        void enqueue(async () => {
          if (currentVisit !== visit || currentElements !== elements) return;
          const interactionNow = options.getNow();
          if (getSlotKey(interactionNow) !== visit.assignment.slotKey) {
            await refreshAt(interactionNow);
            return;
          }
          const applied = applyInteraction(state, visit.assignment.slotKey, choice.id, interactionNow);
          state = applied.state;
          await loaded.repository.save(state);
          elements.choices.replaceChildren();
          elements.result.textContent = applied.interaction.immediate;
          elements.result.hidden = false;
          elements.summarySpeech.textContent = applied.interaction.immediate;
          elements.openButton.textContent = "結果";
          const nextRoom = await renderRoom(
            elements.roomHost,
            { ...visit, interaction: applied.interaction },
            roomCallbacks,
            interactionNow,
          );
          if (currentVisit !== visit || currentElements !== elements) {
            nextRoom.destroy();
            return;
          }
          currentRoom?.destroy();
          currentRoom = nextRoom;
        });
      });
      elements.choices.append(button);
    }
  };

  async function refreshAt(now: Date): Promise<void> {
    if (!currentVisit || !currentElements || !currentRoom) return;
    currentElements.updateClock(now);
    if (getSlotKey(now) === currentVisit.assignment.slotKey) {
      currentRoom.updateClock(now);
      return;
    }

    state = pruneOldSlots(state, formatLocalDate(now));
    const next = resolveVisit(now, state, {
      randomSeed: options.debugRandom ? crypto.randomUUID() : undefined,
      sceneId: options.debugSceneId,
    });
    state = next.state;
    await loaded.repository.save(state);
    await mountVisit(now, next.visit);
  }

  await mountVisit(initialNow, resolved.visit);

  if (options.liveTime) {
    let timerId: number | undefined;
    let scheduleVersion = 0;
    const scheduleNextMinute = (): void => {
      const version = ++scheduleVersion;
      timerId = window.setTimeout(() => {
        if (version !== scheduleVersion) return;
        void enqueue(() => refreshAt(options.getNow())).finally(() => {
          if (version === scheduleVersion) scheduleNextMinute();
        });
      }, millisecondsUntilNextMinute(options.getNow()));
    };
    const syncWhenVisible = (): void => {
      if (document.visibilityState !== "visible") return;
      scheduleVersion += 1;
      if (timerId !== undefined) window.clearTimeout(timerId);
      const version = scheduleVersion;
      void enqueue(() => refreshAt(options.getNow())).finally(() => {
        if (version === scheduleVersion) scheduleNextMinute();
      });
    };
    document.addEventListener("visibilitychange", syncWhenVisible);
    scheduleNextMinute();
  }
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  const root = document.querySelector<HTMLElement>("#app");
  if (root) root.innerHTML = '<p class="fatal">エトキチの部屋を開けませんでした。再読み込みしてみてください。</p>';
});
