// 大数字的显示格式：网页、成就卡片、终端汇总共用，不区分语言。

const UNITS = ['K', 'M', 'B'];

/**
 * 1234 → 1.2K，1234567 → 1.2M，9750000000 → 9.8B；小于 1000 原样显示。
 * 保留一位小数并去掉末尾的 .0；四舍五入后满 1000 就进到下一个单位（999950 → 1M，不是 1000K）。
 */
export function formatCount(n) {
  if (n < 1000) return String(n);
  let unit = 0;
  let v = n / 1000;
  while (unit < UNITS.length - 1 && +v.toFixed(1) >= 1000) {
    v /= 1000;
    unit += 1;
  }
  return `${+v.toFixed(1)}${UNITS[unit]}`;
}
