#!/usr/bin/env node
// agent-badges：本机采集 AI 编程工具的使用统计，生成 3D 成就徽章墙。
// 全程离线：数据只读本机、只存本机（默认 ~/.agent-badges），不上传任何内容。
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND_IDS } from '../src/brands/index.js';

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
  npx agent-badges publish         一条命令部署到 GitHub 主页：徽章图 + 公开版徽章墙（需要 gh）
  npx agent-badges profile <目录>  只往主页仓库目录写入徽章图和公开版徽章墙，不提交

选项
  --brand <${BRAND_IDS.join('|')}>      只采集 / 只看某个工具
  --port <端口>                    本地页面端口（默认 4747）
  --no-open                        不自动打开浏览器
  --json                           以 JSON 输出汇总（collect）
  --out <文件>                     保存位置（默认 agent-badges-card.svg / agent-badges-shelf.png）
  --theme <dark|light>             卡片配色（默认 dark）
  --name <名字>                    卡片和公开版徽章墙上的名字
  --yes                            publish：确认执行（不带时只检查并列出计划）
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
  npx agent-badges publish         put your badges on your GitHub profile, with a public badge wall (needs gh)
  npx agent-badges profile <dir>   only write the badge image and public badge wall into a profile repo folder

Options
  --brand <${BRAND_IDS.join('|')}>      only one tool
  --port <port>                    local page port (default 4747)
  --no-open                        don't open the browser
  --json                           print the summary as JSON (collect)
  --out <file>                     where to save it (default agent-badges-card.svg / agent-badges-shelf.png)
  --theme <dark|light>             card colors (default dark)
  --name <name>                    name shown on the card and the public badge wall
  --yes                            publish: go ahead (without it, publish only checks and shows the plan)
  --lang <en|zh>                   output language (card and shelf default to en, summary to your system)
  -v, --version / -h, --help

Everything stays on this machine: data is read locally and stored in ~/.agent-badges
(override with AGENT_BADGES_HOME). Nothing is uploaded.`,
);

export function parseArgs(argv) {
  const opts = { command: 'open', dir: null, brand: null, port: 4747, open: true, json: false, out: null, theme: 'dark', name: '', cardLang: 'en', outLang: null, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.command = 'help';
    else if (a === '-v' || a === '--version') opts.command = 'version';
    else if (a === '--brand') opts.brand = argv[++i];
    else if (a === '--port') opts.port = Number(argv[++i]);
    else if (a === '--no-open') opts.open = false;
    else if (a === '--json') opts.json = true;
    else if (a === '--yes' || a === '-y') opts.yes = true;
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--theme') opts.theme = argv[++i];
    else if (a === '--name') opts.name = argv[++i] ?? '';
    else if (a === '--lang') opts.cardLang = opts.outLang = argv[++i];
    else if (a === 'collect' || a === 'export' || a === 'open' || a === 'card' || a === 'shelf' || a === 'profile' || a === 'publish') opts.command = a;
    else if ((opts.command === 'export' || opts.command === 'profile') && !opts.dir) opts.dir = a;
    else throw new Error(t(`不认识的参数：${a}`, `Unknown argument: ${a}`));
  }
  if (opts.brand && !BRAND_IDS.includes(opts.brand)) throw new Error(t(`不支持的工具：${opts.brand}`, `Unsupported tool: ${opts.brand}`));
  if (!['dark', 'light'].includes(opts.theme)) throw new Error(t(`不支持的配色：${opts.theme}`, `Unsupported theme: ${opts.theme}`));
  if (!['en', 'zh'].includes(opts.cardLang)) throw new Error(t(`不支持的语言：${opts.cardLang}`, `Unsupported language: ${opts.cardLang}`));
  if (opts.command === 'export' && !opts.dir) throw new Error(t('export 需要一个目录', 'export needs a directory'));
  if (opts.command === 'profile' && !opts.dir) throw new Error(t('profile 需要主页仓库的目录', 'profile needs the directory of your profile repository'));
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
  const before = Object.fromEntries(BRAND_IDS.map((id) => [id, readJSON(join(dataHome(), `${id}.json`))?.progress ?? null]));
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

/** 浅色图的文件名：x.png → x-light.png */
const lightPath = (file) => file.replace(/(\.png)?$/i, '-light.png');

/** README 里的图片：浅色主题用浅色图，其余用深色图。 */
const shelfPicture = (dark, light, url = null) => {
  const pic = `<picture><source media="(prefers-color-scheme: light)" srcset="./${light}"><img src="./${dark}" alt="Agent Badges" width="720"></picture>`;
  return `  ${url ? `<a href="${url}">${pic}</a>` : pic}`;
};

/**
 * 陈列图：徽章要用 WebGL 渲染，所以交给浏览器。
 * 打开本地页面 → 页面渲染已解锁的徽章 → 把 PNG 交回这里 → 写文件、退出。
 */
async function writeShelf(data, opts, { snippet = true } = {}) {
  const { summarize } = await import('../src/collect/summary.js');
  const { createReceiver } = await import('../src/collect/receive.js');
  const unlocked = Object.entries(data).reduce((n, [id, d]) => n + summarize(id, d.progress).unlocked, 0);
  if (!unlocked) throw new Error(t('还没有解锁的徽章，陈列图是空的。先多用用 Claude Code 或 Codex 吧', 'No badges unlocked yet, so the shelf would be empty'));

  const file = resolve(opts.out ?? 'agent-badges-shelf.png');
  // 深色、浅色各一张：GitHub 按访客的主题自动切换（浅色图在文件名后加 -light）
  const lightFile = lightPath(file);
  const receiver = createReceiver({ themes: ['dark', 'light'] });
  const { server, port } = await serve(await appHtml(data), opts.port, { handle: receiver.handle });
  const query = new URLSearchParams({ task: 'shelf', nonce: receiver.nonce, shelfLang: opts.cardLang, lang, themes: 'dark,light' });
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
    const { pngs, respond } = await Promise.race([receiver.received, timeout]);
    try {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, pngs.dark);
      writeFileSync(lightFile, pngs.light);
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
  console.log(t(`\n徽章陈列图：${file}\n浅色版：${lightFile}`, `\nShelf saved to ${file}\nLight version: ${lightFile}`));
  if (!snippet) return;
  console.log(t('放进 GitHub 个人主页 README（按访客的深浅主题自动切换）：', 'Add it to your profile README (switches with the visitor\'s theme):'));
  console.log(shelfPicture(basename(file), basename(lightFile)));
}

const PROJECT_SITE = 'https://aryous.github.io/agent-badges/';

/** 公开版徽章墙的 HTML：只放页面上看得到的数据。 */
async function publicPage(data, name) {
  const { publicData } = await import('../src/collect/public.js');
  const { injectData } = await import('../src/collect/inject.js');
  return injectData(appTemplate(), publicData(data), { name, home: PROJECT_SITE });
}

const PUBLISH_STOPS = {
  'no-gh': () => t('需要 GitHub 命令行工具 gh：https://cli.github.com 。装好后运行 gh auth login 登录，再重试。', 'This needs the GitHub CLI (gh): https://cli.github.com. Install it, run gh auth login, then try again.'),
  'not-logged-in': () => t('gh 还没有登录。请运行 gh auth login，在浏览器里完成登录后再重试。', "gh isn't signed in. Run gh auth login, finish signing in in your browser, then try again."),
  'private-repo': (d) => t(`${d} 是私有仓库。GitHub 只会在主页显示公开仓库的 README，请把它改成公开，或者换一种方式。`, `${d} is private. GitHub only shows the README of a public profile repository.`),
  'pages-source': (d) => t(`这个仓库的 GitHub Pages 已经设置成从其他位置发布（${d}）。为了不打乱你的设置，这里不做改动。`, `GitHub Pages on this repository already publishes from somewhere else (${d}). Leaving your settings alone.`),
  'foreign-index': (d) => t(`${d} 已经存在，而且不是 agent-badges 生成的。为了不覆盖你的网页，这里不做改动。可以改用 npx agent-badges shelf 只生成徽章图。`, `${d} already exists and wasn't made by agent-badges, so it won't be overwritten. Use npx agent-badges shelf for the image only.`),
  'pages-error': () => t('GitHub Pages 构建失败，请到仓库的 Actions / Pages 页面查看原因。', 'The GitHub Pages build failed. Check the Pages section of the repository.'),
};

/**
 * 一条命令部署到 GitHub 主页。不带 --yes 时只检查并列出计划（只读）；
 * 在终端里会问一次，Agent 调用时打印计划后退出，等用户同意再带 --yes 运行。
 */
async function writePublish(data, opts) {
  const { createGitHub, preparePublish, executePublish, PublishStop } = await import('../src/collect/publish.js');
  const { dataHome } = await import('../src/collect/common.js');
  const gh = createGitHub();
  try {
    const plan = await preparePublish({ gh, home: dataHome() });
    const readme = {
      create: t('新建 README，只放徽章', 'create the README with your badges'),
      append: t('在 README 最后加上徽章（其他内容不动）', 'add your badges at the end of the README (nothing else changes)'),
      update: t('更新 README 里的徽章（其他内容不动）', 'update your badges in the README (nothing else changes)'),
    }[plan.readme];
    console.log(t('\n部署计划', '\nPlan'));
    console.log(t(`  账号        ${plan.login}`, `  Account     ${plan.login}`));
    console.log(t(`  仓库        ${plan.login}/${plan.login}${plan.createRepo ? '（新建，公开）' : ''}`, `  Repository  ${plan.login}/${plan.login}${plan.createRepo ? ' (new, public)' : ''}`));
    console.log(t(`  README      ${readme}`, `  README      ${readme}`));
    console.log(t(`  网页        ${plan.url}${plan.enablePages ? '（开启 GitHub Pages）' : ''}`, `  Page        ${plan.url}${plan.enablePages ? ' (turns on GitHub Pages)' : ''}`));
    console.log(
      t(
        '  会公开      已解锁的徽章和等级、徽章进度和解锁日期、每天的 Token 用量和对话轮数（热力图）。旧版本会留在 git 历史里。\n              不公开：对话内容、代码、路径、一天中几点在用、模型和工具的名字。',
        '  Public      unlocked badges and tiers, badge progress and unlock dates, daily token counts and turns (the heatmap). Old versions stay in git history.\n              Not public: prompts, code, paths, what hours you work, model and tool names.',
      ),
    );

    if (!opts.yes) {
      if (!process.stdin.isTTY) {
        console.log(t('\n这只是检查，什么都没改。确认后加上 --yes 再运行一次。', '\nNothing has changed yet. Run again with --yes to go ahead.'));
        return;
      }
      const { createInterface } = await import('node:readline/promises');
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = (await rl.question(t('\n继续吗？[y/N] ', '\nGo ahead? [y/N] '))).trim().toLowerCase();
      rl.close();
      if (answer !== 'y' && answer !== 'yes') return console.log(t('已取消，什么都没改。', 'Cancelled. Nothing changed.'));
    }

    const steps = {
      'create-repo': t('新建仓库…', 'Creating the repository…'),
      push: t('推送到 GitHub…', 'Pushing to GitHub…'),
      unchanged: t('徽章没有变化，不需要提交。', 'Nothing changed since last time, so there is nothing to commit.'),
      'enable-pages': t('开启 GitHub Pages…', 'Turning on GitHub Pages…'),
      wait: t('等 GitHub Pages 构建（通常一两分钟）…', 'Waiting for GitHub Pages to build (usually a minute or two)…'),
    };
    const { live } = await executePublish(plan, {
      gh,
      pageHtml: await publicPage(data, opts.name || plan.login),
      renderShelf: (file) => writeShelf(data, { ...opts, out: file }, { snippet: false }),
      log: (step) => console.log(steps[step] ?? step),
    });
    console.log(t(`\n完成。你的主页：${plan.profileUrl}`, `\nDone. Your profile: ${plan.profileUrl}`));
    console.log(
      live
        ? t(`点徽章图会打开：${plan.url}`, `Clicking the badges opens: ${plan.url}`)
        : t(`徽章墙还在构建，过一两分钟再打开：${plan.url}`, `The badge wall is still building. Open it in a minute or two: ${plan.url}`),
    );
  } catch (e) {
    if (e instanceof PublishStop) throw new Error(PUBLISH_STOPS[e.code]?.(e.detail) ?? e.message);
    throw e;
  }
}

/**
 * 个人主页：往主页仓库写两样东西，一起提交、一起推送。
 *   index.html               公开版徽章墙（开启 GitHub Pages 后可访问）
 *   agent-badges-shelf.png   README 里的徽章图，点它跳到上面的网页
 * 不改 README，不提交，不推送。
 */
async function writeProfile(data, opts) {
  const { pagesForDir } = await import('../src/collect/public.js');
  const dir = resolve(opts.dir);
  if (!existsSync(dir)) throw new Error(t(`目录不存在：${dir}`, `No such directory: ${dir}`));
  const pages = pagesForDir(dir);
  const page = join(dir, 'index.html');
  writeFileSync(page, await publicPage(data, opts.name || pages?.owner || ''));
  console.log(t(`\n公开版徽章墙：${page}`, `\nPublic badge wall: ${page}`));
  await writeShelf(data, { ...opts, out: join(dir, 'agent-badges-shelf.png') }, { snippet: false });

  const url = pages?.url ?? 'https://<you>.github.io/<repo>/';
  console.log(t('\nREADME 里这样写，点图片就会打开徽章墙：', '\nIn the README, link the image to the badge wall:'));
  console.log(shelfPicture('agent-badges-shelf.png', 'agent-badges-shelf-light.png', url));
  console.log(
    t(
      `\n网页会公开你每天的 Token 用量和对话轮数（热力图）、徽章进度和解锁日期；推送后旧版本会留在 git 历史里。\n第一次需要开启 GitHub Pages：仓库 Settings → Pages → Deploy from a branch → main / (root)`,
      `\nThe page makes your daily token counts and turns (the heatmap), badge progress and unlock dates public, and old versions stay in git history.\nFirst time only, turn on GitHub Pages: repo Settings → Pages → Deploy from a branch → main / (root)`,
    ),
  );
  if (pages) console.log(`  gh api -X POST repos/${pages.owner}/${pages.repo}/pages -f 'source[branch]=main' -f 'source[path]=/'`);
  console.log(t('然后提交并推送这两个文件。', 'Then commit and push both files.'));
}

function appTemplate() {
  if (!existsSync(APP)) throw new Error(t('没有找到页面文件，请先运行 npm run build', 'App not built. Run npm run build first.'));
  return readFileSync(APP, 'utf8');
}

function appHtml(data) {
  const html = appTemplate();
  return import('../src/collect/inject.js').then(({ injectData }) => injectData(html, data));
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
  if (opts.command === 'profile') return writeProfile(data, opts);
  if (opts.command === 'publish') return writePublish(data, opts);

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
