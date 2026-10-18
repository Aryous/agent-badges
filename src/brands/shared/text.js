// 徽章文字的中英文选择（纯函数，浏览器和 Node 都能用）。
// 中文写在徽章配置里（title / description），英文在各品牌的 en.js，组装时挂到 config.en 上。

export const TIER_NAMES = {
  zh: { bronze: '铜', silver: '银', gold: '金', platinum: '白金' },
  en: { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' },
};

/** 等级名：中文「银级」，英文「Silver」。 */
export const tierName = (metal, lang = 'zh') =>
  lang === 'zh' ? `${TIER_NAMES.zh[metal] ?? metal}级` : TIER_NAMES.en[metal] ?? metal;

/**
 * 徽章名。英文分级徽章带上等级数值：已是 1K 级就叫「1K Tool Calls」。
 * @param {number|null} tier 等级下标；null 用第一级
 */
export function badgeTitle(config, lang = 'zh', tier = null) {
  if (lang === 'zh' || !config.en?.title) return config.title;
  const t = config.tiers?.[Math.min(Math.max(tier ?? 0, 0), config.tiers.length - 1)];
  return config.en.title.replaceAll('{label}', t?.label ?? '');
}

export const badgeDescription = (config, lang = 'zh') => (lang === 'zh' ? config.description : config.en?.description ?? config.description);

export const seriesTitle = (s, lang = 'zh') => (lang === 'zh' ? s.title : s.en?.title ?? s.title);
export const seriesSubtitle = (s, lang = 'zh') => (lang === 'zh' ? s.subtitle : s.en?.subtitle ?? s.subtitle);

/** 背面刻字（各品牌共用）：品牌、徽章名、状态、日期或进度。 */
export function engravingLines({ brandName, config, lang = 'zh', earnedAt, unlocked, progress, tier, hidden }) {
  const zh = lang === 'zh';
  if (hidden) return [brandName.toUpperCase(), '???', 'HIDDEN ACHIEVEMENT', zh ? '继续探索' : 'KEEP EXPLORING'];
  if (zh) {
    const footer = unlocked ? (tier ? `${tier.name}级 · ${earnedAt}` : earnedAt) : `未解锁 · ${progress.current} / ${progress.target}`;
    return [brandName.toUpperCase(), config.title, config.titleEn, footer];
  }
  const footer = unlocked ? (tier ? `${TIER_NAMES.en[tier.metal] ?? tier.metal} · ${earnedAt}` : earnedAt) : `${progress.current} / ${progress.target}`;
  return [brandName.toUpperCase(), badgeTitle(config, 'en', tier?.index ?? null), unlocked ? 'ACHIEVEMENT UNLOCKED' : 'LOCKED', footer];
}
