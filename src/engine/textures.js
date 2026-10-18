import { CanvasTexture, DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RGBAFormat, SRGBColorSpace } from 'three';

// 程序化贴图。贴图 UV 约定：徽章正面 (x, y) ∈ [-1, 1] 映射到 [0, 1]。
// 只能在浏览器中调用（依赖 canvas）。

const cache = new Map();

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/** 可复现的伪随机数，保证每次生成的拉丝纹理相同。 */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 画同心圆拉丝纹理（灰度）。供凹凸贴图和粗糙度贴图共用。 */
export function drawBrushedRings(ctx, size, { base = 168, spread = 70, seed = 7 } = {}) {
  const rand = rng(seed);
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const maxR = size * 0.72;
  for (let r = 1; r < maxR; r += 0.8 + rand() * 1.4) {
    const g = Math.round(base + (rand() - 0.5) * spread);
    ctx.strokeStyle = `rgba(${g},${g},${g},${0.35 + rand() * 0.5})`;
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** 拉丝灰度贴图（线性空间）。 */
export function brushedTexture(size = 1024) {
  const key = `brushed-${size}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = makeCanvas(size);
  drawBrushedRings(canvas.getContext('2d'), size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = NoColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/**
 * 各向异性方向贴图：方向沿同心圆切线，让高光呈放射状的「光束」，
 * 这是车削/拉丝金属最有辨识度的特征。
 */
export function radialAnisotropyTexture(size = 256) {
  const key = `aniso-${size}`;
  if (cache.has(key)) return cache.get(key);
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) / size * 2 - 1;
      const y = (j + 0.5) / size * 2 - 1;
      const r = Math.hypot(x, y) || 1;
      const k = (j * size + i) * 4;
      data[k] = Math.round(((-y / r) * 0.5 + 0.5) * 255);
      data[k + 1] = Math.round(((x / r) * 0.5 + 0.5) * 255);
      data[k + 2] = 255;
      data[k + 3] = 255;
    }
  }
  const tex = new DataTexture(data, size, size, RGBAFormat);
  tex.colorSpace = NoColorSpace;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

export function canvasTexture(canvas, { srgb = false } = {}) {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export { makeCanvas };
