// 账本和缓存的安全写入：写到一半中断不会留下截断的文件；读到损坏的文件时按文件的性质处理。
// 全部在临时目录里用伪造的数据进行。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 只替换 writeFileSync，用来模拟「写到一半磁盘满了」；其余照常
const realFs = await vi.importActual('node:fs');
vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal();
  return { ...fs, writeFileSync: vi.fn(fs.writeFileSync) };
});
const { writeFileSync: mockedWrite } = await import('node:fs');
const { CorruptLedgerError, readCache, readLedger, saveBrand, writeJSON } = await import('../src/collect/common.js');
const { collectAll } = await import('../src/collect/index.js');

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'agent-badges-storage-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.mocked(mockedWrite).mockClear();
});

const iso = (h, m = 0) => new Date(`2026-05-02T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();

/** 伪造一个最小的 ~/.claude：一个会话，一轮对话。 */
function fakeClaude() {
  const dir = join(root, 'claude', 'projects', 'p');
  mkdirSync(dir, { recursive: true });
  realFs.writeFileSync(
    join(dir, 's1.jsonl'),
    [
      { type: 'user', sessionId: 's1', timestamp: iso(10), message: { content: 'hi' } },
      { type: 'assistant', sessionId: 's1', timestamp: iso(10, 1), message: { id: 'm1', model: 'claude-opus-5', usage: { input_tokens: 10, output_tokens: 5 }, content: [] } },
    ].map((r) => JSON.stringify(r)).join('\n') + '\n',
  );
  return { CLAUDE_CONFIG_DIR: join(root, 'claude'), CODEX_HOME: join(root, 'no-codex'), AGENT_BADGES_HOME: join(root, 'home') };
}

/** 伪造一个最小的 ~/.codex：一个会话，一轮任务。返回目录。 */
function fakeCodex() {
  const day = join(root, 'codex', 'sessions', '2026', '05', '02');
  mkdirSync(day, { recursive: true });
  realFs.writeFileSync(
    join(day, 'rollout-a.jsonl'),
    [
      { type: 'session_meta', timestamp: iso(9), payload: { source: 'cli' } },
      { type: 'event_msg', timestamp: iso(9, 1), payload: { type: 'task_started' } },
    ].map((r) => JSON.stringify(r)).join('\n') + '\n',
  );
  return join(root, 'codex');
}

/** 运行 fn，返回它抛出的错误；没有抛出就让测试失败。 */
function thrownBy(fn) {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error('预期会抛出错误，但没有抛出');
}

describe('写入', () => {
  it('写完不留临时文件，内容完整', () => {
    const p = join(root, 'a', 'x.json');
    writeJSON(p, { n: 1 });
    expect(JSON.parse(readFileSync(p, 'utf8'))).toEqual({ n: 1 });
    expect(readdirSync(join(root, 'a'))).toEqual(['x.json']);
  });

  it('写到一半失败：原文件完好，临时文件被清掉，错误照常抛出', () => {
    const p = join(root, 'x.json');
    writeJSON(p, { old: true });
    vi.mocked(mockedWrite).mockImplementationOnce((file, data) => {
      realFs.writeFileSync(file, String(data).slice(0, 5)); // 只写进去一截
      throw new Error('ENOSPC: no space left on device');
    });
    expect(() => writeJSON(p, { old: false, more: 'x'.repeat(100) })).toThrow('ENOSPC');
    expect(JSON.parse(readFileSync(p, 'utf8'))).toEqual({ old: true });
    expect(readdirSync(root)).toEqual(['x.json']);
  });

  it('覆盖账本前把上一版存成 .bak', () => {
    const home = join(root, 'home');
    const ledger = (n) => ({ version: 1, firstSeen: '2026-05-01', days: { '2026-05-01': { tokens: n, turns: n } } });
    saveBrand(home, 't', ledger(1), {}, { turnsField: 'turns' });
    expect(existsSync(join(home, 't.ledger.json.bak'))).toBe(false);
    saveBrand(home, 't', ledger(2), {}, { turnsField: 'turns' });
    expect(JSON.parse(readFileSync(join(home, 't.ledger.json.bak'), 'utf8'))).toEqual(ledger(1));
    expect(JSON.parse(readFileSync(join(home, 't.ledger.json'), 'utf8'))).toEqual(ledger(2));
  });
});

describe('读到损坏的文件', () => {
  it('账本：抛出 CorruptLedgerError，带上路径和备份', () => {
    const p = join(root, 'x.ledger.json');
    realFs.writeFileSync(p, '{"version":1,"da');
    const noBackup = thrownBy(() => readLedger(p));
    expect(noBackup).toBeInstanceOf(CorruptLedgerError);
    expect(noBackup.path).toBe(p);
    expect(noBackup.backup).toBeNull();
    realFs.writeFileSync(`${p}.bak`, '{}');
    expect(thrownBy(() => readLedger(p)).backup).toBe(`${p}.bak`);
  });

  it('缓存：当作不存在', () => {
    const p = join(root, 'cache.json');
    realFs.writeFileSync(p, '{"version":4,"fi');
    expect(readCache(p)).toBeNull();
    expect(readCache(join(root, 'missing.json'))).toBeNull();
  });

  it('采集时账本损坏：这个工具不采集，账本一个字节都不动', async () => {
    const env = fakeClaude();
    const p = join(env.AGENT_BADGES_HOME, 'claude-code.ledger.json');
    mkdirSync(env.AGENT_BADGES_HOME, { recursive: true });
    realFs.writeFileSync(p, '{"version":1,"da');
    const { results } = await collectAll({ env, home: env.AGENT_BADGES_HOME });
    const r = results.find((x) => x.brandId === 'claude-code');
    expect(r.error).toBeInstanceOf(CorruptLedgerError);
    expect(readFileSync(p, 'utf8')).toBe('{"version":1,"da');
  });
});

describe('命令行', () => {
  const run = (env, args = ['collect']) => spawnSync(process.execPath, ['bin/agent-badges.mjs', ...args], { env: { ...env, LANG: 'en_US.UTF-8', PATH: process.env.PATH }, encoding: 'utf8' });
  /** 伪造的 Claude Code 加上一个损坏的账本（旁边有 .bak），返回环境变量和账本路径。 */
  const corruptClaude = () => {
    const env = fakeClaude();
    const p = join(env.AGENT_BADGES_HOME, 'claude-code.ledger.json');
    mkdirSync(env.AGENT_BADGES_HOME, { recursive: true });
    realFs.writeFileSync(p, '{"version":1,"da');
    realFs.writeFileSync(`${p}.bak`, '{"version":1,"firstSeen":null,"days":{}}');
    return { env, p };
  };

  it('进度文件损坏：提示是哪个文件，照常采集并重写它，退出码 0', () => {
    const env = fakeClaude();
    const p = join(env.AGENT_BADGES_HOME, 'claude-code.json');
    mkdirSync(env.AGENT_BADGES_HOME, { recursive: true });
    realFs.writeFileSync(p, '{"source":"lo');
    const r = run(env);
    expect(r.status).toBe(0);
    expect(r.stderr).toContain(p);
    expect(JSON.parse(readFileSync(p, 'utf8')).source).toBe('local');
  });

  it('账本损坏：提示路径和从 .bak 恢复的命令，退出码非零', () => {
    const { env, p } = corruptClaude();
    const r = run(env);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain(p);
    expect(r.stderr).toContain(`cp "${p}.bak" "${p}"`);
    expect(readFileSync(p, 'utf8')).toBe('{"version":1,"da');
  });

  it('有工具采集失败：card 不生成缺了这个工具的卡片，说明是哪个工具，退出码非零', () => {
    const { env, p } = corruptClaude();
    const out = join(root, 'card.svg');
    // Codex 照常采集成功：不拦下来的话，会生成一张只有 Codex 的卡片
    const r = run({ ...env, CODEX_HOME: fakeCodex() }, ['card', '--out', out]);
    expect(r.status).not.toBe(0);
    expect(existsSync(out)).toBe(false);
    expect(r.stderr).toContain(`cp "${p}.bak" "${p}"`);
    expect(r.stderr).toContain('claude-code could not be collected');
    expect(r.stderr).toContain('run again');
    expect(r.stdout).not.toContain('Card saved');
  });

  it('collect --json：failed 列出采集失败的工具，没失败时是空数组', () => {
    const { env } = corruptClaude();
    const bad = run(env, ['collect', '--json']);
    expect(JSON.parse(bad.stdout).failed).toEqual(['claude-code']);
    const ok = run({ ...env, AGENT_BADGES_HOME: join(root, 'home-ok') }, ['collect', '--json']);
    expect(ok.status).toBe(0);
    expect(JSON.parse(ok.stdout).failed).toEqual([]);
  });

  it('Codex 缓存损坏：当作空缓存重新解析，采集成功', () => {
    const env = { ...fakeClaude(), CODEX_HOME: fakeCodex() };
    mkdirSync(join(env.AGENT_BADGES_HOME, 'cache'), { recursive: true });
    realFs.writeFileSync(join(env.AGENT_BADGES_HOME, 'cache', 'codex-rollouts.json'), '{"version":4,"fi');
    const r = run(env);
    expect(r.status).toBe(0);
    expect(JSON.parse(readFileSync(join(env.AGENT_BADGES_HOME, 'cache', 'codex-rollouts.json'), 'utf8')).version).toBe(4);
    expect(existsSync(join(env.AGENT_BADGES_HOME, 'codex.json'))).toBe(true);
  });
});
