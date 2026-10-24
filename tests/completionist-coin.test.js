// 概览区全解锁徽章的进场时间轴：分段点、阶段升级、每段时长。
import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import { BRANDS } from '../src/brands/index.js';
import { completionistConfig } from '../src/brands/shared/completionist.js';
import { buildBadge, disposeBadge } from '../src/engine/badge.js';
import { mergeByMaterial } from '../src/engine/merge.js';
import { countText } from '../src/brands/shared/completionist.js';
import { Tweens } from '../src/viewer/anim.js';
import { coinMeshes, coinState, introStops, needsFrame, segmentDuration } from '../src/viewer/completionist.js';

describe('全解锁徽章的进场分段', () => {
  it('没有解锁：只有 0 这一点，不升级', () => {
    expect(introStops(0, 32)).toEqual([{ to: 0, stage: 0 }]);
  });

  it('不到四分之一：一段推到 k，停在锡', () => {
    expect(introStops(7, 32)).toEqual([{ to: 7, stage: 0 }]);
  });

  it('正好 ⌈n/4⌉：分段点和 k 重合，只走一段，升到铜', () => {
    expect(introStops(8, 32)).toEqual([{ to: 8, stage: 1 }]);
    expect(introStops(8, 30)).toEqual([{ to: 8, stage: 1 }]);
  });

  it('22 / 32：先到 8 升铜，再到 16 升银，最后推到 22', () => {
    expect(introStops(22, 32)).toEqual([
      { to: 8, stage: 1 },
      { to: 16, stage: 2 },
      { to: 22, stage: 2 },
    ]);
  });

  it('全部解锁：三个分段点各升一级，最后到 n', () => {
    expect(introStops(30, 30)).toEqual([
      { to: 8, stage: 1 },
      { to: 15, stage: 2 },
      { to: 23, stage: 3 },
      { to: 30, stage: 3 },
    ]);
  });

  it('徽章很少、分段点重合时去重，一次升到那一点对应的阶段', () => {
    // n = 2：⌈n/4⌉ = ⌈n/2⌉ = 1，⌈3n/4⌉ = 2
    const stops = introStops(2, 2);
    expect(stops.map((s) => s.to)).toEqual([1, 2]);
    expect(stops.map((s) => s.stage)).toEqual([2, 3]);
  });

  it('每段时长 0.35 + 枚数 × 0.085 秒', () => {
    expect(segmentDuration(0, 8)).toBeCloseTo(0.35 + 8 * 0.085);
    expect(segmentDuration(16, 22)).toBeCloseTo(0.35 + 6 * 0.085);
  });
});

// 动画版按子节点顺序找网格：badge.js 先装背面浮雕、再装正面，顺序一变动画就会点错片
describe('动画版的网格映射', () => {
  for (const { brand, badges, completionist: kit } of BRANDS) {
    for (const k of [0, badges.length]) {
      it(`${brand.id} ${k} / ${badges.length}`, () => {
        const n = badges.length;
        const { config, parts } = completionistConfig(kit, { unlocked: k, total: n, metal: 'stage', anim: true });
        const badge = buildBadge(config, brand, coinState(k, n), { engraving: 0 });
        const m = coinMeshes(badge, config, parts);
        expect(m.front).toHaveLength(config.relief.length);
        expect(m.front.every((o) => o.isMesh && o.userData.side !== 'back')).toBe(true);
        // 正面切片的前一个子节点是背面浮雕：切片没有多吃也没有少吃
        expect(badge.children[badge.children.length - config.relief.length - 1].userData.side).toBe('back');
        for (const list of [m.lit, m.ghost]) {
          expect(list.every((o) => o?.isMesh)).toBe(true);
          expect(new Set(list).size).toBe(list.length);
        }
        const T = kit.tiles().length;
        expect(m.lit).toHaveLength(T);
        expect(m.ghost).toHaveLength(T);
        expect(m.count.isMesh).toBe(true);
        // 三组互不重叠
        expect(new Set([...m.lit, ...m.ghost, m.count]).size).toBe(2 * T + 1);
        // 亮片共用一份几何体，网格摆在各自的中心（缩放时原地弹出）；残影在原位生成
        expect(new Set(m.lit.map((o) => o.geometry)).size).toBe(1);
        m.lit.forEach((o, t) => expect([o.position.x, o.position.y]).toEqual(kit.tiles()[t].center));
        expect(m.ghost.every((o) => o.position.x === 0 && o.position.y === 0)).toBe(true);
        // 阶段金属：至少一份材质，外圈也用它
        expect(m.metals.size).toBeGreaterThanOrEqual(1);
        expect(m.metals.has(badge.getObjectByName('rim').material)).toBe(true);
        disposeBadge(badge);
      });
    }
  }
});

describe('几何量', () => {
  const tris = (g) => {
    let n = 0;
    const seen = new Set();
    g.traverse((o) => {
      if (!o.isMesh || seen.has(o.geometry)) return;
      seen.add(o.geometry);
      n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    });
    return n;
  };
  for (const { brand, badges, completionist: kit } of BRANDS) {
    it(`${brand.id}：动画版和完成形态各不到 30 万个三角形（原来动画版 137 万–166 万）`, () => {
      const n = badges.length;
      const anim = completionistConfig(kit, { unlocked: n, total: n, metal: 'stage', anim: true });
      const a = buildBadge(anim.config, brand, coinState(n, n), { engraving: 0 });
      const f = buildBadge(completionistConfig(kit, { unlocked: n, total: n }).config, brand, coinState(n, n), { engraving: 0 });
      expect(tris(a)).toBeLessThan(300000);
      expect(tris(f)).toBeLessThan(300000);
      disposeBadge(a);
      disposeBadge(f);
    });
  }
});

describe('进场后合并网格', () => {
  for (const { brand, badges, completionist: kit } of BRANDS) {
    it(`${brand.id}：同材质并成一个网格，三角形一个不少，藏着的残影去掉`, () => {
      const n = badges.length;
      const k = Math.ceil(n / 2);
      const { config, parts } = completionistConfig(kit, { unlocked: k, total: n, metal: 'stage', anim: true });
      const badge = buildBadge(config, brand, coinState(k, n), { engraving: 0 });
      const m = coinMeshes(badge, config, parts);
      // 进场结束时的样子：前 lit 片亮着，其余残影
      const shown = Math.round((m.lit.length * k) / n);
      m.lit.forEach((o, i) => (o.visible = i < shown));
      m.ghost.forEach((o, i) => (o.visible = i >= shown));
      const visibleTris = () => {
        let t = 0;
        badge.traverse((o) => o.isMesh && o.visible && (t += o.geometry.attributes.position.count / 3));
        return t;
      };
      const materials = () => new Set(badge.children.filter((o) => o.visible).map((o) => o.material));
      const before = visibleTris();
      const mats = materials();
      // 每份材质的可见网格合起来的包围盒：合并后位置不能变（亮片靠网格位置摆放，合并时要算进去）
      const boxes = () => {
        const out = new Map();
        badge.updateMatrixWorld(true);
        for (const o of badge.children) {
          if (!o.isMesh || !o.visible || o.geometry.userData.shared) continue;
          if (!out.has(o.material)) out.set(o.material, new Box3());
          out.get(o.material).expandByObject(o);
        }
        return out;
      };
      const boxBefore = boxes();
      const freed = [];
      const geos = new Set();
      badge.traverse((o) => o.isMesh && geos.add(o.geometry));
      geos.forEach((g) => g.addEventListener('dispose', () => freed.push(g)));
      const { after } = mergeByMaterial(badge);
      expect(visibleTris()).toBe(before);
      for (const [mat, box] of boxes()) {
        const was = boxBefore.get(mat);
        for (const k of ['x', 'y', 'z']) {
          expect(box.min[k]).toBeCloseTo(was.min[k], 6);
          expect(box.max[k]).toBeCloseTo(was.max[k], 6);
        }
      }
      expect(materials()).toEqual(mats);
      // 每份材质一个网格，外加机身（外圈、滚花共用一份材质但几何体是共用的，不合并）
      expect(after).toBeLessThanOrEqual(mats.size + 4);
      expect(after).toBeLessThan(60);
      expect(badge.children.every((o) => o.visible)).toBe(true);
      // 机身几何体不释放，其余几何体各释放一次
      expect(freed.some((g) => g.userData.shared)).toBe(false);
      expect(new Set(freed).size).toBe(freed.length);
      disposeBadge(badge);
    });
  }
});

describe('减少动态效果时按需渲染', () => {
  it('不减少动态效果：一直画（摆动）', () => {
    expect(needsFrame({ reducedMotion: false, vel: 0, off: 0 })).toBe(true);
  });

  it('停在正面或背面、速度为零：不画', () => {
    expect(needsFrame({ reducedMotion: true, vel: 0, off: 0 })).toBe(false);
    expect(needsFrame({ reducedMotion: true, vel: 0, off: Math.PI })).toBe(false);
    expect(needsFrame({ reducedMotion: true, vel: 0.001, off: -Math.PI + 0.0005 })).toBe(false);
  });

  it('拖动中、有补间、还在滑行或没吸附到位：画', () => {
    expect(needsFrame({ reducedMotion: true, dragging: true, vel: 0, off: 0 })).toBe(true);
    expect(needsFrame({ reducedMotion: true, busy: true, vel: 0, off: 0 })).toBe(true);
    expect(needsFrame({ reducedMotion: true, vel: 0.5, off: 0 })).toBe(true);
    expect(needsFrame({ reducedMotion: true, vel: 0, off: 0.2 })).toBe(true);
  });
});

describe('补间清空', () => {
  it('clear() 放行所有等待者，之后列表为空', async () => {
    const tw = new Tweens();
    const a = tw.add({ duration: 1, update: () => {} });
    const b = tw.add({ duration: 2, update: () => {} });
    tw.clear();
    await expect(Promise.all([a, b])).resolves.toEqual([undefined, undefined]);
    expect(tw.list).toHaveLength(0);
  });
});

describe('下弧文字', () => {
  it('按进度生成：0..n−1 写「j OF n」，n 写 COMPLETIONIST', () => {
    expect(countText(0, 32)).toBe('0 OF 32');
    expect(countText(31, 32)).toBe('31 OF 32');
    expect(countText(32, 32)).toBe('COMPLETIONIST');
  });
});
