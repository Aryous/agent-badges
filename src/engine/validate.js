import { LAYER_KINDS, MATERIAL_TYPES, RELIEF_EFFECTS, RELIEF_KINDS, SHAPE_TYPES } from './registry.js';

// 配置校验：在构建 3D 对象之前发现拼写错误和缺失字段。

export class BadgeConfigError extends Error {
  constructor(id, message) {
    super(`[徽章 ${id ?? '?'}] ${message}`);
    this.name = 'BadgeConfigError';
    this.badgeId = id;
  }
}

const REQUIRED_PALETTE = ['background', 'graphite'];

export function validateBrand(brand) {
  const fail = (msg) => {
    throw new Error(`[品牌 ${brand?.id ?? '?'}] ${msg}`);
  };
  if (!brand?.id) fail('缺少 id');
  if (!brand.name) fail('缺少 name');
  if (!brand.palette) fail('缺少 palette');
  for (const k of REQUIRED_PALETTE) if (!brand.palette[k]) fail(`palette 缺少 ${k}`);
  if (typeof brand.engraving?.lines !== 'function') fail('engraving.lines 必须是函数');
  if (!brand.engraving.fontFamily) fail('缺少 engraving.fontFamily');
  return true;
}

export function validateBadge(config, brand) {
  const id = config?.id;
  const fail = (msg) => {
    throw new BadgeConfigError(id, msg);
  };
  const checkMaterial = (where, m) => {
    if (!MATERIAL_TYPES.includes(m)) fail(`${where} 的材质「${m}」未注册`);
  };
  const checkColor = (where, c) => {
    if (!brand.palette[c]) fail(`${where} 的颜色「${c}」不在品牌色板中`);
  };

  if (!id) fail('缺少 id');
  for (const k of ['title', 'titleEn', 'description']) if (!config[k]) fail(`缺少 ${k}`);
  if (!config.criteria?.metric || !(config.criteria.target > 0)) fail('criteria 需要 metric 和大于 0 的 target');

  if (!SHAPE_TYPES.includes(config.shape?.type)) fail(`轮廓类型「${config.shape?.type}」未注册`);

  const layers = config.layers ?? [];
  for (const [i, l] of layers.entries()) {
    if (!LAYER_KINDS.includes(l.kind)) fail(`layers[${i}] 的类型「${l.kind}」未注册`);
    checkMaterial(`layers[${i}]`, l.material);
    checkColor(`layers[${i}]`, l.color);
  }
  if (layers.filter((l) => l.kind === 'rim').length !== 1) fail('layers 需要恰好一个 rim');
  const face = layers.filter((l) => l.kind === 'face');
  if (face.length !== 1) fail('layers 需要恰好一个 face');
  if (!(face[0].inset > 0 && face[0].inset < 0.5)) fail('face.inset 需要在 (0, 0.5) 之间');
  // 外圈两侧都有倒角，环宽太窄时几何体会自交，内洞挖不出来
  const bevel = config.shape.bevel ?? 0.04;
  if (face[0].inset < bevel * 2 + 0.01 - 1e-9) fail(`face.inset（${face[0].inset}）至少要等于 shape.bevel × 2 + 0.01（${(bevel * 2 + 0.01).toFixed(3)}）`);

  for (const [i, r] of (config.relief ?? []).entries()) {
    if (!RELIEF_KINDS.includes(r.kind)) fail(`relief[${i}] 的类型「${r.kind}」未注册`);
    checkMaterial(`relief[${i}]`, r.material);
    checkColor(`relief[${i}]`, r.color);
    if (r.effect && !RELIEF_EFFECTS.includes(r.effect)) fail(`relief[${i}] 的效果「${r.effect}」未注册`);
  }

  if (!config.back) fail('缺少 back');
  checkMaterial('back', config.back.material);
  checkColor('back', config.back.color);
  return true;
}

/** 校验一组徽章，返回通过的列表和错误列表，不抛出。 */
export function partitionBadges(badges, brand) {
  const valid = [];
  const errors = [];
  for (const b of badges) {
    try {
      validateBadge(b, brand);
      valid.push(b);
    } catch (e) {
      errors.push(e);
    }
  }
  return { valid, errors };
}
