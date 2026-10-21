import { renderPoster } from '../viewer/poster.js';
import { downloadDataURL } from '../viewer/export.js';
import { t } from '../viewer/i18n.js';
import { createModal } from './modal.js';

/**
 * 分享海报：单个工具的成绩单。等缩略图全部渲染完（thumbsDone）才画。
 * 响应 ctx 的 'poster' 事件。
 */
export function mount(ctx, { thumbsDone, profile, heatmap, heatSeries, markers }) {
  const { $, brand, items } = ctx;
  const posterEl = $('#poster');
  const closeBtn = $('[data-poster-close]');
  const download = $('[data-poster-download]');
  let url = null;
  $('[data-poster-title]').textContent = t('poster.title');
  closeBtn.setAttribute('aria-label', t('poster.close'));
  download.textContent = t('poster.download');
  const modal = createModal(posterEl, closeBtn);

  async function open({ viaKeyboard = false } = {}) {
    modal.open({ viaKeyboard });
    const preview = $('[data-poster-preview]');
    preview.innerHTML = `<p class="poster-making">${t('poster.making')}</p>`;
    download.disabled = true;
    await thumbsDone;
    const canvas = await renderPoster({
      brand,
      items: items.map((it) => ({ ...it, thumb: it.thumb })),
      stats: profile.stats,
      // 海报是单个工具的成绩单，热力图也只画这个工具
      heat: {
        year: heatmap.year,
        series: heatSeries.filter((x) => x.id === brand.id),
        markers: Object.fromEntries(
          Object.entries(markers)
            .map(([d, ms]) => [d, ms.filter((m) => m.brandId === brand.id)])
            .filter(([, ms]) => ms.length),
        ),
      },
    });
    url = canvas.toDataURL('image/png');
    const img = new Image();
    img.alt = t('poster.title');
    img.src = url;
    preview.replaceChildren(img);
    download.disabled = false;
  }

  download.addEventListener('click', () => {
    if (url) downloadDataURL(url, `${brand.id}-badges-${heatmap.year}.png`);
  });
  ctx.on('poster', open);
  return {
    open,
    get url() {
      return url;
    },
  };
}
