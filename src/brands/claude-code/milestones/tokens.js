import { textRing, MEDALLION_H, medallion } from '../../shared/layout.js';
import { topVariants } from '../../shared/top-tier.js';
import { clawd } from '../mascot.js';

// Token 里程碑：带滚花边的厚金币；中心三摞金币越堆越高，小怪物坐在最矮那摞上。

/**
 * 三摞金币（2、3、4 枚），像一张越来越高的柱状图。
 * 每枚金币是一根横放的胶囊，硬币之间留一道细缝。
 */
const COIN_H = 0.066;

const COIN_GAP = 0.01;

const COIN_W = 0.21;

const COIN_BASE = -0.39;

const STACK_X = [-0.235, 0, 0.235];

function coinStacks(heights) {
  return heights.flatMap((n, s) =>
    Array.from({ length: n }, (_, i) => {
      const y = COIN_BASE + COIN_H / 2 + i * (COIN_H + COIN_GAP);
      const x = STACK_X[s];
      return {
        kind: 'capsule',
        from: [x - COIN_W / 2 + COIN_H / 2, y],
        to: [x + COIN_W / 2 - COIN_H / 2, y],
        width: COIN_H,
        material: 'polished-metal',
        color: '$metal',
        height: 0.05,
        z: MEDALLION_H,
        bevel: 0.014,
      };
    }),
  );
}

/** 最矮那摞的顶面高度：小怪物坐在上面。 */
const LOW_TOP = COIN_BASE + 2 * COIN_H + COIN_GAP;

const tokensBase = {
  id: 'tokens',
  title: 'Token 里程碑',
  titleEn: '{label} TOKENS',
  description: '累计处理的 Token。一枚一枚攒起来，就成了一座小金山。',
  en: { title: '{label} Tokens', description: 'Tokens processed. Coin by coin, they pile up into a small mountain of gold.' },
  tiers: [
    { threshold: 10_000_000, metal: 'bronze', accent: 'amber', label: '10M' },
    { threshold: 100_000_000, metal: 'silver', accent: 'sapphire', label: '100M' },
    { threshold: 1_000_000_000, metal: 'gold', accent: 'aqua', label: '1B' },
    { threshold: 10_000_000_000, metal: 'platinum', accent: 'amethyst', label: '10B' },
  ],
  shape: { type: 'circle', radius: 1, depth: 0.26, bevel: 0.05, reeded: { count: 160, depth: 0.012 } },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'crimson', inset: 0.13, pattern: 'rings' },
  ],
  relief: [
    // 内外两圈细线，像钱币上的珠圈
    { kind: 'ring', radius: 0.84, width: 0.012, material: 'polished-metal', color: '$metal', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '{label} TOKENS', radius: 0.71, size: 0.095, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.56, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    { kind: 'text', text: '{label}', size: 0.18, center: [0, 0.23], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.06, z: MEDALLION_H },
    ...coinStacks([2, 3, 4]),
    ...clawd({ cell: 0.0125, center: [STACK_X[0], LOW_TOP + 0.0125 * 5 + 0.004], height: 0.045 }),
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

// 顶级 100B：三款彩蛋随机解锁一款（白瓷金 / 黑瓷金 / 蓝宝石），由达到这一级的日期决定
const tokens = {
  ...tokensBase,
  tiers: [...tokensBase.tiers, { threshold: 100_000_000_000, label: '100B', salt: 'claude-code/tokens', variants: topVariants(tokensBase) }],
};

export default tokens;
