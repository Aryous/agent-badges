import { MEDALLION_H, clawd, medallion, textRing } from '../helpers.js';
import { topTierFromLast, topVariants } from '../../shared/medal.js';

// 里程碑系列：起步与累计用量。分级徽章按 铜 → 银 → 金 → 白金 升级，
// 外圈和数字跟着等级换金属，中心圆盘每级换一种珐琅色（$accent），升级有惊喜感。

const firstSession = {
  id: 'first-session',
  title: '初次相遇',
  titleEn: 'FIRST SESSION',
  description: '完成第一次 Claude Code 会话。小家伙第一次在终端里探出头来。',
  criteria: { metric: 'sessions.total', target: 1 },
  shape: { type: 'circle', radius: 1, depth: 0.22, bevel: 0.05 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: 'gold' },
    { kind: 'face', material: 'enamel', color: 'cobalt', inset: 0.12, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.845, width: 0.012, material: 'polished-metal', color: 'gold', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: 'FIRST SESSION', radius: 0.715, size: 0.1, metal: 'polished-metal', color: 'gold' }),
    ...medallion({ radius: 0.56, color: 'azure', metal: 'polished-metal', metalColor: 'gold' }),
    ...clawd({ cell: 0.043, center: [0, -0.01] }),
  ],
  back: { material: 'brushed-metal', color: 'gold' },
};

// ---------------------------------------------------------------------------
// 会话里程碑：八边形，平顶；中心是立体大数字，小怪物站在数字下面。

const sessions = {
  id: 'sessions',
  title: '会话里程碑',
  titleEn: '{label} SESSIONS',
  description: '累计开启的 Claude Code 会话。每一次 claude 回车，都是一次新的结伴出发。',
  criteria: { metric: 'sessions.total' },
  tiers: [
    { threshold: 10, metal: 'bronze', accent: 'aqua', label: '10' },
    { threshold: 100, metal: 'silver', accent: 'sky', label: '100' },
    { threshold: 1000, metal: 'gold', accent: 'amethyst', label: '1K' },
    { threshold: 5000, metal: 'platinum', accent: 'magenta', label: '5K' },
  ],
  shape: { type: 'polygon', sides: 8, radius: 1.03, cornerRadius: 0.13, rotation: Math.PI / 2 + Math.PI / 8, depth: 0.21, bevel: 0.045 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'teal', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.8, width: 0.012, material: 'polished-metal', color: '$metal', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '{label} SESSIONS', radius: 0.695, size: 0.088, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.56, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    { kind: 'text', text: '{label}', size: 0.2, center: [0, 0.13], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.06, z: MEDALLION_H },
    ...clawd({ cell: 0.024, center: [0, -0.27], height: 0.055 }),
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

// ---------------------------------------------------------------------------
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
  criteria: { metric: 'tokens.total' },
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

// ---------------------------------------------------------------------------
// 工具调用里程碑：齿轮外形，深石板色环带；小怪物拎着一把大扳手。

const WRENCH = [
  // 横放的开口扳手：左边是手柄（接在小怪物手上），右边是 C 形开口
  '..........####..',
  '.........######.',
  '.........###....',
  '############....',
  '############....',
  '.........###....',
  '.........######.',
  '..........####..',
];

const toolCalls = {
  id: 'tool-calls',
  title: '工具调用里程碑',
  titleEn: '{label} TOOL CALLS',
  description: '累计的工具调用次数。读文件、跑命令、改代码，小家伙从不嫌活多。',
  criteria: { metric: 'tools.calls' },
  tiers: [
    { threshold: 1000, metal: 'bronze', accent: 'amber', label: '1K' },
    { threshold: 10000, metal: 'silver', accent: 'aqua', label: '10K' },
    { threshold: 100000, metal: 'gold', accent: 'sky', label: '100K' },
    { threshold: 1000000, metal: 'platinum', accent: 'lime', label: '1M' },
  ],
  // 齿少、齿短、倒角小：齿侧的外圈才有足够厚度（引擎按半径内缩，齿侧会变薄）
  shape: { type: 'gear', teeth: 10, radius: 1.04, rootRadius: 0.93, roundness: 0.035, depth: 0.22, bevel: 0.015 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'slate', inset: 0.1, pattern: 'rings' },
  ],
  relief: [
    { kind: 'ring', radius: 0.8, width: 0.012, material: 'polished-metal', color: '$metal', height: 0.014 },
    ...textRing({ top: 'CLAUDE CODE', bottom: '{label} TOOL CALLS', radius: 0.695, size: 0.08, metal: 'polished-metal', color: '$metal' }),
    ...medallion({ radius: 0.56, color: '$accent', metal: 'polished-metal', metalColor: '$metal' }),
    { kind: 'text', text: '{label}', size: 0.16, center: [0, 0.2], tracking: 0.06, material: 'polished-metal', color: '$metal', height: 0.055, z: MEDALLION_H },
    ...clawd({ cell: 0.018, center: [-0.15, -0.21], height: 0.05 }),
    { kind: 'pixels', rows: WRENCH, cell: 0.021, center: [-0.15 + 0.018 * 8 + 0.021 * 8, -0.21], material: 'polished-metal', color: '$metal', height: 0.045, z: MEDALLION_H, bevel: 0.007 },
  ],
  back: { material: 'brushed-metal', color: '$metal' },
};

// 最高一级：三款随机（与 Token 顶级同一家族）
export default [firstSession, topTierFromLast(sessions, 'claude-code/sessions'), tokens, topTierFromLast(toolCalls, 'claude-code/tool-calls')];
