// 采集结果的文字汇总：解锁数、最近获得、即将解锁。CLI 和 Claude Code Skill 共用。
import claudeBrand from '../brands/claude-code/brand.js';
import claudeBadges from '../brands/claude-code/index.js';
import codexBrand from '../brands/codex/brand.js';
import codexBadges from '../brands/codex/index.js';
import { normalizeProgress } from '../data/normalize.js';
import { highlights } from '../data/highlights.js';
import { badgeTitle, tierKey, tierLabel } from '../brands/shared/text.js';

export const BRAND_INFO = {
  'claude-code': { brand: claudeBrand, badges: claudeBadges },
  codex: { brand: codexBrand, badges: codexBadges },
};

/** 徽章名；即将解锁时用「下一级」的名字（已是 1K 级、正在冲 10K，就叫 10K Tool Calls）。 */
const label = (b, s, lang, { next = false } = {}) => badgeTitle(b, lang, next ? (s?.tier ?? -1) + 1 : s?.tier ?? 0);

/** 一个品牌的汇总数据（结构化，供 --json 输出）。 */
export function summarize(brandId, rawProgress, { lang = 'en' } = {}) {
  const { brand, badges } = BRAND_INFO[brandId];
  const p = normalizeProgress(rawProgress, badges, brandId);
  const h = highlights(badges, p);
  const unlocked = h.unlocked;
  const recent = h.recent.map(({ badge: b, state: st }) => ({ id: b.id, title: label(b, st, lang), earnedAt: st.earnedAt }));
  const nearMiss = h.nearMiss.map(({ badge: b, state: st }) => ({ id: b.id, title: label(b, st, lang, { next: true }), current: st.progress.current, target: st.progress.target }));
  return { brand: brand.name, unlocked: unlocked.length, total: badges.length, recent, nearMiss };
}

/**
 * 和上次采集相比新解锁的徽章（包括分级徽章升级）。
 * @param {object|null} prevRaw  上次保存的原始进度（第一次运行时为 null：不报告，避免一次性刷屏）
 */
export function newUnlocks(brandId, prevRaw, nextRaw, { lang = 'en' } = {}) {
  if (!prevRaw) return [];
  const { badges } = BRAND_INFO[brandId];
  const prev = normalizeProgress(prevRaw, badges, brandId);
  const next = normalizeProgress(nextRaw, badges, brandId);
  return badges
    .filter((b) => next[b.id].unlocked && (!prev[b.id].unlocked || (b.tiers && next[b.id].tier > prev[b.id].tier)))
    .map((b) => {
      const st = next[b.id];
      const tier = b.tiers?.[st.tier];
      // 顶级有几款时，告诉用户抽到了哪一款
      const design = tier?.variants ? tierLabel(tier, st.variant, lang) : null;
      return {
        id: b.id,
        title: label(b, st, lang) + (design ? (lang === 'zh' ? `（${design}）` : ` (${design})`) : ''),
        earnedAt: st.earnedAt,
        ...(tier ? { tier: tierKey(tier, st.variant), upgrade: prev[b.id].unlocked } : {}),
      };
    });
}

const fmt = (n) => (n >= 1e9 ? `${+(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${+(n / 1e3).toFixed(1)}K` : String(n));

/** 终端里打印的几行文字。 */
export function formatSummary(s, { lang = 'en' } = {}) {
  const zh = lang === 'zh';
  const lines = [`${s.brand}  ${s.unlocked}/${s.total} ${zh ? '已解锁' : 'unlocked'}`];
  if (s.newUnlocks?.length) lines.push(`  ${zh ? '新解锁' : 'New'}: ${s.newUnlocks.map((r) => r.title).join(', ')}`);
  if (s.recent.length) lines.push(`  ${zh ? '最近获得' : 'Recent'}: ${s.recent.map((r) => `${r.title} (${r.earnedAt})`).join(', ')}`);
  if (s.nearMiss.length) lines.push(`  ${zh ? '即将解锁' : 'Almost there'}: ${s.nearMiss.map((r) => `${r.title} ${fmt(r.current)}/${fmt(r.target)}`).join(', ')}`);
  return lines.join('\n');
}
