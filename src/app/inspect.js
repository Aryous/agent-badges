import { setEngravingSize } from '../engine/badge.js';
import { badgeDescription, tierKey, tierLabel, upperTitle } from '../brands/shared/text.js';
import { describeCompletionist, describeState, fmtDate } from '../viewer/describe.js';
import { COMPLETIONIST_ID, STAGE_METALS } from '../brands/shared/completionist.js';
import { playAward } from '../viewer/award-animation.js';
import { t } from '../viewer/i18n.js';
import { formatCount } from '../data/format.js';
import { lerp, ease } from '../viewer/anim.js';
import { rectToWorld } from '../viewer/inspector.js';
import { splitBackground } from '../viewer/heatmap.js';
import { MONTHS_LONG } from '../viewer/month-medal.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 有没有获得动画可播：已解锁；全解锁徽章一枚没解锁时（锡）没有（award: false）。 */
const awardable = (item) => Boolean(item?.state.unlocked) && item.award !== false;

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
  let closing = null; // 正在播关闭动画的那一枚，动画结束后移出场景
  let onClosed = []; // whenClosed 的等待者，完全关上（徽章移出场景）时放行
  let landHome = null; // 飞回托盘的补间：收尾时还没落定就直接落到终点

  async function runAward() {
    if (awardRunning || !awardable(inspector.current)) return;
    awardRunning = true;
    $('[data-replay]').disabled = true;
    try {
      await playAward({ stage, tweens, inspector, palette: brand.palette, reducedMotion });
    } finally {
      awardRunning = false;
      $('[data-replay]').disabled = !awardable(inspector.current);
    }
  }

  /** 月章：年份 · 金属，月份，三行数字和图例；没有等级阶梯、进度条和获得动画。 */
  function fillMedalInfo({ info }) {
    const kicker = $('[data-kicker]');
    kicker.textContent = t('medal.metal', { year: info.year, metal: t(`completionist.${STAGE_METALS[info.tier]}`) });
    kicker.style.color = '';
    $('[data-title]').textContent = t('proof.months')[info.month];
    const subtitle = $('[data-title-en]');
    subtitle.hidden = lang !== 'zh';
    subtitle.textContent = `${MONTHS_LONG[info.month]} ${info.year}`;
    $('[data-desc]').hidden = true;
    $('[data-tiers]').hidden = true;
    $('[data-meter]').hidden = true;
    $('[data-replay]').hidden = true;
    $('[data-hint]').textContent = t('inspect.hintMedal');
    const facts = $('[data-medal-facts]');
    facts.hidden = false;
    facts.innerHTML = '';
    for (const [k, v] of [
      [t('medal.tokens'), formatCount(info.tokens)],
      [t('medal.days'), t('medal.daysValue', { n: info.active })],
      [t('medal.unlocks'), t('medal.unlocksValue', { n: info.unlocks })],
    ]) {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      row.append(dt, dd);
      facts.append(row);
    }
    const legend = $('[data-medal-legend]');
    legend.hidden = false;
    legend.innerHTML = '';
    const swatch = (background, text, cls = '') => {
      const span = document.createElement('span');
      const i = document.createElement('i');
      if (cls) i.className = cls;
      if (background) i.style.background = background;
      span.append(i, text);
      legend.append(span);
    };
    for (const s of info.legend) swatch(s.color, s.name);
    if (info.both) swatch(splitBackground(info.both[0], info.both[1]), t('heat.both'));
    swatch(null, t('heat.unlock'), 'is-ring');
  }

  function fillInfo(item) {
    const medal = item.kind === 'medal';
    $('[data-medal-facts]').hidden = !medal;
    $('[data-medal-legend]').hidden = !medal;
    $('[data-desc]').hidden = medal;
    if (medal) return fillMedalInfo(item);
    const { config, state } = item;
    const d = describeState(config, state);
    // 全解锁徽章：副标题写阶段或完成日期，进度条后面写下一阶段
    const whole = config.id === COMPLETIONIST_ID ? describeCompletionist(state) : null;
    const kicker = $('[data-kicker]');
    if (whole) kicker.textContent = whole.kicker;
    else if (d.masked) kicker.textContent = t('state.hidden');
    else if (state.unlocked) kicker.textContent = `${d.tier ? d.meta : t('state.earned')} · ${fmtDate(state.earnedAt)}`;
    else kicker.textContent = t('state.locked');
    kicker.style.color = state.unlocked ? '' : 'var(--muted)';
    $('[data-title]').textContent = d.title;
    // 全解锁徽章的背面是月桂浮雕，没有刻字
    $('[data-hint]').textContent = t(whole ? 'inspect.hintCompletionist' : 'inspect.hint');
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
    const showMeter = whole ? Boolean(whole.meter) : !d.masked && (config.tiers ? !maxed : !state.unlocked);
    const meter = $('[data-meter]');
    meter.hidden = !showMeter;
    if (showMeter) {
      const { current, target } = state.progress;
      $('[data-meter-fill]').style.width = `${Math.min(100, (current / target) * 100)}%`;
      $('[data-meter-text]').textContent = whole
        ? whole.meter
        : `${formatCount(current)} / ${formatCount(target)}${config.tiers && state.unlocked ? t('inspect.toNext') : ''}`;
    }
    $('[data-replay]').hidden = !awardable(item);
  }

  /** 顶栏 + 返回按钮、底部信息区各占多少像素，徽章放在中间。 */
  function measureReserve() {
    const info = inspectorEl.querySelector('.info').getBoundingClientRect();
    const back = $('[data-close]').getBoundingClientRect();
    return { top: back.bottom + 16, bottom: window.innerHeight - info.top + 20 };
  }

  /** 一枚徽章离开单枚查看：移出场景、释放刻字；月章还要让托盘里的那一格露出来，并释放它自己的显卡资源。 */
  function release(item) {
    stage.scene.remove(item.holder);
    setEngravingSize(item.badge, 0);
    item.away?.(false);
    item.dispose?.();
  }

  function open(item, { award = true, viaKeyboard = false, from = null } = {}) {
    if (mode === 'inspect' && inspector.current === item) return;
    clearTimeout(closeTimer);
    tweens.cancel('home');
    landHome = null;
    // 关闭动画没播完就打开了另一枚：上一枚的收尾被取消了，现在补上
    if (closing && closing !== item) release(closing);
    closing = null;
    if (inspector.current && inspector.current !== item) release(inspector.current);
    ensureBuilt(item);
    // 打开时才生成刻字，停稳后渲染循环再换成 2048；关闭动画里又打开同一枚时它还留着刻字，不用重做
    if (!item.badge.getObjectByName('back').userData.engravingSize) setEngravingSize(item.badge, 1024);
    mode = 'inspect';
    ctx.emit('inspecting', true);
    document.body.classList.add('is-inspecting');
    overlay.hidden = false;
    fillInfo(item);
    stage.resize();
    inspector.layoutChanged(measureReserve());

    item.pivot.rotation.set(0, 0, 0);
    const { layout } = inspector;
    // 月章从托盘里的原位置起飞；其他徽章照旧从中央、略小的位置放大
    const start = from ? rectToWorld(stage.view, from, item.fill) : null;
    if (start) {
      item.holder.position.set(start.x, start.y, 0);
      item.holder.scale.setScalar(start.scale);
    } else {
      item.holder.position.set(layout.x, layout.y, 0);
      item.holder.scale.setScalar(layout.scale * 0.6);
    }
    // 从原位置起飞时，画布不跟着遮罩淡入，只有背景淡入：月章一直看得见
    overlay.classList.toggle('is-tile', Boolean(start));
    // 飞出去时托盘里才留空凹槽；不飞（减少动态效果、SVG）时那一格一直在，遮罩淡入盖住它
    if (start) item.away?.(true);
    stage.scene.add(item.holder);
    // 托盘里那一格这一刻已经藏起来了：马上画一帧，不等渲染循环的下一帧，免得空一帧
    if (start) stage.renderer.render(stage.scene, stage.camera);
    inspector.open(item);
    exportPanel.set(false);
    loop.start();
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      inspectorEl.classList.add('is-open');
    });
    if (item.kind !== 'medal') history.replaceState(null, '', `#${item.config.id}`);
    // 只有用键盘打开时才把焦点移进来，避免鼠标用户看到焦点框
    if (viaKeyboard) $('[data-close]').focus({ preventScroll: true });
    if (award && awardable(item)) runAward();
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
    exportPanel.set(false, { keepTextFaded: true }); // 文字跟着信息区淡出，关完再复原
    document.body.classList.remove('is-inspecting');
    history.replaceState(null, '', location.pathname + location.search);
    // 月章：托盘里那一格看得见就飞回去（背景同时淡出），看不见就和其他徽章一样整体淡出
    const home = item?.home?.();
    if (home) flyHome(item, rectToWorld(stage.view, home, item.fill));
    else overlay.classList.remove('is-tile');
    closing = item;
    closeTimer = setTimeout(() => {
      closing = null;
      overlay.hidden = true;
      overlay.classList.remove('is-tile');
      exportPanel.set(false); // 遮罩已藏起来，这时复原说明文字不会被看到
      // 补间按帧走、这里按墙钟：慢的时候飞回还没走完，先落到终点再交还托盘
      if (tweens.has('home')) landHome?.();
      landHome = null;
      if (item) release(item); // 关上后释放刻字，换回共用的占位贴图
      loop.stop();
      ctx.emit('inspecting', false);
      onClosed.forEach((resolve) => resolve());
      onClosed = [];
    }, 320);
    item?.tile.focus({ preventScroll: true });
  }

  /** 飞回托盘：翻回正面、回正，落到原位置。0.3 秒，在 320 毫秒的收尾之前落定。 */
  function flyHome(item, to) {
    const h = item.holder;
    const p = item.pivot;
    const from = { x: h.position.x, y: h.position.y, z: h.position.z, s: h.scale.x, ry: p.rotation.y, rx: p.rotation.x };
    const update = (t) => {
      h.position.set(lerp(from.x, to.x, t), lerp(from.y, to.y, t), lerp(from.z, 0, t));
      h.scale.setScalar(lerp(from.s, to.scale, t));
      p.rotation.y = lerp(from.ry, 0, t);
      p.rotation.x = lerp(from.rx, 0, t);
      // 关闭后渲染循环的指纹里没有这一枚，看不出它在动；每帧从头画，免得超采样把飞行轨迹叠成残影
      ctx.accum.reset();
    };
    tweens.add({ key: 'home', duration: 0.3, easing: ease.inOutCubic, update });
    // 直接落到终点：停掉补间，摆到 t = 1
    landHome = () => {
      tweens.cancel('home');
      update(1);
    };
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

  // 切到后台再回来：静止时已经停笔，而手机浏览器可能丢掉后台 2D 画布的内容，叠加画布要重新积累一遍。
  // 2D 上下文被回收后恢复（contextrestored）同理
  document.addEventListener('visibilitychange', () => {
    if (mode === 'inspect' && document.visibilityState === 'visible') ctx.accum.restart();
  });
  $('#stage-accum').addEventListener('contextrestored', () => ctx.accum.restart());

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
