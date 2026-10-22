import { describe, expect, it } from 'vitest';
import { formatCount } from '../src/data/format.js';

// 大数字统一写成 K / M / B：网页、卡片、终端都用这一个函数
describe('formatCount', () => {
  it('小于 1000 原样显示', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });
  it('保留一位小数，去掉末尾的 .0', () => {
    expect(formatCount(1000)).toBe('1K');
    expect(formatCount(1234)).toBe('1.2K');
    expect(formatCount(1_234_567)).toBe('1.2M');
    expect(formatCount(9_750_000_000)).toBe('9.8B');
    expect(formatCount(12_000_000_000)).toBe('12B');
  });
  it('四舍五入后满 1000 就进到下一个单位', () => {
    expect(formatCount(999_950)).toBe('1M');
    expect(formatCount(999_950_000)).toBe('1B');
  });
  it('B 是最大的单位', () => {
    expect(formatCount(1.5e12)).toBe('1500B');
  });
});
