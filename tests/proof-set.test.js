import { describe, expect, it } from 'vitest';
import { PLATE_MIN, caseLayout, mintedMonths, monthStats, monthSums, monthTier, plaqueStatus } from '../src/viewer/proof-set.js';

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
  it('板子的最小高度是 364：铸币 120px 时礼盒的高度', () => {
    expect(PLATE_MIN).toBe(364);
    expect(caseLayout({ width: 1116, plateHeight: 364 }).coin).toBe(120);
  });

  it('电脑、中等宽度、手机：只返回铸币直径和是否窄版，板子 364 高时铸币都是 120（不再有竖排）', () => {
    for (const width of [1440, 820, 390]) {
      const l = caseLayout({ width, plateHeight: 364 });
      expect(Object.keys(l).sort()).toEqual(['coin', 'narrow']);
      expect(l.coin).toBe(120);
    }
  });

  it('铸币不超过 120：板子再高也不放大', () => {
    expect(caseLayout({ width: 1116, plateHeight: 900 }).coin).toBe(120);
    expect(caseLayout({ width: 358, plateHeight: 900 }).coin).toBe(120);
  });

  it('板子比最小高度矮（落地页之类没有礼盒的场合不会发生，这里只验算式）：按高度缩小', () => {
    expect(caseLayout({ width: 1116, plateHeight: PLATE_MIN - 10 }).coin).toBe(115);
  });

  it('宽度不影响直径：放不下 6 枚时托盘横向滑动，不缩小', () => {
    expect(caseLayout({ width: 358, plateHeight: PLATE_MIN }).coin).toBe(caseLayout({ width: 1116, plateHeight: PLATE_MIN }).coin);
  });

  it('礼盒宽度小于 700px 时铭牌栏收成竖条', () => {
    expect(caseLayout({ width: 1116, plateHeight: PLATE_MIN }).narrow).toBe(false);
    expect(caseLayout({ width: 700, plateHeight: PLATE_MIN }).narrow).toBe(false);
    expect(caseLayout({ width: 699, plateHeight: PLATE_MIN }).narrow).toBe(true);
    expect(caseLayout({ width: 358, plateHeight: PLATE_MIN }).narrow).toBe(true);
  });
});
