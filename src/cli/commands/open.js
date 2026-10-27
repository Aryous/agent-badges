// open / export 命令：打开本地徽章墙，或导出可离线打开的静态网页。
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { t } from '../i18n.js';
import { openBrowser, serve } from '../server.js';
import { appHtml } from '../page.js';

async function identity() {
  const { dataHome } = await import('../../collect/common.js');
  const { pageIdentity } = await import('../../share/identity.js');
  return pageIdentity(dataHome());
}

export async function exportPage(opts, data) {
  const html = await appHtml(data, await identity());
  const dir = resolve(opts.dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  console.log(t(`已导出到 ${join(dir, 'index.html')}（含你的统计数字，分享前请留意）`, `Exported to ${join(dir, 'index.html')} (contains your stats; mind this before sharing)`));
}

export async function open(opts, data) {
  // 第一次在终端里打开时问一次要不要头像（非终端不问）
  await (await import('./avatar.js')).maybeAskAvatar();
  const html = await appHtml(data, await identity());
  const { port } = await serve(html, opts.port);
  const query = opts.brand ? `?brand=${opts.brand}` : '';
  const url = `http://127.0.0.1:${port}/${query}`;
  console.log(t(`\n徽章墙：${url}（按 Ctrl+C 退出）`, `\nBadge wall: ${url} (Ctrl+C to quit)`));
  if (opts.open) openBrowser(url);
}
