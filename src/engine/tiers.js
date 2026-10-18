// 分级徽章：同一个成就按门槛分成多级（铜 → 银 → 金 → 白金）。
//
// 徽章配置里写 tiers，造型里用占位符引用当前等级：
//   颜色  '$metal'  → tier.metal（色板键名，如 bronze / silver / gold / platinum）
//         '$accent' → tier.accent（可选，每级不同的珐琅色）
//   文字  '{label}' → tier.label（如 '100'、'10M'）
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
 * @param {object} config 徽章配置
 * @param {number} index  等级下标；小于 0（还没达到第一级）时按第一级的造型显示
 */
export function resolveTier(config, index) {
  if (!config.tiers?.length) return config;
  const i = Math.min(Math.max(index, 0), config.tiers.length - 1);
  const tier = config.tiers[i];
  return { ...replaceDeep(config, tier), tier: { ...tier, index: i, name: TIER_NAMES[tier.metal] ?? tier.metal } };
}

/** 根据数值算出达到的等级下标（-1 表示还没到第一级）。 */
export function tierIndexFor(tiers, value) {
  let idx = -1;
  tiers.forEach((t, i) => {
    if (value >= t.threshold) idx = i;
  });
  return idx;
}
