import { badgeTitle, tierKey, tierLabel } from '../brands/shared/text.js';
import { STAGE_METALS, nextStage, stageOf } from '../brands/shared/completionist.js';
import { formatCount } from '../data/format.js';
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

/**
 * 全解锁徽章在单枚查看里的副标题和进度文字。
 * 进行中：副标题写当前阶段，进度条写 k / n 和下一阶段；已完成：副标题写完成日期（没有就不写），不显示进度条（meter 为 null）。
 */
export function describeCompletionist(state, l = lang) {
  const { current: k, target: n } = state.progress;
  const next = nextStage(k, n);
  if (!next) return { kicker: [t('state.earned', {}, l), fmtDate(state.earnedAt)].filter(Boolean).join(' · '), meter: null };
  const name = (key) => t(`completionist.${key}`, {}, l);
  return {
    kicker: t('completionist.stageNow', { stage: name(STAGE_METALS[stageOf(k, n)]) }, l),
    meter: `${formatCount(k)} / ${formatCount(n)}${t('completionist.next', { stage: name(next.metal), n: next.remaining }, l)}`,
  };
}
