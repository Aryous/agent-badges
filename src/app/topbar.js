import { sourceInfo } from '../data/progress.js';
import { t } from '../viewer/i18n.js';
import { trackSegThumb } from '../viewer/seg.js';

/**
 * 顶栏：品牌切换、语言切换和品牌色立即渲染；页面标题和数据来源要等数据加载完再调 showSource()。
 */
export function mountTopbar(ctx) {
  const { $, available, brand, lang, PUBLIC, forceMock } = ctx;
  // 品牌切换：切换时保留其他参数（如 preview），去掉锚点
  const nav = $('[data-brands]');
  for (const b of available) {
    const a = document.createElement('a');
    const p = new URLSearchParams(location.search);
    p.set('brand', b.brand.id);
    p.set('lang', lang);
    a.href = `?${p}`;
    a.textContent = b.brand.name;
    a.className = 'brand-tab' + (b.brand.id === brand.id ? ' is-active' : '');
    if (b.brand.id === brand.id) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  }
  // 语言切换：胶囊里并排「中」和「EN」，当前语言垫金属滑块；点另一侧跳到同一页面的另一种语言
  const sw = $('[data-lang-switch]');
  sw.setAttribute('aria-label', t('nav.lang'));
  for (const [code, label, hreflang] of [['zh', '中', 'zh-CN'], ['en', 'EN', 'en']]) {
    const a = document.createElement('a');
    const q = new URLSearchParams(location.search);
    q.set('lang', code);
    a.href = `?${q}${location.hash}`;
    a.textContent = label;
    a.lang = hreflang;
    if (code === lang) a.setAttribute('aria-current', 'true');
    sw.appendChild(a);
  }
  trackSegThumb(sw, '[aria-current]');
  document.documentElement.dataset.brand = brand.id;

  /** 页面标题和来源标签（本机数据 / 示例数据 / 公开版）。 */
  function showSource() {
    const source = sourceInfo(brand.id, { forceMock });
    document.title = PUBLIC ? t('app.publicTitle', { name: PUBLIC.name || 'Agent Badges', brand: brand.name }) : t('app.title', { brand: brand.name });
    const sourceEl = $('[data-source]');
    if (PUBLIC) {
      // 公开版只带日期（YYYY-MM-DD），按本地日期解析，避免时区把日子挪一天
      const at = new Date(`${source.generatedAt}T00:00:00`);
      sourceEl.textContent = t('source.public', {
        name: PUBLIC.name || 'Agent Badges',
        m: at.getMonth() + 1,
        d: at.getDate(),
        date: at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      });
      const a = document.createElement('a');
      a.href = PUBLIC.home;
      a.className = 'source-link';
      a.textContent = t('source.getYours');
      sourceEl.append(' · ', a);
    } else if (source.kind === 'local') {
      const at = new Date(source.generatedAt);
      const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
      sourceEl.textContent = t('source.local', {
        m: at.getMonth() + 1,
        d: at.getDate(),
        date: at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time,
      });
    } else {
      sourceEl.textContent = t('source.mock');
      sourceEl.title = t('source.mockHint');
      // 在线演示（GitHub Pages 的 /demo/）：给一个回到首页、看怎么装的入口
      if (location.pathname.includes('/demo/')) {
        const a = document.createElement('a');
        a.href = `../?lang=${lang}`;
        a.className = 'source-link';
        a.textContent = t('source.getYours');
        sourceEl.append(' · ', a);
      }
    }
  }

  return { showSource };
}
