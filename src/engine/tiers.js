// 分级徽章：同一个成就按门槛分成多级（铜 → 银 → 金 → 白金）。
//
// 徽章配置里写 tiers，造型里用占位符引用当前等级：
//   颜色  '$metal'  → tier.metal（色板键名，如 bronze / silver / gold / platinum）
//         '$accent' → tier.accent（可选，每级不同的珐琅色）
//   文字  '{label}' → tier.label（如 '100'、'10M'）
//
// 某一级还可以带 variants（同一级的几种款式，比如顶级随机解锁其中一款）：
//   { id, name: { zh, en }, metal, accent, shape?, layers?, relief?, back? }
// 选中的款式先替换徽章的外形 / 底层 / 浮雕 / 背面，再替换上面的占位符。
//
// resolveTier(config, i) 返回把占位符换成第 i 级具体值的普通配置，
// 引擎其余部分不需要知道分级的存在。

export const TIER_NAMES = { bronze: '铜', silver: '银', gold: '金', platinum: '白金' };

function replaceDeep(value, tier) {
  if (typeof value === 'string') {
    if (value === '$metal') return tier.metal;
    if (value === '$accent') return tier.accent ?? tier.metal;
    return value.replaceAll('{label}', tier.label ?? '');
  }
  if (Array.isArray(value)) return value.map((v) => replaceDeep(v, tier));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = k === 'tiers' ? v : replaceDeep(v, tier);
    return out;
  }
  return value;
}

/**
 * @param {object} config  徽章配置
 * @param {number} index   等级下标；小于 0（还没达到第一级）时按第一级的造型显示
 * @param {number} [variant=0] 这一级有多个款式时选第几款（越界取模）
 */
export function resolveTier(config, index, variant = 0) {
  if (!config.tiers?.length) return config;
  const i = Math.min(Math.max(index, 0), config.tiers.length - 1);
  const { variants, ...tier } = config.tiers[i];
  let base = config;
  let picked = null;
  let fields = tier;
  if (variants?.length) {
    const n = variants.length;
    const k = (((variant ?? 0) % n) + n) % n;
    const { shape, layers, relief, back, ...rest } = variants[k];
    picked = { index: k, count: n, id: rest.id, name: rest.name };
    fields = { ...tier, ...rest };
    base = { ...config, ...(shape && { shape }), ...(layers && { layers }), ...(relief && { relief }), ...(back && { back }) };
  }
  return { ...replaceDeep(base, fields), tier: { ...fields, index: i, name: TIER_NAMES[fields.metal] ?? fields.metal, variant: picked } };
}
