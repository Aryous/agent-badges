import { Color, ExtrudeGeometry, Group, Mesh } from 'three';
import { smoothBevels } from './normals.js';
import { makeOutline, outlineSegments, reededOutline, withHole } from './shapes.js';
import { resolveTier } from './tiers.js';
import { BadgeUV } from './uv.js';
import { createMaterial } from './materials.js';
import { buildRelief } from './relief.js';
import { createEngraving } from './engraving.js';
import { patternTexture } from './textures.js';

/** 珐琅底纹：只改底层的凹凸，清漆层仍是光滑的，像透明珐琅盖在雕花底纹上。 */
function patternOverrides(pattern) {
  if (!pattern || typeof document === 'undefined') return {};
  return { bumpMap: patternTexture(pattern), bumpScale: 0.6 };
}

// 把「徽章配置 + 品牌主题 + 进度状态」组装成一枚 3D 徽章。
//
// 结构（侧视）：
//   ┌── 外圈 rim：带倒角的环，厚度 depth
//   │  ┌ 正面板 face：内缩 inset，表面比外圈低 recess，上面放浮雕
//   │  └ 背面板 back：同尺寸，表面带刻字贴图
//   └──

const SMOOTH_ANGLE = Math.PI / 6;

/** 隐藏成就未解锁时，正面只显示一个像素问号。 */
const QUESTION = ['.####.', '##..##', '....##', '...##.', '..##..', '..##..', '......', '..##..'];

/** 挤出并把 z 范围规整到 [0, depth]。 */
function extrude(shape, depth, { bevel = 0, segments = 12 } = {}) {
  const geo = new ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - 2 * bevel),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 6,
    curveSegments: segments,
    UVGenerator: BadgeUV,
  });
  geo.translate(0, 0, bevel);
  return geo;
}

/** 背面文字的安全区半径（相对外接半径）。 */
function safeRadius(shape, inset) {
  switch (shape.type) {
    case 'circle':
      return (shape.radius ?? 1) - inset - 0.1;
    case 'polygon':
      return ((shape.radius ?? 1) - inset) * Math.cos(Math.PI / (shape.sides ?? 6)) - 0.1;
    case 'starburst':
      return (shape.innerRadius ?? 0.72) - inset - 0.04;
    case 'gear':
      return (shape.rootRadius ?? 0.84) - inset - 0.08;
    case 'shield':
      return ((shape.width ?? 0.86) - inset) * 0.86;
    default:
      return 0.6;
  }
}

function formatDate(iso) {
  return iso ? iso.replaceAll('-', '.') : '';
}

/**
 * @param {object} config  徽章配置（见 brands/<id>/badges.js）
 * @param {object} brand   品牌主题（见 brands/<id>/brand.js）
 * @param {object} state   { unlocked, earnedAt, tier?, progress: { current, target } }
 * @returns {Group}
 */
export function buildBadge(rawConfig, brand, state) {
  const { palette } = brand;
  const locked = !state.unlocked;
  let config = resolveTier(rawConfig, state.tier ?? 0);
  // 隐藏成就：未解锁前不透露图案和名字
  const masked = locked && config.hidden;
  if (masked) {
    config = {
      ...config,
      title: '???',
      titleEn: '???',
      relief: [{ kind: 'pixels', rows: QUESTION, cell: 0.075, center: [0, 0], material: 'enamel', color: 'graphite', height: 0.06 }],
    };
  }
  const shape = config.shape;
  const depth = shape.depth ?? 0.2;
  const bevel = shape.bevel ?? 0.04;
  const recess = shape.recess ?? 0.028;
  const segments = outlineSegments(shape);

  const rimLayer = config.layers.find((l) => l.kind === 'rim');
  const faceLayer = config.layers.find((l) => l.kind === 'face');
  const inset = faceLayer.inset;

  const lockedColor = palette.graphite;
  const reliefLocked = '#' + new Color(palette.graphite).multiplyScalar(1.45).getHexString();
  const mat = (type, colorKey, overrides) =>
    locked ? createMaterial('locked', lockedColor, overrides) : createMaterial(type, palette[colorKey], overrides);

  const group = new Group();
  group.name = config.id;

  // 外圈
  const ringShape = withHole(makeOutline(shape, 0), makeOutline(shape, inset), segments);
  // ExtrudeGeometry 的法线是逐面的，倒角会一格一格地反光；平滑 30° 以内的折角
  const ringGeo = smoothBevels(extrude(ringShape, depth, { bevel, segments }), SMOOTH_ANGLE);
  const ring = new Mesh(ringGeo, mat(rimLayer.material, rimLayer.color));
  ring.geometry.translate(0, 0, -depth / 2);
  ring.name = 'rim';
  group.add(ring);

  // 钱币边缘滚花：一圈细齿套在外圈侧壁中段
  if (shape.reeded && shape.type === 'circle') {
    const R = shape.radius ?? 1;
    const band = withHole(reededOutline(R, shape.reeded), makeOutline(shape, 0.06), 64);
    const bandDepth = depth - 2 * bevel - 0.012;
    const reed = new Mesh(extrude(band, bandDepth, { segments: 64 }), ring.material);
    reed.geometry.translate(0, 0, -bandDepth / 2);
    reed.name = 'reeding';
    group.add(reed);
  }

  // 正面板
  const plate = depth / 2 - recess;
  const coreShape = makeOutline(shape, inset);
  const front = new Mesh(extrude(coreShape, plate, { segments }), mat(faceLayer.material, faceLayer.color, patternOverrides(faceLayer.pattern)));
  front.name = 'face';
  group.add(front);

  // 背面板 + 刻字
  const lines = brand.engraving.lines({
    brandName: brand.name,
    title: config.title,
    titleEn: config.titleEn,
    earnedAt: formatDate(state.earnedAt),
    unlocked: state.unlocked,
    progress: state.progress,
    tier: config.tier,
    hidden: masked,
  });
  const backType = config.back.material;
  const engraving =
    typeof document !== 'undefined'
      ? createEngraving({
          lines,
          fontFamily: brand.engraving.fontFamily,
          safeRadius: config.back.safeRadius ?? safeRadius(shape, inset),
          brushed: !locked && backType === 'brushed-metal',
          ink: locked ? 1 : backType === 'ceramic' ? 0.62 : 0.5,
          base: locked ? 0.55 : 1,
        })
      : {};
  const back = new Mesh(
    extrude(coreShape, plate, { segments }),
    mat(backType, config.back.color, { ...engraving, bumpScale: 1.2, roughness: locked ? 0.85 : 0.62 }),
  );
  back.geometry.translate(0, 0, -plate);
  back.name = 'back';
  group.add(back);

  // 浮雕：同材质同颜色的基元共用一份材质；带动效的单独一份
  const shared = new Map();
  for (const item of config.relief ?? []) {
    let m;
    if (locked) {
      const key = `locked:${item.pattern ?? ''}`;
      m = shared.get(key) ?? createMaterial('locked', reliefLocked, patternOverrides(item.pattern));
      shared.set(key, m);
    } else if (item.effect) {
      m = createMaterial(item.material, palette[item.color], {
        emissive: new Color(palette[item.color]),
        emissiveIntensity: 0,
      });
    } else {
      const key = `${item.material}:${item.color}:${item.pattern ?? ''}`;
      m = shared.get(key) ?? createMaterial(item.material, palette[item.color], patternOverrides(item.pattern));
      shared.set(key, m);
    }
    group.add(buildRelief(item, m, plate));
  }

  group.userData = {
    id: config.id,
    locked,
    masked,
    tier: config.tier ?? null,
    pulses: locked ? [] : group.children.filter((c) => c.userData.pulse).map((c) => c.material),
    dispose() {
      group.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.dispose();
        const m = o.material;
        for (const key of ['map', 'bumpMap', 'roughnessMap']) {
          // 只释放每枚徽章独有的刻字贴图；拉丝等共享贴图保留
          if (o.name === 'back' && m[key]) m[key].dispose();
        }
        m.dispose();
      });
    },
  };
  return group;
}
