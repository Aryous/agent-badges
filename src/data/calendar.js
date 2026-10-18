// 年度日历的纯计算部分（不依赖 DOM，方便测试）。
import { addDays, localDate } from './metrics-common.js';

/**
 * 一年的日历按周排成列：每列 7 格，第一列从 weekStart（0 周日 / 1 周一）开始，
 * 不属于这一年的格子为 null。
 * @returns {{ weeks: (string|null)[][], monthStarts: { month: number, col: number }[] }}
 */
export function yearWeeks(year, weekStart = 1) {
  const first = `${year}-01-01`;
  const last = `${year}-12-31`;
  const offset = (new Date(`${first}T00:00:00`).getDay() - weekStart + 7) % 7;
  let date = addDays(first, -offset);
  const weeks = [];
  const monthStarts = [];
  while (date <= last) {
    const col = [];
    for (let i = 0; i < 7; i++) {
      const inYear = date >= first && date <= last;
      col.push(inYear ? date : null);
      if (inYear && date.endsWith('-01')) monthStarts.push({ month: Number(date.slice(5, 7)) - 1, col: weeks.length });
      date = addDays(date, 1);
    }
    weeks.push(col);
  }
  return { weeks, monthStarts };
}

/** 颜色深浅的分档门槛：用这个工具全部有 Token 的日子的四分位数（对数刻度更符合直觉）。 */
export function levelThresholds(daily) {
  const v = Object.values(daily ?? {})
    .map(([tokens]) => tokens)
    .filter((x) => x > 0)
    .sort((a, b) => a - b);
  if (!v.length) return [1, 1, 1];
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return [q(0.25), q(0.5), q(0.75)];
}

/** 当天的深浅档位：0 没活动，1–4 由浅到深。只有对话没有 Token 的日子算 1。 */
export function levelOf(entry, thresholds) {
  if (!entry) return 0;
  const [tokens, turns] = entry;
  if (tokens <= 0) return turns > 0 ? 1 : 0;
  const [a, b, c] = thresholds;
  return tokens >= c ? 4 : tokens >= b ? 3 : tokens >= a ? 2 : 1;
}

export const today = () => localDate(Date.now());
