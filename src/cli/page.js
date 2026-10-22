// 页面模板和公开版徽章墙。
import { existsSync, readFileSync } from 'node:fs';
import { APP } from './paths.js';
import { t } from './i18n.js';

export function appTemplate() {
  if (!existsSync(APP)) throw new Error(t('没有找到页面文件，请先运行 npm run build', 'App not built. Run npm run build first.'));
  return readFileSync(APP, 'utf8');
}

export function appHtml(data) {
  const html = appTemplate();
  return import('../share/inject.js').then(({ injectData }) => injectData(html, data));
}

export const PROJECT_SITE = 'https://aryous.github.io/agent-badges/';

/** 公开版徽章墙的 HTML：只放页面上看得到的数据。 */
export async function publicPage(data, name) {
  const { publicData } = await import('../share/public.js');
  const { injectData } = await import('../share/inject.js');
  return injectData(appTemplate(), publicData(data), { name, home: PROJECT_SITE });
}
