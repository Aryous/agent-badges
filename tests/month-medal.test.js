// 月章：数据、宝石色板、引擎配置（正面 C + 火珐琅，背面 B3）
import { describe, expect, it } from 'vitest';
import { BRANDS } from '../src/brands/index.js';
import { validateBadge } from '../src/engine/validate.js';
import { buildBadge, disposeBadge } from '../src/engine/badge.js';
import { SUNK } from '../src/viewer/heatmap.js';
import { RB, beadAt, gemHex, gemKey, medalPalette, monthMedalConfig, monthMedalData } from '../src/brands/shared/month-medal.js';

const series = [
  { id: 'claude-code', color: '#D97757' },
  { id: 'codex', color: '#7A9DFF' },
];
// 2026 年 4 月：1 号 Claude Code 3 档；2 号两个工具（左 CC 2 档、右 Codex 4 档）并解锁两枚；3 号没活动；28 号以后是未来
const parts = {
  '2026-04-01': [{ id: 'claude-code', color: '#D97757', level: 3 }],
  '2026-04-02': [
    { id: 'claude-code', color: '#D97757', level: 2 },
    { id: 'codex', color: '#7A9DFF', level: 4 },
  ],
};
const markers = { '2026-04-02': [{}, {}] };
const april = monthMedalData({
  year: 2026,
  month: 3,
  tokens: 1.1e9,
  activeDays: 2,
  series,
  partsOf: (d) => parts[d] ?? [],
  markersOn: (d) => markers[d] ?? [],
  now: '2026-04-27',
});
const brand = BRANDS.find((b) => b.brand.id === 'claude-code').brand;
const withPalette = { ...brand, palette: { ...brand.palette, ...medalPalette(series) } };
const beadsOf = (relief) => relief.filter((r) => r.material === 'fired-enamel');

describe('宝石色', () => {
  it('品牌色的色相、饱和度 0.85，档位越高越深', () => {
    expect([1, 2, 3, 4].map((l) => gemHex('#D97757', l))).toEqual(['#f49171', '#f0744c', '#ee5b2b', '#e24612']);
    expect([1, 2, 3, 4].map((l) => gemHex('#7A9DFF', l))).toEqual(['#7194f4', '#4c77f0', '#2b5eee', '#1249e2']);
  });

  it('色板：每个系列 4 档，键带 medal: 前缀，另有凹点、未来、金边、月份字', () => {
    const p = medalPalette(series);
    expect(p[gemKey(0, 4)]).toBe('#e24612');
    expect(p[gemKey(1, 1)]).toBe('#7194f4');
    expect(p['medal:sunk']).toBe(SUNK);
    expect(p['medal:future']).toBe('#222c5c');
    expect(p['medal:unlock']).toBe('#d9bf86');
    expect(p['medal:label']).toBe('#d6c49a');
    expect(Object.keys(p).every((k) => k.startsWith('medal:'))).toBe(true);
  });
});

describe('月章数据', () => {
  it('按天：工具换成系列序号，解锁数，now 之后是未来', () => {
    expect(april.days).toHaveLength(30);
    expect(april.days[0]).toEqual({ date: '2026-04-01', future: false, parts: [{ series: 0, level: 3 }], unlocks: 0 });
    expect(april.days[1].parts).toEqual([
      { series: 0, level: 2 },
      { series: 1, level: 4 },
    ]);
    expect(april.days[1].unlocks).toBe(2);
    expect(april.days[2]).toEqual({ date: '2026-04-03', future: false, parts: [], unlocks: 0 });
    expect(april.days[27].future).toBe(true);
    expect(april.days[26].future).toBe(false);
  });

  it('汇总：活跃天数用调用方给的数，解锁数相加，当月用过的工具', () => {
    expect(april).toMatchObject({ year: 2026, month: 3, tokens: 1.1e9, active: 2, unlocks: 2, tools: [0, 1] });
  });
});

describe('珠子的位置', () => {
  it('1 号在正上方，顺时针', () => {
    const [x0, y0] = beadAt(0, 30);
    expect(x0).toBeCloseTo(0, 6);
    expect(y0).toBeCloseTo(RB, 6);
    const [x1] = beadAt(1, 30);
    expect(x1).toBeGreaterThan(0);
  });
});

describe('月章配置', () => {
  const config = monthMedalConfig(april, { tier: 2 });

  it('通过校验，能组装出来', () => {
    expect(() => validateBadge(config, withPalette)).not.toThrow();
    const badge = buildBadge(config, withPalette, { unlocked: true, earnedAt: null, tier: null, progress: { current: 1, target: 1 } });
    expect(badge).toBeTruthy();
    disposeBadge(badge);
  });

  it('id、外圈金属、哑光珐琅的正面板和背面', () => {
    expect(config.id).toBe('medal-2026-04');
    expect(config.layers[0]).toMatchObject({ kind: 'rim', material: 'polished-metal', color: 'silver' });
    expect(config.layers[1]).toMatchObject({ kind: 'face', material: 'enamel-matte', color: 'midnight' });
    expect(config.back).toMatchObject({ material: 'enamel-matte', color: 'midnight', engraving: false });
  });

  it('珠子：一个工具一颗火珐琅，两个工具左右各半；没活动是暗色珐琅；未来是小暗点', () => {
    const beads = beadsOf(config.relief);
    // 1 号一整颗，2 号两个半颗
    expect(beads).toHaveLength(3);
    expect(beads.map((b) => b.color)).toEqual([gemKey(0, 3), gemKey(0, 2), gemKey(1, 4)]);
    expect(config.relief.filter((r) => r.color === 'medal:sunk')).toHaveLength(27 - 2);
    expect(config.relief.filter((r) => r.color === 'medal:future')).toHaveLength(3);
  });

  it('解锁的日子嵌一圈金边', () => {
    const rings = config.relief.filter((r) => r.kind === 'ring' && r.color === 'medal:unlock');
    expect(rings).toHaveLength(1);
    expect(rings[0].center[0]).toBeCloseTo(beadAt(1, 30)[0], 6);
  });

  it('珠子顶面和金属环齐平，没有衬片', () => {
    for (const b of beadsOf(config.relief)) expect(b.z ?? 0).toBe(0);
    expect(config.relief.some((r) => r.material === 'polished-metal' && r.color === 'silver' && r.kind === 'circle')).toBe(false);
  });

  it('背面 B3：上弧月份全名、下弧年份，月桂，中间月份数字；两个工具时结是金边色', () => {
    const arcs = config.backRelief.filter((r) => r.kind === 'text-arc');
    expect(arcs.map((a) => [a.arc, a.text])).toEqual([
      ['top', 'APRIL'],
      ['bottom', '2026'],
    ]);
    expect(config.backRelief.find((r) => r.kind === 'text').text).toBe('4');
    const knot = config.backRelief.find((r) => r.kind === 'circle' && r.center?.[1] === -0.41);
    expect(knot.color).toBe('medal:unlock');
  });

  it('只用了一个工具的月份：结是那个工具的 4 档宝石色', () => {
    const one = monthMedalData({ year: 2026, month: 0, tokens: 1, activeDays: 1, series, partsOf: (d) => (d === '2026-01-05' ? [{ id: 'codex', color: '#7A9DFF', level: 1 }] : []), markersOn: () => [], now: '2026-10-26' });
    const knot = monthMedalConfig(one, { tier: 0 }).backRelief.find((r) => r.kind === 'circle' && r.center?.[1] === -0.41);
    expect(knot.color).toBe(gemKey(1, 4));
  });
});
