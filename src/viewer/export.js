import { Color } from 'three';
import { FOV } from './scene.js';

// 导出 PNG：把主画布临时放大到 2048×2048，以当前角度渲染一帧后截取。
// 直接用主画布而不是离屏 render target，是因为 three 只在画到屏幕时
// 做色调映射和 sRGB 转换，离屏渲染出来的颜色会和屏幕上不一致。

/** 徽章占导出画面的比例；页面上的导出预览框也按这个比例绘制。 */
export const EXPORT_FILL = 0.84;

export function renderBadgePNG({ stage, items, item, background = null, size = 2048, fill = EXPORT_FILL }) {
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

    renderer.setPixelRatio(1);
    renderer.setSize(size, size, false);
    renderer.render(scene, camera);
    return canvas.toDataURL('image/png');
  } finally {
    items.forEach((it, i) => (it.holder.visible = saved.visible[i]));
    scene.background = saved.background;
    camera.position.copy(saved.position);
    camera.quaternion.copy(saved.quaternion);
    renderer.setPixelRatio(saved.pixelRatio);
    stage.resize(); // 恢复画布尺寸和相机宽高比
  }
}

export function downloadDataURL(dataURL, filename) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
