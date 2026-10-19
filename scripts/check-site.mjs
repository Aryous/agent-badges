// 检查构建好的 GitHub Pages 站点（先运行 npm run build:site）：
// 落地页、画廊、热力图、演示页都能正常显示，手机上不横向溢出，演示页只有示例数据。
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

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

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu'],
});
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
  await page.goto(base + path);
  await page.waitForFunction(ready, null, { timeout: 60000 });
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
  await page.waitForFunction(() => document.querySelectorAll('.gallery-item.is-ready').length >= 19, null, { timeout: 60000 });
  check(`[${tag}] 画廊渲染出全部 Claude Code 徽章`, (await page.locator('.gallery-item.is-ready').count()) === 19);
  await page.locator('[data-gallery-tabs] button').nth(1).click();
  await page.waitForFunction(() => document.querySelectorAll('.gallery-item.is-ready').length >= 20, null, { timeout: 60000 });
  check(`[${tag}] 切到 Codex 标签，渲染出 20 枚`, (await page.locator('.gallery-item').count()) === 20);
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
  check('演示页 19 枚徽章都有缩略图', (await page.locator('.tile:not(.is-loading)').count()) === 19);
  check('演示页控制台无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
server.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} 通过`);
process.exit(failed ? 1 : 0);
