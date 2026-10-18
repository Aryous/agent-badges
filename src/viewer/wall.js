import { Raycaster, Vector2, Vector3 } from 'three';

// 陈列墙：徽章排成一排（窄屏时竖排），悬浮摆动，悬停时放大并朝鼠标倾斜。
// 位置通过指数平滑逼近目标值，所以从单枚查看返回时会自然飞回原位。

const BADGE_EXTENT = 1.06; // 徽章配置里最大的外接半径

/** 根据可见范围计算每个槽位的中心和缩放。 */
export function computeWallLayout(view, n) {
  const { halfW, halfH, aspect } = view;
  const slots = [];
  if (aspect >= 0.85) {
    const slotW = (halfW * 2 * 0.88) / n;
    const r = Math.min(slotW * 0.36, halfH * 0.42);
    for (let i = 0; i < n; i++) {
      slots.push({ x: (i - (n - 1) / 2) * slotW, y: halfH * 0.04, scale: r / BADGE_EXTENT, r });
    }
  } else {
    const top = halfH * 0.74;
    const slotH = (top + halfH * 0.98) / n;
    const r = Math.min(slotH * 0.3, halfW * 0.5);
    for (let i = 0; i < n; i++) {
      slots.push({ x: 0, y: top - slotH * (i + 0.42), scale: r / BADGE_EXTENT, r });
    }
  }
  return slots;
}

export function createWall({ stage, items, labelsEl, onSelect }) {
  const { camera, renderer, view } = stage;
  const raycaster = new Raycaster();
  const pointer = new Vector2(10, 10);
  let slots = computeWallLayout(view, items.length);
  let hovered = null;
  let downAt = null;
  let active = true;

  items.forEach((item, i) => {
    item.phase = i * 1.7;
    item.tilt = new Vector2();
    item.label.addEventListener('click', () => active && onSelect(item));
    item.label.addEventListener('pointerenter', () => (hovered = item));
    item.label.addEventListener('pointerleave', () => hovered === item && (hovered = null));
  });

  function pick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    for (const item of items) {
      if (raycaster.intersectObject(item.holder, true).length) return item;
    }
    return null;
  }

  const el = renderer.domElement;
  el.addEventListener('pointermove', (e) => {
    if (!active || e.pointerType === 'touch') return;
    hovered = pick(e);
    el.style.cursor = hovered ? 'pointer' : '';
  });
  el.addEventListener('pointerleave', () => {
    if (active) hovered = null;
  });
  el.addEventListener('pointerdown', (e) => {
    if (active) downAt = { x: e.clientX, y: e.clientY };
  });
  el.addEventListener('pointerup', (e) => {
    if (!active || !downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 8) return;
    const hit = pick(e);
    if (hit) onSelect(hit);
  });

  const tmp = new Vector3();

  function update(dt, t) {
    const k = 1 - Math.exp(-dt * 7);
    for (const [i, item] of items.entries()) {
      const slot = slots[i];
      const isHover = hovered === item;
      const float = Math.sin(t * 1.1 + item.phase) * slot.r * 0.035;
      const targetScale = slot.scale * (isHover ? 1.07 : 1);
      item.holder.visible = true;
      item.holder.position.x += (slot.x - item.holder.position.x) * k;
      item.holder.position.y += (slot.y + float - item.holder.position.y) * k;
      item.holder.position.z += (0 - item.holder.position.z) * k;
      const s = item.holder.scale.x + (targetScale - item.holder.scale.x) * k;
      item.holder.scale.setScalar(s);

      // 悬停时朝指针方向倾斜，否则轻微摆动
      if (isHover) {
        tmp.copy(item.holder.position).project(camera);
        item.tilt.set((pointer.x - tmp.x) * 1.6, (pointer.y - tmp.y) * 1.6);
      } else {
        item.tilt.multiplyScalar(1 - k);
      }
      const swayY = Math.sin(t * 0.55 + item.phase) * 0.22 + item.tilt.x * 0.5;
      const swayX = Math.sin(t * 0.4 + item.phase * 1.3) * 0.06 - item.tilt.y * 0.4;
      item.pivot.rotation.y += (swayY - item.pivot.rotation.y) * k;
      item.pivot.rotation.x += (swayX - item.pivot.rotation.x) * k;

      // 标签贴在徽章正下方
      tmp.set(slot.x, slot.y - slot.r * 1.18, 0).project(camera);
      item.label.style.transform = `translate(-50%, 0) translate(${((tmp.x + 1) / 2) * view.width}px, ${((1 - tmp.y) / 2) * view.height}px)`;
      item.label.classList.toggle('is-hover', isHover);
    }
  }

  return {
    update,
    layout() {
      slots = computeWallLayout(view, items.length);
    },
    setActive(v) {
      active = v;
      hovered = null;
      el.style.cursor = '';
      labelsEl.classList.toggle('is-hidden', !v);
    },
  };
}
