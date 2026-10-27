import { describe, expect, it } from 'vitest';
import { DUO, DUO_L, IW, MARGIN, SINGLE, duoColumn, duoLayout, gridHeight, headLayout, heatGridHeight, shareModes, singleLayout, toolCardHeight } from '../src/viewer/poster-layout.js';

describe('能分享的形式', () => {
  it('只有一个工具：只有它自己，不出现「两个一起」', () => {
    expect(shareModes(['a'])).toEqual(['a']);
  });
  it('两个工具：各一种，再加「两个一起」，顺序同热力图', () => {
    expect(shareModes(['a', 'b'])).toEqual(['a', 'b', DUO]);
  });
});

describe('版面', () => {
  it('周数越多，每列越窄，点阵越矮', () => {
    expect(heatGridHeight(54)).toBeLessThan(heatGridHeight(53));
    expect(heatGridHeight(53)).toBeCloseTo(28 + 7 * ((IW - 46) / 53));
  });

  it('徽章墙高度按行数算，最后一行不满也占一整行', () => {
    expect(gridHeight(32, 8, 912)).toBe(4 * 114);
    expect(gridHeight(33, 8, 912)).toBe(5 * 114);
  });

  it('板头各块从上到下排开', () => {
    const h = headLayout(53);
    expect(h.head < h.summary && h.summary < h.heat && h.heat < h.legend && h.legend < h.rule).toBe(true);
  });

  it('单个工具：铸币、细线、徽章墙、页脚依次往下，总高包住页脚和板边', () => {
    const L = singleLayout({ weeks: 53, count: 32 });
    expect(L.mid).toBe(L.rule + 44);
    expect(L.rule2).toBe(L.mid + SINGLE.coin + 44);
    expect(L.foot).toBe(L.grid + gridHeight(32, SINGLE.cols, IW) + 70);
    expect(L.H).toBe(L.foot + 52 + MARGIN);
  });

  it('两个工具：两栏一样宽；徽章墙按徽章多的那一栏算高度', () => {
    const cw = duoColumn();
    expect(cw * 2 + DUO_L.gap).toBeCloseTo(IW);
    const a = duoLayout({ weeks: 53, counts: [32, 30] });
    const b = duoLayout({ weeks: 53, counts: [32, 5] });
    expect(a.gridH).toBe(b.gridH);
    expect(a.gridH).toBe(gridHeight(32, DUO_L.cols, cw));
    expect(a.grid).toBe(a.top + toolCardHeight(DUO_L.coin, DUO_L.value) + 44);
    expect(a.H).toBe(a.foot + 52 + MARGIN);
  });
});
