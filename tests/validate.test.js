import { describe, expect, it } from 'vitest';
import brand from '../src/brands/claude-code/brand.js';
import badges from '../src/brands/claude-code/index.js';
import { partitionBadges, validateBadge, validateBrand } from '../src/engine/validate.js';

const byId = (id) => badges.find((b) => b.id === id);

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
    const b = clone(byId('first-session'));
    delete b.title;
    expect(() => validateBadge(b, brand)).toThrow(/first-session.*title/);
  });

  it('未知材质报错', () => {
    const b = clone(byId('first-session'));
    b.layers[1].material = 'velvet';
    expect(() => validateBadge(b, brand)).toThrow(/velvet/);
  });

  it('未知色键报错', () => {
    const b = clone(byId('first-session'));
    b.relief[0].color = 'neon';
    expect(() => validateBadge(b, brand)).toThrow(/neon/);
  });

  it('未知轮廓报错', () => {
    const b = clone(byId('first-session'));
    b.shape.type = 'heart';
    expect(() => validateBadge(b, brand)).toThrow(/heart/);
  });

  it('外圈太窄（小于倒角 × 2 + 0.01）报错', () => {
    const b = clone(byId('subagent-commander'));
    b.layers[1].inset = 0.07;
    b.shape.bevel = 0.04;
    expect(() => validateBadge(b, brand)).toThrow(/bevel × 2/);
  });

  it('缺少 rim 层报错', () => {
    const b = clone(byId('first-session'));
    b.layers = b.layers.filter((l) => l.kind !== 'rim');
    expect(() => validateBadge(b, brand)).toThrow(/rim/);
  });
});

describe('validateBadge：criteria 形状', () => {
  it('criteria 里多出 metric 报错', () => {
    const b = { ...structuredClone(badges.find((x) => !x.tiers)), criteria: { metric: 'x', target: 1 } };
    expect(() => validateBadge(b, brand)).toThrow(/criteria 只能有 target、unit、dynamic/);
  });

  it('一次性徽章缺少 target 报错', () => {
    const b = { ...structuredClone(badges.find((x) => !x.tiers)), criteria: {} };
    expect(() => validateBadge(b, brand)).toThrow(/target/);
  });

  it('分级徽章写了 criteria 报错', () => {
    const b = { ...structuredClone(badges.find((x) => x.tiers)), criteria: { target: 1 } };
    expect(() => validateBadge(b, brand)).toThrow(/分级徽章.*不写 criteria/);
  });
});

describe('partitionBadges', () => {
  it('跳过出错的徽章，保留其余', () => {
    const bad = clone(byId('seven-day-streak'));
    bad.back.color = 'nope';
    const { valid, errors } = partitionBadges([byId('first-session'), bad, byId('subagent-commander')], brand);
    expect(valid.map((b) => b.id)).toEqual(['first-session', 'subagent-commander']);
    expect(errors).toHaveLength(1);
    expect(errors[0].badgeId).toBe('seven-day-streak');
  });
});
