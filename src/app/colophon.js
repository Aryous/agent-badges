/* global __APP_VERSION__ */
/** 页脚：版本号由构建时注入（vite.config.js 的 define）；没经过 Vite 时（例如直接用 node 跑）不显示版本号。 */
export function mountColophon(ctx) {
  const el = ctx.$('[data-version]');
  if (!el) return;
  if (typeof __APP_VERSION__ === 'string') el.textContent = `v${__APP_VERSION__}`;
  else el.hidden = el.previousElementSibling.hidden = true; // 连同前面的分隔点一起藏起来
}
