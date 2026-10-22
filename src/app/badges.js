import { createStage } from '../viewer/scene.js';
import { mountBadge } from '../viewer/mount-badge.js';
import { createAccumulator } from '../viewer/accumulate.js';
import { Tweens } from '../viewer/anim.js';

/** 建好 3D 舞台和徽章列表，挂到 ctx 上。 */
export function createItems(ctx, valid, progress) {
  const { $, brand, lang } = ctx;
  const stage = createStage($('#stage'));
  const items = valid.map((config) => ({ config, state: progress[config.id], badge: null, pivot: null, holder: null }));
  Object.assign(ctx, {
    stage,
    accum: createAccumulator(stage, $('#stage-accum')),
    tweens: new Tweens(),
    items,
    progress,
    /** 按需组装 3D 徽章；缩略图和单枚查看共用同一份。背面刻字先挂占位贴图，打开时才生成（缩略图只拍正面）。 */
    ensureBuilt(item) {
      if (item.holder) return item;
      return Object.assign(item, mountBadge(item.config, brand, item.state, { stage, lang, engraving: 0 }));
    },
  });
  return items;
}
