// 进度归一化：把数据源给的原始进度补齐成统一格式（浏览器和 Node 都能用）。
import { tierIndexFor } from '../engine/tiers.js';

/** FNV-1a 32 位哈希：浏览器和 Node 结果一致。 */
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

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

/** 闪光款的概率：1/20。 */
export const SHINY_ODDS = 20;

/**
 * 是不是闪光款：由「品牌 + 徽章 + 首次解锁日期」决定，升级后不变，重复采集结果也不变。
 * 改这里的算法会让所有人的闪光款重新洗牌，不要动。
 */
export function pickShiny(brandId, badgeId, firstAt) {
  if (!firstAt) return false;
  return hash32(`shiny|${brandId}/${badgeId}|${firstAt}`) % SHINY_ODDS === 0;
}

/**
 * 补齐缺失字段：没有数据的徽章按「未解锁、进度 0」处理。
 * @param {string} [brandId]  决定闪光款（不传则没有闪光款）
 */
export function normalizeProgress(raw, badges, brandId = null) {
  // 示例数据可以直接写 shiny: true，固定展示闪光款；真实数据不会带这个字段
  const shinyOf = (id, firstAt, forced) => forced ?? (brandId ? pickShiny(brandId, id, firstAt) : false);
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
        // 首次解锁日期：分级徽章用第一级的达成日期（旧数据没有就用当前等级的）
        shiny: tier >= 0 ? shinyOf(b.id, r.firstAt ?? r.earnedAt ?? null, r.shiny) : false,
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
      shiny: unlocked ? shinyOf(b.id, r.earnedAt ?? null, r.shiny) : false,
      value: r.value ?? current,
      progress: { current: r.value !== undefined ? Math.min(r.value, target) : current, target },
    };
  }
  return out;
}

