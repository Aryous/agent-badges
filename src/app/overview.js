import { createHeatmap } from '../viewer/heatmap.js';
import { createProfile } from '../viewer/profile.js';
import { createCompletionistCoin } from '../viewer/completionist.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 档案卡 + 热力图。点击徽章、解锁标记、分享和主页图按钮都通过事件交给对应面板。
 * 全解锁徽章在这里挂上：它自带舞台，不等缩略图，页面一出来就能播进场。
 * 切换工具是整页跳转，新页面按新工具重新组装；卸载时 profile.disposeCoin() 交还 WebGL 上下文。
 */
export function mount(ctx, { heatSeries, markers, currentDaily }) {
  const { $, items, PUBLIC } = ctx;
  const profile = createProfile({
    root: $('#profile-slot'),
    items,
    daily: currentDaily,
    onSelect: (item, viaKeyboard) => ctx.emit('open', item, { viaKeyboard }),
    onShare: (e) => ctx.emit('poster', { viaKeyboard: e?.detail === 0 }),
    onShelf: (e) => ctx.emit('shelf', { viaKeyboard: e?.detail === 0 }),
  });
  // 「GitHub 主页图」是给本人用的，公开版不显示
  if (PUBLIC) profile.el.querySelector('[data-shelf]').hidden = true;
  profile.mountCoin(({ canvas, target }) =>
    createCompletionistCoin({ canvas, target, kit: ctx.completionist, brand: ctx.brand, unlocked: profile.unlocked, total: profile.total, reducedMotion }),
  );
  const heatmap = createHeatmap({
    root: $('#heat-slot'),
    series: heatSeries,
    markers,
    onMarker: (m) => ctx.emit('open', items.find((it) => it.config.id === m.id)),
  });
  return { profile, heatmap };
}
