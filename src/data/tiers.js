// 分级徽章：数值 → 达到的等级下标。统计、归一化、命令行都用，不依赖引擎。

/** 根据数值算出达到的等级下标（-1 表示还没到第一级）。 */
export function tierIndexFor(tiers, value) {
  let idx = -1;
  tiers.forEach((t, i) => {
    if (value >= t.threshold) idx = i;
  });
  return idx;
}
