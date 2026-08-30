import "./styles.css";
import { applyInteraction, pruneOldSlots, resolveVisit } from "./game/state.ts";
import { formatLocalDate, TIME_BAND_LABELS } from "./game/time.ts";
import type { GameState, StateRepository, VisitView } from "./game/types.ts";
import { IndexedDbStateRepository, MemoryStateRepository } from "./persistence/indexed-db-repository.ts";
import { renderRoom } from "./rendering/room.ts";

function getRequestedTime(): Date {
  const requested = new URLSearchParams(window.location.search).get("time");
  if (!requested) return new Date();
  const parsed = new Date(requested);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(date);
}

function createShell(
  root: HTMLElement,
  visit: VisitView,
  now: Date,
): {
  roomHost: HTMLElement;
  speech: HTMLElement;
  choices: HTMLElement;
  result: HTMLElement;
  toast: HTMLElement;
} {
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
  brandSmall.textContent = "ETO LIFE";
  const brandName = document.createElement("strong");
  brandName.textContent = "エトキっち";
  brand.append(brandSmall, brandName);

  const clock = document.createElement("div");
  clock.className = "clock";
  const dateLabel = document.createElement("small");
  dateLabel.textContent = formatDateLabel(now);
  const time = document.createElement("time");
  time.dateTime = now.toISOString();
  time.textContent = formatClock(now);
  clock.append(dateLabel, time);
  topBar.append(brand, clock);

  const panel = document.createElement("article");
  panel.className = "scene-panel";
  const kicker = document.createElement("p");
  kicker.className = "scene-kicker";
  kicker.textContent = `${TIME_BAND_LABELS[visit.assignment.band]}の暮らし`;
  const title = document.createElement("h1");
  title.className = "scene-title";
  title.textContent = visit.scene.title;
  const description = document.createElement("p");
  description.className = "scene-description";
  description.textContent = visit.scene.description;
  const detail = document.createElement("p");
  detail.className = "scene-detail";
  detail.textContent = visit.detail;
  const speech = document.createElement("p");
  speech.className = "speech";
  speech.textContent = visit.line;
  const echoBox = document.createElement("div");
  for (const echo of visit.echoes) {
    const echoText = document.createElement("p");
    echoText.className = "echo";
    echoText.textContent = echo.text;
    echoBox.append(echoText);
  }
  const choices = document.createElement("div");
  choices.className = "choice-list";
  const result = document.createElement("p");
  result.className = "interaction-result";
  result.hidden = true;
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = "エトキチや部屋のものをタップしてみてね";
  panel.append(kicker, title, description, detail, speech, echoBox, choices, result, hint);

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.hidden = true;
  shell.append(roomHost, topBar, panel, toast);
  root.replaceChildren(shell);
  return { roomHost, speech, choices, result, toast };
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

async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("Application root is missing");
  root.innerHTML = '<p class="loading">エトキチの暮らしを見に行っています……</p>';

  const now = getRequestedTime();
  const loaded = await loadRepository();
  let state = pruneOldSlots(loaded.state, formatLocalDate(now));
  const resolved = resolveVisit(now, state);
  state = resolved.state;
  await loaded.repository.save(state);

  const elements = createShell(root, resolved.visit, now);
  const showObservation = (text: string): void => {
    elements.speech.textContent = text;
  };
  await renderRoom(elements.roomHost, resolved.visit, showObservation);

  if (!loaded.persistent) {
    const warning = document.createElement("p");
    warning.className = "storage-warning";
    warning.textContent = "ブラウザ保存を利用できないため、このタブを閉じると記録が消えます。";
    elements.roomHost.parentElement?.append(warning);
  }

  if (resolved.visit.discoveredNow) {
    elements.toast.textContent = `はじめての暮らし「${resolved.visit.scene.title}」`;
    elements.toast.hidden = false;
    window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 3200);
  }

  const existingInteraction = resolved.visit.interaction;
  if (existingInteraction) {
    elements.result.textContent = existingInteraction.immediate;
    elements.result.hidden = false;
  } else {
    for (const choice of resolved.visit.scene.choices ?? []) {
      const button = document.createElement("button");
      button.className = "choice-button";
      button.type = "button";
      button.textContent = choice.label;
      button.addEventListener("click", async () => {
        const applied = applyInteraction(state, resolved.visit.assignment.slotKey, choice.id, now);
        state = applied.state;
        await loaded.repository.save(state);
        elements.choices.replaceChildren();
        elements.result.textContent = applied.interaction.immediate;
        elements.result.hidden = false;
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
