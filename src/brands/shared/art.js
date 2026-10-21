import { MEDALLION_H, around } from './medal.js';

// 各品牌共用的小图案（新徽章的画面零件）。坐标按圆盘半径 0.56 设计，默认放在圆盘上（z = MEDALLION_H）。

const Z = MEDALLION_H;

// 倒角不能超过线宽的三成：细线用默认倒角会把几何体翻过来，变成一整块
export const cap = (from, to, width, color, height = 0.03, material = 'enamel', z = Z) => ({ kind: 'capsule', from, to, width, color, height, material, z, bevel: Math.min(0.012, width * 0.3) });
export const dot = (center, radius, color, height = 0.03, material = 'enamel', z = Z) => ({ kind: 'circle', center, radius, color, height, material, z, bevel: Math.min(0.012, radius * 0.3) });
export const ring = (center, radius, width, color, height, material = 'polished-metal', z = Z) => ({ kind: 'ring', center, radius, width, color, height, material, z, bevel: Math.min(0.012, width * 0.3) });
export const px = (rows, cell, center, color, material = 'enamel', height = 0.05, z = Z) => ({
  kind: 'pixels', rows, cell, center, material, color, height, z, bevel: Math.min(0.012, cell * 0.3),
});
export const rect = (half, radius, center, color, height, z = Z, material = 'enamel') => ({ kind: 'rounded-rect', half, radius, center, color, height, z, material, bevel: 0.005 });
export const label = (text, size, center, color = '$metal', height = 0.055) => ({ kind: 'text', text, size, center, tracking: 0.06, material: 'polished-metal', color, height, z: Z });

/** 小终端窗口：金属描边 + 珐琅面板 + >_ 提示符。 */
export function terminal({ center: [x, y], half, panel = 'ink', prompt = 'lime', frame = 'silver', z = Z }) {
  const s = half / 0.1;
  return [
    rect(half + 0.012, half * 0.28, [x, y], frame, 0.02, z, 'polished-metal'),
    rect(half, half * 0.24, [x, y], panel, 0.03, z),
    cap([x - 0.05 * s, y + 0.03 * s], [x - 0.02 * s, y], 0.016 * s, prompt, 0.04, 'enamel', z),
    cap([x - 0.02 * s, y], [x - 0.05 * s, y - 0.03 * s], 0.016 * s, prompt, 0.04, 'enamel', z),
    cap([x + 0.0 * s, y - 0.035 * s], [x + 0.05 * s, y - 0.035 * s], 0.016 * s, prompt, 0.04, 'enamel', z),
  ];
}

/** 放射状的一簇烟花：中心点 + 一圈胶囊。 */
export function burst([x, y], r, n, color, width = 0.022) {
  return [
    dot([x, y], width * 0.7, color, 0.03),
    ...around(n, 1).map(([c, s]) => cap([x + c * r * 0.45, y + s * r * 0.45], [x + c * r, y + s * r], width, color, 0.028)),
  ];
}

/** 月牙（开口朝右） */
export const MOON = ['..###.', '.##...', '##....', '##....', '##....', '.##...', '..###.'];
export const SNOWFLAKE = ['#.#.#', '.###.', '#####', '.###.', '#.#.#'];

/** 表盘刻度：12 道，3/6/9/12 点长一些。 */
export const dialTicks = (r = 0.49, color = 'silver', minor = 'steel') =>
  around(12, 1).map(([c, s], i) => {
    const long = i % 3 === 0;
    const r0 = long ? r - 0.09 : r - 0.06;
    return cap([c * r0, s * r0], [c * r, s * r], long ? 0.03 : 0.02, long ? color : minor, 0.025, long ? 'polished-metal' : 'enamel');
  });

/** 时针分针在 12 点重合。 */
export const midnightHands = (color = 'gold', y0 = 0) => [
  cap([0, y0 - 0.02], [0, y0 + 0.3], 0.03, color, 0.05, 'polished-metal'),
  cap([0, y0 - 0.02], [0, y0 + 0.2], 0.056, color, 0.045, 'polished-metal'),
  dot([0, y0], 0.045, color, 0.06, 'polished-metal'),
];

// ---------- 沙漏 ----------

const HOURGLASS_FRAME = ['###########', ...Array(9).fill('...........'), '###########'];
const HOURGLASS_GLASS = ['...........', '.#########.', '..#######..', '...#####...', '....###....', '.....#.....', '....###....', '...#####...', '..#######..', '.#########.', '...........'];
const HOURGLASS_SAND = ['...........', '...........', '...........', '....###....', '.....#.....', '.....#.....', '.....#.....', '....###....', '..#######..', '.#########.', '...........'];

export const hourglass = (center, cell, { glass = 'snow', sand = 'honey', frame = '$metal' } = {}) => [
  px(HOURGLASS_GLASS, cell, center, glass, 'enamel', 0.035),
  px(HOURGLASS_SAND, cell, center, sand, 'enamel', 0.045),
  px(HOURGLASS_FRAME, cell, center, frame, 'polished-metal', 0.06),
];

// ---------- 纸飞机 ----------

/** 纸飞机（24 格 viewBox，朝右上） */
const PLANE = 'M2 11.5 L22 2 L15.5 21 L11.5 13.5 Z';
export const plane = (center, scale, color = 'snow') => ({ kind: 'path', d: PLANE, viewBox: 24, scale, center, material: 'enamel', color, height: 0.05, z: Z, bevel: 0.006 });

// ---------- 日历 ----------

/** 一页日历：红色页眉 + 两个装订环 + 5 × 4 工作日格子全部点亮。 */
export function calendar({ center: [x, y] = [0, -0.04], page = 'snow', header = 'scarlet', ticks = 'forest', binder = 'silver' } = {}) {
  return [
    rect(0.33, 0.06, [x, y], page, 0.03),
    cap([x - 0.27, y + 0.26], [x + 0.27, y + 0.26], 0.1, header, 0.045),
    ...[-0.15, 0.15].map((dx) => cap([x + dx, y + 0.24], [x + dx, y + 0.37], 0.034, binder, 0.06, 'polished-metal')),
    ...Array.from({ length: 20 }, (_, i) => dot([x - 0.24 + (i % 5) * 0.12, y + 0.12 - Math.floor(i / 5) * 0.105], 0.038, ticks, 0.045, 'enamel', Z + 0.03)),
  ];
}

// ---------- 灯笼 ----------

const LANTERN_BODY = ['.........', '.#######.', '#########', '#########', '#########', '#########', '#########', '.#######.', '.........', '.........', '.........'];
const LANTERN_GOLD = ['...###...', '.........', '....#....', '....#....', '....#....', '....#....', '....#....', '.........', '...###...', '....#....', '....#....'];

/** 红灯笼，吊绳一直拉到 top。 */
export const lantern = (x, y, cell, { body = 'ruby', trim = 'gold', top = 0.5 } = {}) => [
  cap([x, y + cell * 5.5], [x, top], 0.008, trim, 0.02, 'polished-metal'),
  px(LANTERN_BODY, cell, [x, y], body, 'enamel', 0.06),
  px(LANTERN_GOLD, cell, [x, y], trim, 'polished-metal', 0.068),
];

// ---------- 气球 ----------

/** 一串气球，绳子收到 hand。 */
export const balloons = (list, hand, string = 'snow') => [
  ...list.map(({ c, r }) => cap([c[0], c[1] - r], hand, 0.007, string, 0.02)),
  ...list.flatMap(({ c, r, color }) => [dot(c, r, color, 0.06), dot([c[0] - r * 0.35, c[1] + r * 0.35], r * 0.18, 'snow', 0.07)]),
];
