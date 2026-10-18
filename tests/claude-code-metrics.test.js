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

const hash = (s) => `h:${s.length}:${s.charCodeAt(0)}`;
const SECRET = 'sk-ant-SECRET-should-never-leak-123';

// 本地时间构造时间戳，避免时区影响
const at = (date, h, m = 0) => new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();

const user = (sessionId, ts, text = '你好') => ({ type: 'user', sessionId, timestamp: ts, message: { role: 'user', content: text } });
const toolResult = (sessionId, ts) => ({
  type: 'user', sessionId, timestamp: ts, toolUseResult: { stdout: SECRET },
  message: { content: [{ type: 'tool_result', content: SECRET }] },
});
const assistant = (sessionId, ts, { id = `m-${ts}`, model = 'claude-opus-5-5', tools = [], tokens = 100 } = {}) => ({
  type: 'assistant', sessionId, timestamp: ts,
  message: {
    id, model,
    usage: { input_tokens: tokens, output_tokens: tokens, cache_creation_input_tokens: 0, cache_read_input_tokens: 999999 },
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
  it('同一条消息拆成多条记录时，Token 和工具调用只算一次；不计缓存读取', () => {
    const a = assistant('s1', at('2026-05-01', 10), { id: 'msg-1', tools: ['Bash'], tokens: 50 });
    const { ledger } = run([a, a, a]);
    const d = ledger.days['2026-05-01'];
    expect(d.tokens).toBe(100);
    expect(d.toolCalls).toBe(1);
    expect(d.bashCalls).toBe(1);
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
    expect(progress.sessions).toEqual({ value: 12, earnedAt: '2026-07-10' });
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
});
