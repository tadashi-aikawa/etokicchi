import { getUpdateMessages, UPDATES } from "../content/updates.ts";

export function createUpdatesLayer() {
  const layer = document.createElement("section");
  layer.className = "updates-layer";
  layer.hidden = true;
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.setAttribute("aria-labelledby", "updates-title");

  const header = document.createElement("header");
  header.className = "updates-header";
  const heading = document.createElement("div");
  const kicker = document.createElement("p");
  kicker.className = "collection-kicker";
  kicker.textContent = "ETO LIFE NEWS";
  const title = document.createElement("h2");
  title.id = "updates-title";
  title.textContent = "更新履歴";
  heading.append(kicker, title);
  const closeButton = document.createElement("button");
  closeButton.className = "collection-close";
  closeButton.type = "button";
  closeButton.textContent = "部屋へ戻る";
  header.append(heading, closeButton);
  const content = document.createElement("div");
  content.className = "updates-content";
  content.tabIndex = 0;
  content.setAttribute("aria-label", "過去の更新履歴");
  for (const [index, entry] of UPDATES.entries()) {
    const article = document.createElement("article");
    article.className = "update-entry";
    const dateHeading = document.createElement("h3");
    const date = document.createElement("time");
    date.dateTime = entry.date;
    date.textContent = entry.date.replaceAll("-", ".");
    dateHeading.append(date);
    if (index === 0) {
      const latest = document.createElement("span");
      latest.className = "update-latest";
      latest.textContent = "最新";
      dateHeading.append(latest);
    }
    const list = document.createElement("ul");
    for (const message of getUpdateMessages(entry)) {
      const item = document.createElement("li");
      item.textContent = message;
      list.append(item);
    }
    article.append(dateHeading, list);
    content.append(article);
  }
  layer.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    (document.activeElement === closeButton ? content : closeButton).focus({ preventScroll: true });
  });
  layer.append(header, content);
  return { layer, closeButton };
}
