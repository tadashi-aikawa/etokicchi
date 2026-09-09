// 窓の矩形は、窓レイヤー・雨・訪問者・前景の桟がそれぞれ同じ場所を指すので、ここへ一本化する。

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowPane {
  x: number;
  width: number;
}

/** 窓枠の外形。窓レイヤーのマスクとタップ判定に使う */
export const WINDOW_FRAME: WindowRect = { x: 22, y: 25, width: 56, height: 54 };

/** 窓枠の内側のガラス。雨粒・窓のタツヲ・みみぞうのマスクに使う。カーテンには重ねない */
export const WINDOW_GLASS: WindowRect = { x: 34, y: 29, width: 34, height: 47 };

const LEFT_PANE: WindowPane = { x: 34, width: 15 };
const RIGHT_PANE: WindowPane = { x: 51, width: 17 };

/** ガラスは中央の桟で左右2枚に分かれる。yと高さはWINDOW_GLASSと同じ */
export const WINDOW_GLASS_PANES: readonly WindowPane[] = [LEFT_PANE, RIGHT_PANE];

/** 手前へ重ねる縦桟。左右のガラスの合わせ目に立ち、下枠まで伸びる */
export const WINDOW_MULLION: WindowRect = {
  x: LEFT_PANE.x + LEFT_PANE.width,
  y: WINDOW_GLASS.y,
  width: RIGHT_PANE.x - (LEFT_PANE.x + LEFT_PANE.width),
  height: 49,
};

/** 手前へ重ねる下枠。窓枠の左右いっぱいに渡す */
export const WINDOW_SILL: WindowRect = {
  x: WINDOW_FRAME.x,
  y: WINDOW_FRAME.y + 52,
  width: WINDOW_FRAME.width,
  height: 2,
};
