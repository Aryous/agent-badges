import { describe, expect, it } from 'vitest';
import badges from '../src/brands/codex/badges.js';
import {
  aggregateCodexDays,
  computeCodexProgress,
  extractRolloutFacts,
  mergeCodexLedger,
  originKind,
  threadFacts,
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
  const merged = mergeCodexLedger(ledger, aggregateCodexDays(sessions, threads.map((t) => threadFacts(t, { hash }))));
  return { ledger: merged, progress: computeCodexProgress(merged, badges, today) };
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
    expect(extractRolloutFacts(tool(at('2026-05-01', 1), 'my_private_tool'))).toMatchObject({ name: 'other' });
    expect(extractRolloutFacts(tool(at('2026-05-01', 1), 'apply_patch'))).toMatchObject({ name: 'apply_patch' });
  });

  it('来源分类：子代理的 JSON 来源只保留类别', () => {
    expect(originKind('vscode')).toBe('vscode');
    expect(originKind('{"subagent":{"other":"guardian"}}')).toBe('subagent');
    expect(originKind({ subagent: 'memory_consolidation' })).toBe('subagent');
    expect(originKind('mystery')).toBe('other');
  });
});

describe('统计口径', () => {
  it('Token：未缓存输入 + 输出，同一响应只计一次', () => {
    const s = session([meta(at('2026-05-01', 10)), usage(at('2026-05-01', 10), 'r1', 1000, 800, 50), usage(at('2026-05-01', 10), 'r1', 1000, 800, 50)]);
    expect(run([s]).ledger.days['2026-05-01'].tokens).toBe(250);
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
    expect(progress.patches).toEqual({ value: 12, earnedAt: '2026-05-01' });
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
