// 数据接口：徽章和使用统计之间唯一的约定。
//
// ProgressMap = {
//   [badgeId]: { unlocked: boolean, earnedAt: 'YYYY-MM-DD' | null,
//                progress: { current: number, target: number } }
// }
//
// 以后接入真实数据（如读取 ~/.claude 下的会话记录）时，只需新增一个 source。

import mockClaudeCode from './mock-claude-code.js';

const SOURCES = {
  'claude-code': mockClaudeCode,
};

/** 补齐缺失字段：没有数据的徽章按「未解锁、进度 0」处理。 */
export function normalizeProgress(raw, badges) {
  const out = {};
  for (const b of badges) {
    const r = raw?.[b.id] ?? {};
    const target = r.progress?.target ?? b.criteria.target;
    const current = Math.min(r.progress?.current ?? 0, target);
    out[b.id] = {
      unlocked: Boolean(r.unlocked),
      earnedAt: r.unlocked ? r.earnedAt ?? null : null,
      progress: { current, target },
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
