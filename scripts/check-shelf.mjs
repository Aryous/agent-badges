// 检查 npx agent-badges shelf 的完整流程（先运行 npm run build）：
// 伪造一份 Claude Code 记录 → 命令启动本地页面 → 浏览器渲染 → PNG 交回 → 命令写文件并退出。
// 用临时目录，不读本机真实记录。
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (!existsSync('dist/index.html')) throw new Error('先运行 npm run build');

const root = mkdtempSync(join(tmpdir(), 'agent-badges-shelf-'));
const claude = join(root, 'claude');
mkdirSync(join(claude, 'projects', 'demo'), { recursive: true });
const at = (m) => new Date(`2026-05-02T10:${String(m).padStart(2, '0')}:00`).toISOString();
writeFileSync(
  join(claude, 'projects', 'demo', 's1.jsonl'),
  [
    { type: 'user', sessionId: 's1', timestamp: at(0), message: { content: 'hi' } },
    { type: 'assistant', sessionId: 's1', timestamp: at(1), message: { id: 'm1', model: 'x', usage: { input_tokens: 10, output_tokens: 5 }, content: [] } },
  ]
    .map((r) => JSON.stringify(r))
    .join('\n') + '\n',
);
const out = join(root, 'profile', 'agent-badges-shelf.png');
const env = { ...process.env, CLAUDE_CONFIG_DIR: claude, CODEX_HOME: join(root, 'codex'), AGENT_BADGES_HOME: join(root, 'home'), LANG: 'en_US.UTF-8' };

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const cli = spawn(process.execPath, ['bin/agent-badges.mjs', 'shelf', '--no-open', '--port', '4790', '--out', out], { env });
let stdout = '';
cli.stdout.on('data', (d) => (stdout += d));
cli.stderr.on('data', (d) => (stdout += d));
const exited = new Promise((r) => cli.on('exit', r));

// 等命令打印出网址，再用浏览器打开（代替用户的浏览器）
const url = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`命令没有打印网址：\n${stdout}`)), 60000);
  cli.stdout.on('data', () => {
    const m = stdout.match(/http:\/\/127\.0\.0\.1:\d+\/\?\S+/);
    if (m) {
      clearTimeout(timer);
      resolve(m[0]);
    }
  });
});
check('命令打印了带 task=shelf 和 nonce 的本地网址', /task=shelf/.test(url) && /nonce=[0-9a-f]{32}/.test(url), url);

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url);
const code = await exited;
await page.waitForFunction(() => /agent-badges-shelf\.png/.test(document.querySelector('[data-shelf-status]')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {});
const status = await page.locator('[data-shelf-status]').textContent();

check('命令正常退出', code === 0, `exit ${code}`);
check('PNG 写到了 --out 指定的位置', existsSync(out) && readFileSync(out).subarray(1, 4).toString() === 'PNG', out);
check('终端给出可粘贴进 README 的一行', stdout.includes('<img src="./agent-badges-shelf.png"'));
check('页面显示已保存到哪里', status.includes(out), status);
check('页面没有报错', errors.length === 0, errors.join(' | '));
if (existsSync(out)) writeFileSync('screenshots/shelf-cli.png', readFileSync(out));

await browser.close();
rmSync(root, { recursive: true, force: true });
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} 通过`);
process.exit(failed ? 1 : 0);
