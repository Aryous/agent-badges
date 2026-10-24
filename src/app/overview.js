import { createHeatmap } from '../viewer/heatmap.js';
import { createProfile } from '../viewer/profile.js';
import { completionistItem, createCompletionistCoin } from '../viewer/completionist.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 档案卡 + 热力图。点击徽章、解锁标记、分享和主页图按钮都通过事件交给对应面板。
 * 全解锁徽章在这里挂上：它自带舞台，不等缩略图，页面一出来就能播进场。
 * 切换工具是整页跳转，新页面按新工具重新组装；卸载时 profile.disposeCoin() 交还 WebGL 上下文。
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
    onCoin: (viaKeyboard) => coinItem && ctx.emit('open', coinItem, { viaKeyboard }),
    onShare: (e) => ctx.emit('poster', { viaKeyboard: e?.detail === 0 }),
    onShelf: (e) => ctx.emit('shelf', { viaKeyboard: e?.detail === 0 }),
  });
  // 「GitHub 主页图」是给本人用的，公开版不显示
  if (PUBLIC) profile.el.querySelector('[data-shelf]').hidden = true;
  profile.mountCoin(({ canvas, target }) =>
    createCompletionistCoin({ canvas, target, kit: ctx.completionist, brand: ctx.brand, unlocked: profile.unlocked, total: profile.total, reducedMotion }),
  );
  // 关上单枚查看时焦点回到铸币
  if (coinItem) coinItem.tile = profile.coinEl;
  // 单枚查看挡住了概览区：铸币先停下，完全关上后再接着画
  ctx.on('inspecting', (open) => (open ? profile.pauseCoin() : profile.resumeCoin()));
  const heatmap = createHeatmap({
    root: $('#heat-slot'),
    series: heatSeries,
    markers,
    onMarker: (m) => ctx.emit('open', items.find((it) => it.config.id === m.id)),
  });
  return { profile, heatmap, coinItem };
}
