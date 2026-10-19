// 静止时的超采样（单枚查看）：徽章不动时，每帧把相机错开不到一个像素再渲染，
// 和之前几帧混合。十来帧之后，边缘、金属倒角上的细高光、凸起文字都和超采样一样顺；
// 一动就立刻回到普通渲染，拖动时不多花一点力气。
//
// 用混合而不是「攒够 N 帧就停」：有些徽章带缓慢呼吸的发光，持续混合能让它照常变化。
// 混合在一张叠在 3D 画布上方的 2D 画布里做，3D 画布照常输出色调映射后的颜色，所以颜色和平时一致。

/** Halton 低差异序列：错开的位置均匀铺满一个像素，比随机收敛得快。 */
function halton(i, base) {
  let f = 1;
  let r = 0;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}
const JITTER = Array.from({ length: 16 }, (_, i) => [halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5]);
/** 混合比例的下限：前几帧是逐帧平均，之后保持 1/10，让缓慢的发光变化能透出来。 */
const MIN_ALPHA = 1 / 10;
/** 静止多少帧后开始错开相机（弹簧回正的最后几帧位移小于像素，算作静止）。 */
const SETTLE = 2;

/**
 * @param {object} stage    createStage 的结果
 * @param {HTMLCanvasElement} overlay  叠在 3D 画布上方、同样大小的 2D 画布
 */
export function createAccumulator(stage, overlay) {
  const g = overlay.getContext('2d');
  let lastSig = '';
  let still = 0;
  let k = 0;

  function hide() {
    if (k === 0 && overlay.style.visibility !== 'visible') return;
    overlay.style.visibility = 'hidden';
    k = 0;
  }

  return {
    /**
     * 代替 renderer.render。sig 是这一帧「画面会不会变」的指纹（位置、角度、灯光等），
     * 和上一帧相同就算静止。返回已经静止了多少帧。
     */
    render(sig) {
      const { renderer, scene, camera } = stage;
      const canvas = renderer.domElement;
      const key = `${sig}|${canvas.width}x${canvas.height}`;
      still = key === lastSig ? still + 1 : 0;
      lastSig = key;
      if (still < SETTLE) {
        hide();
        renderer.render(scene, camera);
        return still;
      }
      const w = canvas.width;
      const h = canvas.height;
      if (overlay.width !== w || overlay.height !== h) {
        overlay.width = w;
        overlay.height = h;
        k = 0;
      }
      const [jx, jy] = JITTER[k % JITTER.length];
      camera.setViewOffset(w, h, jx, jy, w, h);
      renderer.render(scene, camera);
      camera.clearViewOffset();
      // 同一个任务里取走画面：WebGL 画布默认不保留上一帧
      if (k === 0) {
        g.globalAlpha = 1;
        g.clearRect(0, 0, w, h);
      } else {
        g.globalAlpha = Math.max(1 / (k + 1), MIN_ALPHA);
      }
      g.drawImage(canvas, 0, 0);
      k++;
      overlay.style.visibility = 'visible';
      return still;
    },
    /** 画面内容变了（比如换了更清晰的贴图），从头积累。 */
    restart() {
      k = 0;
    },
    /** 离开单枚查看时收起。 */
    reset() {
      hide();
      lastSig = '';
      still = 0;
    },
  };
}

/** 把一组数字变成指纹：保留到 1e-4，弹簧回正最后那点微小抖动不算移动。 */
export function signature(values) {
  return values.map((v) => Math.round(v * 1e4)).join(',');
}
