import { describe, expect, it } from 'vitest';
import { ShapeUtils } from 'three';
import { innerRadius, makeOutline } from '../src/engine/shapes.js';
import { innerRadiusOf } from '../src/brands/shared/fit.js';
import ccBadges from '../src/brands/claude-code/index.js';
import codexBadges from '../src/brands/codex/index.js';

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

describe('花形外形', () => {
  it('凹口在外接半径以内，内缩后仍是闭合轮廓', () => {
    const cfg = { type: 'flower', petals: 5, radius: 1.1, petal: 0.45 };
    for (const inset of [0, 0.1]) {
      const pts = makeOutline(cfg, inset).getPoints(40);
      const r = pts.map((p) => Math.hypot(p.x, p.y));
      expect(Math.max(...r)).toBeCloseTo(1.1 - inset, 2);
      expect(Math.min(...r)).toBeGreaterThan(0.75 - inset);
    }
  });
});

describe('不依赖 three 的内切半径', () => {
  it('和引擎的精确结果一致或略小（偏保守），用于所有徽章外形', () => {
    for (const b of [...ccBadges, ...codexBadges]) {
      const shapes = [b.shape, ...(b.tiers ?? []).flatMap((t) => (t.variants ?? []).map((v) => v.shape ?? b.shape))];
      for (const shape of shapes) {
        for (const inset of [0, 0.167]) {
          const exact = innerRadius(shape, inset);
          const fast = innerRadiusOf(shape, inset);
          expect(fast, `${b.id} ${shape.type}`).toBeLessThanOrEqual(exact + 2e-3);
          expect(fast, `${b.id} ${shape.type}`).toBeGreaterThan(exact - 0.04);
        }
      }
    }
  });
});
