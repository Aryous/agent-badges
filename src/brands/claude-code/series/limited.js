import { PLUS } from '../pixel-art.js';
import { MEDALLION_H, clawd, medallion, onClawd, textRing } from '../helpers.js';

// 限定纪念与隐藏彩蛋系列。
//
// 外形与其他系列刻意错开：
//   程序员节  十边形（1024 = 2^10）      全息镭射外圈 + 全息圆盘
//   一周年    24 瓣花边（庆典玫瑰结）     全息镭射外圈
//   模型收藏家 菱形（宝石切面）            铂金外圈 + 四颗水晶
//   Bash 狂人 16 齿锯齿章（爆炸贴纸）      钢色外圈 + 终端绿

// ---------- 像素图 ----------

/** 3×5 像素数字，拼成「1024」。 */
const DIGITS = {
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['###', '..#', '###', '#..', '###'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
};
const pixelNumber = (str) => Array.from({ length: 5 }, (_, r) => [...str].map((d) => DIGITS[d][r]).join('.'));
const N1024 = pixelNumber('1024');

/** 二进制刻度：1024 = 1 后面跟 10 个 0，共 11 位。 */
const BITS = '10000000000';

/** 生日蛋糕：各层分开上色，网格尺寸相同以便对齐（14 列 × 10 行）。 */
const cakeLayer = (rows) => rows;
const CAKE_FLAME = cakeLayer([
  '......#.......',
  '.....##.......',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
]);
const CAKE_CANDLE = cakeLayer([
  '..............',
  '..............',
  '.....##.......',
  '.....##.......',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
]);
const CAKE_ICING = cakeLayer([
  '..............',
  '..............',
  '..............',
  '..............',
  '..##########..',
  '..#.###.##.#..',
  '..............',
  '..............',
  '..............',
  '..............',
]);
const CAKE_SPONGE = cakeLayer([
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '...#...#..#...',
  '..##########..',
  '..............',
  '..##########..',
  '..............',
]);
const CAKE_JAM = cakeLayer([
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..##########..',
  '..............',
  '..............',
]);
const CAKE_PLATE = cakeLayer([
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '##############',
]);

/** 派对帽（戴在小怪物头顶）。 */
const PARTY_HAT = ['..#..', '.###.', '.###.', '#####'];

/** 键盘：18 列 × 4 行，键帽之间留缝。 */
const KEYBOARD = [
  '##################',
  '#.#.#.#.#.#.#.#.##',
  '##.#.#.#.#.#.#.#.#',
  '##################',
];

// ---------- 1024 程序员节 ----------

const programmersDay = {
  id: 'programmers-day',
  title: '1024 程序员节',
  titleEn: 'PROGRAMMERS DAY',
  description: '在 10 月 24 日这天和 Claude Code 一起写代码。2 的 10 次方，属于我们的节日。',
  criteria: { metric: 'days.1024', target: 1 },
  shape: { type: 'polygon', sides: 10, radius: 1.04, cornerRadius: 0.08, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'holographic', color: 'snow' },
    { kind: 'face', material: 'enamel', color: 'teal', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.835, width: 0.012, material: 'polished-metal', color: 'platinum', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: 'OCT 24 · 1024', radius: 0.71, size: 0.088, metal: 'polished-metal', color: 'platinum' }),
    // 全息圆盘
    { kind: 'circle', radius: 0.565, material: 'holographic', color: 'snow', height: MEDALLION_H, pattern: 'sunburst' },
    { kind: 'ring', radius: 0.571, width: 0.03, material: 'polished-metal', color: 'platinum', height: 0.034 },
    // 二进制刻度：第一位亮起，其余 10 位是 0
    ...[...BITS].map((b, i) => {
      // 最高位在左：从左往右读 1 0000000000
      const t = Math.PI / 2 - ((i - 5) / 11) * Math.PI * 0.9;
      return {
        kind: 'circle',
        center: [Math.cos(t) * 0.47, Math.sin(t) * 0.47],
        radius: b === '1' ? 0.026 : 0.016,
        material: 'enamel',
        color: b === '1' ? 'lime' : 'navy',
        height: 0.02,
        z: MEDALLION_H,
      };
    }),
    { kind: 'pixels', rows: N1024, cell: 0.042, center: [0, 0.08], material: 'enamel', color: 'navy', height: 0.06, z: MEDALLION_H, bevel: 0.01 },
    ...clawd({ cell: 0.018, center: [0, -0.27], height: 0.05 }),
  ],
  back: { material: 'holographic', color: 'snow' },
};

// ---------- 一周年 ----------

// 蛋糕底在 y≈-0.17；小怪物站在同一条地平线上
const CAKE = { cell: 0.034, center: [-0.07, 0.0] };
const ANNIV_MASCOT = { cell: 0.016, center: [0.31, -0.09] };

const anniversary = {
  id: 'anniversary',
  title: '一周年',
  titleEn: 'ONE YEAR',
  description: '和 Claude Code 相识满一年。吹蜡烛之前，先许个「测试全绿」的愿望吧。',
  criteria: { metric: 'account.years', target: 1 },
  shape: { type: 'starburst', points: 24, radius: 1.04, innerRadius: 0.95, tipRoundness: 0.14, valleyRoundness: 0.05, depth: 0.22, bevel: 0.04 },
  layers: [
    { kind: 'rim', material: 'holographic', color: 'snow' },
    { kind: 'face', material: 'enamel', color: 'plum', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.8, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '1 YEAR · 365 DAYS', radius: 0.68, size: 0.082, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.545, color: 'magenta', metal: 'polished-metal', metalColor: 'gold' }),
    // 蛋糕
    ...[
      [CAKE_PLATE, 'polished-metal', 'gold', 0.03],
      [CAKE_SPONGE, 'ceramic', 'honey', 0.065],
      [CAKE_JAM, 'enamel', 'scarlet', 0.065],
      [CAKE_ICING, 'enamel', 'snow', 0.075],
      [CAKE_CANDLE, 'enamel', 'sky', 0.075],
      [CAKE_FLAME, 'enamel', 'amber', 0.085],
    ].map(([rows, material, color, height]) => ({
      kind: 'pixels', rows, ...CAKE, material, color, height, z: MEDALLION_H, bevel: 0.009,
    })),
    // 戴派对帽的小怪物
    ...clawd({ ...ANNIV_MASCOT, height: 0.05 }),
    onClawd(ANNIV_MASCOT, PARTY_HAT, { col: 6, row: -4, material: 'enamel', color: 'amber', height: 0.045 }),
    // 彩色纸屑
    ...[
      [-0.38, -0.12, 'amber'],
      [-0.2, -0.36, 'sky'],
      [0.12, -0.34, 'lime'],
      [0.36, 0.16, 'lime'],
      [0.24, 0.32, 'snow'],
      [-0.36, 0.22, 'sky'],
    ].map(([x, y, color]) => ({
      kind: 'pixels', rows: ['#'], cell: 0.026, center: [x, y], material: 'enamel', color, height: 0.025, z: MEDALLION_H,
    })),
  ],
  back: { material: 'holographic', color: 'snow' },
};

// ---------- 模型收藏家（隐藏） ----------

const GEMS = [
  ['ruby', 150],
  ['sapphire', 110],
  ['topaz', 70],
  ['amethyst', 30],
];

const modelCollector = {
  id: 'model-collector',
  hidden: true,
  title: '模型收藏家',
  titleEn: 'MODEL COLLECTOR',
  description: 'Opus、Sonnet、Haiku、Fable，四位都请来干过活。宝石集齐，收藏柜满了。',
  criteria: { metric: 'models.distinct', target: 4 },
  shape: { type: 'polygon', sides: 4, radius: 1.1, cornerRadius: 0.14, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'platinum' },
    { kind: 'face', material: 'enamel', color: 'navy', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    ...textRing({ top: 'CLAUDE CODE', bottom: 'MODEL COLLECTOR', radius: 0.575, size: 0.066, metal: 'polished-metal', color: 'platinum' }),
    ...medallion({ radius: 0.46, color: 'snow', metal: 'polished-metal', metalColor: 'platinum' }),
    // 四颗水晶排成一道弧，悬在小怪物头顶
    ...GEMS.map(([color, deg]) => {
      const t = (deg * Math.PI) / 180;
      return {
        kind: 'gem',
        center: [Math.cos(t) * 0.28, Math.sin(t) * 0.28 - 0.06],
        radius: 0.085,
        material: 'crystal',
        color,
        height: 0.07,
        z: MEDALLION_H,
      };
    }),
    // 闪光
    ...[
      [-0.31, 0.3],
      [0.33, 0.27],
      [0.0, 0.36],
    ].map((center) => ({
      kind: 'pixels', rows: PLUS, cell: 0.016, center, material: 'polished-metal', color: 'gold', height: 0.03, z: MEDALLION_H,
    })),
    ...clawd({ cell: 0.02, center: [0, -0.2], height: 0.055 }),
  ],
  back: { material: 'brushed-metal', color: 'platinum' },
};

// ---------- Bash 狂人（隐藏） ----------

const BASH_MASCOT = { cell: 0.025, center: [0, -0.16] };

const bashManiac = {
  id: 'bash-maniac',
  hidden: true,
  title: 'Bash 狂人',
  titleEn: 'BASH MANIAC',
  description: '一天之内让 Claude Code 敲了 500 次 Bash。键盘冒烟了，终端还在滚。',
  criteria: { metric: 'tools.bashDaily', target: 500 },
  shape: { type: 'starburst', points: 14, radius: 1.06, innerRadius: 0.88, tipRoundness: 0.05, valleyRoundness: 0.1, depth: 0.22, bevel: 0.03 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'steel' },
    { kind: 'face', material: 'enamel', color: 'ink', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.775, width: 0.012, material: 'polished-metal', color: 'lime', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '500 BASH / DAY', radius: 0.665, size: 0.08, metal: 'enamel', color: 'lime' }),
    ...medallion({ radius: 0.53, color: 'slate', metal: 'polished-metal', metalColor: 'steel', pattern: 'rings' }),
    // >_ 提示符
    { kind: 'capsule', from: [-0.24, 0.36], to: [-0.1, 0.26], width: 0.07, material: 'enamel', color: 'lime', height: 0.05, z: MEDALLION_H },
    { kind: 'capsule', from: [-0.1, 0.26], to: [-0.24, 0.16], width: 0.07, material: 'enamel', color: 'lime', height: 0.05, z: MEDALLION_H },
    { kind: 'capsule', from: [-0.02, 0.16], to: [0.2, 0.16], width: 0.07, material: 'enamel', color: 'lime', height: 0.05, z: MEDALLION_H, effect: 'pulse' },
    // 小怪物 + 键盘（键盘在前面，挡住腿）
    ...clawd({ ...BASH_MASCOT, height: 0.05 }),
    onClawd(BASH_MASCOT, KEYBOARD, { col: -1, row: 7, material: 'polished-metal', color: 'steel', height: 0.07 }),
    // 冒烟的速度线
    ...[
      [-0.3, -0.08],
      [0.3, -0.08],
    ].map(([x, y]) => ({
      kind: 'capsule', from: [x, y], to: [x + Math.sign(x) * 0.06, y + 0.03], width: 0.018, material: 'enamel', color: 'lime', height: 0.025, z: MEDALLION_H,
    })),
  ],
  back: { material: 'brushed-metal', color: 'steel' },
};

export default [programmersDay, anniversary, modelCollector, bashManiac];
