// Codex 使用统计：从本地会话记录和会话索引库里提取「可观测的元数据」，算出每枚徽章的进度。
//
// 隐私边界（重要）：
//   - 会话记录（rollout）每行只取：记录类型、时间戳、工具名（只认白名单里的几个，其余记为 other）、
//     Token 计数、模型名（立即哈希）、推理强度和审批策略的取值、上下文压缩事件。
//   - 会话索引库只读这些列：创建时间、来源、会话类型、模型、推理强度、审批策略。
//     来源列里的子代理昵称、父会话 id 只用于分类，当场丢弃。
//   - 对话正文、命令参数、命令输出、标题、首条消息、路径、git 信息、账号 id 一律不读。
//   - 输出（账本 + 进度）只包含数字、日期和哈希。

import { fnv1a } from './hash.js';
import {
  addDays,
  applySessionSegments,
  cumulative,
  distinctOver,
  firstDate,
  localDate,
  holidays,
  hoursSeries,
  LAUNCH_DATES,
  once,
  perfectMonth,
  segmentsOf,
  streaks,
  tiered,
  weekday,
} from './metrics-common.js';

const TOOL_ALLOWLIST = new Set(['apply_patch', 'update_plan', 'spawn_agent']);
const HIGH_EFFORT = new Set(['xhigh', 'ultra']);
const USER_ORIGINS = new Set(['vscode', 'cli', 'exec']);
const num = (v) => (Number.isFinite(v) ? v : 0);

/** 会话来源 → 类别：vscode / cli / exec / subagent / other。原始值（可能含子代理昵称）不保留。 */
export function originKind(source) {
  if (typeof source === 'string') {
    if (USER_ORIGINS.has(source)) return source;
    if (source.startsWith('{')) {
      try {
        return originKind(JSON.parse(source));
      } catch {
        return 'other';
      }
    }
    return 'other';
  }
  if (source && typeof source === 'object' && 'subagent' in source) return 'subagent';
  return 'other';
}

const USAGE_FIELDS = ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];
/** 行业通用口径（与 ccusage、CC Switch 一致）：Codex 的 input_tokens 已含缓存命中，推理计在 output_tokens 里。 */
const usageTokens = (u) => num(u.input_tokens) + num(u.output_tokens);

const isReviewModel = (m) => typeof m === 'string' && m.includes('review');

/** 会话记录的一行 → 白名单事实（null 表示对统计没用）。 */
export function extractRolloutFacts(rec, { hash = fnv1a } = {}) {
  if (!rec || typeof rec !== 'object') return null;
  const t = typeof rec.timestamp === 'string' ? Date.parse(rec.timestamp) : NaN;
  const ts = Number.isFinite(t) ? t : null;
  const p = rec.payload ?? {};

  switch (rec.type) {
    case 'session_meta':
      return { ts, kind: 'session', origin: originKind(p.source) };
    case 'turn_context': {
      const review = isReviewModel(p.model);
      return {
        ts,
        kind: 'context',
        review,
        model: !review && typeof p.model === 'string' ? hash(p.model) : null,
        highEffort: HIGH_EFFORT.has(p.effort),
        fullAuto: p.approval_policy === 'never',
      };
    }
    case 'event_msg':
      if (p.type === 'task_started') return { ts, kind: 'task' };
      // 旧版 Codex 没有 token_usage_record，用量只在 token_count 里：取这次的 last。
      // 「本次用量 + 累计值」做指纹：同一次用量的重复播报、分叉 / 子代理会话开头复制的父会话记录，
      // 指纹都和原来那条一样，汇总时跨会话去重
      if (p.type === 'token_count' && p.info && typeof p.info === 'object') {
        const last = p.info.last_token_usage ?? {};
        const total = p.info.total_token_usage ?? {};
        const sig = (u) => USAGE_FIELDS.map((k) => num(u[k])).join('/');
        return { ts, kind: 'usage-stream', tokens: usageTokens(last), total: sig(total), key: hash(`${sig(total)}|${sig(last)}`) };
      }
      return null;
    case 'response_item':
      if (p.type === 'function_call' || p.type === 'custom_tool_call') {
        return { ts, kind: 'tool', name: TOOL_ALLOWLIST.has(p.name) ? p.name : 'other' };
      }
      return null;
    case 'token_usage_record': {
      const u = p.usage ?? {};
      return {
        ts,
        kind: 'usage',
        id: typeof p.response_id === 'string' ? p.response_id : null,
        tokens: usageTokens(u),
      };
    }
    case 'compacted':
      return { ts, kind: 'compact' };
    default:
      return null;
  }
}

/** 会话索引库的一行（只含白名单列）→ 事实。 */
export function threadFacts(row, { hash = fnv1a } = {}) {
  const ts = num(row.created_at_ms) || null;
  if (!ts) return null;
  const origin = originKind(row.source);
  const review = row.thread_source === 'guardian_review' || isReviewModel(row.model);
  let spawned = false;
  if (origin === 'subagent' && typeof row.source === 'string') spawned = row.source.includes('"thread_spawn"');
  return {
    ts,
    origin,
    review,
    spawned,
    model: !review && typeof row.model === 'string' ? hash(row.model) : null,
    highEffort: HIGH_EFFORT.has(row.reasoning_effort),
    fullAuto: USER_ORIGINS.has(origin) && row.approval_mode === 'never',
  };
}

const emptyDay = () => ({
  threads: 0,
  turns: 0,
  tokens: 0,
  patches: 0,
  compactions: 0,
  longestSessionMin: 0,
  hours: Array(24).fill(0),
  spawn: false,
  plan: false,
  highEffort: false,
  fullAuto: false,
  review: false,
  vscode: false,
  models: [],
  // 0.5 新增
  dispatches: 0,
  activeMin: 0,
  maxParallel: 0,
  midnight: false,
});

const IDLE_GAP_MS = 30 * 60 * 1000;

/**
 * @param {object[][]} sessions  每个会话记录文件的事实数组
 * @param {object[]}   threads   会话索引库的事实数组
 */
/**
 * @param {object} [opts]
 * @param {Array}  [opts.streamsOut]  传入时，旧版 token_count 用量不直接计入，而是以 [指纹, 日期, Token] 放进这里，
 *   由调用方合并所有文件后用 applyStreams 统一去重（采集时按文件缓存，跨文件去重只能放到最后做）
 * @param {Array}  [opts.segsOut]  传入时，自己发起的会话的活动段放进这里，由调用方合并所有文件后用
 *   applySessionSegments 统一计算协作时长、多线并行、跨日夜战（这三项要跨会话一起算）
 */
export function aggregateCodexDays(sessions, threads, { streamsOut = null, segsOut = null } = {}) {
  const days = {};
  const day = (ts) => (days[localDate(ts)] ??= emptyDay());
  const seenUsage = new Set();
  const seenStreams = new Set();
  const allSegs = segsOut ?? [];

  for (const facts of sessions) {
    const sorted = facts.filter((f) => f && f.ts !== null).sort((a, b) => a.ts - b.ts);
    const origin = sorted.find((f) => f.kind === 'session')?.origin ?? 'other';
    const human = USER_ORIGINS.has(origin);
    // 新版每次响应都有 token_usage_record，同时也有 token_count；有前者时不再看后者，避免重复计
    const hasRecords = sorted.some((f) => f.kind === 'usage');
    let lastTotal = null;
    let last = null;
    let activeMs = 0;
    if (human && sorted.length) allSegs.push(segmentsOf(sorted.map((f) => f.ts)));
    for (const f of sorted) {
      const d = day(f.ts);
      if (human && last !== null) {
        const gap = f.ts - last;
        if (gap > 0 && gap < IDLE_GAP_MS) activeMs += gap;
        const min = Math.round(activeMs / 60000);
        if (min > d.longestSessionMin) d.longestSessionMin = min;
      }
      last = f.ts;

      if (f.kind === 'task' && human) {
        d.turns += 1;
        d.hours[new Date(f.ts).getHours()] += 1;
      }
      if (f.kind === 'usage') {
        if (f.id && seenUsage.has(f.id)) continue;
        if (f.id) seenUsage.add(f.id);
        d.tokens += f.tokens;
      }
      if (f.kind === 'usage-stream' && !hasRecords && f.total !== lastTotal) {
        lastTotal = f.total;
        if (streamsOut) streamsOut.push([f.key, localDate(f.ts), f.tokens]);
        else if (!seenStreams.has(f.key)) {
          seenStreams.add(f.key);
          d.tokens += f.tokens;
        }
      }
      if (f.kind === 'tool') {
        if (f.name === 'apply_patch') d.patches += 1;
        if (f.name === 'update_plan') d.plan = true;
        if (f.name === 'spawn_agent') {
          d.spawn = true;
          // 子代理再派出去的不算，只算自己发起的会话派出的
          if (human) d.dispatches += 1;
        }
      }
      if (f.kind === 'compact') d.compactions += 1;
      if (f.kind === 'context') {
        if (f.review) d.review = true;
        if (human && f.highEffort) d.highEffort = true;
        if (human && f.fullAuto) d.fullAuto = true;
        if (f.model && !d.models.includes(f.model)) d.models.push(f.model);
      }
      if (f.kind === 'session' && origin === 'vscode') d.vscode = true;
    }
  }

  for (const t of threads) {
    if (!t) continue;
    const d = day(t.ts);
    if (USER_ORIGINS.has(t.origin)) d.threads += 1;
    if (t.origin === 'vscode') d.vscode = true;
    if (t.review) d.review = true;
    if (t.spawned) d.spawn = true;
    if (t.highEffort && t.origin !== 'subagent') d.highEffort = true;
    if (t.fullAuto) d.fullAuto = true;
    if (t.model && !d.models.includes(t.model)) d.models.push(t.model);
  }
  if (!segsOut && allSegs.length) applySessionSegments(days, allSegs, emptyDay);
  return days;
}

/**
 * 合并两份按天汇总（用于把各个会话文件的缓存结果加起来）：
 * 计数相加，标记取或，最长会话取最大，模型取并集。
 */
/** 把各文件交出来的活动段统一计入（就地修改 days）。 */
export function applyCodexSegments(days, segs) {
  return applySessionSegments(days, segs, emptyDay);
}

/** 把 aggregateCodexDays 交出来的旧版用量按指纹去重后计入（就地修改 days）。 */
export function applyStreams(days, streams) {
  const seen = new Set();
  for (const [key, date, tokens] of streams) {
    if (seen.has(key)) continue;
    seen.add(key);
    (days[date] ??= emptyDay()).tokens += tokens;
  }
  return days;
}

export function mergeDays(a, b) {
  const out = structuredClone(a);
  for (const [date, d] of Object.entries(b)) {
    const t = (out[date] ??= emptyDay());
    for (const k of ['threads', 'turns', 'tokens', 'patches', 'compactions', 'dispatches', 'activeMin']) t[k] += d[k] ?? 0;
    for (const k of ['spawn', 'plan', 'highEffort', 'fullAuto', 'review', 'vscode', 'midnight']) t[k] ||= d[k] ?? false;
    t.longestSessionMin = Math.max(t.longestSessionMin, d.longestSessionMin);
    t.maxParallel = Math.max(t.maxParallel, d.maxParallel ?? 0);
    d.hours.forEach((h, i) => (t.hours[i] += h));
    for (const m of d.models) if (!t.models.includes(m)) t.models.push(m);
  }
  return out;
}

/** 账本合并：本次能看到的日期以本次为准，看不到的日期保留旧值。 */
export function mergeCodexLedger(ledger, freshDays) {
  const days = { ...(ledger?.days ?? {}) };
  for (const [date, d] of Object.entries(freshDays)) days[date] = d;
  const firstSeen = [ledger?.firstSeen, Object.keys(days).sort()[0]].filter(Boolean).sort()[0] ?? null;
  return { version: 1, firstSeen, days };
}

export function computeCodexProgress(ledger, badges, today) {
  const days = ledger.days;
  const dates = Object.keys(days)
    .filter((date) => {
      const d = days[date];
      return d.threads > 0 || d.turns > 0 || d.patches > 0;
    })
    .sort();
  const tiersOf = (id) => badges.find((b) => b.id === id)?.tiers ?? [];
  const out = {};
  const cum = (field) => cumulative(dates, days, field);
  const tier = (id, field) => {
    const s = cum(field);
    out[id] = tiered(tiersOf(id), s.value, s.reachedOn);
  };

  // 里程碑
  out['first-thread'] = once(firstDate(dates, days, (d) => d.threads > 0) ?? dates[0] ?? null);
  tier('threads', 'threads');
  tier('tokens', 'tokens');
  tier('patches', 'patches');

  // 连续与习惯
  const { best, reached } = streaks(dates);
  out['seven-day-streak'] = once(reached[7] ?? null, Math.min(best, 7), 7);
  out['streak-days'] = tiered(tiersOf('streak-days'), best, (n) => reached[n] ?? null);
  out['night-owl'] = once(firstDate(dates, days, (d) => d.hours.slice(0, 5).some((h) => h > 0)));
  out['early-bird'] = once(firstDate(dates, days, (d) => d.hours[5] + d.hours[6] > 0));
  out['weekend-warrior'] = once(firstDate(dates, days, (_, date) => weekday(date) === 0 && dates.includes(addDays(date, -1))));
  {
    const longest = Math.max(0, ...dates.map((d) => days[d].longestSessionMin));
    out.marathon = once(firstDate(dates, days, (d) => d.longestSessionMin >= 240), Math.floor(longest / 60), 4);
  }

  // 功能探索（这几项也看非活跃日，例如只有子代理或审查记录的日子）
  const all = Object.keys(days).sort();
  out['multi-agent'] = once(firstDate(all, days, (d) => d.spawn));
  out['plan-tracker'] = once(firstDate(all, days, (d) => d.plan));
  out['deep-thinker'] = once(firstDate(all, days, (d) => d.highEffort));
  out['full-auto'] = once(firstDate(all, days, (d) => d.fullAuto));
  out.reviewer = once(firstDate(all, days, (d) => d.review));
  out['ide-buddy'] = once(firstDate(all, days, (d) => d.vscode));

  // 限定与彩蛋
  out['programmers-day'] = once(firstDate(dates, days, (_, date) => date.endsWith('-10-24')));
  {
    const first = [ledger.firstSeen, dates[0]].filter(Boolean).sort()[0];
    const anniv = first ? addDays(first, 365) : null;
    out.anniversary = once(anniv && anniv <= today ? anniv : null);
  }
  {
    const { size, reached: r } = distinctOver(all, days, 'models', 4);
    out['model-collector'] = once(r, Math.min(size, 4), 4);
  }
  {
    const s = cumulative(all, days, 'compactions');
    out.compactor = once(s.reachedOn(20), Math.min(s.value, 20), 20);
  }

  // ---- 0.5 新增 ----
  const maxOf = (field) => Math.max(0, ...dates.map((d) => days[d][field] ?? 0));
  // 习惯
  out['midnight-crossing'] = once(firstDate(dates, days, (d) => d.midnight));
  out['productive-day'] = once(firstDate(dates, days, (d) => d.threads >= 20), Math.min(maxOf('threads'), 20), 20);
  out.multitasker = once(firstDate(dates, days, (d) => (d.maxParallel ?? 0) >= 3), Math.min(maxOf('maxParallel'), 3), 3);
  {
    const pm = perfectMonth(dates, today);
    out['perfect-month'] = once(pm.date, pm.current, pm.target);
  }
  // 里程碑
  {
    const h = hoursSeries(dates, days);
    out['active-hours'] = tiered(tiersOf('active-hours'), h.value, h.reachedOn);
  }
  tier('dispatches', 'dispatches');
  // 节日限定
  const on = (pred) => once(firstDate(dates, days, (_, date) => pred(date)));
  out['new-year'] = on(holidays['new-year']);
  out['spring-festival'] = on(holidays['spring-festival']);
  out['tool-birthday'] = on(holidays.birthday(LAUNCH_DATES.codex));
  out.christmas = on(holidays.christmas);
  return out;
}
