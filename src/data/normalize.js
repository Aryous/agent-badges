// 进度归一化：把数据源给的原始进度补齐成统一格式（浏览器和 Node 都能用）。
import { tierIndexFor } from './tiers.js';
import { hash32 } from './hash.js';


/**
 * 顶级有几款时抽到哪一款：由「salt + 达到这一级的日期」决定。
 * 同一个人永远是同一款，本地和 GitHub 主页一致；不用额外存储，也不读任何隐私信息。
 * 改这里的算法会让所有人的款式重新洗牌，不要动。
 */
export function pickVariant(tier, earnedAt) {
  if (!tier?.variants?.length) return null;
  if (!earnedAt) return 0;
  return hash32(`${tier.salt ?? ''}|${earnedAt}`) % tier.variants.length;
}

/** 补齐缺失字段：没有数据的徽章按「未解锁、进度 0」处理。 */
export function normalizeProgress(raw, badges) {
  const out = {};
  for (const b of badges) {
    const r = raw?.[b.id] ?? {};
    if (b.tiers) {
      const value = r.value ?? 0;
      const tier = tierIndexFor(b.tiers, value);
      const next = b.tiers[tier + 1] ?? b.tiers[b.tiers.length - 1];
      out[b.id] = {
        unlocked: tier >= 0,
        earnedAt: tier >= 0 ? r.earnedAt ?? null : null,
        tier: tier >= 0 ? tier : null,
        variant: tier >= 0 ? pickVariant(b.tiers[tier], r.earnedAt ?? null) : null,
        value,
        progress: { current: value, target: next.threshold },
      };
      continue;
    }
    const target = r.progress?.target ?? b.criteria.target;
    const current = Math.min(r.progress?.current ?? 0, target);
    const unlocked = Boolean(r.unlocked ?? (r.value !== undefined && r.value >= target));
    out[b.id] = {
      unlocked,
      earnedAt: unlocked ? r.earnedAt ?? null : null,
      tier: null,
      variant: null,
      value: r.value ?? current,
      progress: { current: r.value !== undefined ? Math.min(r.value, target) : current, target },
    };
  }
  return out;
}

