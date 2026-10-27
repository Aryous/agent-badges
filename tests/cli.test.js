// CLI 端到端：用临时目录伪造 ~/.claude 和 ~/.codex，跑真实的采集与导出，
// 检查结果正确、隐私不泄漏（秘密内容、本机路径都不能出现在任何输出里）。
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { zstdCompressSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from '../src/cli/args.js';
import { collectAll } from '../src/collect/index.js';
import { injectData } from '../src/share/inject.js';
import { aggregateDays, extractRolloutFacts, mergeDays } from '../src/data/codex-metrics.js';
import { hash } from '../src/collect/common.js';

const SECRET = 'sk-ant-api03-TOP-SECRET-should-never-leak';
const TITLE = 'my confidential project roadmap';
let root;
let env;

const iso = (d, h, m = 0) => new Date(`${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();
const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'agent-badges-test-'));
  const claude = join(root, 'claude');
  const codex = join(root, 'codex');
  env = { CLAUDE_CONFIG_DIR: claude, CODEX_HOME: codex, AGENT_BADGES_HOME: join(root, 'home'), LANG: 'en_US.UTF-8', PATH: process.env.PATH };

  // ---- 伪造 Claude Code ----
  mkdirSync(join(claude, 'projects', '-Users-me-secret-repo'), { recursive: true });
  writeFileSync(join(claude, 'settings.json'), JSON.stringify({ env: { ANTHROPIC_API_KEY: SECRET } }));
  writeFileSync(join(claude, '.credentials.json'), JSON.stringify({ token: SECRET }));
  writeFileSync(join(claude, 'history.jsonl'), jsonl([{ display: SECRET }]));
  writeFileSync(
    join(claude, 'projects', '-Users-me-secret-repo', 's1.jsonl'),
    jsonl([
      { type: 'user', sessionId: 's1', timestamp: iso('2026-05-02', 1), message: { content: `please use ${SECRET}` } },
      {
        type: 'assistant', sessionId: 's1', timestamp: iso('2026-05-02', 1, 1),
        message: { id: 'm1', model: 'claude-opus-5', usage: { input_tokens: 600, output_tokens: 400 }, content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: `echo ${SECRET}` } }] },
      },
      { type: 'user', sessionId: 's1', timestamp: iso('2026-05-02', 1, 2), toolUseResult: { stdout: SECRET }, message: { content: [{ type: 'tool_result', content: SECRET }] } },
    ]),
  );

  // ---- 伪造 Codex ----
  const day = join(codex, 'sessions', '2026', '05', '03');
  mkdirSync(day, { recursive: true });
  writeFileSync(join(codex, 'auth.json'), JSON.stringify({ OPENAI_API_KEY: SECRET }));
  writeFileSync(join(codex, 'config.toml'), `api_key = "${SECRET}"`);
  const rollout = jsonl([
    { type: 'session_meta', timestamp: iso('2026-05-03', 9), payload: { id: 'x', source: 'vscode', base_instructions: SECRET, cwd: '/Users/me/secret' } },
    { type: 'event_msg', timestamp: iso('2026-05-03', 9, 1), payload: { type: 'task_started' } },
    { type: 'response_item', timestamp: iso('2026-05-03', 9, 2), payload: { type: 'function_call', name: 'apply_patch', arguments: SECRET } },
    { type: 'response_item', timestamp: iso('2026-05-03', 9, 3), payload: { type: 'function_call_output', output: SECRET } },
    { type: 'token_usage_record', timestamp: iso('2026-05-03', 9, 4), payload: { response_id: 'r1', usage: { input_tokens: 1000, cached_input_tokens: 400, output_tokens: 100 } } },
  ]);
  writeFileSync(join(day, 'rollout-a.jsonl'), rollout);
  writeFileSync(join(day, 'rollout-b.jsonl.zst'), zstdCompressSync(Buffer.from(rollout.replace('"r1"', '"r2"'))));
  const db = new DatabaseSync(join(codex, 'state_5.sqlite'));
  db.exec(`CREATE TABLE threads (id TEXT, created_at_ms INTEGER, source TEXT, thread_source TEXT, model TEXT,
    reasoning_effort TEXT, approval_mode TEXT, title TEXT, first_user_message TEXT, cwd TEXT)`);
  db.prepare('INSERT INTO threads VALUES (?,?,?,?,?,?,?,?,?,?)').run('t1', Date.parse(iso('2026-05-03', 9)), 'vscode', 'user', 'gpt-x', 'ultra', 'never', TITLE, SECRET, '/Users/me/secret');
  db.close();
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

/** 读出数据目录下所有文件的文本（含缓存）。 */
const allOutputs = () => {
  const dir = env.AGENT_BADGES_HOME;
  const out = [];
  const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : out.push(readFileSync(join(d, e.name), 'utf8'))));
  walk(dir);
  return out.join('\n');
};

describe('CLI', () => {
  it('参数解析', () => {
    expect(parseArgs([])).toMatchObject({ command: 'open', open: true, port: 4747 });
    expect(parseArgs(['collect', '--brand', 'codex', '--json'])).toMatchObject({ command: 'collect', brand: 'codex', json: true });
    expect(parseArgs(['export', './out', '--no-open'])).toMatchObject({ command: 'export', dir: './out', open: false });
    expect(() => parseArgs(['--brand', 'gemini'])).toThrow();
    expect(() => parseArgs(['export'])).toThrow();
  });

  it('采集两个品牌，统计正确', async () => {
    const { results } = await collectAll({ env, home: env.AGENT_BADGES_HOME });
    const cc = results.find((r) => r.brandId === 'claude-code');
    const cx = results.find((r) => r.brandId === 'codex');
    expect(cc.progress['night-owl']).toMatchObject({ unlocked: true, earnedAt: '2026-05-02' });
    expect(cc.ledger.days['2026-05-02'].tokens).toBe(1000);
    // 两个会话文件（一个 zstd 压缩）各打一次补丁，Token 按行业通用口径：输入（含缓存命中）+ 输出
    expect(cx.progress.patches.value).toBe(2);
    expect(cx.ledger.days['2026-05-03'].tokens).toBe(2200);
    expect(cx.progress['deep-thinker'].unlocked).toBe(true);
    // 热力图用的按天数据：只有日期和数字
    expect(cc.data.daily).toEqual({ '2026-05-02': [1000, 1] });
    expect(cx.data.daily['2026-05-03'][0]).toBe(2200);
  });

  it('第二次采集走缓存，结果不变', async () => {
    const { results } = await collectAll({ env, home: env.AGENT_BADGES_HOME, only: 'codex' });
    expect(results[0].parsed).toBe(0);
    expect(results[0].progress.patches.value).toBe(2);
  });

  it('隐私：数据目录（账本、进度、缓存）里没有秘密内容和本机路径', () => {
    const text = allOutputs();
    for (const leak of [SECRET, TITLE, '/Users/me/secret', 'secret-repo', root]) expect(text).not.toContain(leak);
  });

  it('export 命令生成内嵌数据的网页，且不含秘密内容', () => {
    if (!existsSync(new URL('../dist/index.html', import.meta.url))) return; // 未构建时跳过
    const out = join(root, 'export');
    execFileSync(process.execPath, [new URL('../bin/agent-badges.mjs', import.meta.url).pathname, 'export', out], { env });
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    expect(html).toContain('window.__AGENT_BADGES_DATA__');
    expect(html).toContain('"claude-code"');
    for (const leak of [SECRET, TITLE, '/Users/me/secret']) expect(html).not.toContain(leak);
  });

  it('export：同意过头像才内嵌身份；不同意、没有图片都不内嵌', () => {
    if (!existsSync(new URL('../dist/index.html', import.meta.url))) return; // 未构建时跳过
    const home = env.AGENT_BADGES_HOME;
    const run = (name) => {
      const out = join(root, name);
      execFileSync(process.execPath, [new URL('../bin/agent-badges.mjs', import.meta.url).pathname, 'export', out], { env });
      return readFileSync(join(out, 'index.html'), 'utf8');
    };
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
    try {
      writeFileSync(join(home, 'avatar.png'), png);
      writeFileSync(join(home, 'identity.json'), JSON.stringify({ consent: true, login: 'octo', file: 'avatar.png', fetchedAt: '2026-10-28' }));
      const yes = run('export-avatar');
      expect(yes).toContain('window.__AGENT_BADGES_IDENTITY__ = ');
      expect(yes).toContain(`data:image/png;base64,${png.toString('base64')}`);
      writeFileSync(join(home, 'identity.json'), JSON.stringify({ consent: false }));
      expect(run('export-declined')).not.toContain('__AGENT_BADGES_IDENTITY__ =');
      writeFileSync(join(home, 'identity.json'), JSON.stringify({ consent: true, login: 'octo', file: 'avatar.png' }));
      rmSync(join(home, 'avatar.png'));
      expect(run('export-missing')).not.toContain('__AGENT_BADGES_IDENTITY__ =');
    } finally {
      rmSync(join(home, 'identity.json'), { force: true });
      rmSync(join(home, 'avatar.png'), { force: true });
    }
  });

  it('collect --json 输出结构化汇总', () => {
    const out = execFileSync(process.execPath, [new URL('../bin/agent-badges.mjs', import.meta.url).pathname, 'collect', '--json'], { env }).toString();
    const j = JSON.parse(out);
    expect(j.brands.map((b) => b.id).sort()).toEqual(['claude-code', 'codex']);
    expect(j.brands[0]).toHaveProperty('nearMiss');
  });
});

describe('内嵌数据', () => {
  it('转义 < 防止提前闭合 script 标签', () => {
    const html = injectData('<html><head></head></html>', { x: { s: '</script><script>alert(1)</script>' } });
    expect(html).not.toContain('</script><script>alert(1)');
    expect(html).toContain('\\u003c/script>');
  });
});

describe('按文件缓存的合并', () => {
  it('分文件汇总再合并，等于一次性汇总', () => {
    const f = (d, h, id) => [
      { type: 'session_meta', timestamp: iso(d, h), payload: { source: 'cli' } },
      { type: 'event_msg', timestamp: iso(d, h, 1), payload: { type: 'task_started' } },
      { type: 'token_usage_record', timestamp: iso(d, h, 2), payload: { response_id: id, usage: { input_tokens: 10, output_tokens: 5 } } },
    ].map((r) => extractRolloutFacts(r, { hash }));
    const a = f('2026-05-01', 9, 'a');
    const b = f('2026-05-01', 23, 'b');
    expect(mergeDays(aggregateDays([a], []), aggregateDays([b], []))).toEqual(aggregateDays([a, b], []));
  });
});
