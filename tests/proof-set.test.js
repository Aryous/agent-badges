import { describe, expect, it } from 'vitest';
import { CASE, caseLayout, mintedMonths, monthStats, monthSums, monthTier, plaqueStatus } from '../src/viewer/proof-set.js';

// 两个工具的按天用量：[Token, 对话轮数]
const cc = {
  '2026-01-03': [100, 2],
  '2026-01-20': [300, 4],
  '2026-03-01': [1000, 9],
  '2025-12-31': [999, 1],
};
const cx = {
  '2026-01-03': [50, 1],
  '2026-02-10': [400, 3],
};

describe('每个月的用量', () => {
  it('按月相加，只算这一年', () => {
    const sums = monthSums([cc, cx], 2026);
    expect(sums).toHaveLength(12);
    expect(sums.slice(0, 4)).toEqual([450, 400, 1000, 0]);
    expect(monthSums([cc], 2025)[11]).toBe(999);
  });

  it('只开一个工具时只算那个工具', () => {
    expect(monthSums([cc], 2026).slice(0, 3)).toEqual([400, 0, 1000]);
    expect(monthSums([cx], 2026).slice(0, 3)).toEqual([50, 400, 0]);
  });

  it('活跃天数：同一天两个工具都用只算一天', () => {
    const stats = monthStats([cc, cx], 2026);
    expect(stats[0]).toEqual({ tokens: 450, days: 2 });
    expect(stats[1]).toEqual({ tokens: 400, days: 1 });
  });
});

describe('外圈金属的分级', () => {
  it('以最多那个月的 1/4、1/2、3/4 为界：锡、铜、银、金', () => {
    expect(monthTier(24, 100)).toBe(0);
    expect(monthTier(25, 100)).toBe(1);
    expect(monthTier(49, 100)).toBe(1);
    expect(monthTier(50, 100)).toBe(2);
    expect(monthTier(74, 100)).toBe(2);
    expect(monthTier(75, 100)).toBe(3);
    expect(monthTier(100, 100)).toBe(3);
  });

  it('这一年没有用量：锡', () => {
    expect(monthTier(0, 0)).toBe(0);
  });
});

describe('哪些月份有月章', () => {
  it('有活动且已经开始的月份；空月份和还没到的月份不铸币', () => {
    const stats = monthStats([cc, cx], 2026);
    expect(mintedMonths(stats, 2026, '2026-10-24')).toEqual([0, 1, 2]);
    // 3 月还没到：即使有数据也不算
    expect(mintedMonths(stats, 2026, '2026-02-15')).toEqual([0, 1]);
  });

  it('只有对话没有 Token 的日子也算活动', () => {
    const stats = monthStats([{ '2026-04-02': [0, 3] }], 2026);
    expect(mintedMonths(stats, 2026, '2026-10-24')).toEqual([3]);
  });
});

describe('铭牌', () => {
  it('今年：MINTING · n / 12', () => {
    expect(plaqueStatus(2026, 10, '2026-10-24')).toBe('MINTING · 10 / 12');
  });

  it('往年：SEALED · 12.31', () => {
    expect(plaqueStatus(2025, 7, '2026-10-24')).toBe('SEALED · 12.31');
  });
});

describe('礼盒的版式和铸币直径', () => {
  it('电脑：6 × 2，直径按板子的高度算，典型约 120px', () => {
    const l = caseLayout({ width: 1116, plateHeight: 333 });
    expect(l).toMatchObject({ cols: 6, rows: 2, stacked: false, height: 333 });
    expect(l.coin).toBe(Math.floor((333 - 2 * CASE.pad - 2 * CASE.trayY - CASE.gap) / 2));
    expect(l.coin).toBeGreaterThanOrEqual(112);
    expect(l.coin).toBeLessThanOrEqual(128);
  });

  it('板子变宽但不变高：直径不跟着变大（不拉伸）', () => {
    expect(caseLayout({ width: 1600, plateHeight: 333 }).coin).toBe(caseLayout({ width: 1116, plateHeight: 333 }).coin);
  });

  it('宽度不够时按宽度缩小，6 枚连同间距放得下', () => {
    const l = caseLayout({ width: 962, plateHeight: 313 });
    expect(l.cols).toBe(6);
    const tray = 962 - 2 * CASE.pad - CASE.side - CASE.sideGap - 2 * CASE.trayX;
    expect(6 * l.coin + 5 * CASE.gap).toBeLessThanOrEqual(tray);
    expect(l.coin).toBeGreaterThanOrEqual(CASE.coinMin);
  });

  it('有下限：6 × 2 放不下时换成竖排，铭牌在上，铸币不小于下限', () => {
    const l = caseLayout({ width: 752, plateHeight: 310 });
    expect(l.stacked).toBe(true);
    expect(l.cols * l.rows).toBe(12);
    expect(l.coin).toBeGreaterThanOrEqual(CASE.coinMin);
  });

  it('手机：3 × 4，礼盒比板子高', () => {
    const l = caseLayout({ width: 358, plateHeight: 450 });
    expect(l).toMatchObject({ cols: 3, rows: 4, stacked: true });
    expect(l.height).toBeGreaterThan(450);
    const tray = 358 - 2 * CASE.pad - 2 * CASE.stackTrayX;
    expect(3 * l.coin + 2 * CASE.stackGap).toBeLessThanOrEqual(tray);
  });
});
