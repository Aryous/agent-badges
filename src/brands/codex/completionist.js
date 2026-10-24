import brand from './brand.js';
import { codexMark } from './mark.js';
import { MEDALLION_H } from '../shared/layout.js';

// 全解锁徽章的 Codex 部件：云形标志的点阵马赛克，圆润的矢量王冠，圆点分隔符。
// 共用版式见 ../shared/completionist.js。

/**
 * 在 CODEX_MARK（viewBox 24，evenodd）上取 21×21 网格，格点 ((i+0.5)·24/21, (j+0.5)·24/21) 落在图形内的记 #，
 * >_ 的镂空不算。brands 层不能用 DOM 和 engine，所以预先算好；tests/completionist.test.js 用 svgShapes 重新算一遍核对。
 */
const GRID_ROWS = [
  '.......####..........',
  '.....##########......',
  '.....#############...',
  '....###############..',
  '...################..',
  '.##################..',
  '.###################.',
  '#####..#############.',
  '#####..#############.',
  '######..############.',
  '#######.#############',
  '.#####..#############',
  '.####..##############',
  '.####..###......#####',
  '.###################.',
  '..##################.',
  '..################...',
  '..###############....',
  '...#############.....',
  '......##########.....',
  '..........####.......',
];

const N = GRID_ROWS.length;

/** 格点表 [i, j]：i 是列，j 是行（自上而下）。 */
export const CODEX_GRID = GRID_ROWS.flatMap((row, j) => [...row].flatMap((ch, i) => (ch === '#' ? [[i, j]] : [])));

const W = 0.62; // 标志在徽章上的宽度
const STEP = 24 / N;
const DOT = (STEP / 24) * W * 0.44;
const RAMP = 16; // 色板 ramp0…ramp15

/** 每个格点一颗圆点，颜色按行取官方渐变；按「从下往上、同一行从左往右」排好。 */
function tiles() {
  return [...CODEX_GRID]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([i, j]) => {
      const px = (i + 0.5) * STEP;
      const py = (j + 0.5) * STEP;
      const center = [((px - 12) / 24) * W, -((py - 12) / 24) * W];
      return {
        center,
        lit: { kind: 'circle', radius: DOT, center: [0, 0], material: 'enamel', color: `ramp${Math.round((j / (N - 1)) * (RAMP - 1))}`, height: 0.045, bevel: 0.008, z: MEDALLION_H },
        ghost: { kind: 'circle', radius: DOT * 0.8, center, material: 'enamel', color: 'ghost', height: 0.008, bevel: 0.002, z: MEDALLION_H },
      };
    });
}

/** 矢量王冠：和云形标志一样圆润。y 是王冠中心。 */
const CROWN_PATH = 'M3.2 15.2 2.4 7.4 7.9 11.4 12 4.6 16.1 11.4 21.6 7.4 20.8 15.2Z M3.4 16.6h17.2v2.6H3.4Z';

function crown(look, y = 0.43) {
  const s = 0.085;
  // 三个尖顶上各一颗圆珠，位置是 viewBox 坐标
  const tip = (px, py) => ({ kind: 'circle', radius: 0.012, center: [((px - 12) / 12) * s, y + ((12 - py) / 12) * s], ...look, height: 0.055, z: MEDALLION_H });
  return [
    { kind: 'path', d: CROWN_PATH, viewBox: 24, scale: s, center: [0, y], ...look, height: 0.045, bevel: 0.006, z: MEDALLION_H },
    tip(2.4, 6.6),
    tip(12, 3.8),
    tip(21.6, 6.6),
  ];
}

const separator = (x, look) => ({ kind: 'circle', radius: 0.02, center: [x, 0], ...look, height: 0.022 });

const accent = { material: 'enamel', color: 'ramp7' };

/** 背面月桂环里的完整标志，用官方渐变。 */
const hero = () => codexMark({ size: 0.15, center: [0, 0.01], height: 0.05 });

export default { id: brand.id, name: 'CODEX', tiles, crown, separator, hero, accent };
