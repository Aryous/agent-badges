import { setEngravingSize } from '../engine/badge.js';
import { signature } from '../viewer/accumulate.js';

/** 渲染循环：只在单枚查看时运行。静止时超采样，停稳后换清晰的背面刻字。 */
export function createLoop(ctx, inspector) {
  const { stage, tweens, accum } = ctx;
  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    tweens.step(dt);
    inspector.update(dt);
    const t = now / 1000;
    const current = inspector.current;
    for (const m of current?.badge.userData.pulses ?? []) {
      m.emissiveIntensity = 0.06 + 0.3 * (0.5 + 0.5 * Math.sin(t * 3.4));
    }
    // 静止时超采样；呼吸发光不算移动
    const { camera, sweep } = stage;
    const h = current?.holder;
    const still = accum.render(
      signature([
        ...(h ? [h.position.x, h.position.y, h.position.z, h.scale.x, current.pivot.rotation.x, current.pivot.rotation.y] : []),
        camera.position.x, camera.position.y, camera.position.z, camera.zoom,
        sweep.intensity, sweep.position.x, sweep.position.y,
      ]),
    );
    // 停稳一小会儿后，背面刻字换成 2048 的清晰版本。上传大贴图会卡一下，静止时看不出来
    if (still === 12 && current && setEngravingSize(current.badge, 2048)) accum.restart();
  }
  return {
    start() {
      lastT = performance.now();
      stage.renderer.setAnimationLoop(loop);
    },
    stop() {
      stage.renderer.setAnimationLoop(null);
      accum.reset();
    },
  };
}
