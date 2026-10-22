import { describe, expect, it } from 'vitest';
import { applySessionSegments, createComputeProgress, holidays, joinSegments, perfectMonth, segmentsOf } from '../src/data/metrics-common.js';

const at = (date, h, m = 0) => new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();
const ms = (date, h, m = 0) => Date.parse(at(date, h, m));
const MIN = 60_000;

describe('活动段', () => {
  it('相邻间隔不超过阈值就连成一段；再按大间隔连段与直接分段结果相同', () => {
    const t = [0, 5, 9, 30, 31, 100].map((m) => m * MIN);
    expect(segmentsOf(t)).toEqual([[0, 9 * MIN], [30 * MIN, 31 * MIN], [100 * MIN, 100 * MIN]]);
    expect(joinSegments(segmentsOf(t), 30 * MIN)).toEqual(segmentsOf(t, 30 * MIN));
  });

  it('协作时长：多个会话同时进行只算一次，离开超过 30 分钟不算，跨午夜按日期切开', () => {
    const days = applySessionSegments({}, [
      segmentsOf([ms('2026-05-01', 10), ms('2026-05-01', 10, 20)]),
      segmentsOf([ms('2026-05-01', 10, 10), ms('2026-05-01', 10, 30)]),
      segmentsOf([ms('2026-05-01', 23, 50), ms('2026-05-02', 0, 10)]),
      segmentsOf([ms('2026-05-03', 9), ms('2026-05-03', 9, 31)]), // 隔了 31 分钟：不计
    ], () => ({}));
    expect(days['2026-05-01'].activeMin).toBe(30 + 10);
    expect(days['2026-05-02'].activeMin).toBe(10);
    expect(days['2026-05-03'].activeMin).toBe(0);
  });
});

describe('全勤月', () => {
  it('进度显示本月已打卡的工作日', () => {
    expect(perfectMonth(['2026-10-01', '2026-10-02', '2026-10-03'], '2026-10-21')).toEqual({ date: null, current: 2, target: 22 });
  });
});

describe('节日', () => {
  it('春节只认表内年份，工具生日只认发布当年及之后', () => {
    expect(holidays['spring-festival']('2027-02-06')).toBe(true);
    expect(holidays['spring-festival']('2036-01-28')).toBe(false);
    expect(holidays.birthday('2025-02-24')('2026-02-24')).toBe(true);
    expect(holidays.birthday('2025-02-24')('2024-02-24')).toBe(false);
  });
});

describe('createComputeProgress：按规则表算每枚徽章的原始进度', () => {
  const rules = { a: (c, b) => ({ id: b.id, dates: c.dates }), b: () => ({ unlocked: false }) };
  const isActive = (d) => d.n > 0;
  const compute = createComputeProgress(rules, isActive, 'src/data/x-metrics.js');
  const ledger = { days: { '2026-03-01': { n: 1 }, '2026-03-02': { n: 0 } } };

  it('每枚徽章调用自己的规则，规则拿到的上下文只含活跃日', () => {
    expect(compute(ledger, [{ id: 'a' }, { id: 'b' }], '2026-03-05')).toEqual({ a: { id: 'a', dates: ['2026-03-01'] }, b: { unlocked: false } });
  });

  it('缺规则时报错，指出该去哪个文件加', () => {
    expect(() => compute(ledger, [{ id: 'c' }], '2026-03-05')).toThrow('徽章「c」没有统计规则：在 src/data/x-metrics.js 的 RULES 里加一条');
  });
});
