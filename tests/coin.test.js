import { describe, expect, it } from 'vitest';
import { BRANDS } from '../src/brands/index.js';
import { buildBadge, disposeBadge } from '../src/engine/badge.js';
import { COIN_ID, coinConfig } from '../src/engine/coin.js';

const dots = (c) => c.relief.filter((r) => r.role);
const state = (unlocked, total) => ({ unlocked: true, earnedAt: null, progress: { current: unlocked, target: total } });

describe('进度铸币', () => {
  it('一枚徽章一个凸点，点亮的数量等于解锁数', () => {
    const c = coinConfig({ unlocked: 27, total: 32 });
    expect(c.id).toBe(COIN_ID);
    expect(dots(c)).toHaveLength(32);
    expect(dots(c).filter((d) => d.role === 'lit')).toHaveLength(27);
  });

  it('凸点从正上方开始顺时针排，已解锁的排在前面', () => {
    const d = dots(coinConfig({ unlocked: 3, total: 30 }));
    expect(d[0].center[0]).toBeCloseTo(0, 6);
    expect(d[0].center[1]).toBeGreaterThan(0);
    expect(d[1].center[0]).toBeGreaterThan(0); // 顺时针：第二颗在右边
    expect(d.slice(0, 3).every((x) => x.role === 'lit')).toBe(true);
    expect(d.slice(3).every((x) => x.role === 'dim')).toBe(true);
  });

  it('中央写解锁数，下方写总数', () => {
    const c = coinConfig({ unlocked: 27, total: 32 });
    const texts = c.relief.filter((r) => r.kind === 'text').map((r) => r.text);
    expect(texts).toEqual(['27', '/ 32']);
  });

  it('边界：全没解锁、全部解锁、解锁数超过总数时按总数算', () => {
    expect(dots(coinConfig({ unlocked: 0, total: 30 })).filter((d) => d.role === 'lit')).toHaveLength(0);
    expect(dots(coinConfig({ unlocked: 30, total: 30 })).filter((d) => d.role === 'dim')).toHaveLength(0);
    expect(dots(coinConfig({ unlocked: 40, total: 30 })).filter((d) => d.role === 'lit')).toHaveLength(30);
  });

  it('输入兜底：解锁数非数按 0 算，总数为 0 时没有凸点', () => {
    const a = coinConfig({ unlocked: NaN, total: 30 });
    expect(dots(a)).toHaveLength(30);
    expect(dots(a).filter((d) => d.role === 'lit')).toHaveLength(0);
    expect(a.relief.filter((r) => r.kind === 'text')[0].text).toBe('0');
    const b = coinConfig({ unlocked: 2, total: 0 });
    expect(dots(b)).toHaveLength(0);
    expect(b.relief.filter((r) => r.kind === 'text').map((r) => r.text)).toEqual(['0', '/ 0']);
  });

  it('深色精制币：镜面黑币面不带纹理，外圈和凸起为金，未解锁点是暗色金属', () => {
    const c = coinConfig({ unlocked: 27, total: 32 });
    const face = c.layers.find((l) => l.kind === 'face');
    expect(face).toMatchObject({ material: 'polished-metal', color: 'onyx' });
    expect(face.pattern).toBeUndefined();
    expect(c.layers.find((l) => l.kind === 'rim').color).toBe('gold');
    const raised = c.relief.filter((r) => r.role !== 'dim');
    expect(raised.every((r) => r.color === 'gold' && r.material !== 'polished-metal')).toBe(true); // 磨砂，不和镜面抢
    const dim = dots(c).filter((d) => d.role === 'dim');
    expect(dim.every((d) => d.color !== 'gold')).toBe(true);
    expect(Math.max(...dim.map((d) => d.height))).toBeLessThan(Math.min(...dots(c).filter((d) => d.role === 'lit').map((d) => d.height)));
  });

  for (const { brand } of BRANDS) {
    it(`能用徽章引擎组装（${brand.id}）：外圈、滚花、正面、背面加上全部浮雕`, () => {
      const c = coinConfig({ unlocked: 27, total: 32 });
      const g = buildBadge(c, brand, state(27, 32), { engraving: 0 });
      const names = g.children.map((m) => m.name);
      expect(names).toEqual(expect.arrayContaining(['rim', 'reeding', 'face', 'back']));
      expect(g.children.length).toBe(4 + c.relief.length);
      disposeBadge(g);
    });
  }
});
