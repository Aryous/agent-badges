import { renderBadgePNG } from '../viewer/snapshot.js';
import { nextFrame } from '../viewer/frame.js';

const THUMB_SIZE = 480;

/**
 * 逐枚渲染缩略图，每枚之间让出一帧，页面不会卡住。
 * inspect：单枚查看面板（isOpen、current），正在查看的那枚跳过、渲染时先藏起来。
 */
export async function renderThumbnails(ctx, { grid, profile, inspect }) {
  const { items, stage, ensureBuilt } = ctx;
  for (const item of items) {
    ensureBuilt(item);
    if (inspect.isOpen && inspect.current === item) continue;
    item.holder.position.set(0, 0, 0);
    item.holder.scale.setScalar(1);
    item.pivot.rotation.set(0, 0, 0);
    // 正在单枚查看的徽章也在场景里，渲染缩略图时先藏起来
    const live = inspect.current?.holder;
    if (live) live.visible = false;
    stage.scene.add(item.holder);
    const src = renderBadgePNG({ stage, items: [item], item, size: THUMB_SIZE, fill: 0.92 });
    stage.scene.remove(item.holder);
    if (live) live.visible = true;
    grid.setThumbnail(item, src);
    profile.setThumbnail(item.config.id, src);
    item.thumb = src;
    await nextFrame();
  }
}
