// 展示用的徽章状态：不看真实进度，只是把徽章摆出来给人看。
// 两个地方的规则不同，各有名字，统一放在这里，调用处不要再手写一份：
//   peakState          落地页画廊和首屏：分级徽章看最高一级（顶级彩蛋取第 0 款），隐藏徽章保持神秘
//   surpriseKeptState  README 素材（tools/studio.html）：最高一级是随机彩蛋时展示它下面一级，留住惊喜

/** 落地页和素材上显示的获得日期。 */
export const SHOWCASE_DATE = '2026-10-24';

const topTier = (tiers) => tiers.length - 1;

/** 落地页：分级徽章看最高一级，隐藏徽章保持神秘，其余都已解锁。 */
export function peakState(config) {
  if (config.hidden) return { unlocked: false, earnedAt: null, tier: null, value: 0, progress: { current: 0, target: 1 } };
  const tier = config.tiers ? topTier(config.tiers) : null;
  return { unlocked: true, earnedAt: SHOWCASE_DATE, tier, value: 0, progress: { current: 1, target: 1 } };
}

/**
 * README 素材：在示例数据的这枚徽章状态（base）上改。分级徽章看最高一级；
 * 最高一级是随机款式的彩蛋时，展示它下面一级，留住惊喜。隐藏徽章保持神秘。
 */
export function surpriseKeptState(config, base) {
  if (config.hidden) return { ...base, unlocked: false, earnedAt: null, tier: null };
  const { tiers } = config;
  const tier = tiers ? (tiers.at(-1).variants ? topTier(tiers) - 1 : topTier(tiers)) : null;
  return { ...base, unlocked: true, earnedAt: base.earnedAt ?? SHOWCASE_DATE, tier };
}
