import { around, textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { topTierFromLast } from '../../shared/top-tier.js';
import { codexMark } from '../mark.js';

// 补丁大师：锯齿边（像花边剪刀剪下来的布补丁），环带上一圈缝线；
// 中间是一张 diff 卡片，Codex 云在角上「盖章」。

/** diff 卡片：18 × 12 格 */
const CARD = Array.from({ length: 12 }, () => '#'.repeat(18));

const CARD_CELL = 0.028;

const CARD_CENTER = [-0.04, -0.02];

const CARD_H = 0.03;

/** 卡片上某一格（列 c，行 r）的中心坐标 */
const onCard = (c, r) => [
  CARD_CENTER[0] + (c + 0.5 - CARD[0].length / 2) * CARD_CELL,
  CARD_CENTER[1] + (CARD.length / 2 - r - 0.5) * CARD_CELL,
];

const MINUS = ['###'];

const PLUS_SIGN = ['.#.', '###', '.#.'];

/** diff 的一行：左边 +/- 号，右边一条代码线 */
function diffRow(row, sign, color, len) {
  const z = MEDALLION_H + CARD_H;
  const cell = CARD_CELL * 0.7;
  const [sx, sy] = onCard(2, row);
  const [lx] = onCard(4, row);
  return [
    { kind: 'pixels', rows: sign === '-' ? MINUS : PLUS_SIGN, cell, center: [sx, sy], material: 'enamel', color, height: 0.022, z, bevel: 0.004 },
    { kind: 'capsule', from: [lx, sy], to: [lx + len, sy], width: CARD_CELL * 0.75, material: 'enamel', color, height: 0.018, z, bevel: 0.005 },
  ];
}

const [fileX, fileY] = onCard(1.5, 1.5);

const patches = {
  id: 'patches',
  title: '补丁大师',
  titleEn: '{label} PATCHES',
  description: '累计应用的补丁。删一行、加两行，代码就这样一针一线地缝好了。',
  en: { title: '{label} Patches', description: 'Patches applied. Delete a line, add two, and the code is stitched together one stitch at a time.' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'sand', label: '10' },
    { threshold: 100, metal: 'silver', accent: 'sky', label: '100' },
    { threshold: 1000, metal: 'gold', accent: 'honey', label: '1K' },
    { threshold: 10000, metal: 'platinum', accent: 'lilac', label: '10K' },
  ],
  // 花边剪刀的锯齿：齿多、齿浅，齿根倒圆，避免外圈自交
  shape: { type: 'starburst', points: 36, radius: 1.03, innerRadius: 0.975, tipRoundness: 0.012, valleyRoundness: 0.012, depth: 0.2, bevel: 0.02 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'forest', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    // 一圈缝线
    ...around(56, 0.85).map(([x, y]) => {
      const t = Math.atan2(y, x);
      const d = 0.018;
      return {
        kind: 'capsule',
        from: [x - Math.sin(t) * d, y + Math.cos(t) * d],
        to: [x + Math.sin(t) * d, y - Math.cos(t) * d],
        width: 0.014,
        material: 'enamel',
        color: 'snow',
        height: 0.012,
      };
    }),
    ...textRing({ top: 'CODEX', bottom: '{label} PATCHES', radius: 0.72, size: 0.088, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.56, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    { kind: 'text', text: '{label}', size: 0.12, center: [0, 0.37], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.05, z: MEDALLION_H },
    { kind: 'pixels', rows: CARD, cell: CARD_CELL, center: CARD_CENTER, material: 'enamel', color: 'snow', height: CARD_H, z: MEDALLION_H, bevel: 0.006 },
    ...diffRow(4.9, '-', 'ruby', 0.2),
    ...diffRow(7.5, '+', 'forest', 0.26),
    ...diffRow(10.1, '+', 'forest', 0.16),
    // 卡片顶部的一条「文件名」灰线
    { kind: 'capsule', from: [fileX, fileY], to: [fileX + 0.24, fileY], width: CARD_CELL * 0.6, material: 'enamel', color: 'steel', height: 0.014, z: MEDALLION_H + CARD_H, bevel: 0.004 },
    ...codexMark({ size: 0.15, center: [0.23, -0.27], height: 0.065, z: MEDALLION_H + CARD_H }),
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

export default topTierFromLast(patches, 'codex/patches');
