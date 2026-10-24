import brand from './brand.js';
import { CLAWD, CLAWD_EYES } from './mascot.js';
import { MEDALLION_H } from '../shared/layout.js';
import { PLUS } from '../shared/pixel-art.js';

// 全解锁徽章的 Claude Code 部件：小怪物的每个像素是一片马赛克，像素王冠，像素十字分隔符。
// 共用版式见 ../shared/completionist.js。

const CELL = 0.04;
const MOSAIC_CENTER = [0, 0.05];

/** 像素王冠：和小怪物同一种像素语言。 */
const CROWN = ['#..#..#', '##.#.##', '#######', '#######'];

/** 每个 # 一片，按「从下往上、同一行从左往右」排好。 */
function tiles() {
  const cells = [];
  CLAWD.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === '#') cells.push({ r, c });
    }),
  );
  cells.sort((a, b) => b.r - a.r || a.c - b.c);
  return cells.map(({ r, c }) => {
    const center = [(c - 7.5) * CELL + MOSAIC_CENTER[0], MOSAIC_CENTER[1] + (4.5 - r) * CELL];
    return {
      center,
      lit: { kind: 'rounded-rect', half: CELL * 0.44, radius: CELL * 0.12, center: [0, 0], material: 'ceramic', color: 'primary', height: 0.05, bevel: 0.006, z: MEDALLION_H },
      ghost: { kind: 'rounded-rect', half: CELL * 0.36, radius: CELL * 0.1, center, material: 'enamel', color: 'ghost', height: 0.008, bevel: 0.002, z: MEDALLION_H },
    };
  });
}

/** 眼睛一直都在：残影也看得出它在看你。 */
const eyes = () => [{ kind: 'pixels', rows: CLAWD_EYES, cell: CELL, center: MOSAIC_CENTER, material: 'enamel', color: 'ink', height: 0.03, z: MEDALLION_H, bevel: 0.004 }];

const crown = (look, y = 0.36) => [{ kind: 'pixels', rows: CROWN, cell: 0.028, center: [0, y], ...look, height: 0.05, z: MEDALLION_H }];

const separator = (x, look) => ({ kind: 'pixels', rows: PLUS, cell: 0.026, center: [x, 0], ...look, height: 0.022 });

const accent = { material: 'ceramic', color: 'primary' };

/** 背面月桂环里的完整小怪物。 */
const hero = () => [
  { kind: 'pixels', rows: CLAWD, cell: 0.021, center: [0, 0.02], ...accent, height: 0.05, z: MEDALLION_H, bevel: 0.005 },
  { kind: 'pixels', rows: CLAWD_EYES, cell: 0.021, center: [0, 0.02], material: 'enamel', color: 'ink', height: 0.028, z: MEDALLION_H, bevel: 0.004 },
];

export default { id: brand.id, name: 'CLAUDE CODE', tiles, eyes, crown, separator, hero, accent };
