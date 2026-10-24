import { createBadgeRenderer } from '../viewer/badge-renderer.js';
import { forEachFrame } from '../viewer/frame.js';
import { renderCoin } from '../viewer/coin.js';

const THUMB_SIZE = 480;

/**
 * 逐枚渲染缩略图，每枚之间让出一帧，页面不会卡住。
 * inspect：单枚查看面板。查看时陈列墙被挡住，缩略图先停下，关上后再接着画，
 * 不和正在转动的那枚抢主线程和显卡。徽章用 ensureBuilt 组装，画完留着给单枚查看用。
 */
export async function renderThumbnails(ctx, { grid, profile, inspect }) {
  const renderer = createBadgeRenderer(ctx.stage);
  // 进度铸币排在缩略图前面：它在第一屏。画不出来就留着兜底的刻度环
  try {
    profile.setCoin(renderCoin(renderer, ctx.brand, { unlocked: profile.unlocked, total: profile.total, lang: ctx.lang }));
  } catch (err) {
    console.warn('进度铸币渲染失败，改用刻度环', err);
  }
  await forEachFrame(
    ctx.items,
    (item) => {
      ctx.ensureBuilt(item);
      const src = renderer.snapshot(item, { size: THUMB_SIZE, fill: 0.92 });
      grid.setThumbnail(item, src);
      profile.setThumbnail(item.config.id, src);
      item.thumb = src;
    },
    { pause: inspect.whenClosed },
  );
}
