// 各品牌统计共用的小工具：本地日期、累计序列、连续天数、账本合并。

/** 本地日期 YYYY-MM-DD（按运行机器的时区）。 */
export function localDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d.getTime());
};

/** 0 周日 … 6 周六 */
export const weekday = (date) => new Date(`${date}T00:00:00`).getDay();

/** 累计型指标：按日期顺序累加，返回当前值和「第一次达到 threshold 的日期」。 */
export function cumulative(dates, days, field) {
  let total = 0;
  const steps = [];
  for (const date of dates) {
    total += days[date][field] ?? 0;
    steps.push([date, total]);
  }
  return { value: total, reachedOn: (threshold) => steps.find(([, v]) => v >= threshold)?.[0] ?? null };
}

/** 第一次满足条件的日期 */
export const firstDate = (dates, days, pred) => dates.find((d) => pred(days[d], d)) ?? null;

/** 连续天数：最长连续天数，以及每个天数第一次达到的日期。 */
export function streaks(dates) {
  let run = 0;
  let best = 0;
  const reached = {};
  for (let i = 0; i < dates.length; i++) {
    run = i > 0 && addDays(dates[i - 1], 1) === dates[i] ? run + 1 : 1;
    if (run > best) {
      for (let n = best + 1; n <= run; n++) reached[n] ??= dates[i];
      best = run;
    }
  }
  return { best, reached };
}

/** 去重累加：按日期顺序把每天的集合并起来，返回最终数量和第一次达到 n 的日期。 */
export function distinctOver(dates, days, field, n) {
  const seen = new Set();
  let reached = null;
  for (const date of dates) {
    for (const v of days[date][field] ?? []) seen.add(v);
    if (!reached && seen.size >= n) reached = date;
  }
  return { size: seen.size, reached };
}

/** 一次性徽章的原始进度。 */
export function once(date, current = date ? 1 : 0, target = 1) {
  return date ? { unlocked: true, earnedAt: date, progress: { current: target, target } } : { unlocked: false, progress: { current, target } };
}

/** 分级徽章：当前值 + 当前等级的达成日期。 */
export function tiered(tiers, value, reachedOn) {
  let earnedAt = null;
  for (const t of tiers ?? []) if (value >= t.threshold) earnedAt = reachedOn(t.threshold);
  return { value, earnedAt };
}
