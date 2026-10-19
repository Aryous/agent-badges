#!/usr/bin/env node
// agent-badges：本机采集 AI 编程工具的使用统计，生成 3D 成就徽章墙。
// 全程离线：数据只读本机、只存本机（默认 ~/.agent-badges），不上传任何内容。
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Node 22 读 SQLite 时会打印「实验特性」警告，对用户没有意义，只屏蔽这一条
const emitWarning = process.emitWarning;
process.emitWarning = (warning, ...rest) => {
  if (String(warning?.message ?? warning).includes('SQLite is an experimental feature')) return;
  return emitWarning.call(process, warning, ...rest);
};

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const APP = join(ROOT, 'dist', 'index.html');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const lang = /^zh/i.test(process.env.LC_ALL ?? process.env.LANG ?? Intl.DateTimeFormat().resolvedOptions().locale ?? '') ? 'zh' : 'en';
const t = (zh, en) => (lang === 'zh' ? zh : en);

const HELP = t(
  `agent-badges ${pkg.version} —— 把你的 AI 编程记录变成 3D 成就徽章

用法
  npx agent-badges                 采集本机数据，打开徽章墙
  npx agent-badges collect         只采集，在终端打印汇总
  npx agent-badges export <目录>   导出可离线打开的静态网页
  npx agent-badges card            生成成就卡片 SVG（可放进 GitHub 个人主页）
  npx agent-badges shelf           在浏览器里渲染已解锁徽章，保存为 PNG（可放进 GitHub 个人主页）

选项
  --brand <claude-code|codex>      只采集 / 只看某个工具
  --port <端口>                    本地页面端口（默认 4747）
  --no-open                        不自动打开浏览器
  --json                           以 JSON 输出汇总（collect）
  --out <文件>                     保存位置（默认 agent-badges-card.svg / agent-badges-shelf.png）
  --theme <dark|light>             卡片配色（默认 dark）
  --name <名字>                    卡片标题里的名字
  --lang <en|zh>                   输出语言（卡片和陈列图默认 en，汇总默认跟随系统）
  -v, --version / -h, --help

数据只读本机、只存 ~/.agent-badges（可用 AGENT_BADGES_HOME 修改），不上传任何内容。`,
  `agent-badges ${pkg.version} — turn your AI coding history into 3D achievement badges

Usage
  npx agent-badges                 collect local stats and open the badge wall
  npx agent-badges collect         collect only and print a summary
  npx agent-badges export <dir>    export a static page you can open offline
  npx agent-badges card            write an achievement card SVG for your GitHub profile
  npx agent-badges shelf           render your unlocked badges in the browser and save a PNG for your profile

Options
  --brand <claude-code|codex>      only one tool
  --port <port>                    local page port (default 4747)
  --no-open                        don't open the browser
  --json                           print the summary as JSON (collect)
  --out <file>                     where to save it (default agent-badges-card.svg / agent-badges-shelf.png)
  --theme <dark|light>             card colors (default dark)
  --name <name>                    name shown on the card
  --lang <en|zh>                   output language (card and shelf default to en, summary to your system)
  -v, --version / -h, --help

Everything stays on this machine: data is read locally and stored in ~/.agent-badges
(override with AGENT_BADGES_HOME). Nothing is uploaded.`,
);

export function parseArgs(argv) {
  const opts = { command: 'open', dir: null, brand: null, port: 4747, open: true, json: false, out: null, theme: 'dark', name: '', cardLang: 'en', outLang: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.command = 'help';
    else if (a === '-v' || a === '--version') opts.command = 'version';
    else if (a === '--brand') opts.brand = argv[++i];
    else if (a === '--port') opts.port = Number(argv[++i]);
    else if (a === '--no-open') opts.open = false;
    else if (a === '--json') opts.json = true;
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--theme') opts.theme = argv[++i];
    else if (a === '--name') opts.name = argv[++i] ?? '';
    else if (a === '--lang') opts.cardLang = opts.outLang = argv[++i];
    else if (a === 'collect' || a === 'export' || a === 'open' || a === 'card' || a === 'shelf') opts.command = a;
    else if (opts.command === 'export' && !opts.dir) opts.dir = a;
    else throw new Error(t(`不认识的参数：${a}`, `Unknown argument: ${a}`));
  }
  if (opts.brand && !['claude-code', 'codex'].includes(opts.brand)) throw new Error(t(`不支持的工具：${opts.brand}`, `Unsupported tool: ${opts.brand}`));
  if (!['dark', 'light'].includes(opts.theme)) throw new Error(t(`不支持的配色：${opts.theme}`, `Unsupported theme: ${opts.theme}`));
  if (!['en', 'zh'].includes(opts.cardLang)) throw new Error(t(`不支持的语言：${opts.cardLang}`, `Unsupported language: ${opts.cardLang}`));
  if (opts.command === 'export' && !opts.dir) throw new Error(t('export 需要一个目录', 'export needs a directory'));
  return opts;
}

/** 需要 Node 内置的 zstd 解压和 SQLite（Node 22.15+）。 */
async function checkRuntime() {
  const zlib = await import('node:zlib');
  let sqlite = true;
  try {
    await import('node:sqlite');
  } catch {
    sqlite = false;
  }
  if (typeof zlib.zstdDecompressSync !== 'function' || !sqlite) {
    throw new Error(t(`需要 Node.js 22.15 或更高版本（当前 ${process.versions.node}）`, `Node.js 22.15+ is required (found ${process.versions.node})`));
  }
}

async function collectAndReport(opts) {
  const { collectAll } = await import('../src/collect/index.js');
  const { summarize, formatSummary, newUnlocks } = await import('../src/collect/summary.js');
  // 首次运行要读完全部会话记录（可能有几 GB），在终端显示进度；之后只处理新增文件
  const tty = process.stderr.isTTY && !opts.json;
  const onProgress = tty
    ? (id, done, total) => {
        if (total < 50) return;
        process.stderr.write(`\r${t(`读取 ${id} 会话记录`, `Reading ${id} sessions`)} ${done}/${total}`);
        if (done === total) process.stderr.write('\r\x1b[K');
      }
    : null;
  // 先记下上次的进度，采集完对比出「新解锁」
  const { dataHome, readJSON } = await import('../src/collect/common.js');
  const before = Object.fromEntries(['claude-code', 'codex'].map((id) => [id, readJSON(join(dataHome(), `${id}.json`))?.progress ?? null]));
  const { home, results } = await collectAll({ only: opts.brand, onProgress });
  const data = {};
  const summaries = [];
  for (const r of results) {
    if (r.error) {
      console.error(t(`× ${r.brandId} 采集失败：${r.error.message}`, `× ${r.brandId} failed: ${r.error.message}`));
      continue;
    }
    if (r.skipped) {
      if (!opts.json) console.log(t(`· 未检测到 ${r.brandId}，跳过`, `· ${r.brandId} not found, skipped`));
      continue;
    }
    data[r.brandId] = r.data;
    const outLang = opts.outLang ?? lang;
    const s = { ...summarize(r.brandId, r.progress, { lang: outLang }), newUnlocks: newUnlocks(r.brandId, before[r.brandId], r.progress, { lang: outLang }) };
    summaries.push({ id: r.brandId, ...s });
    if (!opts.json) {
      console.log(formatSummary(s, { lang: outLang }));
      if (r.note) console.log(`  ${r.note}`);
    }
  }
  if (opts.json) console.log(JSON.stringify({ home, brands: summaries }, null, 2));
  else console.log(t(`\n数据保存在 ${home}（只含数字、日期和哈希）`, `\nSaved to ${home} (numbers, dates and hashes only)`));
  return data;
}

/** 成就卡片：只含解锁数和几个总数，适合公开放在 GitHub 个人主页。 */
async function writeCard(data, opts) {
  const { renderCard } = await import('../src/collect/card.js');
  const { BRAND_INFO, summarize } = await import('../src/collect/summary.js');
  const brands = Object.entries(data).map(([id, d]) => {
    const { brand } = BRAND_INFO[id];
    const { unlocked, total } = summarize(id, d.progress);
    return { id, name: brand.name, accent: brand.ui.accent, unlocked, total, daily: d.daily ?? {} };
  });
  if (!brands.length) throw new Error(t('没有可用的数据，无法生成卡片', 'No data found, so there is nothing to put on the card'));
  const file = resolve(opts.out ?? 'agent-badges-card.svg');
  writeFileSync(file, renderCard({ brands, name: opts.name, theme: opts.theme, lang: opts.cardLang }));
  console.log(t(`\n成就卡片：${file}`, `\nCard saved to ${file}`));
  console.log(t('放进 GitHub 个人主页 README：![Agent Badges](./agent-badges-card.svg)', 'Add it to your profile README: ![Agent Badges](./agent-badges-card.svg)'));
}

const SHELF_TIMEOUT = 120_000;

/**
 * 陈列图：徽章要用 WebGL 渲染，所以交给浏览器。
 * 打开本地页面 → 页面渲染已解锁的徽章 → 把 PNG 交回这里 → 写文件、退出。
 */
async function writeShelf(data, opts) {
  const { summarize } = await import('../src/collect/summary.js');
  const { createReceiver } = await import('../src/collect/receive.js');
  const unlocked = Object.entries(data).reduce((n, [id, d]) => n + summarize(id, d.progress).unlocked, 0);
  if (!unlocked) throw new Error(t('还没有解锁的徽章，陈列图是空的。先多用用 Claude Code 或 Codex 吧', 'No badges unlocked yet, so the shelf would be empty'));

  const file = resolve(opts.out ?? 'agent-badges-shelf.png');
  const receiver = createReceiver();
  const { server, port } = await serve(await appHtml(data), opts.port, { handle: receiver.handle });
  const query = new URLSearchParams({ task: 'shelf', nonce: receiver.nonce, shelfLang: opts.cardLang, lang });
  if (opts.brand) query.set('brand', opts.brand);
  const url = `http://127.0.0.1:${port}/?${query}`;
  const shut = () => {
    server.closeAllConnections();
    server.close();
  };

  console.log(t(`\n正在浏览器里渲染徽章：${url}`, `\nRendering your badges in the browser: ${url}`));
  if (opts.open) openBrowser(url);
  else console.log(t('请在浏览器里打开上面的网址。', 'Open the address above in your browser.'));

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(t(
        `${SHELF_TIMEOUT / 1000} 秒内没有收到浏览器交回的图片。请手动打开上面的网址，或在有图形界面的电脑上运行。`,
        `No image came back from the browser within ${SHELF_TIMEOUT / 1000}s. Open the address above yourself, or run this on a machine with a desktop browser.`,
      ))),
      SHELF_TIMEOUT,
    );
  });
  try {
    const { png, respond } = await Promise.race([receiver.received, timeout]);
    try {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, png);
    } catch (e) {
      respond(500, { error: e.message });
      throw e;
    }
    respond(200, { ok: true, file });
  } finally {
    clearTimeout(timer);
    // 留一点时间把回复送到页面，再关掉服务
    await new Promise((r) => setTimeout(r, 200));
    shut();
  }
  const name = basename(file);
  console.log(t(`\n徽章陈列图：${file}`, `\nShelf saved to ${file}`));
  console.log(t('放进 GitHub 个人主页 README：', 'Add it to your profile README:'));
  console.log(`  <img src="./${name}" alt="Agent Badges" width="720">`);
}

function appHtml(data) {
  if (!existsSync(APP)) throw new Error(t('没有找到页面文件，请先运行 npm run build', 'App not built. Run npm run build first.'));
  return import('../src/collect/inject.js').then(({ injectData }) => injectData(readFileSync(APP, 'utf8'), data));
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

/** 本地页面。handle 可以接管额外的请求（陈列图回传），返回 true 表示已处理。 */
function serve(html, port, { handle = null, tries = 10 } = {}) {
  return new Promise((resolvePromise, reject) => {
    const server = createServer((req, res) => {
      if (handle?.(req, res)) return;
      if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(html);
      } else {
        res.writeHead(404).end();
      }
    });
    server.once('error', (e) => {
      if (e.code === 'EADDRINUSE' && tries > 0) resolvePromise(serve(html, port + 1, { handle, tries: tries - 1 }));
      else reject(e);
    });
    // 只监听本机回环地址，局域网里的其他设备访问不到
    server.listen(port, '127.0.0.1', () => resolvePromise({ server, port }));
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.command === 'help') return console.log(HELP);
  if (opts.command === 'version') return console.log(pkg.version);
  await checkRuntime();

  const data = await collectAndReport(opts);
  if (opts.command === 'collect') return;
  if (opts.command === 'card') return writeCard(data, opts);
  if (opts.command === 'shelf') return writeShelf(data, opts);

  const html = await appHtml(data);
  if (opts.command === 'export') {
    const dir = resolve(opts.dir);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
    console.log(t(`已导出到 ${join(dir, 'index.html')}（含你的统计数字，分享前请留意）`, `Exported to ${join(dir, 'index.html')} (contains your stats; mind this before sharing)`));
    return;
  }

  const { port } = await serve(html, opts.port);
  const query = opts.brand ? `?brand=${opts.brand}` : '';
  const url = `http://127.0.0.1:${port}/${query}`;
  console.log(t(`\n徽章墙：${url}（按 Ctrl+C 退出）`, `\nBadge wall: ${url} (Ctrl+C to quit)`));
  if (opts.open) openBrowser(url);
}

// 被测试导入时不自动运行。npx 通过符号链接启动，要比较真实路径
const isMain = (() => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (isMain) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
