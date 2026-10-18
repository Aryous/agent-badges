import { Color, ExtrudeGeometry, Group, Mesh, Vector2 } from 'three';
import { makeOutline, outlineSegments, withHole } from './shapes.js';
import { createMaterial } from './materials.js';
import { buildRelief } from './relief.js';
import { createEngraving } from './engraving.js';

// 把「徽章配置 + 品牌主题 + 进度状态」组装成一枚 3D 徽章。
//
// 结构（侧视）：
//   ┌── 外圈 rim：带倒角的环，厚度 depth
//   │  ┌ 正面板 face：内缩 inset，表面比外圈低 recess，上面放浮雕
//   │  └ 背面板 back：同尺寸，表面带刻字贴图
//   └──

/** 端面 UV：把 [-1, 1] 映射到 [0, 1]，让程序化贴图覆盖整枚徽章。 */
const BadgeUV = {
  generateTopUV(geometry, v, a, b, c) {
    const uv = (i) => new Vector2((v[i * 3] + 1) / 2, (v[i * 3 + 1] + 1) / 2);
    return [uv(a), uv(b), uv(c)];
  },
  generateSideWallUV(geometry, v, a, b, c, d) {
    const pick = (i, useX) => new Vector2(useX ? v[i * 3] : v[i * 3 + 1], 1 - v[i * 3 + 2]);
    const useX = Math.abs(v[a * 3 + 1] - v[b * 3 + 1]) < Math.abs(v[a * 3] - v[b * 3]);
    return [pick(a, useX), pick(b, useX), pick(c, useX), pick(d, useX)];
  },
};

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
 * @param {object} state   { unlocked, earnedAt, progress: { current, target } }
 * @returns {Group}
 */
export function buildBadge(config, brand, state) {
  const { palette } = brand;
  const locked = !state.unlocked;
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
  const ring = new Mesh(extrude(ringShape, depth, { bevel, segments }), mat(rimLayer.material, rimLayer.color));
  ring.geometry.translate(0, 0, -depth / 2);
  ring.name = 'rim';
  group.add(ring);

  // 正面板
  const plate = depth / 2 - recess;
  const coreShape = makeOutline(shape, inset);
  const front = new Mesh(extrude(coreShape, plate, { segments }), mat(faceLayer.material, faceLayer.color));
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
  });
  const backType = config.back.material;
  const engraving =
    typeof document !== 'undefined'
      ? createEngraving({
          lines,
          fontFamily: brand.engraving.fontFamily,
          safeRadius: config.back.safeRadius ?? safeRadius(shape, inset),
          brushed: !locked && backType === 'brushed-metal',
          ink: locked ? 0.7 : backType === 'ceramic' ? 0.62 : 0.5,
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
      m = shared.get('locked') ?? createMaterial('locked', reliefLocked);
      shared.set('locked', m);
    } else if (item.effect) {
      m = createMaterial(item.material, palette[item.color], {
        emissive: new Color(palette[item.color]),
        emissiveIntensity: 0,
      });
    } else {
      const key = `${item.material}:${item.color}`;
      m = shared.get(key) ?? createMaterial(item.material, palette[item.color]);
      shared.set(key, m);
    }
    group.add(buildRelief(item, m, plate));
  }

  group.userData = {
    id: config.id,
    locked,
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
