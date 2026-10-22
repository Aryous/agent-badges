import { renderBadgePNG } from '../viewer/snapshot.js';
import { nextFrame } from '../viewer/frame.js';

const THUMB_SIZE = 480;

/**
 * 逐枚渲染缩略图，每枚之间让出一帧，页面不会卡住。
 * inspect：单枚查看面板。查看时陈列墙被挡住，缩略图先停下，关上后再接着画，
 * 不和正在转动的那枚抢主线程和显卡。
 */
export async function renderThumbnails(ctx, { grid, profile, inspect }) {
  const { items, stage, ensureBuilt } = ctx;
  for (const item of items) {
    await inspect.whenClosed();
    ensureBuilt(item);
    item.holder.position.set(0, 0, 0);
    item.holder.scale.setScalar(1);
    item.pivot.rotation.set(0, 0, 0);
    stage.scene.add(item.holder);
    const src = renderBadgePNG({ stage, items: [item], item, size: THUMB_SIZE, fill: 0.92 });
    stage.scene.remove(item.holder);
    grid.setThumbnail(item, src);
    profile.setThumbnail(item.config.id, src);
    item.thumb = src;
    await nextFrame();
  }
}
