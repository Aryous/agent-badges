// Claude Code 使用统计：从本地会话记录里提取「可观测的元数据」，算出每枚徽章的进度。
//
// 隐私边界（重要）：
//   - 每条记录只按白名单取字段：时间戳、会话 id、记录类型、模型名、工具名、
//     Token 计数、权限模式、附件/系统消息的类型值、是否子代理。
//   - 对话正文、工具参数、工具结果、文件内容一律不读取、不保存、不输出。
//   - MCP 服务名只用于去重计数，保存前做哈希。
//   - 输出（账本 + 进度）只包含数字、日期和哈希。
//
// 这个模块是纯函数，不碰文件系统；读文件的部分在 scripts/collect-claude-code.mjs。

// ---------- 1. 单条记录 → 白名单事实 ----------

const MODEL_FAMILIES = ['opus', 'sonnet', 'haiku', 'fable'];

/** 模型名 → 家族（opus / sonnet / haiku / fable），认不出返回 null。 */
export function modelFamily(model) {
  if (typeof model !== 'string') return null;
  const m = model.toLowerCase();
  return MODEL_FAMILIES.find((f) => m.includes(f)) ?? null;
}

/** 默认哈希（FNV-1a）：MCP 服务名在提取时就被替换，原名不进入任何后续数据。 */
export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Claude Code 自带的 MCP 服务：装好就有，不是用户自己接入的，不计入「连接者」。
 * Claude Code 以后新增自带服务时，要补到这里。
 */
const BUILTIN_MCP = new Set(['claude_browser', 'claude_in_chrome', 'computer_use', 'remote_devices', 'claude_ai_claude_docs']);

/**
 * 从工具名里取 MCP 服务名。不是 MCP 工具返回 undefined；是自带服务返回 null（算 MCP 调用，但不计入服务数）。
 */
function mcpServer(name) {
  if (typeof name !== 'string') return undefined;
  const m = /^mcp__([^_].*?)__/.exec(name);
  if (!m) return undefined;
  return BUILTIN_MCP.has(m[1].toLowerCase().replace(/-/g, '_')) ? null : m[1];
}

/**
 * 从一条会话记录里取出白名单字段。返回 null 表示这条记录对统计没用。
 * 注意：这里刻意不返回任何字符串内容，除了 id、类型值、模型家族和哈希。
 */
export function extractFacts(rec, { hash = fnv1a } = {}) {
  if (!rec || typeof rec !== 'object') return null;
  const ts = typeof rec.timestamp === 'string' ? Date.parse(rec.timestamp) : NaN;
  const base = {
    ts: Number.isFinite(ts) ? ts : null,
    sessionId: typeof rec.sessionId === 'string' ? rec.sessionId : null,
    sidechain: rec.isSidechain === true,
  };

  if (rec.type === 'user') {
    // 只判断是不是「人发出的一轮」，不看内容：工具结果也是 user 记录，用 toolUseResult/内容块类型区分
    const content = rec.message?.content;
    const isToolResult =
      rec.toolUseResult !== undefined ||
      (Array.isArray(content) && content.length > 0 && content.every((c) => c?.type === 'tool_result'));
    return { ...base, kind: 'user', human: !isToolResult && !rec.isMeta };
  }

  if (rec.type === 'assistant') {
    const msg = rec.message ?? {};
    const u = msg.usage ?? {};
    const tools = [];
    for (const c of Array.isArray(msg.content) ? msg.content : []) {
      if (c?.type !== 'tool_use' || typeof c.name !== 'string') continue;
      // 只保留工具名；MCP 工具只保留服务名（随后哈希），参数 c.input 完全不读
      const server = mcpServer(c.name);
      tools.push({ id: typeof c.id === 'string' ? c.id : null, name: server === undefined ? c.name : 'mcp', mcp: server ? hash(server) : null });
    }
    return {
      ...base,
      kind: 'assistant',
      messageId: typeof msg.id === 'string' ? msg.id : null,
      model: modelFamily(msg.model),
      tokens: num(u.input_tokens) + num(u.output_tokens) + num(u.cache_creation_input_tokens),
      tools,
    };
  }

  if (rec.type === 'attachment') {
    const t = rec.attachment?.type;
    if (t === 'hook_success' || t === 'hook_additional_context') return { ...base, kind: 'hook' };
    // 会话开始时的可用工具清单：只读工具名，取出接入的 MCP 服务（待连接、需登录的不在工具名里，不算）
    if (t === 'deferred_tools_delta' || t === 'deferred_tools_record') {
      const a = rec.attachment;
      const names = t === 'deferred_tools_record'
        ? (Array.isArray(a.entries) ? a.entries.map((e) => e?.name) : [])
        : [...(Array.isArray(a.addedNames) ? a.addedNames : []), ...(Array.isArray(a.readdedNames) ? a.readdedNames : [])];
      const servers = new Set(names.map(mcpServer).filter(Boolean));
      return servers.size ? { ...base, kind: 'mcp', mcp: [...servers].map(hash) } : null;
    }
    // 新版 Claude Code 按 Shift+Tab 进出 Plan 模式时，只留下 plan_mode / plan_mode_exit / plan_mode_reentry 附件
    if (t === 'plan_mode' || (typeof t === 'string' && t.startsWith('plan_mode_'))) return { ...base, kind: 'plan' };
    return null;
  }

  if (rec.type === 'system' && rec.subtype === 'stop_hook_summary') return { ...base, kind: 'hook' };

  if (rec.type === 'permission-mode' && rec.permissionMode === 'plan') return { ...base, kind: 'plan' };

  return null;
}

function num(v) {
  return Number.isFinite(v) ? v : 0;
}

// ---------- 2. 事实 → 按天汇总 ----------

/** 本地日期 YYYY-MM-DD（按运行机器的时区）。 */
export function localDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyDay = () => ({
  sessions: 0,
  humanTurns: 0,
  tokens: 0,
  toolCalls: 0,
  bashCalls: 0,
  skillCalls: 0,
  maxParallelAgents: 0,
  longestSessionMin: 0,
  hours: Array(24).fill(0),
  plan: false,
  hooks: false,
  models: [],
  mcp: [],
});

const IDLE_GAP_MS = 30 * 60 * 1000; // 两条记录间隔超过 30 分钟视为离开，不计入会话时长

/**
 * @param {Iterable<object>} facts  extractFacts 的结果（可混合多个会话）
 * @returns {Record<string, object>} 按本地日期汇总的统计
 */
export function aggregateDays(facts) {
  const days = {};
  const day = (ts) => (days[localDate(ts)] ??= emptyDay());
  const seenMessages = new Set();
  const seenTools = new Set();
  const sessions = new Map(); // sessionId → { first, last, activeMs }
  const agentsPerMessage = new Map(); // messageId → { ts, count }

  for (const f of facts) {
    if (!f || f.ts === null) continue;
    const d = day(f.ts);

    if (f.sessionId && !f.sidechain) {
      const s = sessions.get(f.sessionId);
      if (!s) sessions.set(f.sessionId, { first: f.ts, last: f.ts, activeMs: 0, crossed: null });
      else {
        const gap = f.ts - s.last;
        if (gap > 0 && gap < IDLE_GAP_MS) s.activeMs += gap;
        if (f.ts > s.last) s.last = f.ts;
        if (f.ts < s.first) s.first = f.ts;
        const min = s.activeMs / 60000;
        const sd = days[localDate(f.ts)];
        if (sd && min > sd.longestSessionMin) sd.longestSessionMin = Math.round(min);
      }
    }

    if (f.kind === 'user' && f.human && !f.sidechain) {
      d.humanTurns += 1;
      d.hours[new Date(f.ts).getHours()] += 1;
    }

    if (f.kind === 'assistant') {
      // 同一条消息会按内容块拆成多条记录，usage 重复出现，要按消息 id 去重
      const first = !f.messageId || !seenMessages.has(f.messageId);
      if (f.messageId) seenMessages.add(f.messageId);
      if (first) d.tokens += f.tokens;
      if (f.model && !d.models.includes(f.model)) d.models.push(f.model);
      for (const t of f.tools) {
        if (t.id) {
          if (seenTools.has(t.id)) continue;
          seenTools.add(t.id);
        }
        d.toolCalls += 1;
        if (t.name === 'Bash') d.bashCalls += 1;
        if (t.name === 'Skill') d.skillCalls += 1;
        if (t.name === 'EnterPlanMode' || t.name === 'ExitPlanMode') d.plan = true;
        if (t.mcp && !d.mcp.includes(t.mcp)) d.mcp.push(t.mcp);
        if (t.name === 'Agent' || t.name === 'Task') {
          const key = f.messageId ?? `${f.ts}`;
          const e = agentsPerMessage.get(key) ?? { ts: f.ts, count: 0 };
          e.count += 1;
          agentsPerMessage.set(key, e);
        }
      }
    }

    if (f.kind === 'mcp') for (const h of f.mcp) if (!d.mcp.includes(h)) d.mcp.push(h);
    if (f.kind === 'hook') d.hooks = true;
    if (f.kind === 'plan') d.plan = true;
  }

  for (const s of sessions.values()) day(s.first).sessions += 1;
  for (const e of agentsPerMessage.values()) {
    const d = day(e.ts);
    d.maxParallelAgents = Math.max(d.maxParallelAgents, e.count);
  }
  return days;
}

// ---------- 3. 账本合并 ----------

/**
 * 会话记录会被定期清理，所以把每次算出的按天汇总并入本地账本：
 * 本次能看到的日期以本次为准（重新计算），看不到的日期保留账本里的旧值。
 */
/**
 * 这一天是不是从 stats-cache 补进来的。旧账本没有 source 标记，靠特征认：
 * 会话记录算出的日子只要有对话就有小时分布，stats-cache 补的日子永远没有。
 */
function fromStats(d) {
  if (d.source === 'stats') return true;
  return !d.source && d.longestSessionMin === 0 && !d.models?.length && Array.isArray(d.hours) && d.hours.every((h) => h === 0);
}

export function mergeLedger(ledger, freshDays, extra = {}) {
  const days = { ...(ledger?.days ?? {}) };
  for (const [date, d] of Object.entries(freshDays)) days[date] = d;
  // stats-cache 里有、但会话记录已经没有的日期，用它补上（只有粗粒度计数）。
  // 以前从 stats-cache 补进来的日期也用新的口径更新；会话记录算出的日期不动
  for (const [date, d] of Object.entries(extra.statsDays ?? {})) {
    if (date in freshDays) continue;
    if (!days[date] || fromStats(days[date])) days[date] = d;
  }
  const firstSeen = [ledger?.firstSeen, extra.firstSeen, Object.keys(days).sort()[0]].filter(Boolean).sort()[0] ?? null;
  // 没有日期的模型使用记录（来自 stats-cache 的模型列表）
  const undatedModels = [...new Set([...(ledger?.undatedModels ?? []), ...(extra.undatedModels ?? [])])].sort();
  return { version: 1, firstSeen, undatedModels, days };
}

/** 把 stats-cache.json 里的每日活跃补进账本（只补账本里没有的日期，只取数字）。 */
export function daysFromStatsCache(stats) {
  const out = {};
  const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const tokens = {};
  for (const t of Array.isArray(stats?.dailyModelTokens) ? stats.dailyModelTokens : []) {
    if (!isDate(t?.date) || !t.tokensByModel || typeof t.tokensByModel !== 'object') continue;
    tokens[t.date] = Object.values(t.tokensByModel).reduce((s, n) => s + num(n), 0);
  }
  for (const a of Array.isArray(stats?.dailyActivity) ? stats.dailyActivity : []) {
    if (!isDate(a?.date)) continue;
    // messageCount 把 Claude 的回复和工具结果都算进去了，不是对话轮数；算不出轮数就记 0（界面上不显示轮数）
    out[a.date] = { ...emptyDay(), sessions: num(a.sessionCount), toolCalls: num(a.toolCallCount), tokens: tokens[a.date] ?? 0, source: 'stats' };
  }
  return out;
}

// ---------- 4. 账本 → 徽章进度 ----------

const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d.getTime());
};
const weekday = (date) => new Date(`${date}T00:00:00`).getDay(); // 0 周日 … 6 周六

/**
 * 累计型指标：按日期顺序累加，返回当前值和「第一次达到 threshold 的日期」查询函数。
 */
function cumulative(dates, days, field) {
  let total = 0;
  const steps = [];
  for (const date of dates) {
    total += days[date][field] ?? 0;
    steps.push([date, total]);
  }
  return {
    value: total,
    reachedOn: (threshold) => steps.find(([, v]) => v >= threshold)?.[0] ?? null,
  };
}

/** 第一次满足条件的日期 */
const firstDate = (dates, days, pred) => dates.find((d) => pred(days[d], d)) ?? null;

/**
 * @param {object} ledger   mergeLedger 的结果
 * @param {object[]} badges 徽章配置（用于读取分级门槛）
 * @param {string} today    YYYY-MM-DD
 * @returns {object} 原始进度（交给 progress.js 的 normalizeProgress）
 */
export function computeProgress(ledger, badges, today) {
  const days = ledger.days;
  const dates = Object.keys(days)
    .filter((d) => {
      const x = days[d];
      // hook 触发、进入 Plan 模式本身也说明那天在用
      return x.sessions > 0 || x.humanTurns > 0 || x.toolCalls > 0 || x.tokens > 0 || x.hooks || x.plan;
    })
    .sort();
  const tiers = (id) => badges.find((b) => b.id === id)?.tiers ?? [];
  const out = {};

  /** 分级徽章：当前值 + 当前等级的达成日期 */
  const tiered = (id, series) => {
    const ts = tiers(id);
    let earnedAt = null;
    for (const t of ts) if (series.value >= t.threshold) earnedAt = series.reachedOn(t.threshold);
    out[id] = { value: series.value, earnedAt };
  };
  /** 一次性徽章 */
  const once = (id, date, current = date ? 1 : 0, target = 1) => {
    out[id] = date ? { unlocked: true, earnedAt: date, progress: { current: target, target } } : { unlocked: false, progress: { current, target } };
  };

  // 里程碑
  once('first-session', dates[0] ?? null);
  tiered('sessions', cumulative(dates, days, 'sessions'));
  tiered('tokens', cumulative(dates, days, 'tokens'));
  tiered('tool-calls', cumulative(dates, days, 'toolCalls'));

  // 连续：逐日走一遍，记录每个连续天数第一次达到的日期
  let run = 0;
  let best = 0;
  const runReached = {}; // n 天 → 第一次连续达到 n 天的日期
  for (let i = 0; i < dates.length; i++) {
    run = i > 0 && addDays(dates[i - 1], 1) === dates[i] ? run + 1 : 1;
    if (run > best) {
      for (let n = best + 1; n <= run; n++) runReached[n] ??= dates[i];
      best = run;
    }
  }
  once('seven-day-streak', runReached[7] ?? null, Math.min(best, 7), 7);
  {
    const ts = tiers('streak-days');
    let earnedAt = null;
    for (const t of ts) if (best >= t.threshold) earnedAt = runReached[t.threshold];
    out['streak-days'] = { value: best, earnedAt };
  }

  // 作息（按本地小时）
  once('night-owl', firstDate(dates, days, (d) => d.hours.slice(0, 5).some((h) => h > 0)));
  once('early-bird', firstDate(dates, days, (d) => d.hours[5] + d.hours[6] > 0));
  // 周末战士：同一个周末的周六和周日都有使用，记在周日
  once('weekend-warrior', firstDate(dates, days, (_, date) => weekday(date) === 0 && days[addDays(date, -1)] !== undefined && dates.includes(addDays(date, -1))));
  {
    const longest = Math.max(0, ...dates.map((d) => days[d].longestSessionMin));
    const date = firstDate(dates, days, (d) => d.longestSessionMin >= 240);
    once('marathon', date, Math.floor(longest / 60), 4);
  }

  // 功能探索
  {
    const maxAgents = Math.max(0, ...dates.map((d) => days[d].maxParallelAgents));
    once('subagent-commander', firstDate(dates, days, (d) => d.maxParallelAgents >= 5), Math.min(maxAgents, 5), 5);
  }
  once('hooks-smith', firstDate(dates, days, (d) => d.hooks));
  {
    const seen = new Set();
    let reached = null;
    for (const date of dates) {
      for (const h of days[date].mcp) seen.add(h);
      if (!reached && seen.size >= 3) reached = date;
    }
    once('connector', reached, Math.min(seen.size, 3), 3);
  }
  {
    const s = cumulative(dates, days, 'skillCalls');
    once('skill-master', s.reachedOn(50), Math.min(s.value, 50), 50);
  }
  once('plan-mode', firstDate(dates, days, (d) => d.plan));

  // 限定与彩蛋
  once('programmers-day', firstDate(dates, days, (_, date) => date.endsWith('-10-24')));
  {
    const first = [ledger.firstSeen, dates[0]].filter(Boolean).sort()[0];
    const anniv = first ? addDays(first, 365) : null;
    once('anniversary', anniv && anniv <= today ? anniv : null);
  }
  {
    const seen = new Set(ledger.undatedModels ?? []);
    let reached = seen.size >= 4 ? dates[0] ?? null : null;
    for (const date of dates) {
      for (const m of days[date].models) seen.add(m);
      if (!reached && seen.size >= 4) reached = date;
    }
    once('model-collector', reached, Math.min(seen.size, 4), 4);
  }
  {
    const maxBash = Math.max(0, ...dates.map((d) => days[d].bashCalls));
    once('bash-maniac', firstDate(dates, days, (d) => d.bashCalls >= 500), Math.min(maxBash, 500), 500);
  }

  return out;
}
