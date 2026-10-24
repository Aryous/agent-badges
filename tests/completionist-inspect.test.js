// 单枚查看里的全解锁徽章：临时 item、下一阶段、副标题和进度文字。
import { describe, expect, it } from 'vitest';
import { BRANDS } from '../src/brands/index.js';
import { nextStage } from '../src/brands/shared/completionist.js';
import { describeCompletionist } from '../src/viewer/describe.js';
import { completionistItem } from '../src/viewer/completionist.js';
import { buildBadge } from '../src/engine/badge.js';

const { completionist: kit, badges, brand } = BRANDS.find((b) => b.brand.id === 'claude-code');
const on = (earnedAt) => ({ unlocked: true, earnedAt, tier: null, progress: { current: 1, target: 1 } });
const off = { unlocked: false, earnedAt: null, tier: null, progress: { current: 0, target: 1 } };
/** n 枚徽章，前 k 枚已解锁，解锁日期依次往后。 */
const itemsOf = (k, n) =>
  badges.slice(0, n).map((config, i) => ({ config, state: i < k ? on(`2026-0${1 + (i % 9)}-1${i % 10}`) : off }));

describe('下一阶段', () => {
  it('锡、铜、银：下一种金属，还差到下一个分段点的枚数', () => {
    expect(nextStage(0, 32)).toEqual({ metal: 'bronze', remaining: 8 });
    expect(nextStage(7, 32)).toEqual({ metal: 'bronze', remaining: 1 });
    expect(nextStage(8, 32)).toEqual({ metal: 'silver', remaining: 8 });
    expect(nextStage(22, 32)).toEqual({ metal: 'gold', remaining: 2 });
    expect(nextStage(14, 30)).toEqual({ metal: 'silver', remaining: 1 });
  });

  it('金：下一阶段是完成，还差 n − k', () => {
    expect(nextStage(27, 32)).toEqual({ metal: 'complete', remaining: 5 });
    expect(nextStage(23, 30)).toEqual({ metal: 'complete', remaining: 7 });
  });

  it('已完成没有下一阶段', () => {
    expect(nextStage(32, 32)).toBeNull();
  });
});

describe('副标题和进度文字', () => {
  const st = (k, n, earnedAt = null) => ({ unlocked: k > 0, earnedAt, tier: null, progress: { current: k, target: n } });

  it('进行中：副标题写当前阶段，进度条后面写下一阶段和还差几枚', () => {
    expect(describeCompletionist(st(22, 32), 'zh')).toEqual({ kicker: '当前阶段：银', meter: '22 / 32 · 下一阶段：金，还差 2 枚' });
    expect(describeCompletionist(st(22, 32), 'en')).toEqual({ kicker: 'Stage: silver', meter: '22 / 32 · next stage: gold, 2 to go' });
  });

  it('金阶段：下一阶段是「完成」', () => {
    expect(describeCompletionist(st(27, 32), 'zh').meter).toBe('27 / 32 · 下一阶段：完成，还差 5 枚');
    expect(describeCompletionist(st(27, 32), 'en').meter).toBe('27 / 32 · next stage: complete, 5 to go');
  });

  it('一枚没解锁：锡，还差到铜的枚数', () => {
    expect(describeCompletionist(st(0, 30), 'zh')).toEqual({ kicker: '当前阶段：锡', meter: '0 / 30 · 下一阶段：铜，还差 8 枚' });
  });

  it('已完成：不显示进度条，副标题写完成日期；没有日期就不写', () => {
    expect(describeCompletionist(st(32, 32, '2026-09-30'), 'zh')).toEqual({ kicker: '已获得 · 2026.09.30', meter: null });
    expect(describeCompletionist(st(32, 32, '2026-09-30'), 'en')).toEqual({ kicker: 'Earned · 2026.09.30', meter: null });
    expect(describeCompletionist(st(32, 32), 'zh')).toEqual({ kicker: '已获得', meter: null });
  });
});

describe('临时 item', () => {
  it('配置是当前阶段的静态版，状态按陈列墙算', () => {
    const item = completionistItem(kit, itemsOf(22, 32));
    expect(item.config.id).toBe('completionist');
    expect(item.config.shape.type).toBe('circle');
    expect(item.config.layers[0].color).toBe('silver');
    expect(item.config.back.engraving).toBe(false);
    expect(item.state).toEqual({ unlocked: true, earnedAt: null, tier: null, progress: { current: 22, target: 32 } });
    expect(item.award).toBe(true);
    expect(item.holder).toBeNull();
  });

  it('全部解锁：完成形态，日期是最晚解锁的那一枚', () => {
    const items = itemsOf(12, 12);
    const latest = items.map((it) => it.state.earnedAt).sort().at(-1);
    const item = completionistItem(kit, items);
    expect(item.config.shape.type).toBe('starburst');
    expect(item.state).toEqual({ unlocked: true, earnedAt: latest, tier: null, progress: { current: 12, target: 12 } });
  });

  it('一枚没解锁：锡是起步阶段，按已解锁画（锡色、残影），只是没有获得动画可播', () => {
    const item = completionistItem(kit, itemsOf(0, 32));
    expect(item.state.unlocked).toBe(true);
    expect(item.award).toBe(false);
    expect(item.config.layers[0].color).toBe('pewter');
    expect(item.config.relief.filter((r) => r.color === 'ghost')).toHaveLength(kit.tiles().length);
    // 和概览一致：副标题写「当前阶段：锡」
    expect(describeCompletionist(item.state, 'zh').kicker).toBe('当前阶段：锡');
    // 组装出来不是灰色的未解锁材质
    const badge = buildBadge(item.config, brand, item.state, { engraving: 0 });
    expect(badge.userData.locked).toBe(false);
    expect(badge.getObjectByName('rim').material.userData.preset).toBe('polished-metal');
  });

  it('解锁了一枚以上：有获得动画', () => {
    expect(completionistItem(kit, itemsOf(1, 32)).award).toBe(true);
    expect(completionistItem(kit, itemsOf(32, 32)).award).toBe(true);
  });
});
