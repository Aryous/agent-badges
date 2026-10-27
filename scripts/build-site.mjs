// 组装 GitHub Pages 站点：落地页改名为 index.html，徽章墙复制到 demo/。
// 演示页不注入任何数据，自动显示示例数据。
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

const SITE = 'dist-site';
if (!existsSync('dist/index.html')) throw new Error('先运行 vite build 生成 dist/index.html');
renameSync(`${SITE}/landing.html`, `${SITE}/index.html`);
mkdirSync(`${SITE}/demo`, { recursive: true });
copyFileSync('dist/index.html', `${SITE}/demo/index.html`);
// 演示页里不能有任何本机数据
const demo = readFileSync(`${SITE}/demo/index.html`, 'utf8');
if (demo.includes('__AGENT_BADGES_DATA__ =')) throw new Error('演示页里混进了本机数据');
if (demo.includes('__AGENT_BADGES_IDENTITY__ =')) throw new Error('演示页里混进了头像或用户名');
writeFileSync(`${SITE}/.nojekyll`, '');
console.log(`${SITE}/ ready: index.html (landing) + demo/index.html`);
