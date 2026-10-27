import { COMPLETIONIST_ID } from '../brands/shared/completionist.js';

/**
 * 供自动化验证使用的小接口 window.__badgeApp（scripts/shoot.mjs、peek.mjs、check-shelf.mjs、assets.mjs、check-site.mjs 在用）。
 * face、spin、posterURL、posterMode、posterReady、posterRenders、shelfURL 是 getter，每次读都取最新值。ready 由调用方在缩略图完成后置为 true。
 * ids 只有陈列墙的徽章；open('completionist') 打开概览区的全解锁徽章，和点它一样（它不在 ctx.items 里）。
 */
export function expose(ctx, { inspector, inspect, exportPanel, poster, shelf, wall, heatmap, coinItem }) {
  const { items } = ctx;
  window.__badgeApp = {
    ready: false,
    ids: items.map((it) => it.config.id),
    open: (id, opts) => inspect.open(id === COMPLETIONIST_ID && coinItem ? coinItem : items.find((it) => it.config.id === id), opts),
    close: inspect.close,
    setAngle(a) {
      inspector.spin.angle = a;
      inspector.spin.vel = 0;
    },
    /** 把徽章钉在某个角度（不吸附），用于检查斜角下的材质。 */
    hold(angle, tilt = 0) {
      inspector.override.active = true;
      inspector.override.z = 0;
      inspector.override.scaleMul = 1;
      inspector.spin.angle = angle;
      inspector.spin.tilt = tilt;
    },
    get face() {
      return inspector.face;
    },
    get spin() {
      return { ...inspector.spin };
    },
    exportPNG: (bg) => exportPanel.exportCurrent(bg, { download: false }),
    openPoster: poster.open,
    get posterURL() {
      return poster.url;
    },
    posterModes: poster.modes,
    get posterMode() {
      return poster.mode;
    },
    get posterReady() {
      return poster.ready;
    },
    get posterRenders() {
      return poster.renders;
    },
    setPosterMode: (m) => poster.setMode(m),
    openShelf: shelf.open,
    get shelfURL() {
      return shelf.url;
    },
    setFilter: wall.setFilter,
    heatmap,
  };
  return window.__badgeApp;
}
