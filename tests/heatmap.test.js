import { describe, expect, it } from 'vitest';
import { SUNK, cellBackground, enamelColor, splitBackground, summaryScope } from '../src/viewer/heatmap.js';

const rgbOf = (s) => s.match(/\d+/g).map(Number);
const hexRgb = (hex) => [16, 8, 0].map((sh) => (parseInt(hex.slice(1), 16) >> sh) & 255);
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

describe('热力图取色：品牌色和凹点色之间混色', () => {
  it('等级 4 的单个工具就是品牌色本身', () => {
    expect(enamelColor('#D97757', 4)).toBe('rgb(217, 119, 87)');
    expect(cellBackground([{ color: '#D97757', level: 4 }])).toBe('rgb(217, 119, 87)');
  });

  it('等级 1 明显更接近凹点色，等级越高越接近品牌色', () => {
    const brand = hexRgb('#7A9DFF');
    const sunk = hexRgb(SUNK);
    const l1 = rgbOf(cellBackground([{ color: '#7A9DFF', level: 1 }]));
    expect(dist(l1, sunk)).toBeLessThan(dist(l1, brand));
    const toBrand = [1, 2, 3, 4].map((l) => dist(rgbOf(enamelColor('#7A9DFF', l)), brand));
    expect(toBrand).toEqual([...toBrand].sort((a, b) => b - a));
  });

  it('两个工具同一天都用了：90° 左右各半，和图例里的双色点同一个写法', () => {
    const bg = cellBackground([
      { color: '#D97757', level: 4 },
      { color: '#7A9DFF', level: 2 },
    ]);
    expect(bg).toBe(`linear-gradient(90deg, rgb(217, 119, 87) 0 50%, ${enamelColor('#7A9DFF', 2)} 50% 100%)`);
    expect(splitBackground(enamelColor('#D97757', 4), enamelColor('#7A9DFF', 2))).toBe(bg);
  });

  it('没有活动：凹点色', () => {
    expect(SUNK).toBe('#0d1538');
    expect(cellBackground([])).toBe('rgb(13, 21, 56)');
    expect(enamelColor('#D97757', 0)).toBe('rgb(13, 21, 56)');
  });
});

describe('统计行的范围', () => {
  it('两个工具都开着：写合计', () => {
    expect(summaryScope(['Claude Code', 'Codex'], 'zh')).toBe('两个工具合计');
    expect(summaryScope(['Claude Code', 'Codex'], 'en')).toBe('Both tools');
  });

  it('只开一个：写那个工具的名字', () => {
    expect(summaryScope(['Codex'], 'zh')).toBe('Codex');
    expect(summaryScope(['Claude Code'], 'en')).toBe('Claude Code');
  });
});
