import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { clawd, onClawd } from '../mascot.js';

// 一周年：24 瓣花边（庆典玫瑰结），全息镭射外圈；生日蛋糕和小怪物。

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

// 一周年

// 蛋糕底在 y≈-0.17；小怪物站在同一条地平线上
const CAKE = { cell: 0.034, center: [-0.07, 0.0] };

const ANNIV_MASCOT = { cell: 0.016, center: [0.31, -0.09] };

const anniversary = {
  id: 'anniversary',
  title: '一周年',
  titleEn: 'ONE YEAR',
  description: '和 Claude Code 相识满一年。吹蜡烛之前，先许个「测试全绿」的愿望吧。',
  en: { title: 'One Year', description: 'One year with Claude Code. Before blowing out the candles, wish for all-green tests.' },
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

export default anniversary;
