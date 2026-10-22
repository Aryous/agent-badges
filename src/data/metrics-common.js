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

/**
 * 「某一天的 field 达到 target」类徽章。进度显示历史单日最高值（不超过 target）。
 * @param {string[]} dates 参与判断的日期（升序）
 */
export function dayPeak(dates, days, field, target) {
  const max = Math.max(0, ...dates.map((d) => days[d][field] ?? 0));
  return once(firstDate(dates, days, (d) => (d[field] ?? 0) >= target), Math.min(max, target), target);
}

// ---------- 会话活动段：协作时长、多线并行、跨日夜战 ----------

const MIN = 60 * 1000;
/** 活动段的最小粒度：同一会话相邻两次活动间隔 ≤ 10 分钟就算一直在活动（多线并行用这个粒度） */
export const SEGMENT_GAP_MS = 10 * MIN;
/** 两次活动间隔超过 30 分钟视为离开：会话时长、协作时长都不计这一段。 */
export const IDLE_GAP_MS = 30 * MIN;
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
  const union = joinSegments(sessionSegs.flatMap((s) => joinSegments(s, IDLE_GAP_MS)), 0);
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

// ---------- 规则共用部分（claude-code / codex 两个品牌的 RULES 表都从这里取） ----------

/**
 * 规则共用的上下文：活跃日期、按天数据，以及几个常用的算法。
 * 什么算「活跃日」由品牌自己的 isActive(day) 决定，其余完全一致。
 *   dates / first / on / cum / maxOf / peak  只看活跃日
 *   all / firstAll                            看账本里的所有日期（只有子代理、审查记录的日子也算）
 */
export function metricsContext(ledger, today, isActive) {
  const days = ledger.days;
  const all = Object.keys(days).sort();
  const dates = all.filter((date) => isActive(days[date]));
  let streak;
  return {
    ledger,
    days,
    dates,
    all,
    today,
    first: (pred) => firstDate(dates, days, pred),
    firstAll: (pred) => firstDate(all, days, pred),
    on: (pred) => once(firstDate(dates, days, (_, date) => pred(date))),
    cum: (field) => cumulative(dates, days, field),
    maxOf: (field) => Math.max(0, ...dates.map((d) => days[d][field] ?? 0)),
    peak: (field, target) => dayPeak(dates, days, field, target),
    get streak() {
      return (streak ??= streaks(dates));
    },
  };
}

/**
 * 由规则表生成 computeProgress(ledger, badges, today)：每枚徽章按自己的规则算出原始进度（交给 normalizeProgress）。
 * @param {Record<string, Function>} rules  徽章 id → 规则 (ctx, badge) => 原始进度
 * @param {(day: object) => boolean} isActive  这一天算不算活跃
 * @param {string} rulesFile  缺规则时报错里指出的文件
 */
export function createComputeProgress(rules, isActive, rulesFile) {
  return (ledger, badges, today) => {
    const ctx = metricsContext(ledger, today, isActive);
    return Object.fromEntries(
      badges.map((b) => {
        const rule = rules[b.id];
        if (!rule) throw new Error(`徽章「${b.id}」没有统计规则：在 ${rulesFile} 的 RULES 里加一条`);
        return [b.id, rule(ctx, b)];
      }),
    );
  };
}

/** 分级徽章：按徽章自己的 tiers 取等级，series 是 { value, reachedOn }。 */
export const tier = (badge, series) => tiered(badge.tiers, series.value, series.reachedOn);

/** 分级徽章「累计某个按天字段」：品牌表里写成 tierOf('tokens') 一行。 */
export const tierOf = (field) => (c, b) => tier(b, c.cum(field));

/** 工具生日：从 launchDate 起每年同月同日。每个品牌传自己的上线日期。 */
export const birthdayRule = (launchDate) => (c) => c.on(holidays.birthday(launchDate));

/**
 * 两个品牌里 id 相同、实现也完全相同的规则。
 * 只放两边都有的徽章；品牌独有的、或同 id 但口径不同的（如 productive-day 看的字段不同）留在各自的 RULES 里。
 * tests/contracts.test.js 要求每个品牌的 RULES 键恰好等于它的徽章 id。
 */
export const COMMON_RULES = {
  // 里程碑
  tokens: tierOf('tokens'),
  'active-hours': (c, b) => tier(b, hoursSeries(c.dates, c.days)),
  dispatches: tierOf('dispatches'),

  // 连续与习惯
  'seven-day-streak': (c, { criteria: { target: t } }) => once(c.streak.reached[t] ?? null, Math.min(c.streak.best, t), t),
  'streak-days': (c, b) => tiered(b.tiers, c.streak.best, (n) => c.streak.reached[n] ?? null),
  'night-owl': (c) => once(c.first((d) => d.hours.slice(0, 5).some((h) => h > 0))),
  'early-bird': (c) => once(c.first((d) => d.hours[5] + d.hours[6] > 0)),
  // 周末战士：同一个周末的周六和周日都有使用，记在周日
  'weekend-warrior': (c) => once(c.first((_, date) => weekday(date) === 0 && c.dates.includes(addDays(date, -1)))),
  // 门槛单位是小时，账本里是分钟
  marathon: (c, { criteria: { target: t } }) => once(c.first((d) => d.longestSessionMin >= t * 60), Math.floor(c.maxOf('longestSessionMin') / 60), t),
  'midnight-crossing': (c) => once(c.first((d) => d.midnight)),
  multitasker: (c, b) => c.peak('maxParallel', b.criteria.target),
  // 门槛是当月的工作日数，由规则自己算（配置里的 target 只是显示兜底）
  'perfect-month': (c) => {
    const pm = perfectMonth(c.dates, c.today);
    return once(pm.date, pm.current, pm.target);
  },

  // 限定与彩蛋
  'programmers-day': (c) => c.on((date) => date.endsWith('-10-24')),
  // 门槛是年数
  anniversary: (c, { criteria: { target: years } }) => {
    const firstDay = [c.ledger.firstSeen, c.dates[0]].filter(Boolean).sort()[0];
    const anniv = firstDay ? addDays(firstDay, 365 * years) : null;
    return once(anniv && anniv <= c.today ? anniv : null);
  },
  'new-year': (c) => c.on(holidays['new-year']),
  'spring-festival': (c) => c.on(holidays['spring-festival']),
  christmas: (c) => c.on(holidays.christmas),
};
