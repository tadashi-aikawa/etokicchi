/** 二人を同じ時計で動かす。長い居眠りの後、小さく伸びて最初の姿へ戻る。 */
export function getMasaruSunbeamFrame(elapsedMs: number) {
  const time = ((elapsedMs % 18000) + 18000) % 18000;
  const smooth = (value: number) => value * value * (3 - 2 * value);
  const closeness = time < 3000 ? smooth(time / 3000) : time < 17000 ? 1 : 1 - smooth((time - 17000) / 1000);
  const frame = time < 3000 || time >= 17000 ? 0 : time < 6000 || time >= 16000 ? 1 : 2;
  const stretch = time >= 16000 && time < 17000 ? Math.sin(((time - 16000) / 1000) * Math.PI) : 0;
  return {
    frame,
    dogOffsetX: -6 * closeness,
    characterOffsetX: -12 * closeness,
    breathY: frame === 2 ? Math.sin(((time - 6000) / 3200) * Math.PI * 2) * 0.3 : 0,
    stretchScale: 1 + stretch * 0.025,
    speech: ["ぼくの分も、空けてくれたの？", "マサル、あったかいねえ……", "むにゃ……ひなた、半分こだね……"][frame] ?? "",
  };
}
