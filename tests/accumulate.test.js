import { describe, expect, it } from 'vitest';
import { CONVERGED, createAccumulator } from '../src/viewer/accumulate.js';

// 不需要 WebGL：渲染器、相机、叠加画布都换成只记次数的替身
function setup() {
  const renderer = {
    domElement: { width: 200, height: 100 },
    info: { render: { frame: 0 } },
    renders: 0,
    render() {
      this.renders++;
      this.info.render.frame++;
    },
  };
  /** 每次错开渲染的偏移 [jx, jy] */
  const camera = {
    offsets: [],
    setViewOffset(w, h, jx, jy) {
      this.offsets.push([jx, jy]);
    },
    clearViewOffset() {},
  };
  const g = { globalAlpha: 1, blends: 0, drawImage() { this.blends++; }, clearRect() {} };
  const overlay = { width: 0, height: 0, style: {}, getContext: () => g };
  const accum = createAccumulator({ renderer, scene: {}, camera }, overlay);
  /** 连跑 n 帧，返回这几帧里渲染了几次 */
  const frames = (n, sig = 'a', busy = false) => {
    const before = renderer.renders;
    for (let i = 0; i < n; i++) accum.render(sig, busy);
    return renderer.renders - before;
  };
  return { accum, renderer, camera, g, overlay, frames };
}

describe('静止超采样收敛后停笔', () => {
  it('静止时混合到收敛为止，之后不再渲染也不再混合，叠加画布留着', () => {
    const { frames, g, overlay } = setup();
    // 前两帧普通渲染，之后每帧错开混合，混满 CONVERGED 帧就停
    expect(frames(2 + CONVERGED)).toBe(2 + CONVERGED);
    expect(g.blends).toBe(CONVERGED);
    expect(frames(100)).toBe(0);
    expect(g.blends).toBe(CONVERGED);
    expect(overlay.style.visibility).toBe('visible');
  });

  it('停笔后静止帧数照常累加：停稳第 12 帧换清晰刻字的时机不受停笔影响', () => {
    const { accum, renderer } = setup();
    const n = 2 + CONVERGED + 20;
    const stills = Array.from({ length: n }, () => accum.render('a'));
    expect(stills).toEqual(Array.from({ length: n }, (_, i) => i));
    // 最后 20 帧已经停笔，返回值还在往上数
    expect(renderer.renders).toBe(2 + CONVERGED);
  });

  it('指纹一变（拖动、补间、改尺寸）立刻恢复渲染，重新积累到收敛后再次停笔', () => {
    const { frames, overlay, renderer } = setup();
    frames(200);
    expect(frames(1, 'b')).toBe(1);
    expect(overlay.style.visibility).toBe('hidden');
    expect(frames(1 + CONVERGED, 'b')).toBe(1 + CONVERGED);
    expect(frames(50, 'b')).toBe(0);
    renderer.domElement.width = 300;
    expect(frames(2 + CONVERGED, 'b')).toBe(2 + CONVERGED);
    expect(frames(50, 'b')).toBe(0);
  });

  it('restart()（换了更清晰的贴图）后重新积累到收敛', () => {
    const { frames, accum } = setup();
    frames(200);
    accum.restart();
    expect(frames(CONVERGED)).toBe(CONVERGED);
    expect(frames(50)).toBe(0);
  });

  it('busy（呼吸发光、补间）时一直渲染混合；停下后再混满 CONVERGED 帧才停笔', () => {
    const { frames, g } = setup();
    expect(frames(300, 'a', true)).toBe(300);
    const blends = g.blends;
    expect(frames(CONVERGED)).toBe(CONVERGED);
    expect(g.blends).toBe(blends + CONVERGED);
    expect(frames(50)).toBe(0);
  });

  it('别人在画布上画过（导出）：按上一帧的错开位置重画一次盖掉，叠加画布不动', () => {
    const { frames, renderer, camera, g } = setup();
    frames(200);
    const last = camera.offsets.at(-1); // 最后一次混合用的偏移（JITTER[k-1]）
    const drawn = camera.offsets.length;
    renderer.render(); // 导出
    const blends = g.blends;
    expect(frames(1)).toBe(1);
    expect(camera.offsets.length).toBe(drawn + 1);
    expect(camera.offsets.at(-1)).toEqual(last);
    // 不是从头的第一个偏移（k 已经转回 JITTER[0]，取错下标就会是它）
    expect(camera.offsets.at(-1)).not.toEqual(camera.offsets[0]);
    expect(g.blends).toBe(blends);
    expect(frames(50)).toBe(0);
  });

  it('reset()（离开单枚查看）收起叠加画布，下次从头开始', () => {
    const { frames, accum, overlay } = setup();
    frames(200);
    accum.reset();
    expect(overlay.style.visibility).toBe('hidden');
    expect(frames(2 + CONVERGED)).toBe(2 + CONVERGED);
    expect(frames(10)).toBe(0);
  });
});
