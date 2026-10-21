import { describe, expect, it } from 'vitest';
import { ShapeUtils } from 'three';
import { parseSvgPath, svgShapes } from '../src/engine/svgpath.js';
import { CODEX_MARK } from '../src/brands/codex/mark.js';

const area = (s) => Math.abs(ShapeUtils.area(s.getPoints()));

describe('parseSvgPath', () => {
  it('绝对/相对直线命令', () => {
    const [p] = parseSvgPath('M0 0 H10 V10 h-10 z');
    expect(p).toEqual([[0, 0], [10, 0], [10, 10], [0, 10]]);
  });

  it('数字紧挨着写也能拆开', () => {
    const [p] = parseSvgPath('M0,0L.5.5-1-1z');
    expect(p[1]).toEqual([0.5, 0.5]);
    expect(p[2]).toEqual([-1, -1]);
  });

  it('圆弧：两个半圆拼成整圆，半径正确', () => {
    const [p] = parseSvgPath('M-5 0 A5 5 0 1 1 5 0 A5 5 0 1 1 -5 0 Z', 24);
    for (const [x, y] of p) expect(Math.hypot(x, y)).toBeCloseTo(5, 6);
  });

  it('圆弧标志位与数字连写（压缩写法）', () => {
    // "a.5.5 0 00.5.5" = rx .5, ry .5, 旋转 0, 大弧 0, 顺时针 0, 终点 (.5, .5)
    const [p] = parseSvgPath('M0 0a.5.5 0 00.5.5L0 1z');
    expect(p.find(([x, y]) => Math.abs(x - 0.5) < 1e-9 && Math.abs(y - 0.5) < 1e-9)).toBeTruthy();
  });
});

describe('svgShapes（evenodd）', () => {
  it('方框套方框 → 1 个实心 + 1 个洞，面积为差值', () => {
    const shapes = svgShapes('M0 0H24V24H0Z M6 6H18V18H6Z', { viewBox: 24, scale: 12 });
    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(1);
    expect(area(shapes[0])).toBeCloseTo(24 * 24);
  });

  it('Codex 标志：一块云形外轮廓，镂空出 > 和 _ 两个洞', () => {
    const shapes = svgShapes(CODEX_MARK, { viewBox: 24, scale: 0.5 });
    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(2);
    const xs = shapes[0].getPoints().map((p) => p.x);
    expect(Math.max(...xs)).toBeLessThanOrEqual(0.5 + 1e-3);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-0.5 - 1e-3);
  });
});
