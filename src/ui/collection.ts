import {
  ACHIEVEMENT_THRESHOLDS,
  countDiscoveries,
  getCollectionEntries,
  type CollectionEntry,
} from "../game/collection.ts";
import { TIME_BAND_LABELS, TIME_BANDS } from "../game/time.ts";
import type { GameState, TimeBand } from "../game/types.ts";

export interface CollectionLayer {
  layer: HTMLElement;
  closeButton: HTMLButtonElement;
  closeViewer: (restoreFocus?: boolean) => boolean;
}

type CollectionFilter = "all" | TimeBand;

function createParagraph(className: string, text: string): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.className = className;
  paragraph.textContent = text;
  return paragraph;
}

function focusWithoutScroll(element: HTMLElement): void {
  element.focus({ preventScroll: true });
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

function createAchievement(entry: CollectionEntry): HTMLElement {
  const achievement = document.createElement("div");
  achievement.className = "collection-achievement";

  const heading = document.createElement("div");
  heading.className = "collection-achievement-heading";
  const label = document.createElement("span");
  label.textContent = "達成度";
  const value = document.createElement("strong");
  value.textContent = `${entry.achievement.level}/${entry.achievement.totalLevels}`;
  heading.append(label, value);

  const meter = document.createElement("div");
  meter.className = "collection-achievement-meter";
  meter.setAttribute("role", "progressbar");
  const accessibleSceneName =
    entry.status === "discovered" ? entry.scene.title : `${TIME_BAND_LABELS[entry.scene.band]}の未発見シーン`;
  meter.setAttribute("aria-label", `${accessibleSceneName}の達成度`);
  meter.setAttribute("aria-valuemin", "0");
  meter.setAttribute("aria-valuemax", String(entry.achievement.totalLevels));
  meter.setAttribute("aria-valuenow", String(entry.achievement.level));
  for (const [index, threshold] of ACHIEVEMENT_THRESHOLDS.entries()) {
    const step = document.createElement("span");
    step.className = index < entry.achievement.level ? "is-complete" : "";
    step.title = `${threshold}回`;
    meter.append(step);
  }

  let note: string;
  if (entry.status === "locked") note = "解放後に記録開始";
  else if (entry.status === "available") note = "最初の出会いで1段階目";
  else if (entry.achievement.nextThreshold) note = `次は${entry.achievement.nextThreshold}回`;
  else note = `${entry.discovery?.seenCount ?? 0}回・最高段階`;

  achievement.append(heading, meter, createParagraph("collection-achievement-note", note));
  return achievement;
}

function createCollectionCard(
  entry: CollectionEntry,
  openViewer: (entry: CollectionEntry, trigger: HTMLButtonElement, imageSource: string) => void,
): HTMLElement {
  const card = document.createElement("article");
  card.className = `collection-card is-${entry.status}`;
  card.style.setProperty("--card-accent", entry.scene.accent);

  const illustration = document.createElement("img");
  illustration.className = "collection-illustration";
  illustration.src = `${import.meta.env.BASE_URL}${entry.imagePath}`;
  illustration.alt = "";
  illustration.loading = "lazy";
  illustration.decoding = "async";

  const band = createParagraph("collection-band", TIME_BAND_LABELS[entry.scene.band]);
  const emblem = document.createElement("div");
  emblem.className = "collection-emblem";
  emblem.setAttribute("aria-hidden", "true");
  emblem.textContent = entry.status === "discovered" ? "★" : entry.status === "locked" ? "🔒" : "？";

  const stateLabel = createParagraph(
    "collection-state-label",
    entry.status === "discovered" ? "発見済み" : entry.status === "locked" ? "ロック中" : "未遭遇",
  );
  const cardTitle = document.createElement("h4");
  cardTitle.textContent = entry.status === "discovered" ? entry.scene.title : "？？？";
  card.append(illustration, band, emblem, stateLabel, cardTitle);

  if (entry.status === "discovered" && entry.discovery) {
    card.append(
      createParagraph("collection-first-seen", `初発見 ${formatFirstSeen(entry.discovery.firstSeenAt)}`),
      createParagraph("collection-seen-count", `${entry.discovery.seenCount}回 出会った`),
    );
    const viewerButton = document.createElement("button");
    viewerButton.className = "collection-card-open";
    viewerButton.type = "button";
    viewerButton.setAttribute("aria-label", `${entry.scene.title}の画像を大きく見る`);
    viewerButton.setAttribute("aria-haspopup", "dialog");
    viewerButton.addEventListener("click", () => openViewer(entry, viewerButton, illustration.src));
    card.append(viewerButton);
  } else if (entry.status === "locked") {
    card.append(
      createParagraph("collection-state-detail", entry.scene.unlockRequirement?.hint ?? "条件を満たすと解放"),
    );
  } else {
    card.append(createParagraph("collection-state-detail", "この時間帯の抽選で出会える"));
  }

  card.append(createAchievement(entry));
  return card;
}

export function createCollectionLayer(state: GameState): CollectionLayer {
  const entries = getCollectionEntries(state.discoveries);
  const discoveredCount = countDiscoveries(state.discoveries);
  const achievedLevels = entries.reduce((total, entry) => total + entry.achievement.level, 0);
  const totalLevels = entries.length * ACHIEVEMENT_THRESHOLDS.length;

  const layer = document.createElement("section");
  layer.className = "collection-layer";
  layer.hidden = true;
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.setAttribute("aria-labelledby", "collection-title");

  const header = document.createElement("header");
  header.className = "collection-header";
  const headerMain = document.createElement("div");
  headerMain.className = "collection-header-main";
  const heading = document.createElement("div");
  const kicker = createParagraph("collection-kicker", "ETO LIFE ARCHIVE");
  const title = document.createElement("h2");
  title.id = "collection-title";
  title.textContent = "暮らし図鑑";
  const progress = createParagraph("collection-progress", `${discoveredCount} / ${entries.length} 発見`);
  const achievementProgress = createParagraph(
    "collection-total-achievement",
    `達成 ${achievedLevels} / ${totalLevels}`,
  );
  heading.append(kicker, title, progress, achievementProgress);
  const closeButton = document.createElement("button");
  closeButton.className = "collection-close";
  closeButton.type = "button";
  closeButton.textContent = "部屋へ戻る";
  headerMain.append(heading, closeButton);

  const filters = document.createElement("nav");
  filters.className = "collection-filters";
  filters.setAttribute("aria-label", "時間帯で絞り込む");

  const content = document.createElement("div");
  content.className = "collection-content";

  const viewer = document.createElement("div");
  viewer.className = "collection-viewer";
  viewer.hidden = true;
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-labelledby", "collection-viewer-title");
  const viewerScrim = document.createElement("button");
  viewerScrim.className = "collection-viewer-scrim";
  viewerScrim.type = "button";
  viewerScrim.tabIndex = -1;
  viewerScrim.setAttribute("aria-label", "画像を閉じる");
  const viewerPanel = document.createElement("article");
  viewerPanel.className = "collection-viewer-panel";
  const viewerImage = document.createElement("img");
  viewerImage.className = "collection-viewer-image";
  viewerImage.alt = "";
  const viewerMeta = document.createElement("div");
  viewerMeta.className = "collection-viewer-meta";
  const viewerBand = createParagraph("collection-viewer-band", "");
  const viewerTitle = document.createElement("h3");
  viewerTitle.id = "collection-viewer-title";
  const viewerClose = document.createElement("button");
  viewerClose.className = "collection-viewer-close";
  viewerClose.type = "button";
  viewerClose.textContent = "図鑑へ戻る";
  viewerMeta.append(viewerBand, viewerTitle, viewerClose);
  viewerPanel.append(viewerImage, viewerMeta);
  viewer.append(viewerScrim, viewerPanel);

  let viewerTrigger: HTMLButtonElement | null = null;
  const closeViewer = (restoreFocus = true): boolean => {
    if (viewer.hidden) return false;
    viewer.hidden = true;
    header.inert = false;
    content.inert = false;
    if (restoreFocus && viewerTrigger) focusWithoutScroll(viewerTrigger);
    viewerTrigger = null;
    return true;
  };
  const openViewer = (entry: CollectionEntry, trigger: HTMLButtonElement, imageSource: string): void => {
    viewerImage.src = imageSource;
    viewerImage.alt = entry.scene.title;
    viewerBand.textContent = `${TIME_BAND_LABELS[entry.scene.band]}の暮らし`;
    viewerTitle.textContent = entry.scene.title;
    viewerTrigger = trigger;
    header.inert = true;
    content.inert = true;
    viewer.hidden = false;
    focusWithoutScroll(viewerClose);
  };
  viewerScrim.addEventListener("click", () => closeViewer());
  viewerClose.addEventListener("click", () => closeViewer());
  viewer.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    focusWithoutScroll(viewerClose);
  });

  const sections = new Map<TimeBand, HTMLElement>();
  for (const timeBand of TIME_BANDS) {
    const bandEntries = entries.filter((entry) => entry.scene.band === timeBand);
    const bandDiscovered = bandEntries.filter((entry) => entry.status === "discovered").length;
    const section = document.createElement("section");
    section.className = "collection-group";
    section.dataset.band = timeBand;

    const sectionHeader = document.createElement("header");
    sectionHeader.className = "collection-group-header";
    const sectionTitle = document.createElement("h3");
    sectionTitle.textContent = `${TIME_BAND_LABELS[timeBand]}の暮らし`;
    const sectionProgress = createParagraph("collection-group-progress", `${bandDiscovered} / ${bandEntries.length}`);
    sectionHeader.append(sectionTitle, sectionProgress);

    const grid = document.createElement("div");
    grid.className = "collection-grid";
    for (const entry of bandEntries) grid.append(createCollectionCard(entry, openViewer));
    section.append(sectionHeader, grid);
    content.append(section);
    sections.set(timeBand, section);
  }

  const filterButtons = new Map<CollectionFilter, HTMLButtonElement>();
  const setFilter = (selected: CollectionFilter): void => {
    for (const [filter, button] of filterButtons) button.setAttribute("aria-pressed", String(filter === selected));
    for (const [timeBand, section] of sections) section.hidden = selected !== "all" && selected !== timeBand;
  };
  const filterDefinitions: ReadonlyArray<readonly [CollectionFilter, string]> = [
    ["all", "すべて"],
    ...TIME_BANDS.map((timeBand) => [timeBand, TIME_BAND_LABELS[timeBand]] as const),
  ];
  for (const [filter, label] of filterDefinitions) {
    const button = document.createElement("button");
    button.className = "collection-filter";
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(filter === "all"));
    button.addEventListener("click", () => setFilter(filter));
    filters.append(button);
    filterButtons.set(filter, button);
  }

  header.append(headerMain, filters);
  layer.append(header, content, viewer);
  return { layer, closeButton, closeViewer };
}
