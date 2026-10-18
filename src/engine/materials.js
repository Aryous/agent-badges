import { MeshPhysicalMaterial } from 'three';
import { brushedTexture, radialAnisotropyTexture } from './textures.js';

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
    roughness: 0.16,
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
