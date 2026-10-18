import { clamp } from './anim.js';

// 单枚查看：徽章飞到画面中央。
// 水平拖动 → 绕 Y 轴自由旋转；松手后惯性滑行，慢下来时弹簧吸附到正面或背面。
// 垂直拖动 → 绕 X 轴倾斜，限制在 ±20°，松手回正。

const DRAG_GAIN = 0.011; // 每像素旋转的弧度
const FRICTION = 1.5; // 惯性阻尼
const SNAP_SPEED = 2.6; // 低于该角速度（rad/s）开始吸附
const SPRING_K = 55;
const SPRING_C = 9; // 略欠阻尼，吸附时会有一点回弹
const MAX_TILT = (20 * Math.PI) / 180;
const MAX_FLING = 24; // 松手时角速度上限（rad/s），避免一甩转太多圈

/**
 * 单枚查看时徽章的位置和大小。
 * reserve.top / reserve.bottom 是顶栏和底部信息区占用的像素高度，
 * 徽章放在两者之间的空白里，信息区变高（如分级阶梯）时自动缩小。
 */
export function computeFocusLayout(view, reserve = {}) {
  const { halfW, halfH, aspect, height } = view;
  const narrow = aspect < 0.85;
  const top = reserve.top ?? height * 0.1;
  const bottom = reserve.bottom ?? height * 0.36;
  const pxPerUnit = height / 2 / halfH;
  const availPx = Math.max(height * 0.3, height - top - bottom);
  // 宽度上限要让导出预览框（r / 0.84）也留在屏幕内
  const r = Math.min((availPx / 2 / pxPerUnit) * 0.9, halfH * (narrow ? 0.46 : 0.5), halfW * 0.76);
  const y = (height / 2 - (top + availPx / 2)) / pxPerUnit;
  return { x: 0, y, r, scale: r / 1.06 };
}

export function createInspector({ stage, items }) {
  const { renderer, view } = stage;
  const el = renderer.domElement;
  let current = null;
  let reserve = {};
  let layout = computeFocusLayout(view, reserve);
  /** award 动画进行时由外部接管位置和角度 */
  const override = { active: false, z: 0, scaleMul: 1 };
  const spin = { angle: 0, vel: 0, tilt: 0, tiltVel: 0, dragging: false, snapping: false };
  let last = null;
  const listeners = new Set();

  function onDown(e) {
    if (!current || override.active) return;
    el.setPointerCapture(e.pointerId);
    spin.dragging = true;
    spin.snapping = false;
    spin.vel = 0;
    last = { x: e.clientX, y: e.clientY, t: performance.now(), tilt0: spin.tilt, y0: e.clientY };
    el.style.cursor = 'grabbing';
  }

  function onMove(e) {
    if (!spin.dragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - last.t) / 1000;
    const d = (e.clientX - last.x) * DRAG_GAIN;
    spin.angle += d;
    // 用平滑后的瞬时角速度作为松手时的初速度
    spin.vel = spin.vel * 0.6 + (d / dt) * 0.4;
    spin.tilt = clamp(last.tilt0 + (e.clientY - last.y0) * 0.004, -MAX_TILT, MAX_TILT);
    last.x = e.clientX;
    last.t = now;
  }

  function onUp() {
    if (!spin.dragging) return;
    spin.dragging = false;
    // 松手前停顿太久，视为没有甩动
    if (performance.now() - last.t > 90) spin.vel = 0;
    spin.vel = clamp(spin.vel, -MAX_FLING, MAX_FLING);
    spin.snapping = false;
    el.style.cursor = current ? 'grab' : '';
  }

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  function physics(dt) {
    if (spin.dragging || override.active) return;
    if (!spin.snapping) {
      spin.angle += spin.vel * dt;
      spin.vel *= Math.exp(-FRICTION * dt);
      if (Math.abs(spin.vel) < SNAP_SPEED) spin.snapping = true;
    }
    if (spin.snapping) {
      const target = Math.round(spin.angle / Math.PI) * Math.PI;
      const acc = -SPRING_K * (spin.angle - target) - SPRING_C * spin.vel;
      spin.vel += acc * dt;
      spin.angle += spin.vel * dt;
    }
    // 倾斜回正
    const tAcc = -SPRING_K * spin.tilt - SPRING_C * spin.tiltVel;
    spin.tiltVel += tAcc * dt;
    spin.tilt += spin.tiltVel * dt;
  }

  let lastFace = 'front';

  function update(dt) {
    if (!current) return;
    // 物理步长过大时拆分，避免切回标签页时弹簧发散
    let rest = Math.min(dt, 0.1);
    while (rest > 0) {
      const h = Math.min(rest, 1 / 120);
      physics(h);
      rest -= h;
    }

    const k = 1 - Math.exp(-dt * 6);
    for (const item of items) {
      if (item === current) continue;
      const s = item.holder.scale.x * Math.exp(-dt * 14);
      item.holder.scale.setScalar(s);
      item.holder.visible = s > 0.02;
    }

    const h = current.holder;
    if (override.active) {
      h.position.set(layout.x, layout.y, override.z);
      h.scale.setScalar(layout.scale * override.scaleMul);
    } else {
      h.position.x += (layout.x - h.position.x) * k;
      h.position.y += (layout.y - h.position.y) * k;
      h.position.z += (0 - h.position.z) * k;
      h.scale.setScalar(h.scale.x + (layout.scale - h.scale.x) * k);
    }
    current.pivot.rotation.y = spin.angle;
    current.pivot.rotation.x = spin.tilt;

    const face = Math.cos(spin.angle) >= 0 ? 'front' : 'back';
    if (face !== lastFace) {
      lastFace = face;
      listeners.forEach((fn) => fn(face));
    }
  }

  return {
    spin,
    override,
    update,
    get current() {
      return current;
    },
    get face() {
      return lastFace;
    },
    get layout() {
      return layout;
    },
    onFaceChange(fn) {
      listeners.add(fn);
    },
    layoutChanged(nextReserve) {
      if (nextReserve) reserve = nextReserve;
      layout = computeFocusLayout(view, reserve);
    },
    open(item) {
      current = item;
      // 从陈列墙当前的摆动角度接上，避免跳变
      spin.angle = item.pivot.rotation.y;
      spin.tilt = item.pivot.rotation.x;
      spin.vel = 0;
      spin.tiltVel = 0;
      spin.snapping = true;
      lastFace = 'front';
      el.style.cursor = 'grab';
    },
    close() {
      if (!current) return;
      // 把角度归一到 (-π, π]，返回陈列墙时不会倒转好几圈
      const a = ((spin.angle % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      current.pivot.rotation.y = a;
      current = null;
      override.active = false;
      spin.dragging = false;
      el.style.cursor = '';
    },
  };
}
