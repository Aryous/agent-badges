import './style.css';
import { applyStatic, t } from './viewer/i18n.js';
import { supportsWebGL } from './viewer/scene.js';
import { createInspector } from './viewer/inspector.js';
import { createContext, fatal, showNotice } from './app/context.js';
import { mountTopbar } from './app/topbar.js';
import { loadAll } from './app/load.js';
import { createItems } from './app/badges.js';
import * as overview from './app/overview.js';
import * as wall from './app/wall.js';
import { renderThumbnails } from './app/thumbnails.js';
import * as poster from './app/poster.js';
import * as shelf from './app/shelf.js';
import * as exportPanel from './app/export-panel.js';
import { createLoop } from './app/loop.js';
import * as inspect from './app/inspect.js';
import { expose } from './app/automation.js';

// 页面入口：按顺序挂好各面板。面板之间不互相引用，通过 ctx 的事件通信。
async function main() {
  const ctx = createContext();
  applyStatic();
  const topbar = mountTopbar(ctx);
  if (!supportsWebGL()) {
    fatal(t('app.noWebGL'));
    return;
  }

  const data = await loadAll(ctx);
  if (data.notices.length) showNotice(data.notices.join('\n'));
  topbar.showSource();
  createItems(ctx, data.valid, data.progress);

  const { profile, heatmap } = overview.mount(ctx, data);
  const { grid, setFilter } = wall.mount(ctx);
  // 海报要等缩略图：先建好这个承诺交给海报，真正开始渲染放在所有面板挂好之后
  let startThumbs;
  const thumbsDone = new Promise((resolve, reject) => {
    startThumbs = (deps) => renderThumbnails(ctx, deps).then(resolve, reject);
  });
  const posterPanel = poster.mount(ctx, { thumbsDone, profile, heatmap, ...data });
  const shelfPanel = shelf.mount(ctx);
  // 窗口 keydown 的注册顺序：海报、主页图、单枚查看
  const inspector = createInspector({ stage: ctx.stage });
  const exporter = exportPanel.mount(ctx, inspector);
  const loop = createLoop(ctx, inspector);
  const inspectPanel = inspect.mount(ctx, { inspector, exportPanel: exporter, loop });

  startThumbs({ grid, profile, inspect: inspectPanel });
  const app = expose(ctx, { inspector, inspect: inspectPanel, exportPanel: exporter, poster: posterPanel, shelf: shelfPanel, wall: { setFilter }, heatmap });

  // 支持通过 #徽章id 直接打开某一枚；命令行 ?task=shelf 打开时自动生成主页图
  const fromHash = ctx.items.find((it) => `#${it.config.id}` === location.hash);
  if (fromHash) inspectPanel.open(fromHash);
  if (ctx.task) shelfPanel.open();

  await thumbsDone;
  app.ready = true;
}

main().catch((e) => {
  console.error(e);
  fatal(t('app.loadFailed', { msg: e.message }));
});
