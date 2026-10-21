// 检查 npx agent-badges shelf / profile 的完整流程（先运行 npm run build）：
// 伪造一份 Claude Code 记录 → 命令启动本地页面 → 浏览器渲染 → PNG 交回 → 命令写文件并退出；
// profile 还要写出公开版网页，用访客的眼光打开检查。
// 用临时目录，不读本机真实记录。
import { chromium } from 'playwright-core';
import { execFileSync, spawn } from 'node:child_process';
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

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu'],
});

/** 运行一条命令，等它打印本地网址，用浏览器打开（代替用户的浏览器），等命令退出。 */
async function runWithBrowser(args, { hidden = false } = {}) {
  const cli = spawn(process.execPath, ['bin/agent-badges.mjs', ...args, '--no-open', '--port', '4790'], { env });
  let stdout = '';
  cli.stdout.on('data', (d) => (stdout += d));
  cli.stderr.on('data', (d) => (stdout += d));
  // 卡住时别让检查本身一直挂着：60 秒没退出就算失败
  const exited = new Promise((r) => {
    cli.on('exit', r);
    setTimeout(() => {
      cli.kill();
      r('timeout');
    }, 60000);
  });
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (hidden) {
    // 模拟后台标签页：浏览器不发动画帧
    await page.addInitScript(() => {
      Object.defineProperty(Document.prototype, 'visibilityState', { get: () => 'hidden' });
      Object.defineProperty(Document.prototype, 'hidden', { get: () => true });
      window.requestAnimationFrame = () => 0;
    });
  }
  await page.goto(url);
  const code = await exited;
  await page.waitForFunction(() => /\.png/.test(document.querySelector('[data-shelf-status]')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {});
  const status = await page.locator('[data-shelf-status]').textContent();
  // 本机徽章墙上出现的工具：顶栏切换和热力图图例
  const shown = await page.evaluate(() => ({
    tabs: [...document.querySelectorAll('.brand-tab')].map((a) => a.textContent),
    heat: [...document.querySelectorAll('.heat-brand-name')].map((a) => a.textContent),
    source: document.querySelector('[data-source]')?.textContent ?? '',
  }));
  await page.close();
  return { url, code, stdout, status, errors, shown };
}

// ---------- shelf ----------
{
  const r = await runWithBrowser(['shelf', '--out', out]);
  check('shelf：命令打印了带 task=shelf 和 nonce 的本地网址', /task=shelf/.test(r.url) && /nonce=[0-9a-f]{32}/.test(r.url), r.url);
  check('shelf：命令正常退出', r.code === 0, `exit ${r.code}`);
  check('shelf：PNG 写到了 --out 指定的位置', existsSync(out) && readFileSync(out).subarray(1, 4).toString() === 'PNG', out);
  const lightOut = out.replace('.png', '-light.png');
  check('shelf：同时写出浅色版', existsSync(lightOut) && readFileSync(lightOut).subarray(1, 4).toString() === 'PNG' && !readFileSync(lightOut).equals(readFileSync(out)), lightOut);
  check('shelf：终端给出可粘贴进 README 的一行', r.stdout.includes('<img src="./agent-badges-shelf.png"'));
  check('shelf：页面显示已保存到哪里', r.status.includes(out), r.status);
  check('shelf：页面没有报错', r.errors.length === 0, r.errors.join(' | '));
  // 这份伪造数据只有 Claude Code：没装的 Codex 不能用示例数据冒充
  check(
    '只装了一个工具时，徽章墙不出现另一个工具的示例数据',
    JSON.stringify(r.shown.tabs) === '["Claude Code"]' && JSON.stringify(r.shown.heat) === '["Claude Code"]' && !/Sample|示例/.test(r.shown.source),
    JSON.stringify(r.shown),
  );
  if (existsSync(out)) writeFileSync('screenshots/shelf-cli.png', readFileSync(out));
}

// ---------- shelf：页面在后台 ----------
{
  // 命令行自动打开的标签页常常在后台；浏览器不发动画帧时也要能生成完
  const bg = join(root, 'profile', 'background.png');
  const r = await runWithBrowser(['shelf', '--out', bg], { hidden: true });
  check('shelf：标签页在后台（没有动画帧）也能生成完', r.code === 0 && existsSync(bg), `exit ${r.code}`);
}

// ---------- profile：主页仓库里写入徽章图和公开版徽章墙 ----------
{
  const repo = join(root, 'someone');
  mkdirSync(repo, { recursive: true });
  execFileSync('git', ['init', '-q', repo]);
  execFileSync('git', ['-C', repo, 'remote', 'add', 'origin', 'https://github.com/Someone/someone.git']);
  const r = await runWithBrowser(['profile', repo]);
  check('profile：命令正常退出', r.code === 0, r.code === 0 ? '' : `exit ${r.code}\n${r.stdout}`);
  check('profile：写出了深浅两张徽章图和网页', existsSync(join(repo, 'agent-badges-shelf.png')) && existsSync(join(repo, 'agent-badges-shelf-light.png')) && existsSync(join(repo, 'index.html')));
  check('profile：README 片段链接到 GitHub Pages，按主题切换图片', r.stdout.includes('<a href="https://someone.github.io/someone/"><picture><source media="(prefers-color-scheme: light)" srcset="./agent-badges-shelf-light.png"><img src="./agent-badges-shelf.png"'));

  // 用访客的眼光打开公开版网页
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + join(repo, 'index.html') + '?lang=en');
  await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 60000 });
  const seen = await page.evaluate(() => ({
    source: document.querySelector('[data-source]').textContent,
    home: document.querySelector('[data-source] a')?.href,
    shelfButton: !document.querySelector('[data-shelf]').hidden,
    tabs: [...document.querySelectorAll('.brand-tab')].map((a) => a.textContent),
    title: document.title,
    data: window.__AGENT_BADGES_DATA__,
  }));
  await page.screenshot({ path: 'screenshots/profile-page.png' });
  await page.close();
  const { BRAND_INFO } = await import('../src/collect/summary.js');
  const hiddenIds = new Set(BRAND_INFO['claude-code'].badges.filter((b) => b.hidden).map((b) => b.id));
  const leaked = Object.entries(seen.data['claude-code'].progress).filter(([id, p]) => hiddenIds.has(id) && !p.unlocked);
  check('profile：网页显示名字和日期，链接到项目站点', /^Someone's badges · updated \w+ \d+, \d{4}/.test(seen.source) && seen.home === 'https://aryous.github.io/agent-badges/', seen.source);
  check('profile：只列出有数据的工具（这里只有 Claude Code）', JSON.stringify(seen.tabs) === '["Claude Code"]', JSON.stringify(seen.tabs));
  check('profile：不显示「GitHub 主页图」按钮', !seen.shelfButton);
  check('profile：内嵌数据里没有未解锁的隐藏徽章，时间只到日期', leaked.length === 0 && /^\d{4}-\d{2}-\d{2}$/.test(seen.data['claude-code'].generatedAt), `${leaked.length} 枚，${seen.data['claude-code'].generatedAt}`);
  check('profile：网页没有报错', errors.length === 0 && r.errors.length === 0, [...errors, ...r.errors].join(' | '));
}

await browser.close();
rmSync(root, { recursive: true, force: true });
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} 通过`);
process.exit(failed ? 1 : 0);
