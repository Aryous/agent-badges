import { createGrid } from '../viewer/grid.js';
import { t } from '../viewer/i18n.js';

/** 陈列墙：按系列排的网格和「全部 / 已获得 / 未解锁」筛选。 */
export function mount(ctx) {
  const { $, items, series } = ctx;
  const grid = createGrid({
    root: $('#series'),
    series,
    items,
    onSelect: (item, viaKeyboard) => ctx.emit('open', item, { viaKeyboard }),
  });

  const unlockedCount = items.filter((it) => it.state.unlocked).length;
  const FILTERS = [
    ['all', t('filter.all'), items.length],
    ['unlocked', t('filter.unlocked'), unlockedCount],
    ['locked', t('filter.locked'), items.length - unlockedCount],
  ];
  $('[data-wall-title]').textContent = t('wall.title');
  const filterEl = $('[data-filter]');
  filterEl.setAttribute('aria-label', t('filter.label'));
  for (const [mode, label, n] of FILTERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.dataset.filter = mode;
    b.innerHTML = `${label}<span class="seg-count">${n}</span>`;
    b.addEventListener('click', () => setFilter(mode));
    filterEl.appendChild(b);
  }
  function setFilter(mode) {
    const shown = grid.setFilter(mode);
    filterEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.filter === mode)));
    const empty = $('[data-wall-empty]');
    empty.hidden = shown > 0;
    empty.textContent = t('filter.empty');
  }
  setFilter('all');
  return { grid, setFilter };
}
