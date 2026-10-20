import { describe, expect, it } from 'vitest';
import { ShapeUtils } from 'three';
import { reliefShapes } from '../src/engine/relief.js';
import { BRANDS } from '../src/brands/index.js';

describe('rounded-rect 浮雕', () => {
  const item = { kind: 'rounded-rect', half: 0.3, radius: 0.1, center: [0.05, -0.02] };

  it('面积等于正方形减去四个角', () => {
    const [shape] = reliefShapes(item);
    const area = Math.abs(ShapeUtils.area(shape.getPoints(32)));
    expect(area).toBeCloseTo(0.6 * 0.6 - (4 - Math.PI) * 0.01, 4);
  });

  it('圆角上的点都在圆弧上（不是台阶）', () => {
    const [shape] = reliefShapes(item);
    const inner = 0.3 - 0.1;
    let checked = 0;
    for (const p of shape.getPoints(32)) {
      const x = p.x - 0.05;
      const y = p.y + 0.02;
      if (Math.abs(x) <= inner + 1e-9 || Math.abs(y) <= inner + 1e-9) continue;
      const d = Math.hypot(Math.abs(x) - inner, Math.abs(y) - inner);
      expect(d).toBeCloseTo(0.1, 9);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('光滑造型不该用像素拼', () => {
  it('没有格子细到看不出像素风的像素图（那是在用台阶近似曲线）', () => {
    const tooFine = [];
    for (const { badges } of BRANDS) {
      for (const b of badges) {
        for (const r of b.relief ?? []) {
          if (r.kind === 'pixels' && r.cell < 0.008) tooFine.push(`${b.id}: cell ${r.cell}`);
        }
      }
    }
    expect(tooFine).toEqual([]);
  });
});
