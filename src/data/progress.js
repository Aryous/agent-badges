// 数据接口：徽章和使用统计之间唯一的约定。
//
// 数据源返回的原始数据（每枚徽章一项，二选一）：
//   { unlocked, earnedAt, progress: { current, target } }   普通徽章
//   { value, earnedAt }                                       分级徽章：给出当前数值即可
//
// 归一化后的 ProgressMap = {
//   [badgeId]: { unlocked, earnedAt, tier: 等级下标 | null, value,
//                progress: { current, target } }   分级徽章的 target 是下一级门槛
// }
//
// 以后接入真实数据（如读取 ~/.claude 下的会话记录）时，只需新增一个 source。

import mockClaudeCode from './mock-claude-code.js';
import { tierIndexFor } from '../engine/tiers.js';

const SOURCES = {
  'claude-code': mockClaudeCode,
};

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

/**
 * 读取进度。数据源失败时不抛出，返回全部未解锁并带上 error。
 * @returns {Promise<{ progress: object, error: Error | null }>}
 */
export async function loadProgress(brandId, badges, sources = SOURCES) {
  const source = sources[brandId];
  try {
    if (!source) throw new Error(`没有品牌「${brandId}」的数据源`);
    const raw = await source();
    return { progress: normalizeProgress(raw, badges), error: null };
  } catch (error) {
    return { progress: normalizeProgress({}, badges), error };
  }
}
