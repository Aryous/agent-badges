import { engravingLines } from '../shared/text.js';

// Codex 品牌主题。与 Claude Code 同一个家族：同样的结构和多彩珐琅色板，
// 锚点换成 Codex 标志，品牌色换成标志的淡紫 → 蓝渐变。徽章配置里的 color 字段引用这里的键名。

export default {
  id: 'codex',
  name: 'Codex',
  // 鲜明多彩：每枚徽章一组主色（深色环带 + 亮色圆盘），金属轮换；
  // Codex 渐变（lavender → periwinkle → electric）只留给 Codex 标志。
  palette: {
    background: '#141413', // 页面墨色
    primary: '#7A9DFF', // Codex 标志主色（渐变中段）
    lavender: '#B1A7FF',
    periwinkle: '#7A9DFF',
    electric: '#3941FF',
    orange: '#E07A52', // Claude 系品牌橙在这里只作普通点缀色
    ivory: '#F3F0E8',
    ink: '#1B1A19', // 小怪物的眼睛
    cobalt: '#1D3C8F',
    azure: '#3D7BEA',
    emerald: '#0F6A4C',
    mint: '#2FB47F',
    violet: '#462584',
    lilac: '#8F6BE6',
    gold: '#F2C46B',
    silver: '#EEF0F2',
    rose: '#E0A68F',
    // 分级金属
    bronze: '#D58C5F',
    platinum: '#CBC6BE',
    onyx: '#1C2129', // 蓝黑亮面（Token 顶级「黑瓷金」）：不用纯黑，纯黑金属像锅底
    // 扩展色（新系列可用；深色做环带，亮色做圆盘或点缀）
    midnight: '#141F4D',
    navy: '#1E2F6E',
    sky: '#5BA8F0',
    teal: '#0E6E78',
    aqua: '#3CC7C9',
    forest: '#1E5A3A',
    lime: '#A6D64F',
    crimson: '#8E1D33',
    scarlet: '#E04A5F',
    plum: '#4E2259',
    magenta: '#C2408C',
    amber: '#F2B03D',
    honey: '#E8C46A',
    sand: '#E8D9B8',
    slate: '#2C323C',
    steel: '#8C95A4',
    snow: '#F7F6F2',
    ruby: '#D0233F',
    sapphire: '#2D5BE3',
    topaz: '#F2B41E',
    amethyst: '#9A5BD6',
    graphite: '#3A3936', // 未解锁剪影
  },
  ui: {
    accent: '#7A9DFF',
    accentLight: '#3941FF', // 浅色背景上的品牌色（主页浅色图）
    text: '#F0EEE6',
    muted: '#8F8B82',
  },
  engraving: {
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Helvetica Neue", sans-serif',
    lines: engravingLines,
  },
};
