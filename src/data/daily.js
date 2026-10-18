// 按天的使用量：热力图和分享海报用。只有日期和两个数字（Token、对话轮数）。
//   daily = { 'YYYY-MM-DD': [tokens, turns] }
import { addDays, streaks } from './metrics-common.js';

const TURNS_FIELD = { 'claude-code': 'humanTurns', codex: 'turns' };

/** 账本 → 按天的使用量（没有任何活动的日子不写）。 */
export function dailySeries(brandId, ledger) {
  const field = TURNS_FIELD[brandId];
  const out = {};
  for (const date of Object.keys(ledger?.days ?? {}).sort()) {
    const d = ledger.days[date];
    const tokens = Math.round(d.tokens ?? 0);
    const turns = d[field] ?? 0;
    if (tokens > 0 || turns > 0) out[date] = [tokens, turns];
  }
  return out;
}

/** 一段日期范围内的汇总：Token、活跃天数、最长连续天数。 */
export function dailyStats(daily, { from = '0000-00-00', to = '9999-99-99' } = {}) {
  const dates = Object.keys(daily ?? {})
    .filter((d) => d >= from && d <= to)
    .sort();
  const tokens = dates.reduce((s, d) => s + daily[d][0], 0);
  const turns = dates.reduce((s, d) => s + daily[d][1], 0);
  return { tokens, turns, activeDays: dates.length, longestStreak: streaks(dates).best };
}

/** 有数据的年份（升序）。 */
export const dailyYears = (...series) =>
  [...new Set(series.flatMap((s) => Object.keys(s ?? {}).map((d) => Number(d.slice(0, 4)))))].sort((a, b) => a - b);

/**
 * 示例数据：用固定种子生成看起来像真人的使用曲线（工作日多、周末少、偶尔休息几天）。
 * 相同参数永远得到相同结果，截图和测试稳定。
 */
export function mockDaily({ seed = 1, from, to, base = 400_000, restRate = 0.18 }) {
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const out = {};
  let resting = 0;
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const dow = new Date(`${date}T00:00:00`).getDay();
    if (resting > 0) {
      resting -= 1;
      continue;
    }
    if (rand() < 0.03) resting = 2 + Math.floor(rand() * 5); // 偶尔休息几天
    const weekend = dow === 0 || dow === 6;
    if (rand() < (weekend ? restRate * 2.6 : restRate)) continue;
    // 长尾分布：大多数日子普通，少数日子很猛
    const burst = Math.exp(rand() * 2.4 - 0.6);
    const tokens = Math.round(base * burst * (weekend ? 0.6 : 1));
    out[date] = [tokens, Math.max(1, Math.round(tokens / 18_000))];
  }
  return out;
}
