import { LAYER_KINDS, MATERIAL_TYPES, PATTERNS, RELIEF_EFFECTS, RELIEF_KINDS, SHAPE_TYPES } from './registry.js';
import { hasGlyph } from './text.js';
import { resolveTier } from './tiers.js';

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

  // 分级徽章：先检查门槛，再把每一级展开成普通配置分别校验
  if (config?.tiers) {
    if (config.criteria) fail('分级徽章的门槛写在 tiers 里，不写 criteria');
    const tiers = config.tiers;
    if (!Array.isArray(tiers) || !tiers.length) fail('tiers 不能为空');
    const checkMetal = (where, t) => {
      if (!brand.palette[t.metal]) fail(`${where} 的金属「${t.metal}」不在品牌色板中`);
      if (t.accent && !brand.palette[t.accent]) fail(`${where} 的 accent「${t.accent}」不在品牌色板中`);
    };
    tiers.forEach((t, i) => {
      if (!(t.threshold > 0)) fail(`tiers[${i}] 需要大于 0 的 threshold`);
      if (i > 0 && t.threshold <= tiers[i - 1].threshold) fail(`tiers[${i}] 的 threshold 必须递增`);
      if (t.variants) {
        if (!Array.isArray(t.variants) || !t.variants.length) fail(`tiers[${i}].variants 不能为空`);
        t.variants.forEach((v, k) => {
          if (!v.id || !v.name?.zh || !v.name?.en) fail(`tiers[${i}].variants[${k}] 需要 id 和中英文名`);
          checkMetal(`tiers[${i}].variants[${k}]`, v);
        });
      } else checkMetal(`tiers[${i}]`, t);
    });
    // 每一级（有款式的每一款）都要能单独通过校验
    tiers.forEach((t, i) => {
      for (let k = 0; k < (t.variants?.length ?? 1); k++) {
        const { tiers: _omit, tier: _t, ...plain } = resolveTier(config, i, k);
        try {
          validateBadge({ ...plain, criteria: { target: tiers[0].threshold } }, brand);
        } catch (e) {
          const where = t.variants ? `第 ${i + 1} 级「${t.variants[k].name.zh}」` : `第 ${i + 1} 级`;
          fail(`${where}：${e.message.replace(/^\[徽章 [^\]]+\] /, '')}`);
        }
      }
    });
    return true;
  }
  const checkMaterial = (where, m) => {
    if (!MATERIAL_TYPES.includes(m)) fail(`${where} 的材质「${m}」未注册`);
  };
  const checkColor = (where, c) => {
    if (!brand.palette[c]) fail(`${where} 的颜色「${c}」不在品牌色板中`);
  };

  if (!id) fail('缺少 id');
  for (const k of ['title', 'description']) if (!config[k]) fail(`缺少 ${k}`);
  if (!config.en?.title) fail('缺少 en.title（英文标题，背面刻字的大写英文由它转换）');
  const extra = Object.keys(config.criteria ?? {}).filter((k) => !['target', 'unit', 'dynamic'].includes(k));
  if (extra.length) fail(`criteria 只能有 target、unit、dynamic，多了 ${extra.join('、')}`);
  if (!(config.criteria?.target > 0)) fail('criteria 需要大于 0 的 target');

  if (!SHAPE_TYPES.includes(config.shape?.type)) fail(`轮廓类型「${config.shape?.type}」未注册`);

  const layers = config.layers ?? [];
  for (const [i, l] of layers.entries()) {
    if (!LAYER_KINDS.includes(l.kind)) fail(`layers[${i}] 的类型「${l.kind}」未注册`);
    checkMaterial(`layers[${i}]`, l.material);
    checkColor(`layers[${i}]`, l.color);
    if (l.pattern && !PATTERNS.includes(l.pattern)) fail(`layers[${i}] 的底纹「${l.pattern}」未注册`);
  }
  if (layers.filter((l) => l.kind === 'rim').length !== 1) fail('layers 需要恰好一个 rim');
  const face = layers.filter((l) => l.kind === 'face');
  if (face.length !== 1) fail('layers 需要恰好一个 face');
  if (!(face[0].inset > 0 && face[0].inset < 0.5)) fail('face.inset 需要在 (0, 0.5) 之间');
  // 外圈两侧都有倒角，环宽太窄时几何体会自交，内洞挖不出来
  const bevel = config.shape.bevel ?? 0.04;
  if (face[0].inset < bevel * 2 + 0.01 - 1e-9) fail(`face.inset（${face[0].inset}）至少要等于 shape.bevel × 2 + 0.01（${(bevel * 2 + 0.01).toFixed(3)}）`);

  // 正面和背面的浮雕用同一套规则
  for (const [field, items] of [['relief', config.relief], ['backRelief', config.backRelief]]) {
    for (const [i, r] of (items ?? []).entries()) {
      if (!RELIEF_KINDS.includes(r.kind)) fail(`${field}[${i}] 的类型「${r.kind}」未注册`);
      checkMaterial(`${field}[${i}]`, r.material);
      checkColor(`${field}[${i}]`, r.color);
      if (r.gradient) {
        if (!Array.isArray(r.gradient) || r.gradient.length < 2) fail(`${field}[${i}] 的 gradient 至少需要两个颜色`);
        r.gradient.forEach((k) => checkColor(`${field}[${i}].gradient`, k));
      }
      if (r.pattern && !PATTERNS.includes(r.pattern)) fail(`${field}[${i}] 的底纹「${r.pattern}」未注册`);
      if (r.effect && !RELIEF_EFFECTS.includes(r.effect)) fail(`${field}[${i}] 的效果「${r.effect}」未注册`);
      if (r.kind === 'text') {
        const missing = [...new Set([...(r.text ?? '')].filter((ch) => !hasGlyph(ch)))];
        if (!r.text) fail(`${field}[${i}] 文字缺少 text`);
        if (missing.length) fail(`${field}[${i}] 文字字体不支持：${missing.join(' ')}`);
      }
      if (r.kind === 'text-arc') {
        const missing = [...new Set([...(r.text ?? '')].filter((ch) => !hasGlyph(ch)))];
        if (!r.text) fail(`${field}[${i}] 文字环缺少 text`);
        if (missing.length) fail(`${field}[${i}] 文字环字体不支持：${missing.join(' ')}（可在 scripts/build-font.mjs 中补充）`);
        if (!['top', 'bottom'].includes(r.arc ?? 'top')) fail(`${field}[${i}] 的 arc 只能是 top 或 bottom`);
      }
      if (r.kind === 'pixels' && !(Array.isArray(r.rows) && r.rows.some((row) => row.includes('#')))) {
        fail(`${field}[${i}] 像素图 rows 为空`);
      }
      if (r.kind === 'contour' && !(r.inset >= 0 && r.width > 0)) fail(`${field}[${i}] 轮廓描边需要 inset ≥ 0、width > 0`);
      if (r.kind === 'rounded-rect' && !(r.half > 0 && r.radius >= 0)) {
        fail(`${field}[${i}] 圆角矩形需要 half > 0、radius ≥ 0`);
      }
    }
  }

  if (!config.back) fail('缺少 back');
  checkMaterial('back', config.back.material);
  checkColor('back', config.back.color);
  if (config.back.engraving !== undefined && config.back.engraving !== false) fail('back.engraving 只能是 false（不带刻字）或不写');
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
