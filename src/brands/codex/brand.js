import { engravingLines } from '../shared/text.js';

// Codex 品牌主题。与 Claude Code 同一个家族：同样的结构和多彩珐琅色板，
// 锚点换成 Codex 标志，品牌色换成标志的淡紫 → 蓝渐变。徽章配置里的 color 字段引用这里的键名。

export default {
  id: 'codex',
  name: 'Codex',
  launchDate: '2025-04-16', // 工具发布日，生日徽章用
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
    // 全解锁徽章：锡是起步阶段的金属；stage 只给全解锁徽章的动画用（值同锡），不和戳记的铜银金共用材质
    pewter: '#8c867b',
    stage: '#8c867b',
    ghost: '#cdb98f', // 马赛克残影
    dimBand: '#2a3566', // 环带上没拿到的戳记
    // 全解锁徽章的点阵：lavender → periwinkle → electric 插值成 16 档（three 的 Color.lerp，线性空间插值，和原型一致）
    ramp0: '#b1a7ff',
    ramp1: '#aba6ff',
    ramp2: '#a5a4ff',
    ramp3: '#9ea3ff',
    ramp4: '#97a2ff',
    ramp5: '#8fa0ff',
    ramp6: '#879fff',
    ramp7: '#7f9eff',
    ramp8: '#7799ff',
    ramp9: '#7190ff',
    ramp10: '#6a87ff',
    ramp11: '#627dff',
    ramp12: '#5a71ff',
    ramp13: '#5164ff',
    ramp14: '#4655ff',
    ramp15: '#3941ff',
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
