// Claude Code 使用统计：从本地会话记录里提取「可观测的元数据」，算出每枚徽章的进度。
//
// 隐私边界（重要）：
//   - 每条记录只按白名单取字段：时间戳、会话 id、记录类型、模型名、工具名、
//     Token 计数、权限模式、附件/系统消息的类型值、是否子代理。
//   - 对话正文、工具参数、工具结果、文件内容一律不读取、不保存、不输出。
//   - MCP 服务名只用于去重计数，保存前做哈希。
//   - 输出（账本 + 进度）只包含数字、日期和哈希。
//
// 这个模块是纯函数，不碰文件系统；读文件的部分在 src/collect/claude-code.js。

import brand from '../brands/claude-code/brand.js';
import {
  applySessionSegments,
  birthdayRule,
  COMMON_RULES,
  distinctOver,
  localDate,
  metricsContext,
  once,
  segmentsOf,
  tierOf,
} from './metrics-common.js';

// ---------- 1. 单条记录 → 白名单事实 ----------

const MODEL_FAMILIES = ['opus', 'sonnet', 'haiku', 'fable'];

/** 模型名 → 家族（opus / sonnet / haiku / fable），认不出返回 null。 */
export function modelFamily(model) {
  if (typeof model !== 'string') return null;
  const m = model.toLowerCase();
  return MODEL_FAMILIES.find((f) => m.includes(f)) ?? null;
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
 * hash：调用方传入的哈希函数（采集时是 src/collect/common.js 的 hash）。
 */
export function extractFacts(rec, { hash }) {
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
      // 行业通用口径（与 ccusage、CC Switch 一致）：输入 + 输出 + 缓存写入 + 缓存命中。
      // <synthetic> 是 Claude Code 自己生成的占位回复（如 API 报错），不是真实调用
      usage: msg.model === '<synthetic>' ? [0, 0, 0, 0] : [u.input_tokens, u.output_tokens, u.cache_creation_input_tokens, u.cache_read_input_tokens].map(num),
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

const sum = (a) => a.reduce((x, y) => x + y, 0);

function num(v) {
  return Number.isFinite(v) ? v : 0;
}

// ---------- 2. 事实 → 按天汇总 ----------

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
  // 0.5 新增
  activeMin: 0,
  maxParallel: 0,
  midnight: false,
  dispatches: 0,
  webCalls: 0,
  editCalls: 0,
  autopilot: false,
});

const WEB_TOOLS = new Set(['WebSearch', 'WebFetch']);
const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit']);
/** /loop（ScheduleWakeup）、定时任务（CronCreate）、Workflow 编排 */
const AUTOPILOT_TOOLS = new Set(['ScheduleWakeup', 'CronCreate', 'Workflow']);

const IDLE_GAP_MS = 30 * 60 * 1000; // 两条记录间隔超过 30 分钟视为离开，不计入会话时长

/**
 * @param {Iterable<object>} facts  extractFacts 的结果（可混合多个会话）
 * @returns {Record<string, object>} 按本地日期汇总的统计
 */
export function aggregateDays(facts) {
  const days = {};
  const day = (ts) => (days[localDate(ts)] ??= emptyDay());
  const replies = new Map(); // 消息 id → { ts, usage }
  const seenTools = new Set();
  const sessions = new Map(); // sessionId → { first, last, activeMs }
  const agentsPerMessage = new Map(); // messageId → { ts, count }
  const sessionTimes = new Map(); // sessionId → 主会话的活动时间点
  const seenAllTools = new Set(); // 含子代理：联网检索、文件编辑、自动驾驶

  for (const f of facts) {
    if (!f || f.ts === null) continue;
    const d = day(f.ts);

    if (f.sessionId && !f.sidechain) {
      let times = sessionTimes.get(f.sessionId);
      if (!times) sessionTimes.set(f.sessionId, (times = []));
      times.push(f.ts);
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
      // 同一条回复会按内容块拆成多条记录，每条都带 usage；流式输出时前几条的输出数还不完整。
      // 按消息 id 合并，每个字段取最大值，最后再记到这条回复第一次出现的那天
      if (!f.messageId) d.tokens += sum(f.usage);
      else {
        const m = replies.get(f.messageId);
        if (!m) replies.set(f.messageId, { ts: f.ts, usage: [...f.usage] });
        else f.usage.forEach((v, i) => (m.usage[i] = Math.max(m.usage[i], v)));
      }
      if (f.model && !d.models.includes(f.model)) d.models.push(f.model);
      // 联网检索、文件编辑、自动驾驶：子代理里的调用也算（也是在替你干活）
      for (const t of f.tools) {
        if (t.id) {
          if (seenAllTools.has(t.id)) continue;
          seenAllTools.add(t.id);
        }
        if (WEB_TOOLS.has(t.name)) d.webCalls += 1;
        if (EDIT_TOOLS.has(t.name)) d.editCalls += 1;
        if (AUTOPILOT_TOOLS.has(t.name)) d.autopilot = true;
      }
      // 子代理的工具调用暂不计入工具类徽章：以前不读子代理记录，口径保持不变（Token 和模型照常计入）
      for (const t of f.sidechain ? [] : f.tools) {
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
          d.dispatches += 1;
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

  for (const r of replies.values()) day(r.ts).tokens += sum(r.usage);
  for (const s of sessions.values()) day(s.first).sessions += 1;
  for (const e of agentsPerMessage.values()) {
    const d = day(e.ts);
    d.maxParallelAgents = Math.max(d.maxParallelAgents, e.count);
  }
  applySessionSegments(days, [...sessionTimes.values()].map((t) => segmentsOf(t)), emptyDay);
  return days;
}

// ---------- 3. 账本合并 ----------

/**
 * 这一天是不是从 stats-cache 补进来的。旧账本没有 source 标记，靠特征认：
 * 会话记录算出的日子只要有对话就有小时分布，stats-cache 补的日子永远没有。
 */
function fromStats(d) {
  if (d.source === 'stats') return true;
  return !d.source && d.longestSessionMin === 0 && !d.models?.length && Array.isArray(d.hours) && d.hours.every((h) => h === 0);
}

/**
 * 会话记录会被定期清理，所以把每次算出的按天汇总并入本地账本：
 * 本次能看到的日期以本次为准（重新计算），看不到的日期保留账本里的旧值。
 */
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

/** 活跃日：有对话、工具调用或 Token；hook 触发、进入 Plan 模式本身也说明那天在用。 */
const isActive = (x) => x.sessions > 0 || x.humanTurns > 0 || x.toolCalls > 0 || x.tokens > 0 || x.hooks || x.plan;

/**
 * 每枚徽章一条规则，键是徽章 id。门槛一律从徽章配置读（criteria.target / tiers），这里不写数字。
 * 两个品牌相同的规则在 metrics-common.js 的 COMMON_RULES 里（含 tokens、active-hours、dispatches、连续天数、节日等）；
 * 这里只写 Claude Code 独有的，或口径与 Codex 不同的。
 * 新增徽章：在这里（或两边都有就在 COMMON_RULES）加一条；tests/contracts.test.js 会检查规则和徽章一一对应、门槛跟随配置。
 */
export const RULES = {
  ...COMMON_RULES,
  'tool-birthday': birthdayRule(brand.launchDate),

  // 里程碑
  'first-session': (c) => once(c.dates[0] ?? null),
  sessions: tierOf('sessions'),
  'tool-calls': tierOf('toolCalls'),
  'web-research': tierOf('webCalls'),
  'file-edits': tierOf('editCalls'),

  // 连续与习惯
  'productive-day': (c, b) => c.peak('sessions', b.criteria.target),

  // 功能探索
  'subagent-commander': (c, b) => c.peak('maxParallelAgents', b.criteria.target),
  'hooks-smith': (c) => once(c.first((d) => d.hooks)),
  connector: (c, { criteria: { target: t } }) => {
    const { size, reached } = distinctOver(c.dates, c.days, 'mcp', t);
    return once(reached, Math.min(size, t), t);
  },
  'skill-master': (c, { criteria: { target: t } }) => {
    const s = c.cum('skillCalls');
    return once(s.reachedOn(t), Math.min(s.value, t), t);
  },
  'plan-mode': (c) => once(c.first((d) => d.plan)),
  autopilot: (c) => once(c.first((d) => d.autopilot)),

  // 限定与彩蛋
  'model-collector': (c, { criteria: { target: t } }) => {
    // stats-cache 里没有日期的模型使用记录也算：一开始就收集到了
    const seen = new Set(c.ledger.undatedModels ?? []);
    let r = seen.size >= t ? c.dates[0] ?? null : null;
    for (const date of c.dates) {
      for (const m of c.days[date].models) seen.add(m);
      if (!r && seen.size >= t) r = date;
    }
    return once(r, Math.min(seen.size, t), t);
  },
  'bash-maniac': (c, b) => c.peak('bashCalls', b.criteria.target),
};

/**
 * @param {object} ledger   mergeLedger 的结果
 * @param {object[]} badges 徽章配置（规则从这里读门槛）
 * @param {string} today    YYYY-MM-DD
 * @returns {object} 原始进度（交给 normalizeProgress）
 */
export function computeProgress(ledger, badges, today) {
  const ctx = metricsContext(ledger, today, isActive);
  return Object.fromEntries(
    badges.map((b) => {
      const rule = RULES[b.id];
      if (!rule) throw new Error(`徽章「${b.id}」没有统计规则：在 src/data/claude-code-metrics.js 的 RULES 里加一条`);
      return [b.id, rule(ctx, b)];
    }),
  );
}
