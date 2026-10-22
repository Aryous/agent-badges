import { describe, expect, it } from 'vitest';
import badges from '../src/brands/codex/index.js';
import {
  aggregateDays,
  applyCodexSegments,
  applyStreams,
  computeProgress,
  extractRolloutFacts,
  extractThreadFacts,
  mergeDays,
  mergeLedger,
  originKind,
} from '../src/data/codex-metrics.js';

const SECRET = 'sk-proj-SECRET-should-never-leak-456';
const NICK = 'Darwin-the-secret-agent';
// 测试用哈希：不同输入得到不同结果，且结果里不含原文
const hash = (s) => `h${[...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)}`;
const at = (date, h, m = 0) => new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();
const ms = (date, h) => Date.parse(at(date, h));

const meta = (ts, source = 'vscode') => ({ type: 'session_meta', timestamp: ts, payload: { id: 'x', source, base_instructions: SECRET, cwd: '/Users/me/secret' } });
const task = (ts) => ({ type: 'event_msg', timestamp: ts, payload: { type: 'task_started' } });
const tool = (ts, name) => ({ type: 'response_item', timestamp: ts, payload: { type: 'function_call', name, arguments: `{"cmd":"echo ${SECRET}"}` } });
const output = (ts) => ({ type: 'response_item', timestamp: ts, payload: { type: 'function_call_output', output: SECRET } });
const usage = (ts, id, input, cached, out) => ({
  type: 'token_usage_record', timestamp: ts,
  payload: { response_id: id, usage: { input_tokens: input, cached_input_tokens: cached, output_tokens: out } },
});
const ctx = (ts, extra = {}) => ({ type: 'turn_context', timestamp: ts, payload: { model: 'gpt-x', effort: 'high', approval_policy: 'on-request', cwd: '/secret', ...extra } });

const session = (recs) => recs.map((r) => extractRolloutFacts(r, { hash })).filter(Boolean);
const run = (sessions, threads = [], ledger = null, today = '2026-10-18') => {
  const merged = mergeLedger(ledger, aggregateDays(sessions, threads.map((t) => extractThreadFacts(t, { hash }))));
  return { ledger: merged, progress: computeProgress(merged, badges, today) };
};

describe('隐私：白名单提取', () => {
  it('命令参数、命令输出、系统提示、路径、子代理昵称、模型名都不会出现在输出里', () => {
    const s = session([
      meta(at('2026-05-01', 10)),
      task(at('2026-05-01', 10, 1)),
      tool(at('2026-05-01', 10, 2), 'exec'),
      output(at('2026-05-01', 10, 3)),
      ctx(at('2026-05-01', 10, 4), { model: 'gpt-secret-model' }),
    ]);
    const threads = [{ created_at_ms: ms('2026-05-01', 10), source: JSON.stringify({ subagent: { thread_spawn: { agent_nickname: NICK } } }), model: 'gpt-secret-model' }];
    const { ledger, progress } = run([s], threads);
    const dump = JSON.stringify({ s, ledger, progress });
    for (const leak of [SECRET, NICK, '/Users/me/secret', 'gpt-secret-model']) expect(dump).not.toContain(leak);
  });

  it('不在白名单里的工具名一律记为 other', () => {
    expect(extractRolloutFacts(tool(at('2026-05-01', 1), 'my_private_tool'), { hash })).toMatchObject({ name: 'other' });
    expect(extractRolloutFacts(tool(at('2026-05-01', 1), 'apply_patch'), { hash })).toMatchObject({ name: 'apply_patch' });
  });

  it('来源分类：子代理的 JSON 来源只保留类别', () => {
    expect(originKind('vscode')).toBe('vscode');
    expect(originKind('{"subagent":{"other":"guardian"}}')).toBe('subagent');
    expect(originKind({ subagent: 'memory_consolidation' })).toBe('subagent');
    expect(originKind('mystery')).toBe('other');
  });
});

describe('统计口径', () => {
  it('Token 按行业通用口径：输入（Codex 的输入已含缓存命中）+ 输出，同一响应只计一次', () => {
    const s = session([meta(at('2026-05-01', 10)), usage(at('2026-05-01', 10), 'r1', 1000, 800, 50), usage(at('2026-05-01', 10), 'r1', 1000, 800, 50)]);
    expect(run([s]).ledger.days['2026-05-01'].tokens).toBe(1050);
  });

  // 旧版 Codex（2026-09 之前）没有 token_usage_record，用量只在 token_count 事件里
  const tc = (ts, last, total) => {
    const u = ([input, cached, out]) => ({ input_tokens: input, cached_input_tokens: cached, output_tokens: out, total_tokens: input + out });
    return {
      type: 'event_msg', timestamp: ts,
      payload: { type: 'token_count', info: { total_token_usage: u(total), last_token_usage: u(last), model_context_window: 1 }, rate_limits: { plan_type: SECRET } },
    };
  };

  it('Token（旧版）：没有 token_usage_record 时用 token_count，重复播报只计一次', () => {
    const s = session([
      meta(at('2026-05-20', 10)),
      { type: 'event_msg', timestamp: at('2026-05-20', 10), payload: { type: 'token_count', info: null } },
      tc(at('2026-05-20', 10, 1), [1000, 800, 50], [1000, 800, 50]),
      tc(at('2026-05-20', 10, 1), [1000, 800, 50], [1000, 800, 50]), // 同一次的重复播报
      tc(at('2026-05-20', 10, 2), [2000, 1900, 30], [3000, 2700, 80]),
    ]);
    const { ledger } = run([s]);
    expect(ledger.days['2026-05-20'].tokens).toBe(1050 + 2030);
    expect(JSON.stringify(ledger)).not.toContain(SECRET);
  });

  it('Token：同一会话里既有 token_usage_record 又有 token_count 时只用前者，不重复计', () => {
    const s = session([
      meta(at('2026-09-11', 10)),
      usage(at('2026-09-11', 10, 1), 'r1', 1000, 800, 50),
      tc(at('2026-09-11', 10, 1), [1000, 800, 50], [1000, 800, 50]),
    ]);
    expect(run([s]).ledger.days['2026-09-11'].tokens).toBe(1050);
  });

  it('Token（旧版）：分叉 / 子代理会话开头复制的父会话用量不重复计（按「本次用量 + 累计值」跨会话去重）', () => {
    const parent = session([
      meta(at('2026-05-20', 10)),
      tc(at('2026-05-20', 10, 1), [100, 0, 10], [100, 0, 10]),
      tc(at('2026-05-20', 10, 2), [200, 0, 20], [300, 0, 30]),
    ]);
    const child = session([
      meta(at('2026-05-20', 11), JSON.stringify({ subagent: { thread_spawn: { parent_thread_id: 'p' } } })),
      tc(at('2026-05-20', 11, 1), [200, 0, 20], [300, 0, 30]), // 复制来的
      tc(at('2026-05-20', 11, 2), [400, 0, 40], [700, 0, 70]), // 子会话自己的
    ]);
    const expected = 110 + 220 + 440;
    expect(run([parent, child]).ledger.days['2026-05-20'].tokens).toBe(expected);
    // 按文件分别汇总（采集时的增量缓存）再合并，结果一样
    const streams = [];
    const days = mergeDays(aggregateDays([parent], [], { streamsOut: streams }), aggregateDays([child], [], { streamsOut: streams }));
    applyStreams(days, streams);
    expect(days['2026-05-20'].tokens).toBe(expected);
  });

  it('线程数只算自己发起的会话（vscode / cli / exec），审查子代理不算但解锁审查官', () => {
    const threads = [
      { created_at_ms: ms('2026-05-01', 9), source: 'vscode', thread_source: 'user', model: 'gpt-a', approval_mode: 'never', reasoning_effort: 'ultra' },
      { created_at_ms: ms('2026-05-01', 9), source: 'cli', thread_source: 'user', model: 'gpt-b' },
      { created_at_ms: ms('2026-05-02', 9), source: '{"subagent":{"other":"guardian"}}', thread_source: 'guardian_review', model: 'codex-auto-review', approval_mode: 'never' },
    ];
    const { ledger, progress } = run([], threads);
    expect(ledger.days['2026-05-01'].threads).toBe(2);
    expect(ledger.days['2026-05-02'].threads).toBe(0);
    expect(progress.reviewer).toMatchObject({ unlocked: true, earnedAt: '2026-05-02' });
    expect(progress['ide-buddy']).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
    expect(progress['full-auto']).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
    expect(progress['deep-thinker']).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
  });

  it('补丁、计划、子代理按工具名识别；压缩按事件计数', () => {
    const recs = [meta(at('2026-05-01', 10)), task(at('2026-05-01', 10))];
    for (let i = 0; i < 12; i++) recs.push(tool(at('2026-05-01', 10, i), 'apply_patch'));
    recs.push(tool(at('2026-05-01', 11), 'update_plan'), tool(at('2026-05-01', 11), 'spawn_agent'));
    for (let i = 0; i < 20; i++) recs.push({ type: 'compacted', timestamp: at('2026-05-01', 12, i), payload: { message: SECRET } });
    const { progress } = run([session(recs)]);
    expect(progress.patches).toMatchObject({ value: 12, earnedAt: '2026-05-01' });
    expect(progress['plan-tracker'].unlocked).toBe(true);
    expect(progress['multi-agent'].unlocked).toBe(true);
    expect(progress.compactor).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
  });

  it('作息按发起一轮的本地时间；子代理会话不算', () => {
    const human = session([meta(at('2026-05-02', 1)), task(at('2026-05-02', 1))]); // 周六凌晨
    const sub = session([meta(at('2026-05-03', 6), { subagent: 'x' }), task(at('2026-05-03', 6))]);
    const { progress } = run([human, sub]);
    expect(progress['night-owl']).toMatchObject({ unlocked: true, earnedAt: '2026-05-02' });
    expect(progress['early-bird'].unlocked).toBe(false);
  });

  it('模型收藏家：4 种不同模型（审查模型不计）', () => {
    const threads = ['gpt-a', 'gpt-b', 'gpt-c', 'codex-auto-review', 'gpt-d'].map((model, i) => ({
      created_at_ms: ms(`2026-05-0${i + 1}`, 9), source: 'vscode', model,
    }));
    expect(run([], threads).progress['model-collector']).toMatchObject({ unlocked: true, earnedAt: '2026-05-05' });
  });

  it('账本合并：旧日期保留，徽章不会因记录被清理而消失', () => {
    const first = run([], [{ created_at_ms: ms('2026-04-10', 9), source: 'vscode', model: 'gpt-a' }]).ledger;
    const second = run([], [{ created_at_ms: ms('2026-09-01', 9), source: 'cli', model: 'gpt-a' }], first);
    expect(second.progress['first-thread'].earnedAt).toBe('2026-04-10');
    expect(second.progress.threads.value).toBe(2);
  });
});

describe('会话活动与新徽章', () => {
  const SECRET = 'sk-SECRET-should-never-leak-789';
  const hash = (s) => `h${s.length}`;
  const at = (date, h, m = 0) => new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();
  const ms = (date, h, m = 0) => Date.parse(at(date, h, m));
  const MIN = 60_000;

  // 分级门槛：测试用，和正式配置无关
  const TIERS = (...t) => t.map((threshold) => ({ threshold }));
  const TEST_TIERS = {
    'active-hours': TIERS(10, 100, 1000, 5000),
    dispatches: TIERS(10, 100, 1000, 10000),
    'web-research': TIERS(10, 100, 1000, 10000),
    'file-edits': TIERS(100, 1000, 10000, 100000),
  };
  // 其余徽章用正式配置（规则从配置里读门槛）；这几枚分级徽章换成测试门槛
  const BADGES = badges.map((b) => (TEST_TIERS[b.id] ? { ...b, tiers: TEST_TIERS[b.id] } : b));

  // ---------- Codex ----------
  const meta = (ts, source = 'cli') => ({ type: 'session_meta', timestamp: ts, payload: { source } });
  const task = (ts) => ({ type: 'event_msg', timestamp: ts, payload: { type: 'task_started' } });
  const call = (ts, name) => ({ type: 'response_item', timestamp: ts, payload: { type: 'function_call', name, arguments: SECRET } });
  const facts = (recs) => recs.map((r) => extractRolloutFacts(r, { hash })).filter(Boolean);
  const cxSession = (date, h, m, n, step = 5, source = 'cli') =>
    facts([meta(at(date, h, m), source), ...Array.from({ length: n }, (_, i) => task(new Date(ms(date, h, m) + i * step * MIN).toISOString()))]);
  const cxRun = (sessions, threads = [], today = '2026-10-21') => {
    const ledger = mergeLedger(null, aggregateDays(sessions, threads.map((t) => extractThreadFacts(t, { hash }))));
    return { ledger, progress: computeProgress(ledger, BADGES, today) };
  };

  describe('习惯、里程碑、节日（0.5 起）', () => {
    it('多线并行与跨日夜战只看自己发起的会话；按文件缓存再合并结果一样', () => {
      const sessions = [cxSession('2026-05-01', 22, 30, 50), cxSession('2026-05-01', 23, 0, 10), cxSession('2026-05-01', 23, 5, 10)];
      const direct = cxRun(sessions);
      expect(direct.progress.multitasker).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });
      expect(direct.progress['midnight-crossing']).toMatchObject({ unlocked: true, earnedAt: '2026-05-01' });

      const segs = [];
      let days = {};
      for (const s of sessions) days = mergeDays(days, aggregateDays([s], [], { segsOut: segs }));
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
});
