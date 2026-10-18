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

/**
 * 珐琅底纹（灰度凹凸贴图），以徽章中心为圆心：
 *   sunburst  放射纹，像表盘的太阳纹
 *   rings     同心细纹
 */
export function patternTexture(name, size = 1024) {
  const key = `pattern-${name}-${size}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, size, size);
  if (name === 'sunburst') {
    const rays = 144;
    for (let i = 0; i < rays; i++) {
      const a0 = (i / rays) * Math.PI * 2;
      const a1 = ((i + 0.5) / rays) * Math.PI * 2;
      ctx.fillStyle = 'rgb(200,200,200)';
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, size, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    // 中心收成平面，避免射线在圆心挤成噪点
    const g = ctx.createRadialGradient(c, c, 0, c, c, size * 0.06);
    g.addColorStop(0, 'rgb(164,164,164)');
    g.addColorStop(1, 'rgba(164,164,164,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (name === 'rings') {
    ctx.lineWidth = size / 640;
    for (let r = size / 320; r < size * 0.72; r += size / 320) {
      ctx.strokeStyle = 'rgb(196,196,196)';
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    throw new Error(`未知底纹：${name}`);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = NoColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/**
 * 全息镭射的薄膜厚度贴图：同心波纹叠加角度变化，
 * 配合 iridescence 让彩虹色随位置和视角流动。
 */
export function holoTexture(size = 512) {
  const key = `holo-${size}`;
  if (cache.has(key)) return cache.get(key);
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) / size * 2 - 1;
      const y = (j + 0.5) / size * 2 - 1;
      const r = Math.hypot(x, y);
      const a = Math.atan2(y, x);
      // 低频、平滑：一圈圈宽的彩虹带 + 一点斜向渐变，避免细碎的油膜斑块
      const v = 0.5 + 0.32 * Math.sin(r * 7.5) + 0.14 * (x * 0.8 + y * 0.5) + 0.04 * Math.sin(a * 2);
      const g = Math.round(Math.min(1, Math.max(0, v)) * 255);
      const k = (j * size + i) * 4;
      data[k] = g;
      data[k + 1] = g;
      data[k + 2] = g;
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
