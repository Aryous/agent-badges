import { partitionBadges, validateBrand } from '../engine/validate.js';
import { loadAllProgress } from '../data/brand-progress.js';
import { markersFrom } from '../viewer/heatmap.js';
import { t } from '../viewer/i18n.js';
import { applyPreview } from './preview.js';

/**
 * 校验当前工具的徽章，读取所有可选工具的进度和按天用量，算出热力图要用的数据。
 * notices：要在页面顶部提示的文字（校验错误只在开发时显示）。
 */
export async function loadAll(ctx) {
  const { brand, configs, available, forceMock, params } = ctx;
  validateBrand(brand);
  const { valid, errors } = partitionBadges(configs, brand);
  const notices = [];
  if (errors.length) {
    errors.forEach((e) => console.error(e));
    if (import.meta.env.DEV) notices.push(...errors.map((e) => e.message));
  }

  // 所有可选工具的进度和按天用量一起读：热力图要把各工具叠在一起看。当前工具用上面校验过的列表
  const all = await loadAllProgress({
    brands: available,
    forceMock,
    badgesOf: (b) => (b.brand.id === brand.id ? valid : partitionBadges(b.badges, b.brand).valid),
  });
  const mine = all.find((o) => o.brand.id === brand.id);
  const { progress, error } = mine;
  applyPreview(valid, progress, { preview: params.get('preview'), tier: params.has('tier') ? Number(params.get('tier')) : undefined });
  if (error) {
    console.error(error);
    notices.push(t('app.progressFailed'));
  }

  // 热力图把所有工具叠在一起看，所以每个工具的按天用量和解锁日期都要读
  // ?preview 改的是 mine.progress 本身，热力图上的解锁标记也跟着变
  const markers = markersFrom(all, brand.id);
  const heatSeries = all
    .filter((o) => Object.keys(o.daily).length || o.brand.id === brand.id)
    .map((o) => ({ id: o.brand.id, name: o.brand.name, color: o.brand.ui.accent, daily: o.daily }));
  return { valid, progress, heatSeries, markers, currentDaily: mine.daily, notices };
}
