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

describe('隐藏成就', () => {
  it('未解锁时只显示问号，不透露图案', () => {
    const cfg = { ...resolveTier(tiered, 0), tiers: undefined, tier: undefined, hidden: true, criteria: { metric: 'm', target: 1 } };
    const g = buildBadge(cfg, brand, { unlocked: false, progress: { current: 0, target: 1 } });
    expect(g.userData.masked).toBe(true);
    expect(g.children.filter((m) => !['rim', 'face', 'back'].includes(m.name))).toHaveLength(1);
  });
});
