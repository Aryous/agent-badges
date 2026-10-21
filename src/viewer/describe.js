import { badgeTitle, tierKey, tierLabel } from '../brands/shared/text.js';
import { lang, t } from './i18n.js';

// 徽章状态的文字说明：陈列墙、档案、热力图和详情共用。

/** 日期 YYYY-MM-DD → YYYY.MM.DD；没有日期时返回空串。 */
export const fmtDate = (iso) => (iso ? iso.replaceAll('-', '.') : '');

/** 陈列墙和详情里共用的状态文字。 */
export function describeState(config, state) {
  const masked = config.hidden && !state.unlocked;
  if (masked) return { title: '???', meta: t('state.hidden'), masked };
  const title = badgeTitle(config, lang, state.tier);
  if (config.tiers && state.unlocked) {
    const raw = config.tiers[state.tier];
    const tier = { ...raw, metal: tierKey(raw, state.variant) };
    // 英文标题里已经带着数值（100 Sessions），只写等级名；顶级写抽到的款式
    const name = tierLabel(raw, state.variant, lang);
    const meta = lang === 'zh' ? `${name} · ${tier.label}` : name;
    return { title, meta, tier, masked };
  }
  if (state.unlocked) return { title, meta: fmtDate(state.earnedAt), masked };
  return { title, meta: null, masked };
}
