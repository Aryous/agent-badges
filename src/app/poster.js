import { renderPoster } from '../viewer/poster.js';
import { loadPosterFonts } from '../viewer/poster-draw.js';
import { DUO, shareModes } from '../viewer/poster-layout.js';
import { combineDaily } from '../viewer/heatmap.js';
import { trackSegThumb } from '../viewer/seg.js';
import { downloadURL } from '../viewer/export.js';
import { t } from '../viewer/i18n.js';
import { today, yearCells } from '../data/calendar.js';
import { dailyStats } from '../data/daily.js';
import { brandById } from '../brands/index.js';
import { createModal } from './modal.js';
import { createPosterArt, loadImage } from './poster-art.js';

const PREVIEW_W = 720; // 弹窗里的预览图宽度；下载用原尺寸

const toBlob = (canvas) => new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

/**
 * 分享海报：可以选只分享某一个工具，或两个一起（有两个工具的数据时）。默认是当前所在的工具。
 * 每种画过就缓存（形式 | 年份 | 语言），切回来不重画。预览是缩小的图，下载用原尺寸的 PNG。
 * 响应 ctx 的 'poster' 事件。
 */
export function mount(ctx, { thumbsDone, heatmap, heatSeries, markers, tools }) {
  const { $, brand, lang, PUBLIC, identity, localData } = ctx;
  const posterEl = $('#poster');
  const closeBtn = $('[data-poster-close]');
  const download = $('[data-poster-download]');
  const modesEl = $('[data-poster-modes]');
  const hint = $('[data-poster-hint]');
  const preview = $('[data-poster-preview]');
  $('[data-poster-title]').textContent = t('poster.title');
  closeBtn.setAttribute('aria-label', t('poster.close'));
  download.textContent = t('poster.download');
  const modal = createModal(posterEl, closeBtn);

  // 能分享的工具：热力图上有的（有数据的，加上当前工具），顺序同热力图
  const shown = heatSeries.map((s) => s.id);
  const list = tools
    .filter((x) => shown.includes(x.brand.id))
    .map((x) => ({
      brand: x.brand,
      kit: brandById(x.brand.id).completionist,
      items: x.brand.id === brand.id ? ctx.items : x.badges.map((config) => ({ config, state: x.progress[config.id] })),
      daily: x.daily,
    }));
  const modes = shareModes(list.map((x) => x.brand.id));
  let mode = brand.id;

  // 三段切换（只有一个工具时不显示）
  modesEl.hidden = modes.length < 2;
  modesEl.setAttribute('aria-label', t('poster.modes'));
  for (const m of modes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.dataset.mode = m;
    b.textContent = m === DUO ? t('poster.both') : list.find((x) => x.brand.id === m).brand.name;
    b.addEventListener('click', () => show(m));
    modesEl.appendChild(b);
  }
  const paintModes = () => modesEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
  paintModes();
  if (!modesEl.hidden) trackSegThumb(modesEl);

  // 本机页面上还没有头像：提示可以加（公开页、演示站不提示）
  if (localData && !PUBLIC && !identity) {
    hint.textContent = t('poster.avatarHint');
    hint.hidden = false;
  }

  const art = createPosterArt(ctx, { thumbsDone });
  // 画好的海报按「形式 | 年份 | 语言」缓存，一直留着（最多几种形式乘几个年份），blob URL 不回收
  const cache = new Map();
  const done = new Set();
  let current = null;
  let renders = 0;
  let seq = 0;
  let avatar;

  async function build(m) {
    const picked = m === DUO ? list : list.filter((x) => x.brand.id === m);
    const year = heatmap.year;
    const series = heatSeries.filter((s) => picked.some((x) => x.brand.id === s.id));
    // 进度写进当前显示的这一种的占位文字（每次现查：中途切走再切回来，占位是新建的）
    const progress = (n, total) => {
      const el = preview.querySelector(`.poster-making[data-mode="${m}"]`);
      if (el) el.textContent = t('poster.progress', { n, total });
    };
    const arts = [];
    for (const x of picked) arts.push(await art.get(x, progress));
    await loadPosterFonts();
    if (identity && avatar === undefined) avatar = await loadImage(identity.avatar);
    const canvas = renderPoster({
      mode: m === DUO ? 'duo' : 'single',
      tools: picked.map((x, i) => ({ brand: x.brand, coin: arts[i].coin, items: arts[i].items, all: dailyStats(x.daily) })),
      heat: {
        year,
        series,
        cal: yearCells({ year, weekStart: lang === 'zh' ? 1 : 0, series, markers, enabled: new Set(series.map((s) => s.id)), now: today() }),
        yearStats: dailyStats(combineDaily(series.map((s) => s.daily)), { from: `${year}-01-01`, to: `${year}-12-31` }),
      },
      identity: identity ? { login: identity.login, avatar: avatar ?? null } : null,
    });
    renders++;
    const blob = await toBlob(canvas);
    const small = document.createElement('canvas');
    small.width = PREVIEW_W;
    small.height = Math.round((canvas.height * PREVIEW_W) / canvas.width);
    small.getContext('2d').drawImage(canvas, 0, 0, small.width, small.height);
    const previewBlob = await toBlob(small);
    // 两张 canvas 用完就清空，释放内存（缓存里只留 PNG）
    canvas.width = canvas.height = small.width = small.height = 0;
    return {
      mode: m,
      blob,
      url: URL.createObjectURL(blob),
      preview: URL.createObjectURL(previewBlob),
      file: `${m === DUO ? 'agent' : m}-badges-${year}.png`,
      dataURL: null,
      pending: null,
    };
  }

  async function show(m) {
    if (!modes.includes(m)) return;
    mode = m;
    paintModes();
    const job = ++seq;
    const key = `${m}|${heatmap.year}|${lang}`;
    download.disabled = true;
    // 还没画好的（包括正在画的）先放占位，不让上一张海报留在预览里
    if (!done.has(key)) {
      const making = document.createElement('p');
      making.className = 'poster-making';
      making.dataset.mode = m;
      making.textContent = t('poster.making');
      preview.replaceChildren(making);
    }
    if (!cache.has(key)) {
      cache.set(
        key,
        build(m).catch((e) => {
          cache.delete(key);
          throw e;
        }),
      );
    }
    let entry;
    try {
      entry = await cache.get(key);
    } catch (e) {
      console.error(e);
      if (job === seq) {
        const p = document.createElement('p');
        p.className = 'poster-making';
        p.textContent = t('poster.failed');
        preview.replaceChildren(p);
      }
      return;
    }
    done.add(key);
    if (job !== seq) return;
    current = entry;
    const img = new Image();
    img.alt = t('poster.title');
    img.src = entry.preview;
    preview.replaceChildren(img);
    download.disabled = false;
  }

  function open({ viaKeyboard = false } = {}) {
    modal.open({ viaKeyboard });
    return show(mode);
  }

  download.addEventListener('click', () => {
    if (current) downloadURL(current.url, current.file);
  });
  ctx.on('poster', open);
  return {
    open,
    setMode: show,
    modes,
    get mode() {
      return mode;
    },
    /** 当前显示的就是选中的形式（切换后新海报画好之前是 false）。 */
    get ready() {
      return current?.mode === mode && !download.disabled;
    },
    get renders() {
      return renders;
    },
    /** PNG 的 data URL，只给自动化检查用：第一次读时才从 blob 转（异步），转好之前返回 null。 */
    get url() {
      const e = current;
      if (!e) return null;
      e.pending ??= blobToDataURL(e.blob).then(
        (u) => (e.dataURL = u),
        (err) => {
          e.pending = null; // 下次读时重试
          console.error(err);
        },
      );
      return e.dataURL;
    },
  };
}
