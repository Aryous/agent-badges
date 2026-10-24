import { createHeatmap } from '../viewer/heatmap.js';
import { createProofSet } from '../viewer/proof-set.js';
import { createProfile } from '../viewer/profile.js';
import { completionistItem, createCompletionistCoin } from '../viewer/completionist.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 档案卡 + 热力图。点击徽章、解锁标记、分享和主页图按钮都通过事件交给对应面板。
 * 全解锁徽章在这里挂上：它自带舞台，不等缩略图；但不挤在首屏的同步流程里，等陈列墙挂好、浏览器空闲时再组装，
 * 之前先显示刻度环。切换工具是整页跳转，新页面按新工具重新组装；WebGL 上下文丢了时 profile.disposeCoin() 换回刻度环。
 * 点开它时用一个临时 item 打开单枚查看：不在 ctx.items 里，陈列墙、总数、海报都不算它。
 */
export function mount(ctx, { heatSeries, markers, currentDaily }) {
  const { $, items, PUBLIC } = ctx;
  // 3D 模型第一次打开时才组装（ensureBuilt），之后留着复用
  const coinItem = items.length ? completionistItem(ctx.completionist, items) : null;
  const profile = createProfile({
    root: $('#profile-slot'),
    items,
    daily: currentDaily,
    onSelect: (item, viaKeyboard) => ctx.emit('open', item, { viaKeyboard }),
    onCoin: coinItem ? (viaKeyboard) => ctx.emit('open', coinItem, { viaKeyboard }) : null,
    onShare: (e) => ctx.emit('poster', { viaKeyboard: e?.detail === 0 }),
    onShelf: (e) => ctx.emit('shelf', { viaKeyboard: e?.detail === 0 }),
  });
  // 「GitHub 主页图」是给本人用的，公开版不显示
  if (PUBLIC) profile.el.querySelector('[data-shelf]').hidden = true;
  const mountCoin = () =>
    profile.mountCoin(({ canvas, target, onLost }) =>
      createCompletionistCoin({ canvas, target, kit: ctx.completionist, brand: ctx.brand, unlocked: profile.unlocked, total: profile.total, reducedMotion, onLost }),
    );
  // 本轮同步流程（陈列墙挂上）走完、浏览器空闲时再组装；没有 requestIdleCallback 就排到下一轮
  if (typeof requestIdleCallback === 'function') requestIdleCallback(mountCoin, { timeout: 500 });
  else setTimeout(mountCoin, 1);
  // 关上单枚查看时焦点回到铸币
  if (coinItem) coinItem.tile = profile.coinEl;
  // 单枚查看挡住了概览区：铸币先停下，完全关上后再接着画
  ctx.on('inspecting', (open) => (open ? profile.pauseCoin() : profile.resumeCoin()));
  const heatmap = createHeatmap({
    root: $('#heat-slot'),
    series: heatSeries,
    markers,
    onMarker: (m) => ctx.emit('open', items.find((it) => it.config.id === m.id)),
    reducedMotion,
  });
  // 年度铸币套装藏在热力图板子下面（落地页不挂）
  const proofSet = createProofSet({ heatmap, palette: ctx.brand.palette, reducedMotion });
  return { profile, heatmap, coinItem, proofSet };
}
