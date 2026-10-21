import { MEDALLION_H, around, codexMark, medallion, textRing } from '../helpers.js';
import { CODEX_MARK } from '../icons.js';
import { topTierFromLast, topVariants } from '../../shared/medal.js';

// Codex 里程碑系列：起步与累计用量。分级徽章按 铜 → 银 → 金 → 白金 升级（Token 徽章还有顶级彩蛋），
// 外圈和数字跟着等级换金属，中心圆盘每级换一种珐琅色（$accent）。

const firstThread = {
  id: 'first-thread',
  title: '初次启动',
  titleEn: 'FIRST THREAD',
  description: '在 Codex 里开启第一个会话。光标在云里闪了一下，故事就开始了。',
  criteria: { metric: 'threads.total', target: 1 },
  shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'silver' },
    { kind: 'face', material: 'enamel', color: 'midnight', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.845, width: 0.012, material: 'polished-metal', color: 'silver', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: 'FIRST THREAD', radius: 0.715, size: 0.1, metal: 'polished-metal', color: 'silver' }),
    ...medallion({ radius: 0.56, color: 'snow', metal: 'polished-metal', metalColor: 'silver' }),
    ...codexMark({ size: 0.36, center: [0, 0] }),
  ],
  back: { material: 'brushed-metal', color: 'silver' },
};

/** 金属色的 Codex 标志剪影（不带渐变和嵌片），用作陪衬。 */
const ghostMark = ({ size, center, height = 0.038, z = MEDALLION_H }) => ({
  kind: 'path',
  d: CODEX_MARK,
  viewBox: 24,
  scale: size,
  center,
  material: 'polished-metal',
  color: '$metal',
  height,
  z,
  bevel: Math.min(0.01, size * 0.05),
});

// ---------------------------------------------------------------------------
// 线程里程碑：十二边形；数字下方三朵 Codex 云像扇子一样展开——
// 中间是渐变的主云，两侧是金属色的「其他线程」，越开越多。

const threads = {
  id: 'threads',
  title: '线程里程碑',
  titleEn: '{label} THREADS',
  description: '累计开启的 Codex 会话。一朵云开出一条线，线多了就织成了网。',
  criteria: { metric: 'threads.total' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'sand', label: '10' },
    { threshold: 100, metal: 'silver', accent: 'aqua', label: '100' },
    { threshold: 1000, metal: 'gold', accent: 'honey', label: '1K' },
    { threshold: 5000, metal: 'platinum', accent: 'lime', label: '5K' },
  ],
  shape: { type: 'polygon', sides: 12, radius: 1.02, cornerRadius: 0.09, rotation: Math.PI / 12, depth: 0.21, bevel: 0.04 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'plum', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.84, width: 0.012, material: 'polished-metal', color: '$metal', height: 0.014 },
    ...textRing({ top: 'CODEX', bottom: '{label} THREADS', radius: 0.71, size: 0.092, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.56, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    { kind: 'text', text: '{label}', size: 0.19, center: [0, 0.2], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.06, z: MEDALLION_H },
    ghostMark({ size: 0.13, center: [-0.25, -0.2] }),
    ghostMark({ size: 0.13, center: [0.25, -0.2] }),
    ...codexMark({ size: 0.2, center: [0, -0.18], height: 0.07 }),
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

// ---------------------------------------------------------------------------
// Token 里程碑：圆角菱形（像一枚筹码）；中心圆盘只放数值和一个小的 Codex 图标，留足呼吸空间。

const tokensBase = {
  id: 'tokens',
  title: 'Token 里程碑',
  titleEn: '{label} TOKENS',
  description: '累计消耗的 Token。云里一直在下雨，下的全是字。',
  criteria: { metric: 'tokens.total' },
  tiers: [
    { threshold: 10_000_000, metal: 'bronze', accent: 'amber', label: '10M' },
    { threshold: 100_000_000, metal: 'silver', accent: 'sky', label: '100M' },
    { threshold: 1_000_000_000, metal: 'gold', accent: 'aqua', label: '1B' },
    { threshold: 10_000_000_000, metal: 'platinum', accent: 'magenta', label: '10B' },
  ],
  shape: { type: 'polygon', sides: 4, radius: 1.13, cornerRadius: 0.26, rotation: Math.PI / 2, depth: 0.22, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'slate', inset: 0.11, pattern: 'rings' },
  ],
  relief: [
    // 四个角上的铆钉
    ...around(4, 0.8).map((center) => ({
      kind: 'circle', center, radius: 0.028, material: 'polished-metal', color: '$metal', height: 0.022,
    })),
    ...textRing({ top: 'CODEX', bottom: '{label} TOKENS', radius: 0.66, size: 0.085, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.53, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    // 圆盘里只放数字和一个小一些的 Codex 图标，上下居中，四周留白
    { kind: 'text', text: '{label}', size: 0.16, center: [0, 0.15], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: MEDALLION_H },
    ...codexMark({ size: 0.14, center: [0, -0.16], height: 0.06 }),
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

// 顶级 100B：三款彩蛋随机解锁一款（白瓷金 / 黑瓷金 / 蓝宝石），由达到这一级的日期决定
const tokens = {
  ...tokensBase,
  tiers: [...tokensBase.tiers, { threshold: 100_000_000_000, label: '100B', salt: 'codex/tokens', variants: topVariants(tokensBase) }],
};

// ---------------------------------------------------------------------------
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
  criteria: { metric: 'tools.applyPatch' },
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

// 最高一级：三款随机（与 Token 顶级同一家族）
export default [firstThread, topTierFromLast(threads, 'codex/threads'), tokens, topTierFromLast(patches, 'codex/patches')];
