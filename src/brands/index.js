import claudeBrand from './claude-code/brand.js';
import claudeBadges, { SERIES as claudeSeries } from './claude-code/badges.js';
import codexBrand from './codex/brand.js';
import codexBadges, { SERIES as codexSeries } from './codex/badges.js';

// 品牌注册表。新增品牌：建 brands/<id>/，在这里登记，再在 data/progress.js 里登记数据源。

export const BRANDS = [
  { brand: claudeBrand, badges: claudeBadges, series: claudeSeries },
  { brand: codexBrand, badges: codexBadges, series: codexSeries },
];

export const DEFAULT_BRAND = 'claude-code';

export function getBrand(id) {
  return BRANDS.find((b) => b.brand.id === id) ?? BRANDS.find((b) => b.brand.id === DEFAULT_BRAND);
}
