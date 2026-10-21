// 一次读取多个工具的进度（以及按天用量）：页面的热力图、GitHub 主页陈列图、落地页都要把各工具放在一起看。
// 本层不能引用 engine，徽章配置的校验由调用方通过 badgesOf 传进来。
import { BRANDS } from '../brands/index.js';
import { loadDaily, loadProgress, sourceInfo } from './progress.js';

/**
 * @param {object} [o]
 * @param {object[]} [o.brands]     要读的工具（BRANDS 里的条目），默认全部
 * @param {string | null} [o.only]  只读某个工具
 * @param {boolean} [o.forceMock]   用示例数据
 * @param {(b) => object[]} [o.badgesOf]  每个工具参与统计的徽章，默认全部（调用方可以只留下校验通过的）
 * @param {boolean} [o.daily]       是否同时读取按天用量，默认读取
 * @returns {Promise<{ brand, badges, series, progress, error, daily, local }[]>}
 *   顺序和 brands 一致；daily 不读时为 null；local：是否为本机数据
 */
export async function loadAllProgress({ brands = BRANDS, only = null, forceMock = false, badgesOf = (b) => b.badges, daily = true } = {}) {
  return Promise.all(
    brands
      .filter((b) => !only || b.brand.id === only)
      .map(async (b) => {
        const badges = badgesOf(b);
        const { progress, error } = await loadProgress(b.brand.id, badges, undefined, { forceMock });
        return {
          brand: b.brand,
          badges,
          series: b.series,
          progress,
          error,
          daily: daily ? await loadDaily(b.brand.id, { forceMock }) : null,
          local: sourceInfo(b.brand.id, { forceMock }).kind === 'local',
        };
      }),
  );
}
