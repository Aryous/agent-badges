import { describe, expect, it } from 'vitest';
import { BRANDS } from '../src/brands/index.js';
import { SHOWCASE_DATE, filledState, peakState, surpriseKeptState } from '../src/brands/shared/showcase.js';

// 三套展示用状态，期望值照抄自原来 src/site/main.js、src/project/studio.js、tools/promo/main.js 里手写的规则
const all = BRANDS.flatMap((b) => b.badges);
const hidden = all.find((c) => c.hidden);
const plain = all.find((c) => !c.hidden && !c.tiers);
const surprise = all.find((c) => c.tiers?.at(-1).variants);
const noSurprise = { ...surprise, tiers: surprise.tiers.map(({ variants: _v, ...t }) => t) };
const base = { unlocked: false, earnedAt: '2025-08-02', tier: 1, value: 1_200_000_000, progress: { current: 1_200_000_000, target: 10_000_000_000 } };

describe('peakState（落地页）', () => {
  it('分级徽章看最高一级', () => {
    expect(peakState(surprise)).toEqual({ unlocked: true, earnedAt: SHOWCASE_DATE, tier: surprise.tiers.length - 1, value: 0, progress: { current: 1, target: 1 } });
  });
  it('普通徽章已解锁、没有等级', () => {
    expect(peakState(plain)).toEqual({ unlocked: true, earnedAt: '2026-10-24', tier: null, value: 0, progress: { current: 1, target: 1 } });
  });
  it('隐藏徽章保持神秘', () => {
    expect(peakState(hidden)).toEqual({ unlocked: false, earnedAt: null, tier: null, value: 0, progress: { current: 0, target: 1 } });
  });
});

describe('surpriseKeptState（studio 素材）', () => {
  it('最高一级是随机彩蛋时，展示它下面一级，其余字段沿用示例数据', () => {
    expect(surpriseKeptState(surprise, base)).toEqual({ ...base, unlocked: true, earnedAt: '2025-08-02', tier: surprise.tiers.length - 2 });
  });
  it('最高一级不是彩蛋时就展示最高一级', () => {
    expect(surpriseKeptState(noSurprise, base).tier).toBe(noSurprise.tiers.length - 1);
  });
  it('示例数据没有日期时用展示日期', () => {
    expect(surpriseKeptState(plain, { ...base, earnedAt: null })).toEqual({ ...base, unlocked: true, earnedAt: SHOWCASE_DATE, tier: null });
  });
  it('隐藏徽章：在示例数据上改成未解锁', () => {
    expect(surpriseKeptState(hidden, base)).toEqual({ ...base, unlocked: false, earnedAt: null, tier: null });
  });
});

describe('filledState（宣传片）', () => {
  it('默认最高一级，进度按这一级的门槛填满', () => {
    const top = surprise.tiers.length - 1;
    const value = surprise.tiers[top].threshold;
    expect(filledState(surprise)).toEqual({ unlocked: true, earnedAt: '2026-05-02', tier: top, value, progress: { current: value, target: value } });
  });
  it('可以指定等级', () => {
    const value = surprise.tiers[1].threshold;
    expect(filledState(surprise, 1)).toEqual({ unlocked: true, earnedAt: '2026-05-02', tier: 1, value, progress: { current: value, target: value } });
  });
  it('可以指定第 0 级', () => {
    const value = surprise.tiers[0].threshold;
    expect(filledState(surprise, 0)).toEqual({ unlocked: true, earnedAt: '2026-05-02', tier: 0, value, progress: { current: value, target: value } });
  });
  it('普通徽章进度是 1 / 1', () => {
    expect(filledState(plain)).toEqual({ unlocked: true, earnedAt: '2026-05-02', tier: null, value: 1, progress: { current: 1, target: 1 } });
  });
});
