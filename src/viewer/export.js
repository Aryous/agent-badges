// 下载导出的图片。徽章快照的渲染在 snapshot.js，这里再导出一次，兼容旧的引用路径。
export { EXPORT_FILL, renderBadgePNG } from './snapshot.js';

export function downloadDataURL(dataURL, filename) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
