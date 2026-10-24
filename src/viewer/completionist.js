// 概览区的全解锁徽章：自带一个小舞台，实时渲染（做法同落地页首屏）。
// 第一次进入视野时播放进场：浮现 → 马赛克一段段亮起，跨过阶段时金属升级（火花、扫光、轻跳）→ 全部解锁时铸成星芒形态。
// 平时轻轻摆动，每 9 秒一道很淡的扫光；左右拖动翻到背面，松手带惯性滑行，再吸附到正面或背面。
// 减少动态效果时直接显示最终状态，没有摆动和扫光，仍然可以拖动；静止时不画。
// 省资源：只组装要用的那一版；完成形态在进场开始前才组装；进场结束后同材质的浮雕并成一个网格（几十次绘制）。
import { Color, Group } from 'three';
import { buildBadge, disposeBadge, swapRelief } from '../engine/badge.js';
import { mergeByMaterial } from '../engine/merge.js';
import { STAGE_METALS, completionistConfig, countText, isComplete, stageOf } from '../brands/shared/completionist.js';
import { createStage } from './scene.js';
import { Tweens, ease, lerp } from './anim.js';
import { burst } from './award-animation.js';

/** 铸币占版面的比例：0.9，和原来的 PNG 铸币一样大；火花飞出版面，落在多出来的画布上。 */
const FILL = 0.9;

/**
 * 进场的分段点：⌈n/4⌉、⌈n/2⌉、⌈3n/4⌉ 中不超过 k 的，最后是 k 本身（去重）。
 * stage 是到达这一点时的阶段（0..3），比上一段高就要升级。
 * @returns {{ to: number, stage: number }[]}
 */
export function introStops(unlocked, total) {
  const points = [0.25, 0.5, 0.75].map((f) => Math.ceil(total * f)).filter((x) => x <= unlocked);
  return [...new Set([...points, unlocked])].map((to) => ({ to, stage: stageOf(to, total) }));
}

/** 一段推进的时长（秒）：0.35 + 枚数 × 0.085。 */
export const segmentDuration = (from, to) => 0.35 + (to - from) * 0.085;

/** 动画版徽章用的状态：按已解锁画（不用灰色的未解锁材质）。 */
export const coinState = (unlocked, total) => ({ unlocked: true, earnedAt: null, progress: { current: unlocked, target: total } });

/**
 * 在动画版徽章里找到要动的网格。正面浮雕是最后 relief.length 个子节点（badge.js 先装背面），顺序同配置；
 * 阶段金属是色板键为 'stage' 的材质（渐变材质没有色板键）。
 * @returns {{ front: object[], lit: object[], ghost: object[], count: object, metals: Set<object> }}
 */
export function coinMeshes(badge, config, parts) {
  const front = badge.children.slice(badge.children.length - config.relief.length);
  const metals = new Set();
  badge.traverse((o) => {
    if (o.isMesh && o.material.userData?.colorKey === 'stage') metals.add(o.material);
  });
  return {
    front,
    lit: parts.lit.map((i) => front[i]),
    ghost: parts.ghost.map((i) => front[i]),
    count: front[parts.count],
    metals,
  };
}

/**
 * 减少动态效果时还要不要画下一帧：拖动中、有补间、还在滑行或没吸附到位就画，停稳了就停。
 * 不减少动态效果时一直在摆动，每帧都画。
 */
export function needsFrame({ reducedMotion, dragging = false, busy = false, vel, off }) {
  if (!reducedMotion || dragging || busy) return true;
  const snap = Math.round(off / Math.PI) * Math.PI;
  return Math.abs(vel) > 0.01 || Math.abs(off - snap) > 0.001;
}

/**
 * 合并静态网格，并在传上显卡后丢掉合并几何体在内存里的那份数组（之后不再改它；包围球先算好，视锥裁剪要用）。
 * 铸币不处理上下文恢复：丢了就换回刻度环，所以不需要留着数组重新上传。
 */
function settle(badge) {
  mergeByMaterial(badge);
  for (const o of badge.children) {
    if (o.name !== 'merged') continue;
    o.geometry.computeBoundingSphere();
    for (const a of Object.values(o.geometry.attributes)) a.onUpload(release);
  }
}
function release() {
  this.array = null;
}

/** 空闲时再做（最多等 timeout 毫秒）；没有 requestIdleCallback 的浏览器排到下一轮。 */
const idle = (fn, timeout) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 1));

/**
 * 单枚查看用的临时 item：不进陈列墙，也不算进总数。
 * 模型是当前阶段的静态版；全部解锁时日期取最晚解锁的那一枚。
 * 锡是起步阶段，不是未解锁：一枚没解锁也按已解锁画（锡色、残影），只是没有获得动画可播（award: false）。
 * @param {object} kit  品牌部件
 * @param {object[]} items  陈列墙的徽章 [{ config, state }]
 */
export function completionistItem(kit, items) {
  const total = items.length;
  const done = items.filter((it) => it.state?.unlocked);
  const k = done.length;
  const earnedAt = isComplete(k, total) ? (done.map((it) => it.state.earnedAt).filter(Boolean).sort().at(-1) ?? null) : null;
  const { config } = completionistConfig(kit, { unlocked: k, total });
  return {
    config,
    state: { unlocked: true, earnedAt, tier: null, progress: { current: k, target: total } },
    award: k > 0,
    badge: null,
    pivot: null,
    holder: null,
  };
}

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {HTMLElement} [opts.target]  接收拖动、判断可见的元素，宽度就是铸币的版面宽度；画布可以比它大（给火花留地方）
 * @param {object} opts.kit      品牌部件（BRANDS[i].completionist）
 * @param {object} opts.brand
 * @param {number} opts.unlocked
 * @param {number} opts.total
 * @param {boolean} [opts.reducedMotion]
 * @param {() => void} [opts.onLost]  WebGL 上下文丢了：铸币已经自己释放，调用方换回刻度环
 * @returns {{ pause(): void, resume(): void, dispose(): void }}
 */
export function createCompletionistCoin({ canvas, target = canvas, kit, brand, unlocked, total, reducedMotion = false, onLost }) {
  if (!(total > 0)) throw new Error('全解锁徽章需要徽章总数');
  const k = Math.max(0, Math.min(unlocked, total));
  const done = isComplete(k, total);
  const { palette } = brand;
  const METALS = STAGE_METALS.map((key) => new Color(palette[key]));
  const accent = new Color(palette.primary);
  const ivory = new Color(palette.ivory);

  // 配置先算好：出错时还没占用 WebGL 上下文。减少动态效果时只要最终的静态版（完成时就是完成形态）
  const anim = reducedMotion ? null : completionistConfig(kit, { unlocked: k, total, metal: 'stage', anim: true });
  const finalConfig = reducedMotion || done ? completionistConfig(kit, { unlocked: k, total }).config : null;

  // 像素比沿用舞台的设置（屏幕像素比，最多 2 倍）
  const stage = createStage(canvas);
  const holder = new Group();
  const pivot = new Group();
  holder.add(pivot);
  stage.scene.add(holder);
  const tweens = new Tweens();
  let R = 1; // 铸币半径（世界单位）
  let box = 1; // 原型里的画布半高：扫光的路径按它算

  function fit() {
    stage.resize();
    const ratio = target === canvas ? 1 : target.clientWidth / (canvas.clientWidth || 1);
    box = stage.view.halfH * ratio;
    R = box * FILL;
    holder.scale.setScalar(R);
  }

  const state = coinState(k, total);
  /** 组装、挂环境贴图，提前把贴图传上显卡、着色器交给后台编译，换上来时不卡。 */
  function assemble(config) {
    const badge = buildBadge(config, brand, state, { engraving: 0 });
    stage.applyEnvironment(badge);
    badge.traverse((o) => {
      if (!o.isMesh) return;
      for (const v of Object.values(o.material)) if (v?.isTexture) stage.renderer.initTexture(v);
    });
    stage.renderer.compileAsync(badge, stage.camera, stage.scene).catch(() => {});
    return badge;
  }

  let disposed = false;
  /** 静态的最终版：组装后同材质的浮雕并成一个网格。 */
  let finale = null;
  const buildFinal = () => {
    if (!finale && !disposed) {
      finale = assemble(finalConfig);
      settle(finale);
    }
    return finale;
  };

  // 动画版：圆形外形，亮片、残影各一套（各自共用一份几何体），下弧文字一份、按进度换字
  let badge;
  let lit = [];
  let ghost = [];
  let countMesh = null;
  let metals = new Set();
  if (anim) {
    badge = assemble(anim.config);
    // 阶段金属：外圈、细线圈、小珠、文字、圆盘描边、月桂、星共用的材质
    ({ lit, ghost, count: countMesh, metals } = coinMeshes(badge, anim.config, anim.parts));
    // 铸成后换上的完成形态（星芒、王冠、金）在进场开始前组装（见 sync），不挤在进场动画中间
  } else {
    badge = buildFinal();
  }
  pivot.add(badge);

  const setMetal = (c) => metals.forEach((m) => m.color.copy(c));

  let tiles = -1;
  let shown = 0; // 配置里的下弧文字是 0
  /** 进度 j 枚：亮起对应数量的马赛克（新亮的弹一下），下弧文字换成 j（用到哪个生成哪个）。 */
  function setProgress(j, animate = true) {
    const m = Math.round((lit.length * j) / total);
    if (m !== tiles) {
      lit.forEach((mesh, i) => {
        const on = i < m;
        if (on && !mesh.visible && animate) pop(mesh, (i - Math.max(tiles, 0)) * 0.012);
        mesh.visible = on;
      });
      ghost.forEach((mesh, i) => (mesh.visible = i >= m));
      tiles = m;
    }
    if (j !== shown) {
      swapRelief(badge, countMesh, { ...anim.config.relief[anim.parts.count], text: countText(Math.min(j, k), total) });
      shown = j;
    }
  }

  function pop(mesh, delay = 0) {
    mesh.scale.setScalar(0.001);
    tweens.add({ delay, duration: 0.34, easing: ease.linear, update: (t) => mesh.scale.setScalar(Math.max(0.001, ease.outBack(t))) });
  }

  const sw = { t: -1, dur: 1, peak: 0 };
  const sweep = (dur, peak) => Object.assign(sw, { t: 0, dur, peak });
  const wait = (s) => tweens.add({ duration: s, easing: ease.linear, update: () => {} });
  const sparks = (colors, count, spread) => burst(stage, tweens, { x: 0, y: 0, r: R }, colors, { count, spread });

  let scaleFx = 1;
  let intro = 0; // 进场开始后的秒数：摆动在 1.5 秒后用 2.5 秒加进来

  async function upgrade(from, to) {
    const a = METALS[from];
    const b = METALS[to];
    const c = new Color();
    sparks([b, b, accent], 50, 0.7);
    sweep(0.9, 30);
    tweens.add({ duration: 0.6, easing: ease.linear, update: (t) => (scaleFx = 1 + Math.sin(t * Math.PI) * 0.045) });
    await tweens.add({ duration: 0.55, easing: ease.inOutCubic, update: (t) => setMetal(c.lerpColors(a, b, t)) });
    if (!disposed) await wait(0.25);
  }

  /** 动画版用完了：放掉对它网格的引用，几何体数组才能回收。 */
  function forgetAnim() {
    lit = [];
    ghost = [];
    countMesh = null;
    metals = new Set();
  }

  function swapComplete() {
    pivot.remove(badge);
    disposeBadge(badge);
    forgetAnim();
    badge = buildFinal();
    pivot.add(badge);
  }

  async function mint() {
    await wait(0.35);
    if (disposed) return;
    await tweens.add({ duration: 0.28, easing: ease.inCubic, update: (t) => (scaleFx = lerp(1, 0.05, t)) });
    if (disposed) return;
    swapComplete();
    sparks([METALS[3], accent, ivory], 140, 1.2);
    sweep(1.1, 36);
    await tweens.add({ duration: 0.8, easing: ease.linear, update: (t) => (scaleFx = Math.max(0.05, ease.outBack(t))) });
  }

  async function play() {
    intro = 0;
    scaleFx = 0.9;
    await tweens.add({ duration: 0.6, easing: ease.outCubic, update: (t) => (scaleFx = lerp(0.9, 1, t)) });
    let from = 0;
    let level = 0;
    for (const { to, stage: next } of introStops(k, total)) {
      if (disposed) return;
      if (to > from) {
        const a = from;
        await tweens.add({ duration: segmentDuration(a, to), easing: ease.inOutSine, update: (t) => setProgress(Math.round(lerp(a, to, t))) });
      }
      if (disposed) return;
      from = to;
      if (next > level) {
        await upgrade(level, next);
        level = next;
      }
    }
    if (disposed) return;
    if (done) {
      await mint();
      return;
    }
    // 进场结束：不再单独改动浮雕，同材质的并成一个网格（藏着的残影直接去掉）。
    // 合并会把每片当时的缩放写进几何体，所以要等最后几片「弹出」放完再并；保险起见并之前把亮片都摆回原大小
    const settleWhenQuiet = () =>
      idle(() => {
        if (disposed) return;
        if (tweens.list.length) return settleWhenQuiet();
        lit.forEach((mesh) => mesh.scale.setScalar(1));
        settle(badge);
        forgetAnim();
      }, 1000);
    settleWhenQuiet();
  }

  // 起始状态：动画从锡、0 枚开始（减少动态效果时已经是静态的最终版）
  if (anim) {
    setMetal(METALS[0]);
    setProgress(0, false);
  }

  // ---------- 拖动：左右转，松手带惯性，再吸附到最近的正面或背面 ----------
  const s = { off: 0, vel: 0, drag: false, x: 0, t: 0 };
  const listeners = new AbortController();
  const on = (el, type, fn) => el.addEventListener(type, fn, { signal: listeners.signal });
  on(target, 'pointerdown', (e) => {
    // 只认左键；按在下方说明文字上不转
    if (e.button !== 0 || e.target.closest?.('figcaption')) return;
    s.drag = true;
    s.x = e.clientX;
    s.t = performance.now();
    target.setPointerCapture(e.pointerId);
    wake();
  });
  // 上下文丢了（显卡重置、标签页太多被浏览器收回）：释放自己，交给调用方换回刻度环
  on(canvas, 'webglcontextlost', () => {
    if (disposed) return;
    dispose({ lost: true });
    onLost?.();
  });
  on(target, 'pointermove', (e) => {
    if (!s.drag) return;
    const now = performance.now();
    const d = (e.clientX - s.x) * 0.014;
    s.off += d;
    s.vel = d / Math.max(0.008, (now - s.t) / 1000);
    s.x = e.clientX;
    s.t = now;
  });
  const up = () => (s.drag = false);
  on(target, 'pointerup', up);
  on(target, 'pointercancel', up);

  // ---------- 渲染循环 ----------
  let last = performance.now();
  const phase = Math.random() * 10000;
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    tweens.step(dt);
    intro += dt;
    pivot.scale.setScalar(scaleFx);
    if (!s.drag) {
      s.vel *= Math.exp(-dt * 2.2);
      if (Math.abs(s.vel) < 1.2) {
        const snap = Math.round(s.off / Math.PI) * Math.PI;
        s.vel += (snap - s.off) * dt * 14;
        s.vel *= Math.exp(-dt * 5);
      }
      s.off += s.vel * dt;
    }
    // 减少动态效果时停稳了就画完这一帧停下，下次拖动、改尺寸时再开
    const rest = !needsFrame({ reducedMotion, dragging: s.drag, busy: tweens.list.length > 0 || sw.t >= 0, vel: s.vel, off: s.off });
    if (rest) {
      s.off = Math.round(s.off / Math.PI) * Math.PI;
      s.vel = 0;
    }
    const t = (now + phase) / 1000;
    const sway = reducedMotion ? 0 : ease.inOutSine(Math.min(1, Math.max(0, (intro - 1.5) / 2.5)));
    pivot.rotation.set(0.04 + Math.sin(t * 0.55) * 0.07 * sway, 0.18 + Math.sin(t * 0.37) * 0.22 * sway + s.off, 0);

    // 扫光：进场里的升级、铸成各一道；平时每 9 秒一道很淡的
    let p = -1;
    let peak = 0;
    if (sw.t >= 0) {
      sw.t += dt;
      p = ease.inOutSine(Math.min(1, sw.t / sw.dur));
      peak = sw.peak;
      if (sw.t >= sw.dur) sw.t = -1;
    } else if (!reducedMotion) {
      p = (t % 9) / 1.6;
      peak = 12;
    }
    if (p >= 0 && p < 1) {
      stage.sweep.position.set(-box + 2 * box * p, box * 0.7 - 1.2 * box * p, box * 0.9);
      stage.sweep.distance = box * 2.4;
      stage.sweep.intensity = Math.sin(p * Math.PI) * peak;
    } else stage.sweep.intensity = 0;
    stage.renderer.render(stage.scene, stage.camera);
    if (rest) setLoop(false);
  }

  // 看不见、或被单枚查看挡住（pause）时不画；第一次真正画出来时播放进场，之后不再自动播放
  let played = reducedMotion;
  let visible = false;
  let paused = false;
  let looping = false;
  function setLoop(on) {
    if (on === looping) return;
    looping = on;
    last = performance.now();
    stage.renderer.setAnimationLoop(on ? tick : null);
  }
  /** 需要画的时候（拖动、改尺寸、重新露出来）把循环打开；停稳后 tick 自己关。 */
  function wake() {
    if (visible && !paused && !disposed) setLoop(true);
  }
  function sync() {
    const run = visible && !paused && !disposed;
    setLoop(run);
    if (run && !played) {
      played = true;
      // 第一帧还没画：这时组装完成形态看不出停顿，比在进场中间（空闲回调）组装好
      if (done) buildFinal();
      play().catch((e) => console.warn('全解锁徽章进场出错', e));
    }
  }

  // 尺寸跟着版面走（桌面 184px、手机 140px）
  const sizer = new ResizeObserver(() => {
    fit();
    wake();
  });
  sizer.observe(canvas);
  fit();
  const seen = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      sync();
    },
    { threshold: 0.5 },
  );
  seen.observe(target);

  /** 释放全部资源；上下文已经丢了（lost）时不再去交还它。 */
  function dispose({ lost = false } = {}) {
    if (disposed) return;
    disposed = true;
    stage.renderer.setAnimationLoop(null);
    seen.disconnect();
    sizer.disconnect();
    listeners.abort();
    // 放行等着补间的进场，它醒来看到 disposed 就收手
    tweens.clear();
    // 还在飘的火花
    const points = [];
    stage.scene.traverse((o) => o.isPoints && points.push(o));
    for (const o of points) {
      stage.scene.remove(o);
      o.geometry.dispose();
      o.material.dispose();
    }
    disposeBadge(badge);
    if (finale && finale !== badge) disposeBadge(finale);
    stage.dispose({ lost });
  }

  return {
    /** 停下渲染循环（比如单枚查看挡住了它）；进场也跟着停在原处。 */
    pause() {
      paused = true;
      sync();
    },
    resume() {
      paused = false;
      sync();
    },
    dispose: () => dispose(),
  };
}
