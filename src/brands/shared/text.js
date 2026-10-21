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
 * 等级在界面上的名字：普通的一级写金属名（「银级」/ Silver）；
 * 有几种款式的那一级写抽到的款式（「白瓷金」），还没抽到写「隐藏款」。
 * @param {object} tier       config.tiers 里的一项
 * @param {number|null} variant 抽到第几款（state.variant）
 */
export function tierLabel(tier, variant, lang = 'zh') {
  if (!tier?.variants?.length) return tierName(tier?.metal, lang);
  const v = variant == null ? null : tier.variants[variant % tier.variants.length];
  if (!v) return lang === 'zh' ? '隐藏款' : 'Secret';
  return lang === 'zh' ? v.name.zh : v.name.en;
}

/** 等级圆点用的颜色键：普通的一级是金属名；有款式的一级是抽到的款式 id，还没抽到是 secret。 */
export function tierKey(tier, variant) {
  if (!tier?.variants?.length) return tier?.metal;
  return variant == null ? 'secret' : tier.variants[variant % tier.variants.length].id;
}

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

/** 背面刻字（各品牌共用）：品牌、徽章名（分级徽章带数值）、状态、日期或进度。 */
export function engravingLines({ brandName, config, lang = 'zh', earnedAt, unlocked, progress, tier, hidden, shiny = false }) {
  const zh = lang === 'zh';
  if (hidden) return [brandName.toUpperCase(), '???', 'HIDDEN ACHIEVEMENT', zh ? '继续探索' : 'KEEP EXPLORING'];
  if (zh) {
    // 分级徽章不写金属名：数值已经刻在上一行（100B TOKENS），顶级再写抽到的款式
    // 闪光款再在最前面加「闪光」：闪光 · 白瓷金 · 2026.10.24
    const parts = [shiny && '闪光', tier?.variant?.name.zh, earnedAt].filter(Boolean);
    const footer = unlocked ? parts.join(' · ') : `未解锁 · ${progress.current} / ${progress.target}`;
    return [brandName.toUpperCase(), config.title, config.titleEn, footer];
  }
  const parts = [shiny && 'SHINY', tier?.variant?.name.en.toUpperCase(), earnedAt].filter(Boolean);
  const footer = unlocked ? parts.join(' · ') : `${progress.current} / ${progress.target}`;
  return [brandName.toUpperCase(), badgeTitle(config, 'en', tier?.index ?? null), unlocked ? 'ACHIEVEMENT UNLOCKED' : 'LOCKED', footer];
}
