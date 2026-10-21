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

// ---------- 会话活动段：协作时长、多线并行、跨日夜战 ----------

const MIN = 60 * 1000;
/** 活动段的最小粒度：同一会话相邻两次活动间隔 ≤ 10 分钟就算一直在活动（多线并行用这个粒度） */
export const SEGMENT_GAP_MS = 10 * MIN;
/** 协作时长：间隔 ≤ 30 分钟的部分计入，超过的视为离开 */
const ACTIVE_GAP_MS = 30 * MIN;
/** 跨日夜战：23:00–02:00 之间相邻两次活动的间隔不超过 60 分钟 */
const NIGHT_GAP_MS = 60 * MIN;

/** 一个会话的活动时间点 → 活动段 [[开始, 结束], …]：相邻两点间隔 ≤ gap 就连成一段。 */
export function segmentsOf(times, gap = SEGMENT_GAP_MS) {
  const ts = [...times].sort((a, b) => a - b);
  const out = [];
  for (const t of ts) {
    const last = out[out.length - 1];
    if (last && t - last[1] <= gap) last[1] = t;
    else out.push([t, t]);
  }
  return out;
}

/** 把细粒度的活动段按更大的间隔再连起来（结果与直接按大间隔分段相同）。 */
export function joinSegments(segs, gap) {
  const out = [];
  for (const [a, b] of [...segs].sort((x, y) => x[0] - y[0])) {
    const last = out[out.length - 1];
    if (last && a - last[1] <= gap) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** 本地日期 date 的 hh:00 时刻（毫秒）。 */
const at = (date, hh) => new Date(`${date}T${String(hh).padStart(2, '0')}:00:00`).getTime();

/**
 * 由所有会话的活动段（每个会话一组，粒度 SEGMENT_GAP_MS）算出每天的：
 *   activeMin    活动时间并集（分钟，多个会话同时进行只算一次）
 *   maxParallel  同时处于活动中的会话数的最大值
 *   midnight     这天 23:00 前开始的活动一直持续到次日 02:00 之后
 * 结果写进 days（就地修改），没有的日期会新建。
 */
export function applySessionSegments(days, sessionSegs, emptyDay) {
  const reset = (d) => Object.assign(d, { activeMin: 0, maxParallel: 0, midnight: false });
  for (const d of Object.values(days)) reset(d);
  const day = (date) => (days[date] ??= reset(emptyDay()));

  // 协作时长：先按 30 分钟连段，再把所有会话的段求并集，按本地日期切开累加
  const union = joinSegments(sessionSegs.flatMap((s) => joinSegments(s, ACTIVE_GAP_MS)), 0);
  for (const [a, b] of union) {
    let t = a;
    while (t < b) {
      const date = localDate(t);
      const end = Math.min(b, at(addDays(date, 1), 0));
      day(date).activeMin += (end - t) / MIN;
      t = end;
    }
  }
  for (const d of Object.values(days)) d.activeMin = Math.round(d.activeMin);

  // 多线并行：扫描线，开始在前、结束在后（同一时刻开始和结束算重叠）
  const events = [];
  for (const segs of sessionSegs) for (const [a, b] of segs) events.push([a, 1], [b, -1]);
  events.sort((x, y) => x[0] - y[0] || y[1] - x[1]);
  let open = 0;
  for (const [t, delta] of events) {
    open += delta;
    if (delta > 0) {
      const d = day(localDate(t));
      if (open > d.maxParallel) d.maxParallel = open;
    }
  }

  // 跨日夜战：按 60 分钟连段，某段覆盖 [D 日 23:00 之前, D+1 日 02:00 之后]
  for (const segs of sessionSegs) {
    for (const [a, b] of joinSegments(segs, NIGHT_GAP_MS)) {
      for (let date = localDate(a); at(date, 0) <= b; date = addDays(date, 1)) {
        if (a < at(date, 23) && b > at(addDays(date, 1), 2)) day(date).midnight = true;
      }
    }
  }
  return days;
}

// ---------- 节日 ----------

/** 农历正月初一。只到 2035 年：之后的年份不判定，需要续表。 */
const SPRING_FESTIVAL = new Set([
  '2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03',
  '2031-01-23', '2032-02-11', '2033-01-31', '2034-02-19', '2035-02-08',
]);

export const holidays = {
  'new-year': (date) => date.endsWith('-01-01'),
  'spring-festival': (date) => SPRING_FESTIVAL.has(date),
  christmas: (date) => date.endsWith('-12-25'),
  birthday: (launch) => (date) => date >= launch && date.slice(5) === launch.slice(5),
};

// ---------- 全勤月 ----------

/** 某月的全部工作日（周一到周五）。 */
function weekdaysOf(month) {
  const out = [];
  for (let date = `${month}-01`; date.startsWith(month); date = addDays(date, 1)) {
    const w = weekday(date);
    if (w >= 1 && w <= 5) out.push(date);
  }
  return out;
}

/**
 * 全勤月：某个自然月的每个工作日都有活动。不扣法定节假日。
 * @returns {{ date: string|null, current: number, target: number }}
 *   date 为第一次达成的那个月的最后一个工作日；进度显示本月（today 所在月）已打卡的工作日数
 */
export function perfectMonth(dates, today) {
  const active = new Set(dates);
  const months = [...new Set(dates.map((d) => d.slice(0, 7)))].sort();
  let date = null;
  for (const m of months) {
    const wd = weekdaysOf(m);
    if (wd.every((d) => active.has(d))) {
      date = wd[wd.length - 1];
      break;
    }
  }
  const cur = weekdaysOf(today.slice(0, 7));
  return { date, current: cur.filter((d) => active.has(d)).length, target: cur.length };
}

/** 协作时长：按分钟累计，value 和门槛都按整小时算。 */
export function hoursSeries(dates, days, field = 'activeMin') {
  const s = cumulative(dates, days, field);
  return { value: Math.floor(s.value / 60), reachedOn: (h) => s.reachedOn(h * 60) };
}
