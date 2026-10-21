import { clawd } from './mascot.js';

// 功能探索系列的「App 图标」骨架，六枚功能徽章共用。

// ---------------------------------------------------------------------------
// App 图标家族：圆角方形 + 阳极氧化铝外框 + 深色珐琅底 + 亮色圆角面板 + 像素图标。
// 上边条写品牌，下边条写功能名；小怪物在面板里和图标互动。
// ---------------------------------------------------------------------------

// 方形的视觉面积比同外接半径的圆小，整体放大 S 倍，陈列墙上和圆形徽章看起来一样大
const S = 1.18;

const APP_SHAPE = { type: 'polygon', sides: 4, rotation: Math.PI / 4, radius: 1.12 * S, cornerRadius: 0.34 * S, depth: 0.2, bevel: 0.035 };

const APP_INSET = 0.09;

const PANEL = 0.5; // 面板半边长

const PANEL_Y = 0.0;

const BAND_Y = 0.6; // 上下边条文字的中心高度

/** 圆角矩形面板：直边加圆弧的矢量轮廓，挤出成单个几何体，放大到多近都没有台阶。 */
function roundRect(half, radius, { cy = 0, ...item }) {
  return [{ kind: 'rounded-rect', half, radius, center: [0, cy], ...item }];
}

/** 把一个浮雕基元的平面尺寸放大 k 倍（高度不变）。 */
function scaleItem(item, k) {
  const out = { ...item };
  for (const key of ['center', 'from', 'to']) if (out[key]) out[key] = out[key].map((v) => v * k);
  for (const key of ['cell', 'width', 'radius', 'size', 'half']) if (out[key] !== undefined) out[key] *= k;
  return out;
}

/** 面板上表面高度：图标和小怪物要用 z: PANEL_TOP 抬起来。 */
const PANEL_TOP = 0.03;

/**
 * App 图标徽章骨架。
 * @param {object} o
 * @param {string} o.rim   外框阳极氧化颜色
 * @param {string} o.face  底面深色珐琅
 * @param {string} o.panel 面板亮色珐琅
 * @param {string} o.metal 描边与文字的金属色
 * @param {string} o.name  下边条文字
 */
export function appIcon({ id, title, titleEn, description, en, criteria, rim, face, panel, metal = 'silver', name, art }) {
  return {
    id,
    title,
    titleEn,
    description,
    en,
    criteria,
    shape: APP_SHAPE,
    layers: [
      { kind: 'rim', material: 'anodized', color: rim },
      { kind: 'face', material: 'enamel', color: face, inset: APP_INSET, pattern: 'rings' },
    ],
    relief: [
      // 面板金属描边（垫在面板下面，露出一圈）
      // 面板：金属描边垫在下面（比面板低、比面板大一圈），珐琅面板盖在上面
      ...roundRect(PANEL + 0.03, 0.2, { cy: PANEL_Y, material: 'polished-metal', color: metal, height: 0.018, bevel: 0.006 }),
      ...roundRect(PANEL, 0.18, { cy: PANEL_Y, material: 'enamel', color: panel, height: PANEL_TOP, pattern: 'sunburst', bevel: 0.006 }),
      { kind: 'text', text: 'CLAUDE CODE', size: 0.058, center: [0, BAND_Y], tracking: 0.32, material: 'polished-metal', color: metal, height: 0.02, bevel: 0.004 },
      { kind: 'text', text: name, size: 0.064, center: [0, -BAND_Y], tracking: 0.32, material: 'polished-metal', color: metal, height: 0.02, bevel: 0.004 },
      ...art.map((a) => ({ ...a, z: (a.z ?? 0) + PANEL_TOP })),
    ].map((item) => scaleItem(item, S)),
    // 背面拉丝：银色太亮，改用钢灰；金色保留
    back: { material: 'brushed-metal', color: metal === 'silver' ? 'steel' : metal, safeRadius: 0.6 * S },
  };
}

/** 小怪物（放在面板上）。 */
export const mascot = (cell, center) => clawd({ cell, center, z: 0, height: 0.055 });

export const px = (rows, cell, center, color, material = 'enamel', height = 0.05) => ({
  kind: 'pixels', rows, cell, center, material, color, height, bevel: Math.min(0.012, cell * 0.3),
});
