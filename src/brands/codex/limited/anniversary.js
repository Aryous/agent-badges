import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { codexMark, onMark } from '../mark.js';

// 一周年：滚花边纪念币，全息外圈；戴派对帽的 Codex 标志。

/** 派对帽（11 列 × 10 行）：绒球 / 帽身 / 帽檐分开上色，网格尺寸相同以便对齐。 */
const HAT_POM = ['....###....', '....###....', ...Array(8).fill('...........')];

const HAT_CONE = [
  '...........',
  '...........',
  '.....#.....',
  '....###....',
  '....###....',
  '...#####...',
  '...#####...',
  '..#######..',
  '..#######..',
  '...........',
];

const HAT_DOTS = ['...........', '...........', '...........', '...........', '.....#.....', '...........', '...#...#...', '...........', '.....#.....', '...........'];

const HAT_BRIM = [...Array(9).fill('...........'), '.#########.'];

// 一周年

const MARK_A = { size: 0.25, center: [0, -0.15] };

const CONFETTI = [
  { center: [-0.34, 0.22], color: 'aqua' },
  { center: [0.32, 0.3], color: 'scarlet' },
  { center: [-0.3, -0.33], color: 'lime' },
  { center: [0.38, -0.12], color: 'amber' },
  { center: [-0.42, -0.05], color: 'snow' },
  { center: [0.24, 0.42], color: 'lime' },
  { center: [-0.22, 0.4], color: 'scarlet' },
  { center: [0.3, -0.36], color: 'snow' },
];

const anniversary = {
  id: 'anniversary',
  title: '一周年',
  description: '和 Codex 相识满一年。云朵戴上派对帽：再来一年，继续把想法变成代码。',
  en: { title: 'One Year', description: 'One year with Codex. The cloud puts on a party hat: here is to another year of turning ideas into code.' },
  criteria: { target: 1 },
  shape: { type: 'circle', radius: 1, depth: 0.24, bevel: 0.05, reeded: { count: 150, depth: 0.012 } },
  layers: [
    { kind: 'rim', material: 'holographic', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'plum', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.845, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'ONE YEAR · 365 DAYS', radius: 0.715, size: 0.088, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.56, color: 'honey', metal: 'polished-metal', metalColor: 'gold' }),
    // 彩色纸屑
    ...CONFETTI.map(({ center, color }, i) => ({
      kind: 'pixels', rows: i % 2 ? ['##'] : ['#', '#'], cell: 0.03, center, material: 'enamel', color, height: 0.024, z: MEDALLION_H, bevel: 0.006,
    })),
    ...codexMark(MARK_A),
    // 派对帽：帽檐坐在云朵顶上
    onMark(MARK_A, HAT_CONE, { col: 3, row: -9, material: 'enamel', color: 'magenta', height: 0.05 }),
    onMark(MARK_A, HAT_DOTS, { col: 3, row: -9, material: 'enamel', color: 'snow', height: 0.056 }),
    onMark(MARK_A, HAT_BRIM, { col: 3, row: -9, material: 'enamel', color: 'snow', height: 0.056 }),
    onMark(MARK_A, HAT_POM, { col: 3, row: -9, material: 'enamel', color: 'amber', height: 0.06 }),
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

export default anniversary;
