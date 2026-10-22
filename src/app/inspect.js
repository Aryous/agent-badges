import { setEngravingSize } from '../engine/badge.js';
import { badgeDescription, tierKey, tierLabel, upperTitle } from '../brands/shared/text.js';
import { describeState, fmtDate } from '../viewer/describe.js';
import { playAward } from '../viewer/award-animation.js';
import { formatBig, t } from '../viewer/i18n.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 单枚查看：徽章飞到画面中央，下面是说明、等级阶梯和进度条。响应 ctx 的 'open' 事件。
 * inspector：viewer/inspector.js 的拖动旋转状态；exportPanel、loop 由外面建好传进来。
 */
export function mount(ctx, { inspector, exportPanel, loop }) {
  const { $, brand, lang, stage, tweens, ensureBuilt } = ctx;
  const overlay = $('#overlay');
  const inspectorEl = $('#inspector');
  let mode = 'wall';
  let awardRunning = false;
  let closeTimer = null;
  let onClosed = []; // whenClosed 的等待者，完全关上（徽章移出场景）时放行

  async function runAward() {
    if (awardRunning || !inspector.current?.state.unlocked) return;
    awardRunning = true;
    $('[data-replay]').disabled = true;
    try {
      await playAward({ stage, tweens, inspector, palette: brand.palette, reducedMotion });
    } finally {
      awardRunning = false;
      $('[data-replay]').disabled = !inspector.current?.state.unlocked;
    }
  }

  function fillInfo(item) {
    const { config, state } = item;
    const d = describeState(config, state);
    const kicker = $('[data-kicker]');
    if (d.masked) kicker.textContent = t('state.hidden');
    else if (state.unlocked) kicker.textContent = `${d.tier ? d.meta : t('state.earned')} · ${fmtDate(state.earnedAt)}`;
    else kicker.textContent = t('state.locked');
    kicker.style.color = state.unlocked ? '' : 'var(--muted)';
    $('[data-title]').textContent = d.title;
    // 中文界面在标题下面再写一行英文；英文界面不需要
    const subtitle = $('[data-title-en]');
    subtitle.hidden = lang !== 'zh';
    subtitle.textContent = d.masked ? 'HIDDEN ACHIEVEMENT' : upperTitle(config, state.tier);
    $('[data-desc]').textContent = d.masked ? t('inspect.hiddenDesc', { brand: brand.name }) : badgeDescription(config, lang);
    // 顶级彩蛋：告诉用户这一级有几款、抽到了哪一款（没抽到的不展示）
    const topTier = config.tiers?.[state.tier ?? -1];
    if (!d.masked && topTier?.variants && state.variant != null) {
      $('[data-desc]').textContent += t('inspect.variant', { n: topTier.variants.length, name: tierLabel(topTier, state.variant, lang) });
    }

    // 等级阶梯
    const ladder = $('[data-tiers]');
    ladder.hidden = !config.tiers || d.masked;
    ladder.innerHTML = '';
    for (const [i, tier] of (config.tiers ?? []).entries()) {
      const li = document.createElement('li');
      const earned = state.tier !== null && i <= state.tier;
      // 有款式的那一级：抽到了写款式名，还没到写「隐藏款」
      const variant = i === state.tier ? state.variant : null;
      li.dataset.metal = tierKey(tier, variant);
      li.className = (earned ? 'is-earned' : '') + (i === state.tier ? ' is-current' : '');
      li.innerHTML = `<span class="dot"></span><span>${tierLabel(tier, variant, lang).replace(/级$/, '')}</span><span>${tier.label}</span>`;
      ladder.appendChild(li);
    }

    // 进度条：未解锁的普通徽章，或还没满级的分级徽章
    const maxed = config.tiers && state.tier === config.tiers.length - 1;
    const showMeter = !d.masked && (config.tiers ? !maxed : !state.unlocked);
    const meter = $('[data-meter]');
    meter.hidden = !showMeter;
    if (showMeter) {
      const { current, target } = state.progress;
      $('[data-meter-fill]').style.width = `${Math.min(100, (current / target) * 100)}%`;
      $('[data-meter-text]').textContent = `${formatBig(current)} / ${formatBig(target)}${config.tiers && state.unlocked ? t('inspect.toNext') : ''}`;
    }
    $('[data-replay]').hidden = !state.unlocked;
  }

  /** 顶栏 + 返回按钮、底部信息区各占多少像素，徽章放在中间。 */
  function measureReserve() {
    const info = inspectorEl.querySelector('.info').getBoundingClientRect();
    const back = $('[data-close]').getBoundingClientRect();
    return { top: back.bottom + 16, bottom: window.innerHeight - info.top + 20 };
  }

  function open(item, { award = true, viaKeyboard = false } = {}) {
    if (mode === 'inspect' && inspector.current === item) return;
    clearTimeout(closeTimer);
    if (inspector.current && inspector.current !== item) {
      stage.scene.remove(inspector.current.holder);
      setEngravingSize(inspector.current.badge, 1024);
    }
    ensureBuilt(item);
    mode = 'inspect';
    document.body.classList.add('is-inspecting');
    overlay.hidden = false;
    fillInfo(item);
    stage.resize();
    inspector.layoutChanged(measureReserve());

    item.pivot.rotation.set(0, 0, 0);
    const { layout } = inspector;
    item.holder.position.set(layout.x, layout.y, 0);
    item.holder.scale.setScalar(layout.scale * 0.6);
    stage.scene.add(item.holder);
    inspector.open(item);
    exportPanel.set(false);
    loop.start();
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      inspectorEl.classList.add('is-open');
    });
    history.replaceState(null, '', `#${item.config.id}`);
    // 只有用键盘打开时才把焦点移进来，避免鼠标用户看到焦点框
    if (viaKeyboard) $('[data-close]').focus({ preventScroll: true });
    if (award && item.state.unlocked) runAward();
  }

  function close() {
    if (mode !== 'inspect') return;
    tweens.cancel('award');
    awardRunning = false;
    stage.sweep.intensity = 0;
    const item = inspector.current;
    inspector.close();
    mode = 'wall';
    overlay.classList.remove('is-open');
    inspectorEl.classList.remove('is-open');
    exportPanel.set(false);
    document.body.classList.remove('is-inspecting');
    history.replaceState(null, '', location.pathname + location.search);
    closeTimer = setTimeout(() => {
      overlay.hidden = true;
      if (item) {
        stage.scene.remove(item.holder);
        setEngravingSize(item.badge, 1024); // 离开近看，换回省显存的版本
      }
      loop.stop();
      onClosed.forEach((resolve) => resolve());
      onClosed = [];
    }, 320);
    item?.tile.focus({ preventScroll: true });
  }

  $('[data-close]').addEventListener('click', close);
  $('[data-replay]').addEventListener('click', runAward);

  window.addEventListener('keydown', (e) => {
    if (mode !== 'inspect') return;
    if (e.key === 'Escape') {
      if (exportPanel.isOpen) exportPanel.set(false);
      else close();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      inspector.spin.snapping = false;
      inspector.spin.vel += e.key === 'ArrowRight' ? 7 : -7;
    }
  });

  window.addEventListener('resize', () => {
    if (mode !== 'inspect') return;
    stage.resize();
    inspector.layoutChanged(measureReserve());
    if (exportPanel.isOpen) exportPanel.place();
  });

  ctx.on('open', open);
  return {
    open,
    close,
    get isOpen() {
      return mode === 'inspect';
    },
    /** 单枚查看完全关上（关闭动画结束、徽章移出场景）时兑现；没打开就立即兑现。 */
    whenClosed() {
      return overlay.hidden
        ? Promise.resolve()
        : new Promise((resolve) => onClosed.push(resolve));
    },
    get current() {
      return inspector.current;
    },
  };
}
