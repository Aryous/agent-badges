import { lang } from '../viewer/i18n.js';
import { selectBrand } from './brand-select.js';

// 页面共用的上下文：地址参数、当前工具和它的徽章，加载完成后再挂上舞台和徽章列表。
// 面板之间不互相引用，通过 ctx.emit / ctx.on 通信，事件有：
//   'open'（item, opts）单枚查看  'poster'（opts）分享海报  'shelf'（opts）GitHub 主页图
//   'inspecting'（true / false）单枚查看打开 / 完全关上（关闭动画播完）

export const $ = (sel, root = document) => root.querySelector(sel);

export function showNotice(text) {
  const el = $('#notice');
  el.textContent = text;
  el.hidden = false;
}

export function fatal(text) {
  document.body.innerHTML = `<div class="fatal">${text}</div>`;
}

/** 命令行 npx agent-badges shelf 会带着 ?task=shelf&nonce=… 打开页面；themes：要哪几张（主页图要深色、浅色两张）。 */
function shelfTask(params) {
  if (params.get('task') !== 'shelf') return null;
  return { nonce: params.get('nonce') ?? '', themes: (params.get('themes') ?? 'dark').split(',').filter((x) => ['dark', 'light'].includes(x)) };
}

export function createContext() {
  const params = new URLSearchParams(location.search);
  const handlers = new Map();
  return {
    params,
    lang,
    // 公开版（npx agent-badges profile 生成、放在 GitHub Pages 上给别人看）：文字改成「某某的徽章」
    PUBLIC: window.__AGENT_BADGES_PUBLIC__ ?? null,
    // 用户同意后命令行注入的 GitHub 登录名和头像（data URL）；没同意、开发服务器、演示站都是 null
    identity: window.__AGENT_BADGES_IDENTITY__ ?? null,
    // 页面带着本机数据：命令行打开的本机页、公开页和开发服务器都是。海报弹窗据此提示可以加头像（公开页另由 PUBLIC 挡掉）
    localData: Boolean(window.__AGENT_BADGES_DATA__) && params.get('source') !== 'mock',
    forceMock: params.get('source') === 'mock',
    ...selectBrand(params, window.__AGENT_BADGES_DATA__),
    task: shelfTask(params),
    // 以下由 createItems 在数据加载完成后填上
    items: null,
    progress: null,
    stage: null,
    tweens: null,
    accum: null,
    ensureBuilt: null,
    $,
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event).push(fn);
    },
    emit(event, ...args) {
      for (const fn of handlers.get(event) ?? []) fn(...args);
    },
  };
}
