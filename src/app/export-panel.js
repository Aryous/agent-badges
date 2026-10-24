import { downloadDataURL } from '../viewer/export.js';
import { EXPORT_FILL, renderBadgePNG } from '../viewer/snapshot.js';
import { t } from '../viewer/i18n.js';

/**
 * 导出面板。背景选项只影响导出文件，所以收在面板里；面板打开时才显示导出取景框。
 * inspector：viewer/inspector.js 的单枚查看状态（当前徽章、朝向、取景位置）。
 */
export function mount(ctx, inspector) {
  const { $, brand, stage } = ctx;
  const inspectorEl = $('#inspector');
  const exportFrame = $('#export-frame');
  const exportPanel = $('#export-panel');
  const exportToggle = $('[data-export-toggle]');
  const FACE_LABEL = { front: t('export.front'), back: t('export.back') };
  let exportBg = 'transparent';

  /**
   * keepTextFaded：退出单枚查看时收起面板，说明文字保持淡出，跟着信息区一起离开，不先淡回来；
   * 关完后（inspect.js 的 closeTimer）再调一次 set(false) 复原。
   */
  function set(open, { keepTextFaded = false } = {}) {
    exportPanel.hidden = !open;
    exportToggle.setAttribute('aria-expanded', String(open));
    // 面板盖在说明文字上：打开时文字淡下去，收起时原样淡回来（inspector.css 的 .is-exporting）
    if (!keepTextFaded) inspectorEl.classList.toggle('is-exporting', open);
    exportFrame.classList.toggle('is-visible', open);
    if (open) {
      place();
      $('[data-export-face]').textContent = FACE_LABEL[inspector.face];
    }
  }
  exportToggle.addEventListener('click', () => set(exportPanel.hidden));
  inspector.onFaceChange((face) => ($('[data-export-face]').textContent = FACE_LABEL[face]));
  // 点面板以外的界面元素时收起；拖动画布旋转徽章不收起，方便转到背面再导出。
  // 「全部徽章」除外：由 inspect.js 的 close() 收起面板，说明文字不在按下时就淡回来
  document.addEventListener('pointerdown', (e) => {
    if (exportPanel.hidden || e.target.closest('.export, [data-close]') || e.target.id === 'stage') return;
    set(false);
  });

  for (const b of inspectorEl.querySelectorAll('[data-bg]')) {
    b.addEventListener('click', () => {
      exportBg = b.dataset.bg;
      exportFrame.dataset.bg = exportBg;
      inspectorEl.querySelectorAll('[data-bg]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    });
  }

  /** 把预览框放到导出 PNG 的取景范围上（以单枚查看的最终位置为准）。 */
  function place() {
    const { layout } = inspector;
    const { view } = stage;
    const pxPerUnit = view.height / 2 / view.halfH;
    const half = (layout.r / EXPORT_FILL) * pxPerUnit;
    const cx = view.width / 2 + layout.x * pxPerUnit;
    const cy = view.height / 2 - layout.y * pxPerUnit;
    exportFrame.style.width = exportFrame.style.height = `${half * 2}px`;
    exportFrame.style.transform = `translate(${cx - half}px, ${cy - half}px)`;
    exportFrame.style.borderRadius = `${Math.round(half * 0.12)}px`;
  }
  $('[data-export]').addEventListener('click', () => {
    exportCurrent(exportBg);
    set(false);
  });

  /** 导出当前查看的徽章；download: false 时只返回数据（供自动化检查）。 */
  function exportCurrent(bg = 'transparent', { download = true } = {}) {
    const item = inspector.current;
    if (!item) return null;
    const dataURL = renderBadgePNG({
      stage,
      items: [item],
      item,
      background: bg === 'ink' ? brand.palette.background : null,
    });
    const tier = item.config.tiers && item.state.tier !== null ? `-${item.config.tiers[item.state.tier].metal}` : '';
    const filename = `${brand.id}-${item.config.id}${tier}-${inspector.face}.png`;
    if (download) downloadDataURL(dataURL, filename);
    return { dataURL, filename };
  }

  return {
    set,
    get isOpen() {
      return !exportPanel.hidden;
    },
    place,
    exportCurrent,
  };
}
