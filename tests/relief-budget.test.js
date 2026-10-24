// 浮雕的几何预算：segments 控制分段数，share 让重复的小件共用一份几何体，disposeBadge 每份只释放一次。
import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import brand from '../src/brands/claude-code/brand.js';
import badges from '../src/brands/claude-code/index.js';
import { BRANDS } from '../src/brands/index.js';
import { DEFAULT_SEGMENTS, reliefGeometry } from '../src/engine/relief.js';
import { buildBadge, disposeBadge, swapRelief } from '../src/engine/badge.js';
import { validateBadge } from '../src/engine/validate.js';

const count = (g) => g.attributes.position.count;
const box = (g) => {
  g.computeBoundingBox();
  return g.boundingBox;
};
const state = { unlocked: true, earnedAt: null, progress: { current: 1, target: 1 } };

/** 一枚最简单的圆章，正面放 items，背面放 back。 */
const coin = (items, back = []) => ({
  ...badges[0],
  tiers: undefined,
  criteria: { target: 1 },
  relief: items,
  backRelief: back,
  back: { material: 'enamel', color: 'graphite', engraving: false },
});

describe('segments：分段数', () => {
  const tile = { kind: 'rounded-rect', half: 0.0176, radius: 0.0048, center: [0.1, 0.2], material: 'ceramic', color: 'primary', height: 0.05, bevel: 0.006 };

  it('不写时和原来一样：曲线 30 段、倒角 4 段', () => {
    expect(DEFAULT_SEGMENTS).toEqual({ curve: 30, bevel: 4 });
    expect(count(reliefGeometry(tile))).toBe(count(reliefGeometry({ ...tile, segments: { curve: 30, bevel: 4 } })));
  });

  it('写少一点：顶点少一个数量级，外形尺寸不变', () => {
    const full = reliefGeometry(tile);
    const lean = reliefGeometry({ ...tile, segments: { curve: 4, bevel: 2 } });
    expect(count(lean) * 8).toBeLessThan(count(full));
    const a = box(full);
    const b = box(lean);
    for (const k of ['x', 'y', 'z']) {
      expect(b.min[k]).toBeCloseTo(a.min[k], 6);
      expect(b.max[k]).toBeCloseTo(a.max[k], 6);
    }
  });

  it('只给一项时另一项用默认值', () => {
    const curveOnly = reliefGeometry({ ...tile, segments: { curve: 4 } });
    const both = reliefGeometry({ ...tile, segments: { curve: 4, bevel: 4 } });
    expect(count(curveOnly)).toBe(count(both));
  });

  it('校验：整数、范围、只能有 curve 和 bevel、文字和宝石不支持', () => {
    const ok = (item) => () => validateBadge(coin([item]), brand);
    expect(ok({ ...tile, segments: { curve: 4, bevel: 2 } })).not.toThrow();
    expect(ok({ ...tile, segments: { curve: 0 } })).toThrow(/segments.curve/);
    expect(ok({ ...tile, segments: { curve: 2.5 } })).toThrow(/segments.curve/);
    expect(ok({ ...tile, segments: { bevel: 9 } })).toThrow(/segments.bevel/);
    expect(ok({ ...tile, segments: { steps: 3 } })).toThrow(/只能有 curve、bevel/);
    expect(ok({ kind: 'gem', radius: 0.04, material: 'enamel', color: 'primary', segments: { curve: 4 } })).toThrow(/不起作用/);
  });

  it('陈列墙上的徽章都没写 segments 和 share（都按原来的方式画）', () => {
    const marked = BRANDS.flatMap(({ badges: list }) => list.filter((b) => /"(segments|share)"/.test(JSON.stringify(b))).map((b) => b.id));
    expect(marked).toEqual([]);
  });
});

describe('share：重复的小件共用几何体', () => {
  const bead = (x, y) => ({ kind: 'circle', radius: 0.0085, center: [x, y], material: 'polished-metal', color: 'gold', height: 0.012, bevel: 0.003, share: true });
  const front = [bead(0.5, 0), bead(0, 0.5), { ...bead(-0.5, 0), color: 'silver' }];
  const back = [bead(0.5, 0), bead(0, -0.5)];

  it('除 center、材质、颜色外相同的件共用一份几何体，网格挪到 center', () => {
    const g = buildBadge(coin(front, back), brand, state);
    const fronts = g.children.filter((m) => m.userData.side !== 'back').slice(-3);
    const backs = g.children.filter((m) => m.userData.side === 'back');
    expect(new Set(fronts.map((m) => m.geometry)).size).toBe(1);
    expect(new Set(backs.map((m) => m.geometry)).size).toBe(1);
    // 正反面各一份：背面的几何体转过半圈
    expect(fronts[0].geometry).not.toBe(backs[0].geometry);
    expect(fronts.map((m) => [m.position.x, m.position.y])).toEqual([[0.5, 0], [0, 0.5], [-0.5, 0]]);
    // 共用的是这枚徽章自己的，不标 userData.shared
    expect(fronts[0].geometry.userData.shared).toBeUndefined();
  });

  it('摆出来的位置和不共用时一样（背面 x 取反）', () => {
    const plain = (items) => items.map(({ share: _s, ...r }) => r);
    const a = buildBadge(coin(front, back), brand, state);
    const b = buildBadge(coin(plain(front), plain(back)), brand, state);
    const boxes = (g) => g.children.slice(-5).map((m) => new Box3().setFromObject(m).getCenter(new Vector3()));
    const ba = boxes(a);
    const bb = boxes(b);
    ba.forEach((c, i) => {
      expect(c.x).toBeCloseTo(bb[i].x, 6);
      expect(c.y).toBeCloseTo(bb[i].y, 6);
      expect(c.z).toBeCloseTo(bb[i].z, 6);
    });
  });

  it('校验：share 只能是布尔值，不能和底纹、渐变一起用', () => {
    const ok = (item) => () => validateBadge(coin([item]), brand);
    expect(ok(bead(0, 0))).not.toThrow();
    expect(ok({ ...bead(0, 0), share: 'yes' })).toThrow(/share/);
    expect(ok({ ...bead(0, 0), pattern: 'rings' })).toThrow(/不能 share/);
    expect(ok({ ...bead(0, 0), gradient: ['gold', 'silver'] })).toThrow(/不能 share/);
  });
});

describe('disposeBadge 和共用资源', () => {
  const spy = (badge) => {
    const calls = new Map();
    badge.traverse((o) => {
      if (!o.isMesh) return;
      for (const r of [o.geometry, o.material]) {
        if (calls.has(r)) continue;
        calls.set(r, 0);
        r.addEventListener('dispose', () => calls.set(r, calls.get(r) + 1));
      }
    });
    return calls;
  };

  it('共用的几何体和材质各释放一次；机身几何体（userData.shared）不释放', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ kind: 'circle', radius: 0.01, center: [Math.cos(i) * 0.6, Math.sin(i) * 0.6], material: 'polished-metal', color: 'gold', height: 0.012, share: true }));
    const g = buildBadge(coin(items, items), brand, state);
    const calls = spy(g);
    disposeBadge(g);
    for (const [r, n] of calls) expect(n, r.type ?? r.constructor.name).toBe(r.userData?.shared ? 0 : 1);
    expect([...calls.keys()].filter((r) => r.isBufferGeometry && !r.userData.shared)).toHaveLength(2);
  });

  it('swapRelief：换上的几何体底面仍在正面板上，旧的释放', () => {
    const arc = { kind: 'text-arc', text: '0 OF 9', arc: 'bottom', radius: 0.69, size: 0.088, material: 'polished-metal', color: 'gold', height: 0.024 };
    const g = buildBadge(coin([arc]), brand, state);
    const mesh = g.children.at(-1);
    const old = mesh.geometry;
    let freed = false;
    old.addEventListener('dispose', () => (freed = true));
    const z0 = box(old).min.z;
    swapRelief(g, mesh, { ...arc, text: '7 OF 9' });
    expect(freed).toBe(true);
    expect(mesh.geometry).not.toBe(old);
    expect(box(mesh.geometry).min.z).toBeCloseTo(z0, 6);
  });
});
