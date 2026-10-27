import { describe, expect, it } from 'vitest';
import { dayParts, levelOf, levelThresholds, yearCells } from '../src/data/calendar.js';

const series = [
  { id: 'a', color: '#D97757', daily: { '2026-01-01': [100, 2], '2026-01-02': [5000, 9], '2026-03-11': [300, 1] } },
  { id: 'b', color: '#7A9DFF', daily: { '2026-01-02': [40, 1] } },
];
const markers = { '2026-01-02': [{ brandId: 'b', id: 'x' }], '2026-03-11': [{ brandId: 'a', id: 'y' }] };
const flat = (cal) => cal.weeks.flat();
const cell = (cal, date) => flat(cal).find((c) => c?.date === date);

describe('yearCells：一年的点阵', () => {
  it('2026-01-01 是周四：周一起始前面空 3 格，周日起始空 4 格', () => {
    const mon = yearCells({ year: 2026, weekStart: 1, series, now: '2026-12-31' });
    const sun = yearCells({ year: 2026, weekStart: 0, series, now: '2026-12-31' });
    expect(mon.weeks[0].slice(0, 4).map((c) => c?.date ?? null)).toEqual([null, null, null, '2026-01-01']);
    expect(sun.weeks[0].slice(0, 5).map((c) => c?.date ?? null)).toEqual([null, null, null, null, '2026-01-01']);
    expect(mon.weekStart).toBe(1);
    expect(sun.weekStart).toBe(0);
  });

  it('这一年的每一天正好出现一次，月份起点和 yearWeeks 一致', () => {
    const cal = yearCells({ year: 2026, weekStart: 1, series, now: '2026-12-31' });
    const dates = flat(cal).filter(Boolean).map((c) => c.date);
    expect(dates).toHaveLength(365);
    expect(new Set(dates).size).toBe(365);
    expect(cal.monthStarts).toHaveLength(12);
    expect(cal.monthStarts[0]).toEqual({ month: 0, col: 0 });
  });

  it('今天之后的日子是未来：没有颜色，也不算解锁', () => {
    const cal = yearCells({ year: 2026, weekStart: 1, series, markers, now: '2026-03-10' });
    expect(cell(cal, '2026-03-11')).toEqual({ date: '2026-03-11', future: true, parts: [], unlocked: false });
    expect(cell(cal, '2026-03-10').future).toBe(false);
  });

  it('一个工具、两个工具：按工具顺序给出档位，左边是第一个', () => {
    const cal = yearCells({ year: 2026, weekStart: 1, series, markers, now: '2026-12-31' });
    const thA = levelThresholds(series[0].daily);
    const thB = levelThresholds(series[1].daily);
    expect(cell(cal, '2026-01-01').parts).toEqual([{ id: 'a', color: '#D97757', level: levelOf([100, 2], thA) }]);
    expect(cell(cal, '2026-01-02').parts).toEqual([
      { id: 'a', color: '#D97757', level: levelOf([5000, 9], thA) },
      { id: 'b', color: '#7A9DFF', level: levelOf([40, 1], thB) },
    ]);
    expect(cell(cal, '2026-01-05').parts).toEqual([]);
  });

  it('解锁：那天有开着的工具的解锁标记；关掉的工具不算', () => {
    const all = yearCells({ year: 2026, weekStart: 1, series, markers, now: '2026-12-31' });
    expect(cell(all, '2026-01-02').unlocked).toBe(true);
    const onlyA = yearCells({ year: 2026, weekStart: 1, series, markers, enabled: new Set(['a']), now: '2026-12-31' });
    expect(cell(onlyA, '2026-01-02').unlocked).toBe(false);
    expect(cell(onlyA, '2026-01-02').parts.map((p) => p.id)).toEqual(['a']);
    expect(cell(onlyA, '2026-03-11').unlocked).toBe(true);
  });
});

describe('dayParts：热力图、海报共用的同一条规则', () => {
  it('enabled 为空表示全部开着', () => {
    const th = Object.fromEntries(series.map((s) => [s.id, levelThresholds(s.daily)]));
    expect(dayParts('2026-01-02', series, th).map((p) => p.id)).toEqual(['a', 'b']);
    expect(dayParts('2026-01-02', series, th, new Set(['b'])).map((p) => p.id)).toEqual(['b']);
    expect(dayParts('2026-02-02', series, th)).toEqual([]);
  });
});
