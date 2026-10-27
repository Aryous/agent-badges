// 分享海报的版面：纯计算，不碰 DOM，方便测试。
// 单个工具是「整版珐琅」：板头、点阵、铸币和累计数字、徽章墙。
// 两个工具是「左右分栏」：板头、点阵之后每个工具一栏。
// 数字照实验页（poster-lab.html）里用户选定的版式。

export const W = 1080;
export const SCALE = 2; // 输出 2160 像素宽
export const MARGIN = 28; // 珐琅板离画布边
export const IX = 84; // 板内左右边距
export const IW = W - IX * 2;
export const WD = 46; // 星期一栏的宽度

export const DUO = 'duo';

/** 弹窗里能选的形式：有数据的工具各一种（顺序同热力图），两个以上时再加「两个一起」。 */
export const shareModes = (ids) => (ids.length > 1 ? [...ids, DUO] : [...ids]);

/** 点阵每列的宽度。 */
export const heatStep = (weeks, w = IW) => (w - WD) / weeks;
/** 点阵（含上面一行月份）的高度。 */
export const heatGridHeight = (weeks, w = IW) => 28 + 7 * heatStep(weeks, w);
/** 徽章墙的高度：每格是正方形，最后一行不满也占一整行。 */
export const gridHeight = (n, cols, w) => Math.ceil(n / cols) * (w / cols);

/** 两种版式共用的上半部分：板头（头像、名字、年份）、统计行、点阵、图例、细线。 */
export function headLayout(weeks) {
  const head = 100;
  const summary = head + 150;
  const heat = summary + 44;
  const legend = heat + heatGridHeight(weeks) + 26;
  const rule = legend + 18 + 40;
  return { head, summary, heat, legend, rule };
}

export const SINGLE = { coin: 270, cols: 8 };

/** 单个工具：细线下面左边铸币、右边累计数字；再一道细线，下面是 8 列徽章墙。 */
export function singleLayout({ weeks, count }) {
  const h = headLayout(weeks);
  const mid = h.rule + 44;
  const rule2 = mid + SINGLE.coin + 44;
  const grid = rule2 + 46;
  const foot = grid + gridHeight(count, SINGLE.cols, IW) + 70;
  return { ...h, mid, rule2, grid, foot, H: foot + 52 + MARGIN };
}

export const DUO_L = { coin: 210, cols: 5, gap: 56, value: 28 };

/** 两栏里每栏的宽度。 */
export const duoColumn = () => (IW - DUO_L.gap) / 2;
/** 一栏的小卡：铸币、工具名、徽章数、三个数字（标签一行加数字一行）。 */
export const toolCardHeight = (coin, value) => coin + 44 + 32 + 30 + 16 + 18 + value;

/** 两个工具：每栏上面是小卡，下面是这个工具的徽章墙；两栏的徽章墙从同一高度开始。 */
export function duoLayout({ weeks, counts }) {
  const h = headLayout(weeks);
  const cw = duoColumn();
  const top = h.rule + 48;
  const grid = top + toolCardHeight(DUO_L.coin, DUO_L.value) + 44;
  const gridH = Math.max(...counts.map((n) => gridHeight(n, DUO_L.cols, cw)));
  const foot = grid + gridH + 70;
  return { ...h, cw, top, grid, gridH, foot, H: foot + 52 + MARGIN };
}
