// 组装 GitHub Pages 站点：落地页改名为 index.html，徽章墙复制到 demo/。
// 演示页不注入任何数据，自动显示示例数据。
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { personalDataIn } from './demo-guard.mjs';

const SITE = 'dist-site';
if (!existsSync('dist/index.html')) throw new Error('先运行 vite build 生成 dist/index.html');
renameSync(`${SITE}/landing.html`, `${SITE}/index.html`);
mkdirSync(`${SITE}/demo`, { recursive: true });
copyFileSync('dist/index.html', `${SITE}/demo/index.html`);
// 演示页里不能有任何本机数据
const leak = personalDataIn(readFileSync(`${SITE}/demo/index.html`, 'utf8'));
if (leak) throw new Error(leak);
writeFileSync(`${SITE}/.nojekyll`, '');
console.log(`${SITE}/ ready: index.html (landing) + demo/index.html`);
