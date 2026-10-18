import { describe, expect, it } from 'vitest';
import { ShapeUtils } from 'three';
import { makeOutline } from '../src/engine/shapes.js';

const pts = (shape) => shape.getPoints(64);
const area = (shape) => Math.abs(ShapeUtils.area(pts(shape)));

/** 数半径的局部极大值个数，即星芒的尖角数。 */
function countTips(shape) {
  const raw = shape.getPoints(4);
  // 闭合路径的最后一个点与第一个点重合，去掉以免重复计数
  if (raw.at(-1).distanceTo(raw[0]) < 1e-9) raw.pop();
  const p = raw.map((v) => v.length());
  const n = p.length;
  let tips = 0;
  for (let i = 0; i < n; i++) {
    if (p[i] > p[(i - 1 + n) % n] && p[i] >= p[(i + 1) % n] && p[i] > 0.9) tips++;
  }
  return tips;
}

describe('makeOutline', () => {
  it('圆形面积约为 πr²', () => {
    expect(area(makeOutline({ type: 'circle', radius: 1 }))).toBeCloseTo(Math.PI, 2);
  });

  it('内缩后面积变小', () => {
    for (const cfg of [
      { type: 'circle', radius: 1 },
      { type: 'polygon', sides: 6, radius: 1 },
      { type: 'starburst', points: 12 },
    ]) {
      expect(area(makeOutline(cfg, 0.1))).toBeLessThan(area(makeOutline(cfg)));
    }
  });

  it('六边形外接半径不超过 radius', () => {
    const max = Math.max(...pts(makeOutline({ type: 'polygon', sides: 6, radius: 1 })).map((v) => v.length()));
    expect(max).toBeLessThanOrEqual(1 + 1e-9);
  });

  it.each([5, 8, 12])('星芒尖角数量为 %i', (n) => {
    expect(countTips(makeOutline({ type: 'starburst', points: n, radius: 1, innerRadius: 0.7 }))).toBe(n);
  });

  it('未知类型报错', () => {
    expect(() => makeOutline({ type: 'heart' })).toThrow(/heart/);
  });
});
