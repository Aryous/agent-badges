import { disposeBadge } from '../engine/badge.js';
import { createStage } from './scene.js';
import { renderBadgePNG } from './snapshot.js';
import { mountBadge } from './mount-badge.js';

// 把徽章画成图片（PNG data URL）的唯一入口：陈列墙缩略图、落地页画廊、主页图、素材工作台、宣传片都走这里。
// 单枚查看的实时画面和「导出 PNG」画的是正在查看的那一枚，不归这里（见 app/inspect.js、app/export-panel.js）。

/** 建在不显示的画布上的舞台，只用来截图；绘图缓冲由截图按需放大（见 snapshot.js）。 */
function offscreenStage() {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.display = 'none';
  document.body.appendChild(canvas);
  return createStage(canvas);
}

/**
 * @param {object} [stage]  createStage 的结果；不给就自己建一个离屏舞台
 */
export function createBadgeRenderer(stage = offscreenStage()) {
  /**
   * 画一枚已经组装好的徽章（mountBadge 的结果）：摆到原点、按角度转好，截一张图，再移出场景。
   * @param {{ badge, pivot, holder }} item
   * @param {{ size?: number, fill?: number, angle?: number, tilt?: number, background?: string | null }} [opts]
   * @returns {string}
   */
  function snapshot(item, { size, fill, angle = 0, tilt = 0, background = null } = {}) {
    item.holder.position.set(0, 0, 0);
    item.holder.scale.setScalar(1);
    item.pivot.rotation.set(tilt, angle, 0);
    stage.scene.add(item.holder);
    try {
      return renderBadgePNG({ stage, items: [item], item, size, fill, background });
    } finally {
      stage.scene.remove(item.holder);
    }
  }

  /**
   * 临时组装一枚徽章，画完立即释放它独占的显卡资源。
   * opts：snapshot 的选项，另加 lang（背面刻字语言）和 engraving（刻字贴图边长）。
   * @returns {string}
   */
  function image(config, brand, state, { lang, engraving, ...shot } = {}) {
    const item = mountBadge(config, brand, state, { stage, lang, engraving });
    try {
      return snapshot(item, shot);
    } finally {
      disposeBadge(item.badge);
    }
  }

  return { stage, snapshot, image };
}
