// 概览区全解锁徽章的进场时间轴：分段点、阶段升级、每段时长。
import { describe, expect, it } from 'vitest';
import { BRANDS } from '../src/brands/index.js';
import { completionistConfig } from '../src/brands/shared/completionist.js';
import { buildBadge, disposeBadge } from '../src/engine/badge.js';
import { coinMeshes, coinState, introStops, segmentDuration } from '../src/viewer/completionist.js';

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
        for (const list of [m.lit, m.ghost, m.counts]) {
          expect(list.every((o) => o?.isMesh)).toBe(true);
          expect(new Set(list).size).toBe(list.length);
        }
        expect(m.lit).toHaveLength(parts.tileCenters.length);
        expect(m.ghost).toHaveLength(parts.tileCenters.length);
        expect(m.counts).toHaveLength(k + 1);
        // 三组互不重叠
        expect(new Set([...m.lit, ...m.ghost, ...m.counts]).size).toBe(m.lit.length + m.ghost.length + m.counts.length);
        // 阶段金属：至少一份材质，外圈也用它
        expect(m.metals.size).toBeGreaterThanOrEqual(1);
        expect(m.metals.has(badge.getObjectByName('rim').material)).toBe(true);
        disposeBadge(badge);
      });
    }
  }
});
