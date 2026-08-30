import "./styles.css";
import { countDiscoveries, getCollectionEntries } from "./game/collection.ts";
import { isRandomDebugMode } from "./game/debug.ts";
import { applyInteraction, createInitialState, pruneOldSlots, resolveVisit } from "./game/state.ts";
import { formatLocalDate, TIME_BAND_LABELS } from "./game/time.ts";
import type { GameState, StateRepository, VisitView } from "./game/types.ts";
import { IndexedDbStateRepository, MemoryStateRepository } from "./persistence/indexed-db-repository.ts";
import { renderRoom } from "./rendering/room.ts";

interface LaunchOptions {
  now: Date;
  debugRandom: boolean;
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
}

function getLaunchOptions(): LaunchOptions {
  const parameters = new URLSearchParams(window.location.search);
  const requested = parameters.get("time");
  const parsed = requested ? new Date(requested) : new Date();
  return {
    now: Number.isNaN(parsed.getTime()) ? new Date() : parsed,
    debugRandom: isRandomDebugMode(parameters),
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

function formatFirstSeen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "発見日時を記録済み";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function createCollectionLayer(state: GameState): { layer: HTMLElement; closeButton: HTMLButtonElement } {
  const entries = getCollectionEntries(state.discoveries);
  const discoveredCount = countDiscoveries(state.discoveries);
  const layer = document.createElement("section");
  layer.className = "collection-layer";
  layer.hidden = true;
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.setAttribute("aria-labelledby", "collection-title");

  const header = document.createElement("header");
  header.className = "collection-header";
  const heading = document.createElement("div");
  const kicker = createParagraph("collection-kicker", "ETO LIFE ARCHIVE");
  const title = document.createElement("h2");
  title.id = "collection-title";
  title.textContent = "暮らし図鑑";
  const progress = createParagraph("collection-progress", `${discoveredCount} / ${entries.length} 発見`);
  heading.append(kicker, title, progress);
  const closeButton = document.createElement("button");
  closeButton.className = "collection-close";
  closeButton.type = "button";
  closeButton.textContent = "部屋へ戻る";
  header.append(heading, closeButton);

  const cards = document.createElement("div");
  cards.className = "collection-grid";
  for (const { scene, discovery } of entries) {
    const card = document.createElement("article");
    card.className = `collection-card ${discovery ? "is-discovered" : "is-locked"}`;
    card.style.setProperty("--card-accent", scene.accent);
    const band = createParagraph("collection-band", TIME_BAND_LABELS[scene.band]);
    const emblem = document.createElement("div");
    emblem.className = "collection-emblem";
    emblem.setAttribute("aria-hidden", "true");
    emblem.textContent = discovery ? "★" : "？";
    const cardTitle = document.createElement("h3");
    cardTitle.textContent = discovery ? scene.title : "？？？";
    card.append(band, emblem, cardTitle);
    if (discovery) {
      card.append(
        createParagraph("collection-first-seen", `初発見 ${formatFirstSeen(discovery.firstSeenAt)}`),
        createParagraph("collection-seen-count", `${discovery.seenCount}回 出会った`),
      );
    } else {
      card.append(createParagraph("collection-locked-label", "まだ出会っていない暮らし"));
    }
    cards.append(card);
  }

  layer.append(header, cards);
  return { layer, closeButton };
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
  collectionButton.textContent = `図鑑 ${countDiscoveries(state.discoveries)}/10`;
  collectionButton.setAttribute("aria-haspopup", "dialog");
  const topMenu = document.createElement("div");
  topMenu.className = "top-menu";
  topMenu.append(brand, collectionButton);

  const clock = document.createElement("div");
  clock.className = "clock";
  const dateLabel = document.createElement("small");
  dateLabel.textContent = formatDateLabel(now);
  const time = document.createElement("time");
  time.dateTime = now.toISOString();
  time.textContent = formatClock(now);
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
    closeButton.focus();
  };
  const closeSheet = (): void => {
    sheetLayer.hidden = true;
    shell.classList.remove("sheet-open");
    openButton.focus();
  };
  const openCollection = (): void => {
    sheetLayer.hidden = true;
    collection.layer.hidden = false;
    collection.closeButton.focus();
  };
  const closeCollection = (): void => {
    collection.layer.hidden = true;
    collectionButton.focus();
  };
  openButton.addEventListener("click", openSheet);
  closeButton.addEventListener("click", closeSheet);
  scrim.addEventListener("click", closeSheet);
  collectionButton.addEventListener("click", openCollection);
  collection.closeButton.addEventListener("click", closeCollection);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!collection.layer.hidden) closeCollection();
    else if (!sheetLayer.hidden) closeSheet();
  });

  shell.append(roomHost, topBar, hud, sheetLayer, collection.layer, toast);
  root.replaceChildren(shell);
  return { roomHost, summarySpeech, sheetSpeech, choices, result, toast, openButton, openSheet };
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
  let state = pruneOldSlots(loaded.state, formatLocalDate(options.now));
  const resolved = resolveVisit(options.now, state, {
    randomSeed: options.debugRandom ? crypto.randomUUID() : undefined,
  });
  state = resolved.state;
  await loaded.repository.save(state);

  const elements = createShell(root, resolved.visit, options.now, options.debugRandom, state);
  const showObservation = (text: string): void => {
    elements.summarySpeech.textContent = text;
    elements.sheetSpeech.textContent = text;
  };
  await renderRoom(elements.roomHost, resolved.visit, {
    onObservation: showObservation,
    onCharacterTap: elements.openSheet,
  });

  if (!loaded.persistent) {
    const warning = createParagraph(
      "storage-warning",
      "ブラウザ保存を利用できないため、このタブを閉じると記録が消えます。",
    );
    elements.roomHost.parentElement?.append(warning);
  }

  if (resolved.visit.discoveredNow && !options.debugRandom) {
    const label = createParagraph("achievement-label", "実績解除");
    const title = document.createElement("strong");
    title.textContent = "新しい暮らしを発見！";
    const scene = createParagraph("achievement-scene", resolved.visit.scene.title);
    const progress = createParagraph("achievement-progress", `暮らし図鑑 ${countDiscoveries(state.discoveries)} / 10`);
    elements.toast.replaceChildren(label, title, scene, progress);
    elements.toast.hidden = false;
    window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 4500);
  }

  const existingInteraction = resolved.visit.interaction;
  if (existingInteraction) {
    elements.result.textContent = existingInteraction.immediate;
    elements.result.hidden = false;
    elements.openButton.textContent = "結果";
  } else {
    for (const choice of resolved.visit.scene.choices ?? []) {
      const button = document.createElement("button");
      button.className = "choice-button";
      button.type = "button";
      button.textContent = choice.label;
      button.addEventListener("click", async () => {
        const applied = applyInteraction(state, resolved.visit.assignment.slotKey, choice.id, options.now);
        state = applied.state;
        await loaded.repository.save(state);
        elements.choices.replaceChildren();
        elements.result.textContent = applied.interaction.immediate;
        elements.result.hidden = false;
        elements.summarySpeech.textContent = applied.interaction.immediate;
        elements.openButton.textContent = "結果";
      });
      elements.choices.append(button);
    }
  }
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  const root = document.querySelector<HTMLElement>("#app");
  if (root) root.innerHTML = '<p class="fatal">エトキチの部屋を開けませんでした。再読み込みしてみてください。</p>';
});
