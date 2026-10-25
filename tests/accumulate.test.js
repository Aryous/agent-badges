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
  const camera = { setViewOffset() {}, clearViewOffset() {} };
  const g = { globalAlpha: 1, blends: 0, drawImage() { this.blends++; }, clearRect() {} };
  const overlay = { width: 0, height: 0, style: {}, getContext: () => g };
  const accum = createAccumulator({ renderer, scene: {}, camera }, overlay);
  /** 连跑 n 帧，返回这几帧里渲染了几次 */
  const frames = (n, sig = 'a', busy = false) => {
    const before = renderer.renders;
    for (let i = 0; i < n; i++) accum.render(sig, busy);
    return renderer.renders - before;
  };
  return { accum, renderer, g, overlay, frames };
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

  it('收敛前就换清晰刻字（停稳第 12 帧）：CONVERGED 足够大', () => {
    expect(CONVERGED).toBeGreaterThan(10);
  });

  it('指纹一变（拖动、补间、改尺寸）立刻恢复渲染，并重新积累', () => {
    const { frames, overlay, renderer } = setup();
    frames(200);
    expect(frames(1, 'b')).toBe(1);
    expect(overlay.style.visibility).toBe('hidden');
    expect(frames(1, 'b')).toBe(1);
    frames(200, 'b');
    renderer.domElement.width = 300;
    expect(frames(1, 'b')).toBe(1);
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

  it('别人在画布上画过（导出）：按上一帧重画一次盖掉，叠加画布不动', () => {
    const { frames, renderer, g } = setup();
    frames(200);
    renderer.render(); // 导出
    const blends = g.blends;
    expect(frames(1)).toBe(1);
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
