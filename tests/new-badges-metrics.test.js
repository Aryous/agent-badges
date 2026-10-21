import { describe, expect, it } from 'vitest';
import { aggregateDays, computeProgress, extractFacts, mergeLedger } from '../src/data/claude-code-metrics.js';
import {
  aggregateCodexDays,
  applyCodexSegments,
  computeCodexProgress,
  extractRolloutFacts,
  mergeCodexLedger,
  mergeDays,
  threadFacts,
} from '../src/data/codex-metrics.js';
import { applySessionSegments, holidays, joinSegments, perfectMonth, segmentsOf } from '../src/data/metrics-common.js';

const SECRET = 'sk-SECRET-should-never-leak-789';
const hash = (s) => `h${s.length}`;
const at = (date, h, m = 0) => new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();
const ms = (date, h, m = 0) => Date.parse(at(date, h, m));
const MIN = 60_000;

// 分级门槛：测试用，和正式配置无关
const TIERS = (...t) => t.map((threshold) => ({ threshold }));
const BADGES = [
  { id: 'active-hours', tiers: TIERS(10, 100, 1000, 5000) },
  { id: 'dispatches', tiers: TIERS(10, 100, 1000, 10000) },
  { id: 'web-research', tiers: TIERS(10, 100, 1000, 10000) },
  { id: 'file-edits', tiers: TIERS(100, 1000, 10000, 100000) },
];

// ---------- Claude Code 记录 ----------
const user = (sessionId, ts) => ({ type: 'user', sessionId, timestamp: ts, message: { role: 'user', content: SECRET } });
let seq = 0;
const assistant = (sessionId, ts, tools = [], sidechain = false) => {
  const id = `m${++seq}`;
  return {
    type: 'assistant', sessionId, timestamp: ts, isSidechain: sidechain,
    message: {
      id, model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: 1 },
      content: tools.map((name, i) => ({ type: 'tool_use', id: `${id}-${i}`, name, input: { url: SECRET } })),
    },
  };
};
const ccRun = (records, today = '2026-10-21') => {
  const facts = records.map((r) => extractFacts(r, { hash })).filter(Boolean);
  const ledger = mergeLedger(null, aggregateDays(facts));
  return { ledger, progress: computeProgress(ledger, BADGES, today) };
};
/** 一个会话：从 start 起每隔 step 分钟一条记录，共 n 条 */
const ccSession = (id, date, h, m, n, step = 5) =>
  Array.from({ length: n }, (_, i) => user(id, new Date(ms(date, h, m) + i * step * MIN).toISOString()));

describe('活动段', () => {
  it('相邻间隔不超过阈值就连成一段；再按大间隔连段与直接分段结果相同', () => {
    const t = [0, 5, 9, 30, 31, 100].map((m) => m * MIN);
    expect(segmentsOf(t)).toEqual([[0, 9 * MIN], [30 * MIN, 31 * MIN], [100 * MIN, 100 * MIN]]);
    expect(joinSegments(segmentsOf(t), 30 * MIN)).toEqual(segmentsOf(t, 30 * MIN));
  });

  it('协作时长：多个会话同时进行只算一次，离开超过 30 分钟不算，跨午夜按日期切开', () => {
    const days = applySessionSegments({}, [
      segmentsOf([ms('2026-05-01', 10), ms('2026-05-01', 10, 20)]),
      segmentsOf([ms('2026-05-01', 10, 10), ms('2026-05-01', 10, 30)]),
      segmentsOf([ms('2026-05-01', 23, 50), ms('2026-05-02', 0, 10)]),
      segmentsOf([ms('2026-05-03', 9), ms('2026-05-03', 9, 31)]), // 隔了 31 分钟：不计
    ], () => ({}));
    expect(days['2026-05-01'].activeMin).toBe(30 + 10);
    expect(days['2026-05-02'].activeMin).toBe(10);
    expect(days['2026-05-03'].activeMin).toBe(0);
  });
});

describe('Claude Code 新徽章', () => {
  it('跨日夜战：22:59 开始、02:01 还在，中间间隔不超过 60 分钟', () => {
    const recs = [];
    for (let t = ms('2026-05-01', 22, 59); t <= ms('2026-05-02', 2, 1); t += 50 * MIN) recs.push(user('s1', new Date(t).toISOString()));
    recs.push(user('s1', at('2026-05-02', 2, 1)));
    expect(ccRun(recs).progress['midnight-crossing']).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
  });

  it('跨日夜战：中间断了 61 分钟不算；不同会话接力也不算', () => {
    const gap = [user('s1', at('2026-05-01', 22, 30)), user('s1', at('2026-05-01', 23, 59)), user('s1', at('2026-05-02', 1)), user('s1', at('2026-05-02', 2, 1))];
    expect(ccRun(gap).progress['midnight-crossing'].unlocked).toBe(false);
    const relay = [...ccSession('a', '2026-05-01', 22, 30, 20), ...ccSession('b', '2026-05-02', 0, 10, 30)];
    expect(ccRun(relay).progress['midnight-crossing'].unlocked).toBe(false);
  });

  it('高产日：一天 20 个会话；子代理不算会话', () => {
    const recs = Array.from({ length: 19 }, (_, i) => user(`s${i}`, at('2026-05-01', 9, i)));
    expect(ccRun(recs).progress['productive-day']).toMatchObject({ unlocked: false, progress: { current: 19, target: 20 } });
    recs.push(assistant('side', at('2026-05-01', 10), [], true));
    expect(ccRun(recs).progress['productive-day'].unlocked).toBe(false);
    recs.push(user('s19', at('2026-05-01', 11)));
    expect(ccRun(recs).progress['productive-day']).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
  });

  it('多线并行：恰好 3 个会话重叠才解锁', () => {
    const two = [...ccSession('a', '2026-05-01', 10, 0, 6), ...ccSession('b', '2026-05-01', 10, 3, 6)];
    expect(ccRun(two).progress.multitasker.unlocked).toBe(false);
    const three = [...two, ...ccSession('c', '2026-05-01', 10, 20, 3)];
    expect(ccRun(three).progress.multitasker).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
  });

  it('全勤月：当月每个工作日都有活动，记在最后一个工作日', () => {
    // 2026 年 6 月：1 日周一，30 日周二
    const recs = [];
    for (let d = 1; d <= 30; d++) {
      const date = `2026-06-${String(d).padStart(2, '0')}`;
      const w = new Date(`${date}T00:00:00`).getDay();
      if (w >= 1 && w <= 5) recs.push(user(`s${d}`, at(date, 10)));
    }
    expect(ccRun(recs).progress['perfect-month']).toMatchObject({ unlocked: true, earnedAt: '2026-06-30' });
    expect(ccRun(recs.slice(0, -1)).progress['perfect-month'].unlocked).toBe(false);
  });

  it('里程碑：子代理派遣只算主会话；联网检索和文件编辑含子代理；协作时长按小时', () => {
    const recs = [
      assistant('s1', at('2026-05-01', 10), ['Agent', 'Agent', 'Task', 'WebSearch', 'Edit']),
      assistant('s1', at('2026-05-01', 10, 1), ['WebFetch', 'Write', 'MultiEdit', 'NotebookEdit']),
      assistant('s1', at('2026-05-01', 10, 2), ['Agent', 'WebSearch', 'Edit'], true), // 子代理
    ];
    const { ledger, progress } = ccRun(recs);
    const d = ledger.days['2026-05-01'];
    expect(d).toMatchObject({ dispatches: 3, webCalls: 3, editCalls: 5 });
    expect(progress.dispatches).toMatchObject({ value: 3, earnedAt: null });
    expect(JSON.stringify(ledger)).not.toContain(SECRET);

    const long = ccSession('s1', '2026-05-02', 0, 0, 12 * 12 + 1); // 每 5 分钟一条，持续 12 小时
    expect(ccRun(long).progress['active-hours']).toMatchObject({ value: 12, earnedAt: '2026-05-02', firstAt: '2026-05-02' });
  });

  it('自动驾驶：/loop、定时任务或 Workflow', () => {
    expect(ccRun([assistant('s1', at('2026-05-01', 10), ['Bash'])]).progress.autopilot.unlocked).toBe(false);
    for (const tool of ['ScheduleWakeup', 'CronCreate', 'Workflow']) {
      expect(ccRun([assistant('s1', at('2026-05-01', 10), [tool])]).progress.autopilot).toMatchObject({ unlocked: true });
    }
  });

  it('节日：元旦、春节（表内）、圣诞、生日（发布当年及之后）', () => {
    const p = ccRun(['2026-01-01', '2027-02-06', '2025-12-25', '2026-02-24'].map((d, i) => user(`s${i}`, at(d, 10)))).progress;
    expect(p['new-year']).toMatchObject({ unlocked: true, earnedAt: '2026-01-01' });
    expect(p['spring-festival']).toMatchObject({ unlocked: true, earnedAt: '2027-02-06' });
    expect(p.christmas).toMatchObject({ unlocked: true, earnedAt: '2025-12-25' });
    expect(p['tool-birthday']).toMatchObject({ unlocked: true, earnedAt: '2026-02-24' });
    expect(holidays['spring-festival']('2036-01-28')).toBe(false); // 表外年份不判定
    expect(holidays.birthday('2025-02-24')('2024-02-24')).toBe(false);
  });

  it('旧账本缺新字段不报错，记录被清理后徽章保留', () => {
    const old = { version: 1, days: { '2025-12-25': { sessions: 1, humanTurns: 1, tokens: 0, toolCalls: 0, hours: Array(24).fill(0), models: [], mcp: [] } } };
    const ledger = mergeLedger(old, {});
    const p = computeProgress(ledger, BADGES, '2026-10-21');
    expect(p.christmas.unlocked).toBe(true);
    expect(p['active-hours']).toMatchObject({ value: 0 });
    expect(p.multitasker.unlocked).toBe(false);
  });
});

describe('全勤月进度', () => {
  it('进度显示本月已打卡的工作日', () => {
    expect(perfectMonth(['2026-10-01', '2026-10-02', '2026-10-03'], '2026-10-21')).toEqual({ date: null, current: 2, target: 22 });
  });
});

// ---------- Codex ----------
const meta = (ts, source = 'cli') => ({ type: 'session_meta', timestamp: ts, payload: { source } });
const task = (ts) => ({ type: 'event_msg', timestamp: ts, payload: { type: 'task_started' } });
const call = (ts, name) => ({ type: 'response_item', timestamp: ts, payload: { type: 'function_call', name, arguments: SECRET } });
const facts = (recs) => recs.map((r) => extractRolloutFacts(r, { hash })).filter(Boolean);
const cxSession = (date, h, m, n, step = 5, source = 'cli') =>
  facts([meta(at(date, h, m), source), ...Array.from({ length: n }, (_, i) => task(new Date(ms(date, h, m) + i * step * MIN).toISOString()))]);
const cxRun = (sessions, threads = [], today = '2026-10-21') => {
  const ledger = mergeCodexLedger(null, aggregateCodexDays(sessions, threads.map((t) => threadFacts(t, { hash }))));
  return { ledger, progress: computeCodexProgress(ledger, BADGES, today) };
};

describe('Codex 新徽章', () => {
  it('多线并行与跨日夜战只看自己发起的会话；按文件缓存再合并结果一样', () => {
    const sessions = [cxSession('2026-05-01', 22, 30, 50), cxSession('2026-05-01', 23, 0, 10), cxSession('2026-05-01', 23, 5, 10)];
    const direct = cxRun(sessions);
    expect(direct.progress.multitasker).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
    expect(direct.progress['midnight-crossing']).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });

    const segs = [];
    let days = {};
    for (const s of sessions) days = mergeDays(days, aggregateCodexDays([s], [], { segsOut: segs }));
    applyCodexSegments(days, segs);
    for (const date of Object.keys(direct.ledger.days)) {
      expect(days[date]).toMatchObject({ activeMin: direct.ledger.days[date].activeMin, maxParallel: direct.ledger.days[date].maxParallel, midnight: direct.ledger.days[date].midnight });
    }

    const subs = [cxSession('2026-06-01', 10, 0, 5), cxSession('2026-06-01', 10, 0, 5, 5, '{"subagent":"x"}'), cxSession('2026-06-01', 10, 0, 5, 5, '{"subagent":"y"}')];
    expect(cxRun(subs).progress.multitasker.unlocked).toBe(false);
  });

  it('子代理派遣只算自己发起的会话；高产日按线程数', () => {
    const own = facts([meta(at('2026-05-01', 10)), call(at('2026-05-01', 10, 1), 'spawn_agent'), call(at('2026-05-01', 10, 2), 'spawn_agent')]);
    const sub = facts([meta(at('2026-05-01', 11), '{"subagent":"x"}'), call(at('2026-05-01', 11, 1), 'spawn_agent')]);
    const threads = Array.from({ length: 20 }, (_, i) => ({ created_at_ms: ms('2026-05-01', 9, i), source: 'cli', model: 'gpt-a' }));
    const { ledger, progress } = cxRun([own, sub], threads);
    expect(ledger.days['2026-05-01'].dispatches).toBe(2);
    expect(progress['productive-day']).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
    expect(JSON.stringify(ledger)).not.toContain(SECRET);
  });

  it('节日：Codex 的生日是 4 月 16 日', () => {
    const p = cxRun([cxSession('2026-04-16', 10, 0, 2), cxSession('2026-02-24', 10, 0, 2)]).progress;
    expect(p['tool-birthday']).toMatchObject({ unlocked: true, earnedAt: '2026-04-16' });
  });
});
