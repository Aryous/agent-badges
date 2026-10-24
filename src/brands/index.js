import claudeBrand from './claude-code/brand.js';
import claudeBadges, { SERIES as claudeSeries } from './claude-code/index.js';
import claudeCompletionist from './claude-code/completionist.js';
import codexBrand from './codex/brand.js';
import codexBadges, { SERIES as codexSeries } from './codex/index.js';
import codexCompletionist from './codex/completionist.js';

// 工具注册表：全项目唯一的工具列表。其他层（采集、示例数据、命令行、开发服务器）都从这里或自己按 id 索引的表取，
// tests/contracts.test.js 保证各处一致。新增工具的完整步骤见 CONTRIBUTING.md。
// completionist 是全解锁徽章的品牌部件（见 shared/completionist.js），它不进陈列墙，所以不放在 badges 里。

export const BRANDS = [
  { brand: claudeBrand, badges: claudeBadges, series: claudeSeries, completionist: claudeCompletionist },
  { brand: codexBrand, badges: codexBadges, series: codexSeries, completionist: codexCompletionist },
];

export const BRAND_IDS = BRANDS.map((e) => e.brand.id);

export const DEFAULT_BRAND = 'claude-code';

export const brandById = (id) => BRANDS.find((e) => e.brand.id === id) ?? null;

export function getBrand(id) {
  return brandById(id) ?? brandById(DEFAULT_BRAND);
}
