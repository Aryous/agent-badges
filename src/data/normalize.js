// 进度归一化：把数据源给的原始进度补齐成统一格式（浏览器和 Node 都能用）。
import { tierIndexFor } from '../engine/tiers.js';

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
      value: r.value ?? current,
      progress: { current: r.value !== undefined ? Math.min(r.value, target) : current, target },
    };
  }
  return out;
}

