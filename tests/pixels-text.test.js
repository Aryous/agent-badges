import { describe, expect, it } from 'vitest';
import { ShapeUtils } from 'three';
import { pixelShapes } from '../src/engine/pixels.js';
import { arcTextGeometry, glyphShapes, layoutArc } from '../src/engine/text.js';
import { CLAWD } from '../src/brands/claude-code/mascot.js';

describe('pixelShapes', () => {
  it('实心方块 → 1 个外轮廓、4 个顶点', () => {
    const [s, ...rest] = pixelShapes(['##', '##'], { cell: 1 });
    expect(rest).toHaveLength(0);
    expect(s.getPoints()).toHaveLength(4);
    expect(Math.abs(ShapeUtils.area(s.getPoints()))).toBeCloseTo(4);
  });

  it('回字形 → 1 个外轮廓 + 1 个洞', () => {
    const shapes = pixelShapes(['###', '#.#', '###'], { cell: 1 });
    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(1);
  });

  it('Claude Code 小怪物：身体和腿连成 1 块，眼睛是 2 个洞，以中心为原点', () => {
    const shapes = pixelShapes(CLAWD, { cell: 0.1 });
    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(2);
    const xs = shapes.flatMap((s) => s.getPoints().map((p) => p.x));
    expect(Math.min(...xs)).toBeCloseTo(-0.8);
    expect(Math.max(...xs)).toBeCloseTo(0.8);
  });

  it('对角相接的格子不会生成自交轮廓', () => {
    const shapes = pixelShapes(['#.', '.#'], { cell: 1 });
    expect(shapes).toHaveLength(2);
    shapes.forEach((s) => expect(Math.abs(ShapeUtils.area(s.getPoints()))).toBeCloseTo(1));
  });
});

describe('文字环', () => {
  it('字母 O 有一个洞，字母 L 没有洞', () => {
    const o = glyphShapes('O');
    expect(o).toHaveLength(1);
    expect(o[0].holes).toHaveLength(1);
    expect(glyphShapes('L')[0].holes).toHaveLength(0);
  });

  it('上弧从左往右读：第一个字母在左边（角度更大），整体以正上方为中心', () => {
    const { chars } = layoutArc({ text: 'ABC', radius: 0.7, size: 0.1, arc: 'top' });
    expect(chars[0].angle).toBeGreaterThan(chars[2].angle);
    expect((chars[0].angle + chars[2].angle) / 2).toBeCloseTo(Math.PI / 2);
  });

  it('下弧从左往右读：第一个字母在左边（角度更小），整体以正下方为中心', () => {
    const { chars } = layoutArc({ text: 'ABC', radius: 0.7, size: 0.1, arc: 'bottom' });
    expect(chars[0].angle).toBeLessThan(chars[2].angle);
    expect((chars[0].angle + chars[2].angle) / 2).toBeCloseTo(-Math.PI / 2);
  });

  it('上弧文字落在 [radius - size/2, radius + size/2] 的环带内，高度正确', () => {
    const geo = arcTextGeometry({ text: 'CLAUDE CODE', radius: 0.7, size: 0.1, arc: 'top', height: 0.03 });
    const pos = geo.attributes.position;
    let rMin = Infinity;
    let rMax = 0;
    let zMax = 0;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      rMin = Math.min(rMin, r);
      rMax = Math.max(rMax, r);
      zMax = Math.max(zMax, pos.getZ(i));
    }
    expect(rMin).toBeGreaterThan(0.7 - 0.05 - 0.01);
    expect(rMax).toBeLessThan(0.7 + 0.05 + 0.03); // 字母宽度会让外角略超出
    expect(zMax).toBeCloseTo(0.03, 3);
  });

  it('不支持的字符报错', () => {
    expect(() => layoutArc({ text: '中', radius: 1, size: 0.1 })).toThrow(/中/);
  });
});
