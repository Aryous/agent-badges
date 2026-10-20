import { describe, expect, it } from 'vitest';
import brand from '../src/brands/claude-code/brand.js';
import { resolveTier, tierIndexFor } from '../src/engine/tiers.js';
import { validateBadge } from '../src/engine/validate.js';
import { buildBadge } from '../src/engine/badge.js';

const tiered = {
  id: 'sessions',
  title: '会话里程碑',
  titleEn: '{label} SESSIONS',
  description: 'x',
  criteria: { metric: 'sessions.total' },
  tiers: [
    { threshold: 10, metal: 'bronze', label: '10' },
    { threshold: 100, metal: 'silver', label: '100' },
    { threshold: 1000, metal: 'gold', label: '1K' },
  ],
  shape: { type: 'polygon', sides: 8, radius: 1, cornerRadius: 0.1 },
  layers: [
    { kind: 'rim', material: 'polished-metal', color: '$metal' },
    { kind: 'face', material: 'enamel', color: 'cobalt', inset: 0.12 },
  ],
  relief: [{ kind: 'text', text: '{label}', size: 0.3, material: 'polished-metal', color: '$metal', height: 0.05 }],
  back: { material: 'brushed-metal', color: '$metal' },
};

describe('分级', () => {
  it('tierIndexFor：按门槛取最高等级', () => {
    expect(tierIndexFor(tiered.tiers, 0)).toBe(-1);
    expect(tierIndexFor(tiered.tiers, 10)).toBe(0);
    expect(tierIndexFor(tiered.tiers, 999)).toBe(1);
    expect(tierIndexFor(tiered.tiers, 1e9)).toBe(2);
  });

  it('resolveTier：替换颜色和文字占位符，并附上等级信息', () => {
    const c = resolveTier(tiered, 1);
    expect(c.layers[0].color).toBe('silver');
    expect(c.relief[0].text).toBe('100');
    expect(c.titleEn).toBe('100 SESSIONS');
    expect(c.tier).toMatchObject({ index: 1, name: '银', label: '100' });
  });

  it('每一级都能通过校验并组装', () => {
    expect(validateBadge(tiered, brand)).toBe(true);
    for (let i = 0; i < 3; i++) {
      const g = buildBadge(tiered, brand, { unlocked: true, tier: i, earnedAt: '2025-01-01', progress: { current: 1, target: 1 } });
      expect(g.userData.tier.index).toBe(i);
      expect(g.children[0].material.color.getHexString()).not.toBe('');
    }
  });

  it('门槛不递增时报错', () => {
    const bad = { ...tiered, tiers: [{ threshold: 10, metal: 'bronze' }, { threshold: 5, metal: 'gold' }] };
    expect(() => validateBadge(bad, brand)).toThrow(/递增/);
  });

  it('某一级的金属不在色板中时报错', () => {
    const bad = { ...tiered, tiers: [{ threshold: 10, metal: 'unobtainium' }] };
    expect(() => validateBadge(bad, brand)).toThrow(/unobtainium/);
  });
});

describe('分级的款式（variants）', () => {
  const withVariants = {
    ...tiered,
    tiers: [
      ...tiered.tiers,
      {
        threshold: 10000,
        label: '10K',
        variants: [
          { id: 'ivory', name: { zh: '白瓷金', en: 'Ivory Gold' }, metal: 'gold', accent: 'cobalt', shape: { type: 'starburst', points: 24, radius: 1.05, innerRadius: 0.985 }, layers: [{ kind: 'rim', material: 'polished-metal', color: '$metal' }, { kind: 'face', material: 'ceramic', color: 'ivory', inset: 0.12 }] },
          { id: 'sapphire', name: { zh: '蓝宝石', en: 'Sapphire' }, metal: 'silver', accent: 'cobalt' },
        ],
      },
    ],
  };

  it('resolveTier：按款式替换外形和底层，再替换占位符；等级信息里带上款式', () => {
    const c = resolveTier(withVariants, 3, 0);
    expect(c.shape.type).toBe('starburst');
    expect(c.layers[1]).toMatchObject({ material: 'ceramic', color: 'ivory' });
    expect(c.layers[0].color).toBe('gold');
    expect(c.relief[0].text).toBe('10K');
    expect(c.tier.variant).toMatchObject({ index: 0, count: 2, id: 'ivory', name: { zh: '白瓷金', en: 'Ivory Gold' } });
    expect(c.tier.variants).toBeUndefined();
  });

  it('没写替换的部分沿用徽章本身；款式下标越界时取模', () => {
    const c = resolveTier(withVariants, 3, 3);
    expect(c.tier.variant.id).toBe('sapphire');
    expect(c.shape.type).toBe('polygon');
    expect(c.layers[0].color).toBe('silver');
  });

  it('没有款式的等级不受影响', () => {
    expect(resolveTier(withVariants, 1, 1).tier.variant).toBeNull();
  });

  it('每一款都要通过校验', () => {
    expect(validateBadge(withVariants, brand)).toBe(true);
    const bad = structuredClone(withVariants);
    bad.tiers[3].variants[1].accent = 'unobtainium';
    expect(() => validateBadge(bad, brand)).toThrow(/unobtainium/);
    const badShape = structuredClone(withVariants);
    badShape.tiers[3].variants[0].shape = { type: 'blob' };
    expect(() => validateBadge(badShape, brand)).toThrow(/blob/);
  });

  it('组装时按 state.variant 选款式', () => {
    const g = buildBadge(withVariants, brand, { unlocked: true, tier: 3, variant: 1, earnedAt: '2025-01-01', progress: { current: 1, target: 1 } });
    expect(g.userData.tier.variant.id).toBe('sapphire');
  });
});

describe('隐藏成就', () => {
  it('未解锁时只显示问号，不透露图案', () => {
    const cfg = { ...resolveTier(tiered, 0), tiers: undefined, tier: undefined, hidden: true, criteria: { metric: 'm', target: 1 } };
    const g = buildBadge(cfg, brand, { unlocked: false, progress: { current: 0, target: 1 } });
    expect(g.userData.masked).toBe(true);
    expect(g.children.filter((m) => !['rim', 'face', 'back'].includes(m.name))).toHaveLength(1);
  });
});
