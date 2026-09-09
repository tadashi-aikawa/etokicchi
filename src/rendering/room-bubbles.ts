import type { Application, Container } from "pixi.js";
import type { CharacterBubblePresentation } from "./room-presentation-types.ts";
import { resolveSpeechBubblePlacement, resolveSpeechTargetBounds, type SpeechContentBounds } from "./room-speech.ts";
import { ROOM_HEIGHT, ROOM_WIDTH } from "./scene-assets.ts";

/** シーンに固定で出るフキダシ。エトキチの現在位置へ毎フレーム追随する。 */
export function createCharacterBubbleElement(
  app: Application,
  character: Container,
  presentation: CharacterBubblePresentation,
): HTMLDivElement {
  const bubble = document.createElement("div");
  bubble.className = `room-character-bubble is-${presentation.kind}`;
  if (presentation.tailSide) bubble.classList.add(`tail-${presentation.tailSide}`);
  bubble.textContent = presentation.text;
  bubble.style.width = `${(presentation.width / ROOM_WIDTH) * 100}%`;
  bubble.style.minHeight = `${(presentation.height / ROOM_HEIGHT) * 100}%`;

  const updatePosition = (): void => {
    bubble.style.left = `${((character.x + presentation.offset.x) / ROOM_WIDTH) * 100}%`;
    bubble.style.top = `${((character.y + presentation.offset.y) / ROOM_HEIGHT) * 100}%`;
  };
  updatePosition();
  app.ticker.add(updatePosition);
  return bubble;
}

export interface SpeechBubble {
  element: HTMLDivElement;
  show: (text: string, durationMs: number, target?: Container, contentBounds?: SpeechContentBounds) => void;
  destroy: () => void;
}

/** タップに応じて出るセリフのフキダシ。表示中だけ位置を更新し、時間で自動的に消える。 */
export function createSpeechBubble(
  app: Application,
  host: HTMLElement,
  defaultTarget: Container,
  onVisibilityChange: (visible: boolean) => void,
): SpeechBubble {
  const element = document.createElement("div");
  element.className = "room-speech-bubble";
  const label = document.createElement("span");
  label.className = "room-speech-bubble-text";
  const tail = document.createElement("span");
  tail.className = "room-speech-bubble-tail";
  element.append(label, tail);

  let roomWidth = host.clientWidth;
  let roomHeight = host.clientHeight;
  const roomResize = new ResizeObserver(() => {
    roomWidth = host.clientWidth;
    roomHeight = host.clientHeight;
  });
  roomResize.observe(host);

  let visible = false;
  let target = defaultTarget;
  let bubbleWidth = 0;
  let bubbleHeight = 0;
  let characterTop = 0;
  let characterCenter = 0;
  let characterWidth = 0;
  let tailSide = "";
  let timerId: number | undefined;

  const update = (): void => {
    if (!visible) return;
    const scaleX = roomWidth / ROOM_WIDTH;
    const scaleY = roomHeight / ROOM_HEIGHT;
    const placement = resolveSpeechBubblePlacement({
      roomWidth,
      roomHeight,
      characterX: (target.x + characterCenter) * scaleX,
      characterTopY: (target.y + characterTop) * scaleY,
      characterWidth: characterWidth * scaleX,
      bubbleWidth,
      bubbleHeight,
    });
    element.style.left = `${placement.left}px`;
    element.style.top = `${placement.top}px`;
    element.style.setProperty("--tail-offset", `${placement.tailOffset}px`);
    if (tailSide !== placement.tail) {
      element.classList.remove(`tail-${tailSide}`);
      element.classList.add(`tail-${placement.tail}`);
      tailSide = placement.tail;
    }
  };

  const hide = (): void => {
    if (timerId !== undefined) window.clearTimeout(timerId);
    timerId = undefined;
    if (!visible) return;
    visible = false;
    element.classList.remove("is-visible");
    onVisibilityChange(false);
  };

  const show = (
    text: string,
    durationMs: number,
    speaker: Container = defaultTarget,
    contentBounds?: SpeechContentBounds,
  ): void => {
    target = speaker;
    label.textContent = text;
    // 見かけの大きさは描画後の座標系で測る。歩行中も使えるよう、上端は基準点からの相対位置で持つ
    const bounds = resolveSpeechTargetBounds(target.getBounds(), contentBounds);
    characterCenter = contentBounds ? bounds.x + bounds.width / 2 - target.x : 0;
    characterTop = bounds.y - target.y;
    characterWidth = bounds.width;
    roomWidth = host.clientWidth;
    roomHeight = host.clientHeight;
    element.classList.add("is-visible");
    bubbleWidth = element.offsetWidth;
    bubbleHeight = element.offsetHeight;
    visible = true;
    update();
    if (timerId !== undefined) window.clearTimeout(timerId);
    timerId = window.setTimeout(hide, durationMs);
    onVisibilityChange(true);
  };

  app.ticker.add(update);
  return {
    element,
    show,
    destroy: () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      roomResize.disconnect();
    },
  };
}
