import { MeshPhysicalMaterial } from 'three';
import { brushedTexture, holoTexture, radialAnisotropyTexture } from './textures.js';

// 材质预设。color 为 sRGB 十六进制色值。
// overrides 用于背面刻字等需要替换贴图的场景。

const PRESETS = {
  enamel: (c) => ({
    color: c,
    metalness: 0,
    roughness: 0.55,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 0.55,
  }),

  'polished-metal': (c) => ({
    color: c,
    metalness: 1,
    roughness: 0.12,
    clearcoat: 0.3,
    clearcoatRoughness: 0.08,
  }),

  'brushed-metal': (c, { browser }) => ({
    color: c,
    metalness: 1,
    roughness: 0.34,
    anisotropy: 0.85,
    ...(browser
      ? {
          anisotropyMap: radialAnisotropyTexture(),
          roughnessMap: brushedTexture(),
          bumpMap: brushedTexture(),
          bumpScale: 0.35,
        }
      : {}),
  }),

  ceramic: (c) => ({
    color: c,
    metalness: 0,
    roughness: 0.6,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.7,
  }),

  // 全息镭射：金属底 + 薄膜干涉，彩虹色随视角流动（限定款）
  holographic: (c, { browser }) => ({
    color: c,
    metalness: 1,
    roughness: 0.2,
    iridescence: 1,
    iridescenceIOR: 2.0,
    iridescenceThicknessRange: [260, 760],
    clearcoat: 0.5,
    clearcoatRoughness: 0.06,
    ...(browser ? { iridescenceThicknessMap: holoTexture() } : {}),
  }),

  // 阳极氧化铝：有色的细磨砂金属（功能探索系列的边框）
  anodized: (c) => ({
    color: c,
    metalness: 0.85,
    roughness: 0.4,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
  }),

  // 水晶宝石：透射 + 高折射率，颜色来自体内吸收
  crystal: (c) => ({
    color: '#ffffff',
    metalness: 0,
    roughness: 0.03,
    transmission: 1,
    thickness: 0.18,
    ior: 1.75,
    attenuationColor: c,
    attenuationDistance: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    specularIntensity: 1,
  }),

  // 月章上的珐琅：比 enamel 哑。满清漆在月章这种小件上会映出整片灯箱、把颜色冲白
  'enamel-matte': (c) => ({
    color: c,
    metalness: 0,
    roughness: 0.68,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.12,
    specularIntensity: 0.35,
  }),

  // 火珐琅珠（月章上每天一颗）：高光泽的彩色金属，不透光；自身带一点同色的光，暗处也看得出颜色
  'fired-enamel': (c) => ({
    color: c,
    metalness: 0.9,
    roughness: 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.2,
    ior: 1.77,
    specularIntensity: 1,
    emissive: c,
    emissiveIntensity: 0.08,
  }),

  locked: (c) => ({
    color: c,
    metalness: 0.35,
    roughness: 0.78,
    clearcoat: 0.1,
    clearcoatRoughness: 0.6,
  }),
};

const isBrowser = () => typeof document !== 'undefined';

export function createMaterial(type, color, overrides = {}) {
  const preset = PRESETS[type];
  if (!preset) throw new Error(`未知材质：${type}`);
  const params = preset(color, { browser: isBrowser() });
  const mat = new MeshPhysicalMaterial({ ...params, ...overrides });
  mat.userData.preset = type;
  return mat;
}

export function hasMaterial(type) {
  return Object.prototype.hasOwnProperty.call(PRESETS, type);
}
