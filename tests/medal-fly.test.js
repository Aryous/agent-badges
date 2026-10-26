import { describe, expect, it } from 'vitest';
import { computeFocusLayout, rectToWorld } from '../src/viewer/inspector.js';

// 舞台 1000 × 800 像素，半高 4 个单位 → 每单位 100 像素
const view = { width: 1000, height: 800, halfH: 4, halfW: 5, aspect: 1.25 };

describe('屏幕矩形换算成舞台坐标', () => {
  it('画面正中的矩形落在原点', () => {
    const r = rectToWorld(view, { left: 440, top: 340, width: 120, height: 120 }, 0.94);
    expect(r.x).toBeCloseTo(0, 6);
    expect(r.y).toBeCloseTo(0, 6);
  });

  it('x 向右、y 向上；徽章半径 = 图片边长 × fill / 2 / 1.06', () => {
    const r = rectToWorld(view, { left: 0, top: 0, width: 120, height: 120 }, 0.94);
    expect(r.x).toBeCloseTo((60 - 500) / 100, 6);
    expect(r.y).toBeCloseTo((400 - 60) / 100, 6);
    expect(r.scale).toBeCloseTo((120 * 0.94) / 2 / 1.06 / 100, 6);
  });

  it('和单枚查看的布局同一套比例：布局的 scale 换回像素就是布局的直径', () => {
    const layout = computeFocusLayout(view, { top: 80, bottom: 200 });
    const px = layout.scale * 1.06 * 2 * 100; // 含余量的直径（像素）
    const back = rectToWorld(view, { left: 500 - px / 2, top: 400 - layout.y * 100 - px / 2, width: px, height: px }, 1);
    expect(back.scale).toBeCloseTo(layout.scale, 6);
    expect(back.y).toBeCloseTo(layout.y, 6);
  });
});
