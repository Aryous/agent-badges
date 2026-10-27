import { renderShelves, shelfGroups } from '../viewer/shelf.js';
import { downloadURL } from '../viewer/export.js';
import { t } from '../viewer/i18n.js';
import { createModal } from './modal.js';

/**
 * GitHub 主页徽章图。响应 ctx 的 'shelf' 事件。
 * npx agent-badges shelf 会带着 ?task=shelf&nonce=… 打开页面（ctx.task）：自动生成，再交回命令行保存。
 */
export function mount(ctx) {
  const { $, params, lang, task, forceMock } = ctx;
  const shelfEl = $('#shelf');
  const closeBtn = $('[data-shelf-close]');
  const download = $('[data-shelf-download]');
  const status = $('[data-shelf-status]');
  const shelfLang = ['en', 'zh'].includes(params.get('shelfLang')) ? params.get('shelfLang') : lang;
  let url = null;
  let busy = null;
  $('[data-shelf-title]').textContent = t('shelf.title');
  closeBtn.setAttribute('aria-label', t('poster.close'));
  download.textContent = t('poster.download');
  const modal = createModal(shelfEl, closeBtn);

  async function send(canvases) {
    status.textContent = t('shelf.sending');
    try {
      let body = {};
      // 依次交回；命令行收齐所有主题后才回复最后一张
      for (const theme of task.themes) {
        const blob = await new Promise((r) => canvases[theme].toBlob(r, 'image/png'));
        const res = await fetch(`/__agent-badges/shelf?nonce=${encodeURIComponent(task.nonce)}&theme=${theme}`, {
          method: 'POST',
          headers: { 'content-type': 'image/png' },
          body: blob,
        });
        body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      status.textContent = t('shelf.saved', { file: body.file });
    } catch (e) {
      status.textContent = t('shelf.failed', { msg: e.message });
    }
  }

  async function make() {
    const preview = $('[data-shelf-preview]');
    const making = document.createElement('p');
    making.className = 'poster-making';
    preview.replaceChildren(making);
    download.disabled = true;
    status.textContent = '';
    // 命令行交付时 ?brand= 指定只画哪个工具
    const groups = await shelfGroups({ only: task ? params.get('brand') : null, forceMock });
    if (!groups.length) {
      making.textContent = t('shelf.empty');
      return;
    }
    const canvases = await renderShelves(groups, {
      lang: shelfLang,
      // 页面预览总是用深色那张
      themes: task ? [...new Set(['dark', ...task.themes])] : ['dark'],
      onProgress: (done, total) => (making.textContent = t('shelf.making', { done, total })),
    });
    url = canvases.dark.toDataURL('image/png');
    const img = new Image();
    img.alt = t('shelf.title');
    img.src = url;
    preview.replaceChildren(img);
    download.disabled = false;
    if (task) await send(canvases);
    else status.textContent = t('shelf.hint');
  }

  async function open({ viaKeyboard = false } = {}) {
    modal.open({ viaKeyboard });
    // 生成过就直接显示；命令行交付只做一次
    busy ??= make().catch((e) => {
      console.error(e);
      busy = null;
      status.textContent = t('app.loadFailed', { msg: e.message });
    });
    await busy;
  }

  download.addEventListener('click', () => url && downloadURL(url, 'agent-badges-shelf.png'));
  ctx.on('shelf', open);
  return {
    open,
    get url() {
      return url;
    },
  };
}
