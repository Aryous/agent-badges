import { describe, expect, it } from 'vitest';
import brand from '../src/brands/claude-code/brand.js';
import badges from '../src/brands/claude-code/badges.js';
import { partitionBadges, validateBadge, validateBrand } from '../src/engine/validate.js';

const clone = (o) => structuredClone(o);

describe('validateBrand', () => {
  it('Claude Code 品牌配置合法', () => {
    expect(validateBrand(brand)).toBe(true);
  });

  it('缺少 graphite 时报错', () => {
    const b = { ...brand, palette: { ...brand.palette, graphite: undefined } };
    expect(() => validateBrand(b)).toThrow(/graphite/);
  });
});

describe('validateBadge', () => {
  it.each(badges.map((b) => [b.id, b]))('%s 配置合法', (_, b) => {
    expect(validateBadge(b, brand)).toBe(true);
  });

  it('缺少 title 时报错并带上徽章 id', () => {
    const b = clone(badges[0]);
    delete b.title;
    expect(() => validateBadge(b, brand)).toThrow(/first-session.*title/);
  });

  it('未知材质报错', () => {
    const b = clone(badges[0]);
    b.layers[1].material = 'velvet';
    expect(() => validateBadge(b, brand)).toThrow(/velvet/);
  });

  it('未知色键报错', () => {
    const b = clone(badges[0]);
    b.relief[0].color = 'neon';
    expect(() => validateBadge(b, brand)).toThrow(/neon/);
  });

  it('未知轮廓报错', () => {
    const b = clone(badges[0]);
    b.shape.type = 'heart';
    expect(() => validateBadge(b, brand)).toThrow(/heart/);
  });

  it('缺少 rim 层报错', () => {
    const b = clone(badges[0]);
    b.layers = b.layers.filter((l) => l.kind !== 'rim');
    expect(() => validateBadge(b, brand)).toThrow(/rim/);
  });
});

describe('partitionBadges', () => {
  it('跳过出错的徽章，保留其余', () => {
    const bad = clone(badges[1]);
    bad.back.color = 'nope';
    const { valid, errors } = partitionBadges([badges[0], bad, badges[2]], brand);
    expect(valid.map((b) => b.id)).toEqual(['first-session', 'subagent-commander']);
    expect(errors).toHaveLength(1);
    expect(errors[0].badgeId).toBe('seven-day-streak');
  });
});
