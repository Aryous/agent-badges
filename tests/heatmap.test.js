import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PLATE, SUNK, cellBackground, enamelColor, splitBackground } from '../src/viewer/heatmap.js';
import { t } from '../src/viewer/i18n.js';

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

describe('统计行', () => {
  it('只留数字，不写范围（范围由图例里的开关说明）', () => {
    const vars = { tokens: '10.5B', days: 194, streak: 20 };
    expect(t('heat.summary', vars, 'zh')).toBe('10.5B Token · 194 个活跃日 · 最长连续 20 天');
    expect(t('heat.summary', vars, 'en')).toBe('10.5B tokens · 194 active days · longest streak 20 days');
  });
});

describe('珐琅板颜色：JS 和 CSS 同一份', () => {
  const css = readFileSync(new URL('../src/styles/heatmap.css', import.meta.url), 'utf8');
  const norm = (s) => s.replace(/\s+/g, '').toLowerCase();
  const VARS = { '--plate': 'plate', '--plate-sunk': 'sunk', '--plate-frame': 'frame', '--plate-ink': 'ink', '--plate-sub': 'sub', '--plate-month': 'month', '--plate-dim': 'dim', '--plate-name': 'name', '--plate-ring': 'ring' };

  it('heatmap.css 的 --plate-* 等于 PLATE', () => {
    for (const [v, key] of Object.entries(VARS)) {
      const m = css.match(new RegExp(`${v}:\\s*([^;]+);`));
      expect(m, v).toBeTruthy();
      expect(norm(m[1]), v).toBe(norm(PLATE[key]));
    }
  });

  it('两个 @property 的初始值是凹点色；内框线和淡轮廓也是 PLATE 里的值', () => {
    const inits = [...css.matchAll(/initial-value:\s*([^;]+);/g)].map((m) => norm(m[1]));
    expect(inits).toEqual([norm(PLATE.sunk), norm(PLATE.sunk)]);
    expect(norm(css)).toContain(norm(PLATE.frameInner));
    expect(norm(css)).toContain(norm(PLATE.outline));
    expect(SUNK).toBe(PLATE.sunk);
  });
});
