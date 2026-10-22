import { createBadgeRenderer } from '../viewer/badge-renderer.js';
import { forEachFrame } from '../viewer/frame.js';

const THUMB_SIZE = 480;

/**
 * 逐枚渲染缩略图，每枚之间让出一帧，页面不会卡住。
 * inspect：单枚查看面板。查看时陈列墙被挡住，缩略图先停下，关上后再接着画，
 * 不和正在转动的那枚抢主线程和显卡。徽章用 ensureBuilt 组装，画完留着给单枚查看用。
 */
export async function renderThumbnails(ctx, { grid, profile, inspect }) {
  const renderer = createBadgeRenderer(ctx.stage);
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
