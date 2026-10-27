// 下载导出的图片。徽章快照的渲染在 snapshot.js。

/** 下载一个地址（data URL 或 blob URL）。 */
export function downloadURL(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
