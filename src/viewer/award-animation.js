import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, PointsMaterial } from 'three';
import { ease, lerp } from './anim.js';

// 获得动画：徽章从远处旋转飞入（约 2.5 圈），停在正面，
// 然后一道高光扫过表面，同时迸出一圈金色火花。

const SPIN_TURNS = 2.5;
const FLY_DURATION = 1.6;

export async function playAward({ stage, tweens, inspector, palette, reducedMotion = false }) {
  const { override, spin } = inspector;
  const item = inspector.current;
  if (!item) return;

  override.active = true;
  spin.vel = 0;
  spin.tilt = 0;
  spin.tiltVel = 0;

  if (reducedMotion) {
    override.z = 0;
    override.scaleMul = 1;
    spin.angle = 0;
    override.active = false;
    return;
  }

  const startAngle = -SPIN_TURNS * Math.PI * 2;
  await tweens.add({
    key: 'award',
    duration: FLY_DURATION,
    easing: ease.linear,
    update: (t) => {
      const e = ease.outQuart(t);
      override.z = lerp(-14, 0, ease.outCubic(t));
      override.scaleMul = lerp(0.35, 1, ease.outBack(Math.min(1, t * 1.15)));
      spin.angle = lerp(startAngle, 0, e);
    },
  });
  if (inspector.current !== item) return;
  override.active = false;
  spin.angle = 0;
  spin.snapping = true;

  burst(stage, tweens, inspector, palette);
  await glint(stage, tweens, inspector);
}

/** 点光源从左到右扫过徽章正面。 */
function glint(stage, tweens, inspector) {
  const { sweep } = stage;
  const { layout } = inspector;
  const span = layout.r * 2.2;
  return tweens.add({
    key: 'glint',
    duration: 0.9,
    easing: ease.inOutCubic,
    update: (t) => {
      sweep.position.set(layout.x + lerp(-span, span, t), layout.y + lerp(span * 0.5, -span * 0.3, t), layout.r * 0.9);
      sweep.distance = layout.r * 2.4;
      sweep.intensity = Math.sin(t * Math.PI) * 60;
    },
  }).then(() => {
    sweep.intensity = 0;
  });
}

/** 一圈向外飘散的火花。 */
function burst(stage, tweens, inspector, palette) {
  const { layout } = inspector;
  const N = 90;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const dirs = [];
  const colors = [new Color(palette.gold), new Color(palette.primary), new Color(palette.ivory)];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 0.7 + Math.random() * 0.8;
    dirs.push([Math.cos(a) * speed, Math.sin(a) * speed, (Math.random() - 0.3) * 0.6]);
    const c = colors[i % 3];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  const mat = new PointsMaterial({
    size: layout.r * 0.05,
    vertexColors: true,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const points = new Points(geo, mat);
  points.position.set(layout.x, layout.y, 0);
  stage.scene.add(points);

  tweens.add({
    key: 'burst',
    duration: 1.3,
    easing: ease.linear,
    update: (t) => {
      const d = ease.outCubic(t) * layout.r * 0.75;
      for (let i = 0; i < N; i++) {
        const [x, y, z] = dirs[i];
        pos[i * 3] = x * (layout.r * 0.85 + d);
        pos[i * 3 + 1] = y * (layout.r * 0.85 + d) - t * t * layout.r * 0.2;
        pos[i * 3 + 2] = z * d;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 1 - ease.inOutCubic(t);
    },
  }).then(() => {
    stage.scene.remove(points);
    geo.dispose();
    mat.dispose();
  });
}
