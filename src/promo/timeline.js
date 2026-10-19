// 宣传动画的时间表（秒）。画面（main.js）和配乐（scripts/promo-audio.mjs）共用，保证声画对齐。
// 纯数据，Node 里也能导入。

export const DURATION = 20;

/** 每一幕的起止。 */
export const SCENES = { hero: [0, 3.8], wall: [3.8, 7.8], tier: [7.8, 11.8], agent: [11.8, 16.2], profile: [16.2, 18.3], end: [18.0, 20] };

/** 开场：标志旋转落下的时长；落定时高光扫过。 */
export const HERO_LAND = 1.3;
export const HERO_GLINT = [1.1, 1.75];

/** 徽章墙：第 i 枚弹出的时刻。 */
export const WALL_COUNT = 24;
export const wallPopAt = (i) => 4.05 + i * 0.055;

/** 分级：每一级出现的时刻（第一个是铜，之后每次翻转升级）。 */
export const TIER_AT = [8.0, 8.95, 9.9, 10.85];

/** 终端：打字的起止、每一行打勾的时刻、最后「完成」那一行。 */
export const TYPE = [12.15, 13.25];
export const LINE_AT = [13.6, 14.0, 14.4, 14.8];
export const DONE_AT = 15.25;
export const TYPED = { en: 'put my badges on my GitHub profile', zh: '把我的徽章放到 GitHub 主页' };

/** 主页：光标点击徽章图。 */
export const CLICK_AT = 17.35;

/** 结尾：标志转入、落定时高光。 */
export const END_LAND = [18.1, 18.8];
export const END_GLINT = [18.75, 19.4];
