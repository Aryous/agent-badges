// 命令行参数和帮助文本。所有 --flag 字面量都在这里。
import { BRAND_IDS } from '../brands/index.js';
import { pkg } from './paths.js';
import { t } from './i18n.js';

export const THEMES = ['dark', 'light'];
export const LANGS = ['en', 'zh'];

export const HELP = t(
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
  if (!THEMES.includes(opts.theme)) throw new Error(t(`不支持的配色：${opts.theme}`, `Unsupported theme: ${opts.theme}`));
  if (!LANGS.includes(opts.cardLang)) throw new Error(t(`不支持的语言：${opts.cardLang}`, `Unsupported language: ${opts.cardLang}`));
  if (opts.command === 'export' && !opts.dir) throw new Error(t('export 需要一个目录', 'export needs a directory'));
  if (opts.command === 'profile' && !opts.dir) throw new Error(t('profile 需要主页仓库的目录', 'profile needs the directory of your profile repository'));
  return opts;
}
