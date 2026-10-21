import { describe, expect, it } from 'vitest';
import badges from '../src/brands/claude-code/badges.js';
import {
  aggregateDays,
  computeProgress,
  daysFromStatsCache,
  extractFacts,
  mergeLedger,
  modelFamily,
} from '../src/data/claude-code-metrics.js';
import { dailySeries } from '../src/data/daily.js';

const hash = (s) => `h:${s.length}:${s.charCodeAt(0)}`;
const SECRET = 'sk-ant-SECRET-should-never-leak-123';

// 本地时间构造时间戳，避免时区影响
const at = (date, h, m = 0) => new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();

const user = (sessionId, ts, text = '你好') => ({ type: 'user', sessionId, timestamp: ts, message: { role: 'user', content: text } });
const toolResult = (sessionId, ts) => ({
  type: 'user', sessionId, timestamp: ts, toolUseResult: { stdout: SECRET },
  message: { content: [{ type: 'tool_result', content: SECRET }] },
});
const assistant = (sessionId, ts, { id = `m-${ts}`, model = 'claude-opus-5-5', tools = [], tokens = 100, usage = null, sidechain = false } = {}) => ({
  type: 'assistant', sessionId, timestamp: ts, isSidechain: sidechain,
  message: {
    id, model,
    usage: usage ?? { input_tokens: tokens, output_tokens: tokens, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    content: [{ type: 'text', text: SECRET }, ...tools.map((name, i) => ({ type: 'tool_use', id: `${id}-t${i}`, name, input: { command: `echo ${SECRET}` } }))],
  },
});

const run = (records, ledger = null, today = '2026-10-18') => {
  const facts = records.map((r) => extractFacts(r, { hash })).filter(Boolean);
  const merged = mergeLedger(ledger, aggregateDays(facts));
  return { ledger: merged, progress: computeProgress(merged, badges, today) };
};

describe('隐私：白名单提取', () => {
  it('对话正文、工具参数、工具结果都不会出现在提取结果、账本或进度里', () => {
    const records = [
      user('s1', at('2026-05-01', 10), `我的密钥是 ${SECRET}`),
      assistant('s1', at('2026-05-01', 10, 1), { tools: ['Bash', 'mcp__secret_server__do'] }),
      toolResult('s1', at('2026-05-01', 10, 2)),
      { type: 'attachment', timestamp: at('2026-05-01', 10, 3), sessionId: 's1', attachment: { type: 'hook_success', content: SECRET } },
    ];
    const facts = records.map((r) => extractFacts(r));
    const { ledger, progress } = run(records);
    const dump = JSON.stringify({ facts, ledger, progress });
    expect(dump).not.toContain(SECRET);
    expect(dump).not.toContain('我的密钥');
    expect(dump).not.toContain('secret_server'); // MCP 服务名只以哈希形式出现
  });

  it('只认得的记录类型才会产出事实', () => {
    expect(extractFacts({ type: 'last-prompt', lastPrompt: SECRET })).toBeNull();
    expect(extractFacts({ type: 'ai-title', aiTitle: SECRET })).toBeNull();
    expect(extractFacts(null)).toBeNull();
  });

  it('模型名只保留家族', () => {
    expect(modelFamily('claude-opus-5-5')).toBe('opus');
    expect(modelFamily('claude-haiku-4-5-20251001')).toBe('haiku');
    expect(modelFamily('<synthetic>')).toBeNull();
  });
});

describe('统计口径', () => {
  it('同一条消息拆成多条记录时，Token 和工具调用只算一次', () => {
    const a = assistant('s1', at('2026-05-01', 10), { id: 'msg-1', tools: ['Bash'], tokens: 50 });
    const { ledger } = run([a, a, a]);
    const d = ledger.days['2026-05-01'];
    expect(d.tokens).toBe(100);
    expect(d.toolCalls).toBe(1);
    expect(d.bashCalls).toBe(1);
  });

  it('Token 按行业通用口径：输入 + 输出 + 缓存写入 + 缓存命中', () => {
    const usage = { input_tokens: 10, output_tokens: 200, cache_creation_input_tokens: 3000, cache_read_input_tokens: 40000 };
    const { ledger } = run([assistant('s1', at('2026-05-01', 10), { usage })]);
    expect(ledger.days['2026-05-01'].tokens).toBe(43210);
  });

  it('同一条回复的多行记录：每个字段各取最大值（流式输出时前几行的输出数不完整）', () => {
    const line = (out, read) => assistant('s1', at('2026-05-01', 10), { id: 'msg-2', usage: { input_tokens: 5, output_tokens: out, cache_creation_input_tokens: 0, cache_read_input_tokens: read } });
    const { ledger } = run([line(1, 900), line(80, 0), line(30, 900)]);
    expect(ledger.days['2026-05-01'].tokens).toBe(5 + 80 + 900);
  });

  it('子代理记录（isSidechain）的 Token 计入，但不算人发出的一轮，也不新增会话', () => {
    const { ledger } = run([
      user('s1', at('2026-05-01', 10)),
      assistant('s1', at('2026-05-01', 10, 1), { id: 'main', tokens: 10 }),
      { ...user('s1', at('2026-05-01', 10, 2), '去查一下'), isSidechain: true },
      assistant('s1', at('2026-05-01', 10, 3), { id: 'sub', tokens: 7, sidechain: true }),
    ]);
    const d = ledger.days['2026-05-01'];
    expect(d.tokens).toBe(20 + 14);
    expect(d.humanTurns).toBe(1);
    expect(d.sessions).toBe(1);
  });

  it('子代理的工具调用暂不计入工具类徽章（只算主会话，和以前一致）', () => {
    const { ledger } = run([
      assistant('s1', at('2026-05-01', 10), { id: 'main', tools: ['Bash'] }),
      assistant('s1', at('2026-05-01', 10, 1), { id: 'sub', tools: ['Bash', 'Skill', 'Read'], sidechain: true }),
    ]);
    const d = ledger.days['2026-05-01'];
    expect(d).toMatchObject({ toolCalls: 1, bashCalls: 1, skillCalls: 0 });
  });

  it('<synthetic> 不是真实调用（如 API 报错时的占位回复），不计 Token', () => {
    const { ledger } = run([
      user('s1', at('2026-05-01', 10)),
      assistant('s1', at('2026-05-01', 10, 1), { model: '<synthetic>', usage: { input_tokens: 0, output_tokens: 99, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }),
    ]);
    expect(ledger.days['2026-05-01'].tokens).toBe(0);
  });

  it('工具结果不算「人发出的一轮」，也不计入作息小时', () => {
    const { ledger } = run([user('s1', at('2026-05-01', 2)), toolResult('s1', at('2026-05-01', 3))]);
    const d = ledger.days['2026-05-01'];
    expect(d.humanTurns).toBe(1);
    expect(d.hours[2]).toBe(1);
    expect(d.hours[3]).toBe(0);
  });

  it('夜猫子、早起鸟、周末战士、1024', () => {
    const { progress } = run([
      user('s1', at('2026-05-02', 1)), // 周六凌晨
      user('s2', at('2026-05-03', 6)), // 周日早上
      user('s3', at('2025-10-24', 14)),
    ]);
    expect(progress['night-owl']).toMatchObject({ unlocked: true, earnedAt: '2026-05-02' });
    expect(progress['early-bird']).toMatchObject({ unlocked: true, earnedAt: '2026-05-03' });
    expect(progress['weekend-warrior']).toMatchObject({ unlocked: true, earnedAt: '2026-05-03' });
    expect(progress['programmers-day']).toMatchObject({ unlocked: true, earnedAt: '2025-10-24' });
  });

  it('连续天数：七日连击在第 7 天达成，断档后重新计数', () => {
    const records = [];
    for (let i = 1; i <= 9; i++) if (i !== 4) records.push(user(`s${i}`, at(`2026-06-${String(i).padStart(2, '0')}`, 12)));
    for (let i = 10; i <= 16; i++) records.push(user(`s${i}`, at(`2026-06-${i}`, 12)));
    const { progress } = run(records);
    // 6/5–6/16 连续 12 天，第 7 天是 6/11
    expect(progress['seven-day-streak']).toMatchObject({ unlocked: true, earnedAt: '2026-06-11' });
    expect(progress['streak-days'].value).toBe(12);
  });

  it('分级徽章：累计值和当前等级的达成日期', () => {
    const records = [];
    for (let i = 0; i < 12; i++) records.push(user(`s${i}`, at(`2026-07-${String(i + 1).padStart(2, '0')}`, 12)));
    const { progress } = run(records);
    // 第 10 个会话在 7/10 → 达到 10 次那一级
    expect(progress.sessions).toMatchObject({ value: 12, earnedAt: '2026-07-10' });
  });

  it('子代理：同一条消息里并行调度的 Agent 数', () => {
    const { progress } = run([assistant('s1', at('2026-05-01', 10), { tools: ['Agent', 'Agent', 'Agent', 'Agent', 'Agent'] })]);
    expect(progress['subagent-commander']).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
  });

  it('MCP 服务按服务名去重；Hooks、Plan 模式按事件识别', () => {
    const { progress } = run([
      assistant('s1', at('2026-05-01', 10), { tools: ['mcp__a__x', 'mcp__a__y', 'mcp__b__x'] }),
      assistant('s1', at('2026-05-02', 10), { tools: ['mcp__c__z', 'ExitPlanMode'] }),
      { type: 'system', subtype: 'stop_hook_summary', sessionId: 's1', timestamp: at('2026-05-03', 9) },
    ]);
    expect(progress.connector).toMatchObject({ unlocked: true, earnedAt: '2026-05-02' });
    expect(progress['plan-mode']).toMatchObject({ unlocked: true, earnedAt: '2026-05-02' });
    expect(progress['hooks-smith']).toMatchObject({ unlocked: true, earnedAt: '2026-05-03' });
  });

  it('MCP：会话开始时可用工具清单里的服务也算接入（不调用也算），自带服务不算', () => {
    const delta = (ts, addedNames, extra = {}) => ({
      type: 'attachment', sessionId: 's1', timestamp: ts,
      attachment: { type: 'deferred_tools_delta', addedNames, addedLines: addedNames, removedNames: [], readdedNames: [], ...extra },
    });
    const record = (ts, names) => ({
      type: 'attachment', sessionId: 's1', timestamp: ts,
      attachment: { type: 'deferred_tools_record', entries: names.map((name) => ({ name, description: SECRET, input_schema: {} })) },
    });
    const { ledger, progress } = run([
      user('s1', at('2026-07-26', 9)),
      delta(at('2026-07-26', 9), [
        'CronCreate', 'mcp__claude_ai_Gmail__send', 'mcp__claude_ai_Gmail__search',
        // 自带服务
        'mcp__computer-use__click', 'mcp__Claude_Browser__open', 'mcp__claude-in-chrome__tab', 'mcp__remote-devices__list', 'mcp__claude_ai_Claude_Docs__batch',
      ], { pendingMcpServers: ['claude.ai Notion'], needsAuthMcpServers: ['claude.ai Linear'] }),
      user('s1', at('2026-07-27', 9)),
      record(at('2026-07-27', 9), ['mcp__open-design__get_file', 'Read']),
      user('s1', at('2026-07-28', 9)),
      delta(at('2026-07-28', 9), [], { readdedNames: ['mcp__claude_ai_Notion__search'] }),
    ]);
    expect(progress.connector).toMatchObject({ unlocked: true, earnedAt: '2026-07-28' });
    expect(ledger.days['2026-07-26'].mcp).toHaveLength(1); // 只有 Gmail；待连接、需登录、自带的都不算
    expect(JSON.stringify(ledger)).not.toContain(SECRET);
    expect(JSON.stringify(ledger)).not.toContain('Gmail'); // 服务名只存哈希
  });

  it('MCP：调用自带服务也不算', () => {
    const { progress } = run([
      assistant('s1', at('2026-05-01', 10), { tools: ['mcp__computer-use__click', 'mcp__Claude_Browser__open', 'mcp__a__x'] }),
    ]);
    expect(progress.connector.unlocked).toBe(false);
    expect(progress.connector.progress).toMatchObject({ current: 1 });
  });

  it('Plan 模式：新版只留下 plan_mode_* 附件（按 Shift+Tab 进出，没有工具调用）', () => {
    const planAttachment = (type, ts) => ({
      type: 'attachment', sessionId: 's1', timestamp: ts,
      attachment: { type, planFilePath: `/Users/x/.claude/plans/${SECRET}.md`, planExists: true },
    });
    for (const type of ['plan_mode', 'plan_mode_exit', 'plan_mode_reentry']) {
      const { ledger, progress } = run([user('s1', at('2026-10-15', 9)), planAttachment(type, at('2026-10-15', 11))]);
      expect(progress['plan-mode']).toMatchObject({ unlocked: true, earnedAt: '2026-10-15' });
      // 计划文件路径不能进账本
      expect(JSON.stringify(ledger)).not.toContain(SECRET);
    }
    // 名字里带 plan 但不是 Plan 模式的附件不算
    const { progress } = run([user('s1', at('2026-10-15', 9)), planAttachment('planner_hint', at('2026-10-15', 11))]);
    expect(progress['plan-mode'].unlocked).toBe(false);
  });

  it('马拉松：按活跃时长计，离开超过 30 分钟的间隔不算', () => {
    const recs = [];
    // 每 20 分钟一条，持续 5 小时 → 活跃 5 小时
    for (let i = 0; i <= 15; i++) recs.push(user('long', new Date(Date.parse(at('2026-05-01', 8)) + i * 20 * 60000).toISOString()));
    // 另一个会话：两条记录相隔 6 小时 → 活跃 0
    recs.push(user('idle', at('2026-05-02', 8)), user('idle', at('2026-05-02', 14)));
    const { ledger, progress } = run(recs);
    expect(ledger.days['2026-05-01'].longestSessionMin).toBe(300);
    expect(ledger.days['2026-05-02'].longestSessionMin).toBe(0);
    expect(progress.marathon).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
  });
});

describe('账本合并', () => {
  it('会话记录被清理后，账本里的旧日期仍然保留，徽章不会掉', () => {
    const first = run([user('s1', at('2026-01-01', 12))]).ledger;
    const second = run([user('s2', at('2026-09-01', 12))], first);
    expect(Object.keys(second.ledger.days).sort()).toEqual(['2026-01-01', '2026-09-01']);
    expect(second.progress['first-session'].earnedAt).toBe('2026-01-01');
  });

  it('同一天重新计算时以新结果为准（不会重复累加）', () => {
    const r = [user('s1', at('2026-01-01', 12))];
    const once = run(r).ledger;
    const twice = run(r, once).ledger;
    expect(twice.days['2026-01-01'].sessions).toBe(1);
  });

  it('stats-cache 只补账本没有的日期；无日期的模型计入模型收藏家', () => {
    const statsDays = daysFromStatsCache({ dailyActivity: [{ date: '2025-12-31', sessionCount: 2, toolCallCount: 9, messageCount: 5 }] });
    const merged = mergeLedger(null, {}, { statsDays, firstSeen: '2025-12-30', undatedModels: ['opus', 'sonnet', 'haiku', 'fable'] });
    expect(merged.days['2025-12-31'].sessions).toBe(2);
    expect(merged.firstSeen).toBe('2025-12-30');
    const p = computeProgress(merged, badges, '2026-12-31');
    expect(p['model-collector'].unlocked).toBe(true);
    expect(p.anniversary).toMatchObject({ unlocked: true, earnedAt: '2026-12-30' });
  });

  const STATS = {
    dailyActivity: [{ date: '2026-04-07', sessionCount: 1, toolCallCount: 114, messageCount: 454 }],
    dailyModelTokens: [{ date: '2026-04-07', tokensByModel: { 'claude-opus-4-6': 80000, 'claude-sonnet-4-6': 1147 } }],
  };

  it('stats-cache：Token 取每天各模型之和；消息数不是对话轮数，不当轮数用', () => {
    const d = daysFromStatsCache(STATS)['2026-04-07'];
    expect(d).toMatchObject({ tokens: 81147, sessions: 1, toolCalls: 114, humanTurns: 0 });
    const merged = mergeLedger(null, {}, { statsDays: daysFromStatsCache(STATS) });
    expect(dailySeries('claude-code', merged)['2026-04-07']).toEqual([81147, 0]);
  });

  it('stats-cache：账本里旧版补进来的日期（没有 Token）会被更新；会话记录算出的日期不会被覆盖', () => {
    const legacy = { ...daysFromStatsCache(STATS)['2026-04-07'], tokens: 0, humanTurns: 454 };
    delete legacy.source;
    const fromTranscripts = aggregateDays([extractFacts(user('s1', at('2026-04-08', 9)), { hash }), extractFacts(assistant('s1', at('2026-04-08', 9, 1), { tokens: 5 }), { hash })]);
    const ledger = { version: 1, firstSeen: '2026-04-07', undatedModels: [], days: { '2026-04-07': legacy, ...fromTranscripts } };
    const stats = { ...STATS, dailyActivity: [...STATS.dailyActivity, { date: '2026-04-08', sessionCount: 9, toolCallCount: 9, messageCount: 99 }] };
    const merged = mergeLedger(ledger, {}, { statsDays: daysFromStatsCache(stats) });
    expect(merged.days['2026-04-07']).toMatchObject({ tokens: 81147, humanTurns: 0 });
    expect(merged.days['2026-04-08']).toMatchObject({ tokens: 10, humanTurns: 1 });
  });
});
