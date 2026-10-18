// 采集结果的文字汇总：解锁数、最近获得、即将解锁。CLI 和 Claude Code Skill 共用。
import claudeBrand from '../brands/claude-code/brand.js';
import claudeBadges from '../brands/claude-code/badges.js';
import codexBrand from '../brands/codex/brand.js';
import codexBadges from '../brands/codex/badges.js';
import { normalizeProgress } from '../data/normalize.js';

const CATALOG = {
  'claude-code': { brand: claudeBrand, badges: claudeBadges },
  codex: { brand: codexBrand, badges: codexBadges },
};

/** 徽章名：中文用 title；英文用 titleEn，分级徽章把 {label} 换成当前（或第一级）的数值。 */
const label = (b, s, lang) => {
  if (lang === 'zh') return b.title;
  const tier = b.tiers?.[s?.tier ?? 0] ?? b.tiers?.[0];
  return titleCase(b.titleEn.replaceAll('{label}', tier?.label ?? '').trim());
};
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])[a-z]/g, (m) => m.toUpperCase()).replace(/\b(\d+)(k|m|b)\b/gi, (_, n, u) => n + u.toUpperCase());

/** 一个品牌的汇总数据（结构化，供 --json 输出）。 */
export function summarize(brandId, rawProgress, { lang = 'en' } = {}) {
  const { brand, badges } = CATALOG[brandId];
  const p = normalizeProgress(rawProgress, badges);
  const unlocked = badges.filter((b) => p[b.id].unlocked);
  const recent = unlocked
    .filter((b) => p[b.id].earnedAt)
    .sort((a, b) => p[b.id].earnedAt.localeCompare(p[a.id].earnedAt))
    .slice(0, 3)
    .map((b) => ({ id: b.id, title: label(b, p[b.id], lang), earnedAt: p[b.id].earnedAt }));
  // 即将解锁：未解锁或未满级的徽章里，进度比例最高的几枚（隐藏成就不透露）
  const nearMiss = badges
    .filter((b) => !(b.hidden && !p[b.id].unlocked))
    .map((b) => {
      const s = p[b.id];
      const maxed = b.tiers ? s.tier === b.tiers.length - 1 : s.unlocked;
      const ratio = s.progress.target ? s.progress.current / s.progress.target : 0;
      return { b, s, maxed, ratio };
    })
    .filter((x) => !x.maxed && x.ratio > 0 && x.ratio < 1)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3)
    .map(({ b, s }) => ({ id: b.id, title: label(b, s, lang), current: s.progress.current, target: s.progress.target }));
  return { brand: brand.name, unlocked: unlocked.length, total: badges.length, recent, nearMiss };
}

const fmt = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${+(n / 1e3).toFixed(1)}K` : String(n));

/** 终端里打印的几行文字。 */
export function formatSummary(s, { lang = 'en' } = {}) {
  const zh = lang === 'zh';
  const lines = [`${s.brand}  ${s.unlocked}/${s.total} ${zh ? '已解锁' : 'unlocked'}`];
  if (s.recent.length) lines.push(`  ${zh ? '最近获得' : 'Recent'}: ${s.recent.map((r) => `${r.title} (${r.earnedAt})`).join(', ')}`);
  if (s.nearMiss.length) lines.push(`  ${zh ? '即将解锁' : 'Almost there'}: ${s.nearMiss.map((r) => `${r.title} ${fmt(r.current)}/${fmt(r.target)}`).join(', ')}`);
  return lines.join('\n');
}
