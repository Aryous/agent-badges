// 渲染循环交给超采样的 busy：呼吸发光、补间在动时不能停笔（否则发光被冻住、火花残影留在画面上）。
import { describe, expect, it } from 'vitest';
import { createLoop } from '../src/app/loop.js';

const v3 = () => ({ x: 0, y: 0, z: 0 });

// 不需要 WebGL：舞台、补间、超采样、单枚查看都换成替身，只记下每帧传给 accum.render 的 busy
function setup({ pulses = [], tweening = false } = {}) {
  let frame = null;
  const stage = {
    renderer: {
      setAnimationLoop(fn) {
        frame = fn;
      },
    },
    camera: { position: v3(), zoom: 1 },
    sweep: { intensity: 0, position: v3() },
  };
  const tweens = { list: tweening ? [{}] : [], step() {} };
  const busy = [];
  const accum = {
    render(sig, b) {
      busy.push(b);
      return 0;
    },
    restart() {},
    reset() {},
  };
  const inspector = {
    update() {},
    current: {
      badge: { userData: { pulses } },
      holder: { position: v3(), scale: v3() },
      pivot: { rotation: v3() },
    },
  };
  createLoop({ stage, tweens, accum }, inspector).start();
  return { busy, tick: (now) => frame(now) };
}

describe('渲染循环的 busy', () => {
  it('有呼吸发光：busy，一直混合不停笔', () => {
    const glow = { emissiveIntensity: 0 };
    const { busy, tick } = setup({ pulses: [glow] });
    tick(1000);
    tick(1016);
    expect(busy).toEqual([true, true]);
    expect(glow.emissiveIntensity).toBeGreaterThan(0);
  });

  it('没有呼吸发光、没有补间：不 busy，可以停笔', () => {
    const { busy, tick } = setup();
    tick(1000);
    expect(busy).toEqual([false]);
  });

  it('补间进行中（获得动画的火花）：busy', () => {
    const { busy, tick } = setup({ tweening: true });
    tick(1000);
    expect(busy).toEqual([true]);
  });
});
