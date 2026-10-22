import { BufferAttribute, Color, ExtrudeGeometry, Group, Mesh } from 'three';
import { smoothBevels } from './normals.js';
import { makeOutline, outlineSegments, reededOutline, withHole, innerRadius } from './shapes.js';
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

/**
 * 竖向渐变：按顶点高度在几个颜色之间插值（顶部 → 底部），
 * 用于 Codex 标志这类官方带渐变的图形。
 */
function paintGradient(geometry, hexes) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const stops = hexes.map((h) => new Color(h));
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const t = 1 - (pos.getY(i) - min.y) / Math.max(1e-6, max.y - min.y); // 0 顶部 → 1 底部
    const f = t * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(f));
    c.copy(stops[k]).lerp(stops[k + 1], f - k);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
}

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

/**
 * 机身（外圈、滚花、正面板、背面板）只由外形和内缩决定。同样外形的徽章共用一份几何体：
 * 省掉重复的挤出和三角剖分（有些细长外圈剖分要几十毫秒），显卡上也只存一份。
 * 共用的几何体标上 userData.shared，disposeBadge 不会释放它们。
 */
const bodies = new Map();

function bodyGeometry(shape, inset) {
  const key = JSON.stringify([shape, inset]);
  if (bodies.has(key)) return bodies.get(key);
  const depth = shape.depth ?? 0.2;
  const bevel = shape.bevel ?? 0.04;
  const recess = shape.recess ?? 0.028;
  const segments = outlineSegments(shape);
  const plate = depth / 2 - recess;

  // 外圈：ExtrudeGeometry 的法线是逐面的，倒角会一格一格地反光；平滑 30° 以内的折角
  const ringShape = withHole(makeOutline(shape, 0), makeOutline(shape, inset), segments);
  const rim = smoothBevels(extrude(ringShape, depth, { bevel, segments }), SMOOTH_ANGLE).translate(0, 0, -depth / 2);

  // 钱币边缘滚花：一圈细齿套在外圈侧壁中段
  let reeding = null;
  if (shape.reeded && shape.type === 'circle') {
    const band = withHole(reededOutline(shape.radius ?? 1, shape.reeded), makeOutline(shape, 0.06), 64);
    const bandDepth = depth - 2 * bevel - 0.012;
    reeding = extrude(band, bandDepth, { segments: 64 }).translate(0, 0, -bandDepth / 2);
  }

  const coreShape = makeOutline(shape, inset);
  const face = extrude(coreShape, plate, { segments });
  const back = extrude(coreShape, plate, { segments }).translate(0, 0, -plate);

  const body = { rim, reeding, face, back, plate };
  for (const g of [rim, reeding, face, back]) if (g) g.userData.shared = true;
  bodies.set(key, body);
  return body;
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
    case 'flower':
      return innerRadius(shape, inset) - 0.08;
    default:
      return 0.6;
  }
}

function formatDate(iso) {
  return iso ? iso.replaceAll('-', '.') : '';
}

/**
 * @param {object} config  徽章配置（见 brands/<id>/<系列>/<徽章>.js）
 * @param {object} brand   品牌主题（见 brands/<id>/brand.js）
 * @param {object} state   { unlocked, earnedAt, tier?, progress: { current, target } }
 * @param {object} [options]
 * @param {'zh'|'en'} [options.lang]  背面刻字的语言
 * @returns {Group}
 */
export function buildBadge(rawConfig, brand, state, { lang = 'zh' } = {}) {
  const { palette } = brand;
  const locked = !state.unlocked;
  let config = resolveTier(rawConfig, state.tier ?? 0, state.variant ?? 0);
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

  const rimLayer = config.layers.find((l) => l.kind === 'rim');
  const faceLayer = config.layers.find((l) => l.kind === 'face');
  const inset = faceLayer.inset;

  const lockedColor = palette.graphite;
  const reliefLocked = '#' + new Color(palette.graphite).multiplyScalar(1.45).getHexString();
  const mat = (type, colorKey, overrides) =>
    locked ? createMaterial('locked', lockedColor, overrides) : createMaterial(type, palette[colorKey], overrides);

  const group = new Group();
  group.name = config.id;

  const body = bodyGeometry(shape, inset);
  const { plate } = body;

  // 外圈（钱币款带一圈滚花）
  const ring = new Mesh(body.rim, mat(rimLayer.material, rimLayer.color));
  ring.name = 'rim';
  group.add(ring);
  if (body.reeding) {
    const reed = new Mesh(body.reeding, ring.material);
    reed.name = 'reeding';
    group.add(reed);
  }

  // 正面板
  const front = new Mesh(body.face, mat(faceLayer.material, faceLayer.color, patternOverrides(faceLayer.pattern)));
  front.name = 'face';
  group.add(front);

  // 背面板 + 刻字
  const lines = brand.engraving.lines({
    brandName: brand.name,
    config,
    lang,
    title: config.title,
    titleEn: config.titleEn,
    earnedAt: formatDate(state.earnedAt),
    unlocked: state.unlocked,
    progress: state.progress,
    tier: config.tier,
    hidden: masked,
  });
  const backType = config.back.material;
  const engravingOpts = {
    lines,
    fontFamily: brand.engraving.fontFamily,
    safeRadius: config.back.safeRadius ?? safeRadius(shape, inset),
    brushed: !locked && backType === 'brushed-metal',
    ink: locked ? 1 : backType === 'ceramic' ? 0.62 : 0.5,
    base: locked ? 0.55 : 1,
  };
  const engraving = typeof document !== 'undefined' ? createEngraving(engravingOpts) : {};
  const back = new Mesh(body.back, mat(backType, config.back.color, { ...engraving, bumpScale: 1.2, roughness: locked ? 0.85 : 0.62 }));
  back.name = 'back';
  // 背面刻字默认 1024；近看时用 setEngravingSize 换成更清晰的版本
  back.userData.engraving = engravingOpts;
  back.userData.engravingSize = 1024;
  group.add(back);

  // 浮雕：同材质同颜色的基元共用一份材质；带动效的单独一份
  const shared = new Map();
  for (const item of config.relief ?? []) {
    let m;
    if (locked) {
      const key = `locked:${item.pattern ?? ''}`;
      m = shared.get(key) ?? createMaterial('locked', reliefLocked, patternOverrides(item.pattern));
      shared.set(key, m);
    } else if (item.gradient) {
      m = createMaterial(item.material, '#ffffff', { vertexColors: true });
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
    const mesh = buildRelief(item.kind === 'contour' ? { ...item, shape } : item, m, plate);
    if (item.gradient && !locked) paintGradient(mesh.geometry, item.gradient.map((k) => palette[k]));
    group.add(mesh);
  }

  group.userData = {
    id: config.id,
    locked,
    masked,
    tier: config.tier ?? null,
    pulses: locked ? [] : group.children.filter((c) => c.userData.pulse).map((c) => c.material),
  };
  return group;
}

/**
 * 释放一枚徽章独占的显卡资源：几何体、材质、刻字贴图。
 * 多枚徽章共用的（userData.shared：机身几何体、拉丝和底纹贴图）和场景的环境贴图不动。
 */
export function disposeBadge(badge) {
  badge.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.geometry.userData.shared) o.geometry.dispose();
    for (const [key, v] of Object.entries(o.material)) {
      if (v?.isTexture && key !== 'envMap' && !v.userData.shared) v.dispose();
    }
    o.material.dispose();
  });
}

/**
 * 换一套指定分辨率的背面刻字贴图。陈列墙同时建着十几枚徽章，全用 2048 显存吃不消，
 * 所以平时用 1024，只给正在近看的那一枚换成 2048，离开时再换回来。
 * @returns {boolean} 是否真的换了
 */
export function setEngravingSize(badge, size) {
  const back = badge?.getObjectByName('back');
  const opts = back?.userData.engraving;
  if (!opts || back.userData.engravingSize === size || typeof document === 'undefined') return false;
  const next = createEngraving({ ...opts, size });
  const m = back.material;
  for (const key of ['map', 'bumpMap', 'roughnessMap']) {
    m[key]?.dispose();
    m[key] = next[key];
  }
  m.needsUpdate = true;
  back.userData.engravingSize = size;
  return true;
}
