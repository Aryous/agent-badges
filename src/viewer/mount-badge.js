import { Group } from 'three';
import { buildBadge } from '../engine/badge.js';

// 把一枚徽章装进 pivot / holder 两层空节点：
//   holder 管位置和大小，pivot 管旋转，badge 本身不动。
// 不加进场景，也不设位置角度，这些由调用方决定。

/**
 * @param {object} config  徽章配置
 * @param {object} brand
 * @param {object} state   该徽章的进度
 * @param {{ stage, lang?: 'en' | 'zh', engraving?: number }} opts
 *   stage：给徽章套上它的环境贴图；engraving：背面刻字贴图边长（不传用 1024；0 表示先挂占位贴图）
 * @returns {{ badge, pivot, holder }}
 */
export function mountBadge(config, brand, state, { stage, lang = 'zh', engraving } = {}) {
  const badge = buildBadge(config, brand, state, { lang, engraving });
  stage.applyEnvironment(badge);
  const pivot = new Group();
  const holder = new Group();
  pivot.add(badge);
  holder.add(pivot);
  return { badge, pivot, holder };
}
