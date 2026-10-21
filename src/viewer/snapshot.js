import { Color } from 'three';
import { FOV } from './scene.js';

// 徽章快照：把主画布临时放大，以当前角度渲染一帧后截取。
// 直接用主画布而不是离屏 render target，是因为 three 只在画到屏幕时
// 做色调映射和 sRGB 转换，离屏渲染出来的颜色会和屏幕上不一致。
//
// 超采样：先按 2 倍尺寸渲染，再缩小到目标尺寸。显卡自带的多重采样只照顾几何边缘，
// 金属倒角上很细的高光、细描边、凸起文字的边缘仍会出台阶；多算一倍像素再平均就顺了。

/** 渲染画布的边长上限：再大部分显卡会吃不消。 */
const MAX_RENDER = 4096;

/** 徽章占导出画面的比例；页面上的导出预览框也按这个比例绘制。 */
export const EXPORT_FILL = 0.84;

export function renderBadgePNG({ stage, items, item, background = null, size = 2048, fill = EXPORT_FILL, supersample = 2 }) {
  const { renderer, scene, camera } = stage;
  const canvas = renderer.domElement;

  const saved = {
    pixelRatio: renderer.getPixelRatio(),
    position: camera.position.clone(),
    quaternion: camera.quaternion.clone(),
    background: scene.background,
    visible: items.map((it) => it.holder.visible),
  };

  try {
    items.forEach((it) => (it.holder.visible = it === item));
    scene.background = background ? new Color(background) : null;

    // 让徽章占画面 fill 比例
    const radius = item.holder.scale.x * 1.06;
    const dist = radius / (Math.tan(((FOV / 2) * Math.PI) / 180) * fill);
    camera.position.set(item.holder.position.x, item.holder.position.y, item.holder.position.z + dist);
    camera.lookAt(item.holder.position);
    camera.aspect = 1;
    camera.updateProjectionMatrix();

    const limit = Math.min(MAX_RENDER, renderer.capabilities.maxTextureSize ?? MAX_RENDER);
    const ss = Math.max(1, Math.min(supersample, Math.floor(limit / size)));
    renderer.setPixelRatio(1);
    renderer.setSize(size * ss, size * ss, false);
    renderer.render(scene, camera);
    if (ss === 1) return canvas.toDataURL('image/png');
    // 必须在同一个任务里取走画面：WebGL 画布默认不保留上一帧
    return downscale(canvas, size).toDataURL('image/png');
  } finally {
    items.forEach((it, i) => (it.holder.visible = saved.visible[i]));
    scene.background = saved.background;
    camera.position.copy(saved.position);
    camera.quaternion.copy(saved.quaternion);
    renderer.setPixelRatio(saved.pixelRatio);
    stage.resize(); // 恢复画布尺寸和相机宽高比
  }
}

/** 高质量缩小：每次缩一半，最后一步缩到目标尺寸，比一步到位更细腻。 */
function downscale(source, size) {
  let src = source;
  let w = source.width;
  while (w / 2 >= size) {
    const next = document.createElement('canvas');
    next.width = next.height = Math.round(w / 2);
    const g = next.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, next.width, next.height);
    src = next;
    w = next.width;
  }
  if (w === size) return src;
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const g = out.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, size, size);
  return out;
}
