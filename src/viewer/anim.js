// 极简补间动画：在渲染循环里统一推进。

export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outBack: (t) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class Tweens {
  constructor() {
    this.list = [];
  }

  /**
   * @param {object} o
   * @param {number} o.duration 秒
   * @param {(t:number)=>void} o.update 传入已缓动的进度 0~1
   * @param {number} [o.delay]
   * @param {(t:number)=>number} [o.easing]
   * @param {string} [o.key] 同 key 的旧补间会被取消
   * @returns {Promise<void>}
   */
  add({ duration, update, delay = 0, easing = ease.outCubic, key }) {
    if (key) this.cancel(key);
    return new Promise((resolve) => {
      this.list.push({ duration, update, delay, easing, key, elapsed: -delay, resolve });
    });
  }

  cancel(key) {
    this.list = this.list.filter((tw) => tw.key !== key);
  }

  has(key) {
    return this.list.some((tw) => tw.key === key);
  }

  step(dt) {
    const done = [];
    for (const tw of this.list) {
      tw.elapsed += dt;
      if (tw.elapsed < 0) continue;
      const t = Math.min(1, tw.elapsed / tw.duration);
      tw.update(tw.easing(t));
      if (t >= 1) done.push(tw);
    }
    if (done.length) {
      this.list = this.list.filter((tw) => !done.includes(tw));
      done.forEach((tw) => tw.resolve());
    }
  }
}
