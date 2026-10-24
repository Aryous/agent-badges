// 检查构建好的 GitHub Pages 站点（先运行 npm run build:site）：
// 落地页、画廊、热力图、演示页都能正常显示，手机上不横向溢出，演示页只有示例数据。
import { launchChrome } from './browser.mjs';
// 软件渲染（CI）下页面的 load 事件可能超过 Playwright 默认的 30 秒，和后面的就绪等待一样放宽到 3 分钟
const NAV_TIMEOUT = 180000;
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { brandById } from '../src/brands/index.js';

// 徽章数量从注册表读取，新增徽章后不用再改这里（脚本属于工具，可以直接点名这两个工具）
const CLAUDE_COUNT = brandById('claude-code').badges.length;
const CODEX_COUNT = brandById('codex').badges.length;

const ROOT = 'dist-site';
if (!existsSync(`${ROOT}/index.html`)) throw new Error('先运行 npm run build:site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!p.startsWith(ROOT)) return res.writeHead(403).end();
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await launchChrome();
const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

async function visit(path, viewport, ready) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => errors.push(`请求失败 ${r.url()}`));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await page.goto(base + path, { timeout: NAV_TIMEOUT });
  await page.waitForFunction(ready, null, { timeout: 180000 });
  return { page, errors };
}

for (const [tag, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const { page, errors } = await visit('?lang=en', viewport, () => window.__site?.ready);
  await page.waitForTimeout(800);
  const heroPixels = await page.evaluate(() => {
    const c = document.querySelector('#hero-stage');
    return c.width > 0 && c.height > 0;
  });
  check(`[${tag}] 落地页首屏 3D 画布已渲染`, heroPixels);
  await page.locator('[data-gallery]').scrollIntoViewIfNeeded();
  // 画廊逐帧画徽章：真实显卡几秒，软件渲染（CI）每枚要一两秒
  await page.waitForFunction((n) => document.querySelectorAll('.gallery-item.is-ready').length >= n, CLAUDE_COUNT, { timeout: 600000 });
  check(`[${tag}] 画廊渲染出全部 ${CLAUDE_COUNT} 枚 Claude Code 徽章`, (await page.locator('.gallery-item.is-ready').count()) === CLAUDE_COUNT);
  await page.locator('[data-gallery-tabs] button').nth(1).click();
  await page.waitForFunction((n) => document.querySelectorAll('.gallery-item.is-ready').length >= n, CODEX_COUNT, { timeout: 600000 });
  check(`[${tag}] 切到 Codex 标签，渲染出 ${CODEX_COUNT} 枚`, (await page.locator('.gallery-item').count()) === CODEX_COUNT);
  check(`[${tag}] 热力图有 365 格`, (await page.locator('.heat-cell[data-date]').count()) >= 365);
  const demoHref = await page.locator('.hero-actions [data-demo-link]').getAttribute('href');
  check(`[${tag}] 演示链接指向 ./demo/`, demoHref.startsWith('./demo/'), demoHref);
  check(`[${tag}] 落地页无横向溢出`, !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  const agent = await page.evaluate(() => ({
    empty: [...document.querySelectorAll('#agent [data-i18n], #agent [data-i18n-html]')].filter((el) => !el.textContent.trim()).length,
    copies: [...document.querySelectorAll('#agent [data-copy]')].map((b) => b.dataset.copy),
    jump: document.querySelector('.hero-alt')?.getAttribute('href'),
  }));
  check(
    `[${tag}] Agent 区块文字齐全，有 Claude Code 和 Codex 两段可复制的安装命令`,
    agent.empty === 0 && agent.copies.length === 2 && agent.copies[0].startsWith('/plugin install') && agent.copies[1].startsWith('codex plugin') && agent.jump === '#agent',
    JSON.stringify(agent),
  );
  await page.locator('#agent').screenshot({ path: `screenshots/site-agent-${tag}.png` });
  await page.screenshot({ path: `screenshots/site-${tag}.png`, fullPage: true });
  check(`[${tag}] 落地页控制台无报错`, errors.length === 0, errors.join(' | '));
  await page.close();
}

{
  const { page, errors } = await visit('demo/?lang=en', { width: 1440, height: 900 }, () => window.__badgeApp?.ready);
  const source = await page.locator('[data-source]').textContent();
  check('演示页显示示例数据，并有回到首页的链接', source.startsWith('Sample data') && (await page.locator('.source-link').getAttribute('href')).startsWith('../'), source);
  check('演示页没有注入本机数据', !(await page.evaluate(() => 'window.__AGENT_BADGES_DATA__' in window && window.__AGENT_BADGES_DATA__)));
  check(`演示页 ${CLAUDE_COUNT} 枚徽章都有缩略图`, (await page.locator('.tile:not(.is-loading)').count()) === CLAUDE_COUNT);
  check('演示页控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
server.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} 通过`);
process.exit(failed ? 1 : 0);
