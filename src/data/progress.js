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
import mockCodex from './mock-codex.js';
import { normalizeProgress } from './normalize.js';

export { normalizeProgress };

// 本机数据由 CLI（npx agent-badges）或开发服务器注入页面：
//   <script>window.__AGENT_BADGES_DATA__ = { 'claude-code': {...}, codex: {...} }</script>
// 公开的在线演示不注入，自动退回示例数据。
const injected = () => (typeof window !== 'undefined' && window.__AGENT_BADGES_DATA__) || {};
const local = (brandId) => injected()[brandId] ?? null;
const MOCKS = { 'claude-code': mockClaudeCode, codex: mockCodex };

/** 数据来源说明，供页面展示。 */
export function sourceInfo(brandId, { forceMock = false } = {}) {
  const l = local(brandId);
  if (l && !forceMock) return { kind: 'local', generatedAt: l.generatedAt };
  return { kind: 'mock' };
}

const source = (brandId) => async ({ forceMock } = {}) => {
  const l = local(brandId);
  return l && !forceMock ? l.progress : MOCKS[brandId]();
};

const SOURCES = {
  'claude-code': source('claude-code'),
  codex: source('codex'),
};

/**
 * 读取进度。数据源失败时不抛出，返回全部未解锁并带上 error。
 * @returns {Promise<{ progress: object, error: Error | null }>}
 */
export async function loadProgress(brandId, badges, sources = SOURCES, options = {}) {
  const source = sources[brandId];
  try {
    if (!source) throw new Error(`没有品牌「${brandId}」的数据源`);
    const raw = await source(options);
    return { progress: normalizeProgress(raw, badges), error: null };
  } catch (error) {
    return { progress: normalizeProgress({}, badges), error };
  }
}
