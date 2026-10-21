// shelf 命令：在浏览器里渲染已解锁的徽章，保存为 PNG。
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { lang, t } from '../i18n.js';
import { openBrowser, serve } from '../server.js';
import { appHtml } from '../app.js';

const SHELF_TIMEOUT = 120_000;

/** 浅色图的文件名：x.png → x-light.png */
export const lightPath = (file) => file.replace(/(\.png)?$/i, '-light.png');

/** README 里的图片：浅色主题用浅色图，其余用深色图。 */
export const shelfPicture = (dark, light, url = null) => {
  const pic = `<picture><source media="(prefers-color-scheme: light)" srcset="./${light}"><img src="./${dark}" alt="Agent Badges" width="720"></picture>`;
  return `  ${url ? `<a href="${url}">${pic}</a>` : pic}`;
};

/**
 * 陈列图：徽章要用 WebGL 渲染，所以交给浏览器。
 * 打开本地页面 → 页面渲染已解锁的徽章 → 把 PNG 交回这里 → 写文件、退出。
 */
export async function writeShelf(data, opts, { snippet = true } = {}) {
  const { summarize } = await import('../../collect/summary.js');
  const { createReceiver } = await import('../../collect/receive.js');
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
