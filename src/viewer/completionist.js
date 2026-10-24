// 概览区的全解锁徽章：自带一个小舞台，实时渲染（做法同落地页首屏）。
// 第一次进入视野时播放进场：浮现 → 马赛克一段段亮起，跨过阶段时金属升级（火花、扫光、轻跳）→ 全部解锁时铸成星芒形态。
// 平时轻轻摆动，每 9 秒一道很淡的扫光；左右拖动翻到背面，松手带惯性滑行，再吸附到正面或背面。
// 减少动态效果时直接显示最终状态，没有摆动和扫光，仍然可以拖动。
import { Color, Group } from 'three';
import { buildBadge, disposeBadge } from '../engine/badge.js';
import { STAGE_METALS, completionistConfig, isComplete, stageOf } from '../brands/shared/completionist.js';
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
 * @returns {{ front: object[], lit: object[], ghost: object[], counts: object[], metals: Set<object> }}
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
    counts: parts.counts.map((i) => front[i]),
    metals,
  };
}

/**
 * 单枚查看用的临时 item：不进陈列墙，也不算进总数。
 * 模型是当前阶段的静态版；全部解锁时日期取最晚解锁的那一枚。
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
    state: { unlocked: k > 0, earnedAt, tier: null, progress: { current: k, target: total } },
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
 * @returns {{ pause(): void, resume(): void, dispose(): void }}
 */
export function createCompletionistCoin({ canvas, target = canvas, kit, brand, unlocked, total, reducedMotion = false }) {
  if (!(total > 0)) throw new Error('全解锁徽章需要徽章总数');
  const k = Math.max(0, Math.min(unlocked, total));
  const done = isComplete(k, total);
  const { palette } = brand;
  const METALS = STAGE_METALS.map((key) => new Color(palette[key]));
  const accent = new Color(palette.primary);
  const ivory = new Color(palette.ivory);

  // 配置先算好：出错时还没占用 WebGL 上下文
  const { config, parts } = completionistConfig(kit, { unlocked: k, total, metal: 'stage', anim: true });
  const finaleConfig = done ? completionistConfig(kit, { unlocked: total, total }).config : null;

  const stage = createStage(canvas);
  // 只有一枚、一直在动，用不上静止超采样：直接按 2 倍像素渲染
  stage.renderer.setPixelRatio(2);
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

  // 动画版：圆形外形，亮片、残影各一套，下弧文字 0..k 各一份
  let badge = assemble(config);
  // 阶段金属：外圈、细线圈、小珠、文字、圆盘描边、月桂、星共用的材质
  const { lit, ghost, counts, metals } = coinMeshes(badge, config, parts);
  // 亮片在原点生成，挪到各自的位置，缩放时原地弹出
  lit.forEach((m, t) => m.position.set(parts.tileCenters[t][0], parts.tileCenters[t][1], 0));
  pivot.add(badge);
  // 铸成后换上的静态完成形态（星芒、王冠、金），提前组装好
  const finale = finaleConfig && assemble(finaleConfig);

  const setMetal = (c) => metals.forEach((m) => m.color.copy(c));

  let tiles = -1;
  let shown = -1;
  /** 进度 j 枚：亮起对应数量的马赛克（新亮的弹一下），下弧文字换成 j。 */
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
      counts.forEach((mesh, i) => (mesh.visible = i === Math.min(j, k)));
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
  let disposed = false;

  async function upgrade(from, to) {
    const a = METALS[from];
    const b = METALS[to];
    const c = new Color();
    sparks([b, b, accent], 50, 0.7);
    sweep(0.9, 30);
    tweens.add({ duration: 0.6, easing: ease.linear, update: (t) => (scaleFx = 1 + Math.sin(t * Math.PI) * 0.045) });
    await tweens.add({ duration: 0.55, easing: ease.inOutCubic, update: (t) => setMetal(c.lerpColors(a, b, t)) });
    await wait(0.25);
  }

  function swapComplete() {
    pivot.remove(badge);
    disposeBadge(badge);
    badge = finale;
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
    if (done && !disposed) await mint();
  }

  // 起始状态：动画从锡、0 枚开始；减少动态效果时直接是最终状态
  if (reducedMotion) {
    setProgress(k, false);
    setMetal(METALS[stageOf(k, total)]);
    if (done) swapComplete();
  } else {
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
  }

  // 尺寸跟着版面走（桌面 184px、手机 140px）
  const sizer = new ResizeObserver(fit);
  sizer.observe(canvas);
  fit();

  // 看不见、或被单枚查看挡住（pause）时不画；第一次真正画出来时播放进场，之后不再自动播放
  let played = reducedMotion;
  let visible = false;
  let paused = false;
  function sync() {
    const run = visible && !paused && !disposed;
    last = performance.now();
    stage.renderer.setAnimationLoop(run ? tick : null);
    if (run && !played) {
      played = true;
      play();
    }
  }
  const seen = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      sync();
    },
    { threshold: 0.5 },
  );
  seen.observe(target);

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
    dispose() {
      if (disposed) return;
      disposed = true;
      stage.renderer.setAnimationLoop(null);
      seen.disconnect();
      sizer.disconnect();
      listeners.abort();
      tweens.list = [];
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
      stage.dispose();
    },
  };
}
