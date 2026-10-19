// 宣传动画（约 20 秒）：开场 → 徽章墙 → 分级升级 → 跟 Agent 说一句 → 主页效果 → 结尾。
// 画面完全由时间 t 决定：window.__promo.seek(t) 设置这一刻的样子并渲染一帧，
// scripts/promo.mjs 逐帧截图后用 ffmpeg 合成视频。参数：?aspect=16x9|9x16&lang=en|zh
import './promo.css';
import { Group } from 'three';
import { BRANDS } from '../brands/index.js';
import { buildBadge } from '../engine/badge.js';
import { badgeTitle, tierName } from '../brands/shared/text.js';
import { createStage } from '../viewer/scene.js';
import { renderBadgePNG } from '../viewer/export.js';
import { LOGO_STATE, logoBadge, logoBrand } from '../project/logo.js';
import { renderShelf, shelfGroups } from '../viewer/shelf.js';
import { CLICK_AT, DONE_AT, DURATION, END_GLINT, END_LAND, HERO_GLINT, HERO_LAND, LINE_AT, TIER_AT, TYPE, TYPED, wallPopAt } from './timeline.js';

const params = new URLSearchParams(location.search);
const PORTRAIT = params.get('aspect') === '9x16';
const LANG = params.get('lang') === 'zh' ? 'zh' : 'en';
document.documentElement.classList.add(PORTRAIT ? 'portrait' : 'landscape');
document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
const W = PORTRAIT ? 1080 : 1920;
const H = PORTRAIT ? 1920 : 1080;

const TEXT = {
  en: {
    'hero.title': 'Every session with your agent<br />deserves a badge.',
    'wall.title': '39 badges. Two agents.',
    'wall.sub': 'Milestones, streaks, features to discover, and a few hidden ones.',
    'tier.title': 'Level up, bronze to platinum.',
    'tier.sub': 'Earned from your real Claude Code and Codex history.',
    'agent.title': 'Then just ask your agent.',
    'agent.sub': 'Works in Claude Code and Codex.',
    'agent.lines': ['Checked GitHub: you/you', 'Rendered 30 badges in your browser', 'Committed and pushed', 'GitHub Pages is live'],
    'agent.done': 'Done → <u>github.com/you</u>',
    'profile.title': 'Your badges, on your profile.',
    'profile.sub': 'Click them to open your 3D badge wall.',
    'end.tag': 'Runs locally · Reads metadata only · Uploads nothing',
    tokens: (label) => `${label} tokens`,
  },
  zh: {
    'hero.title': '每一次和 Agent 并肩写代码，<br />都值得一枚徽章。',
    'wall.title': '39 枚徽章，两个 Agent。',
    'wall.sub': '里程碑、连续打卡、功能探索，还有几枚隐藏彩蛋。',
    'tier.title': '分级升级，从铜到白金。',
    'tier.sub': '来自你真实的 Claude Code 和 Codex 使用记录。',
    'agent.title': '然后，跟 Agent 说一句。',
    'agent.sub': 'Claude Code 和 Codex 都能用。',
    'agent.lines': ['已检查 GitHub：you/you', '在浏览器里渲染了 30 枚徽章', '已提交并推送', 'GitHub Pages 已上线'],
    'agent.done': '完成 → <u>github.com/you</u>',
    'profile.title': '徽章，挂在你的主页上。',
    'profile.sub': '点一下，打开你的 3D 徽章墙。',
    'end.tag': '本机运行 · 只读元数据 · 不上传任何内容',
    tokens: (label) => `${label} Token`,
  },
}[LANG];

// ---------- 缓动 ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** t 在 [a, b] 里走到哪了（0 → 1）。 */
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const outCubic = (k) => 1 - Math.pow(1 - k, 3);
const inCubic = (k) => k * k * k;
const inOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const outBack = (k) => {
  const c = 1.45;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
};
/** 一幕的整体透明度：淡入、停留、淡出。 */
const alpha = (t, a, b, fade = 0.3) => seg(t, a, a + fade) * (1 - seg(t, b - fade, b));

const $ = (s) => document.querySelector(s);
const show = (el, o, dy = 0, scale = 1) => {
  el.style.opacity = o;
  el.style.transform = `${el.dataset.baseTransform ?? ''} translateY(${dy}px) scale(${scale})`;
};

// ---------- 文字 ----------
// 竖屏英文标题换行：三行更匀称，不留单个词
if (PORTRAIT && LANG === 'en') TEXT['hero.title'] = 'Every session<br />with your agent<br />deserves a badge.';
document.querySelectorAll('[data-t]').forEach((el) => (el.innerHTML = TEXT[el.dataset.t]));
for (const el of document.querySelectorAll('.tier-chip, .tier-steps, .term, .profile, .end-cmd')) el.dataset.baseTransform = 'translateX(-50%)';

// ---------- 3D 舞台 ----------
const stage = createStage($('#stage'));
stage.resize();

const METAL_COLORS = { bronze: '#c0825a', silver: '#c9ced6', gold: '#d9b061', platinum: '#e4e7ec' };
const claude = BRANDS.find((b) => b.brand.id === 'claude-code');
const tokens = claude.badges.find((b) => b.id === 'tokens');

/** 展示用状态：分级徽章用最高级（或指定级），其余都已解锁。 */
function showcase(config, tier = null) {
  const t = config.tiers ? (tier ?? config.tiers.length - 1) : null;
  const value = config.tiers ? config.tiers[t].threshold : 1;
  return { unlocked: true, earnedAt: '2026-05-02', tier: t, value, progress: { current: value, target: value } };
}

function holderFor(config, brand, state) {
  const badge = buildBadge(config, brand, state, { lang: LANG });
  stage.applyEnvironment(badge);
  const pivot = new Group();
  const holder = new Group();
  pivot.add(badge);
  holder.add(pivot);
  return { holder, pivot, badge };
}

/** 画面像素坐标（中心、半径）→ 3D 世界坐标。 */
function place(item, px, py, r, angle = 0, tilt = 0) {
  const { halfH } = stage.view;
  const k = halfH / (H / 2);
  item.holder.visible = r > 0.5;
  item.holder.position.set((px - W / 2) * k, -(py - H / 2) * k, 0);
  item.holder.scale.setScalar(Math.max(0.0001, r * k));
  item.pivot.rotation.set(tilt, angle, 0);
}

/** 扫过徽章表面的高光（和徽章墙的获得动画一样）。 */
function glint(u, px, py, r) {
  const { sweep, view } = stage;
  const k = view.halfH / (H / 2);
  const x = (px - W / 2) * k;
  const y = -(py - H / 2) * k;
  const rr = r * k;
  const span = rr * 1.3;
  sweep.position.set(x + lerp(-span, span, u), y + lerp(span * 0.5, -span * 0.3, u), rr * 0.9);
  sweep.distance = rr * 2.4;
  sweep.intensity = u > 0 && u < 1 ? Math.sin(u * Math.PI) * 60 : 0;
}

// ---------- 预先准备：徽章墙缩略图 + 3D 徽章 ----------

async function prepare() {
  // 徽章墙：每个工具取 12 枚不隐藏的，先渲染成小图（此时场景里还没有其他徽章）
  const wall = $('#wall');
  for (const b of BRANDS) {
    const group = document.createElement('div');
    group.className = 'wall-group';
    group.style.setProperty('--brand', b.brand.ui.accent);
    group.innerHTML = `<h3>${b.brand.name}</h3><div class="wall-grid"></div>`;
    const grid = group.querySelector('.wall-grid');
    for (const config of b.badges.filter((c) => !c.hidden).slice(0, 12)) {
      const item = holderFor(config, b.brand, showcase(config));
      stage.scene.add(item.holder);
      const img = new Image();
      img.src = renderBadgePNG({ stage, items: [item], item, size: 320, fill: 0.92 });
      stage.scene.remove(item.holder);
      grid.appendChild(img);
      await img.decode();
    }
    wall.appendChild(group);
  }

  // 主页上的徽章图：用产品里同一个函数、示例数据现画，文字跟着视频的语言
  const shelf = $('#shelf-img');
  shelf.src = (await renderShelf(await shelfGroups({ forceMock: true }), { lang: LANG })).toDataURL('image/png');
  await shelf.decode();

  const logo = holderFor(logoBadge, logoBrand, LOGO_STATE);
  const tiers = tokens.tiers.map((_, i) => holderFor(tokens, claude.brand, showcase(tokens, i)));
  for (const it of [logo, ...tiers]) {
    it.holder.visible = false;
    stage.scene.add(it.holder);
  }

  // 分级进度条
  $('#tier-steps').innerHTML = tokens.tiers.map(() => '<i></i>').join('');
  await document.fonts.ready;
  return { logo, tiers };
}

// ---------- 每一帧 ----------

const L = PORTRAIT
  ? { hero: [540, 760, 360], tier: [540, 900, 330], end: [540, 820, 220], cursorFrom: [880, 980], cursorTo: [470, 560] }
  : { hero: [960, 420, 300], tier: [960, 540, 250], end: [960, 390, 190], cursorFrom: [1260, 640], cursorTo: [860, 330] };

function frame(t, { logo, tiers }) {
  // 背景光晕跟着每一幕变色
  const tierIdx = TIER_AT.filter((x) => t >= x).length - 1;
  const glowColor = t >= 7.8 && t < 11.8 ? METAL_COLORS[tokens.tiers[Math.max(0, tierIdx)].metal] : '#e8b45a';
  $('#glow').style.setProperty('--glow', `${glowColor}2e`);

  // 1. 开场：项目标志转着落下，高光扫过，标题浮现
  {
    const [x, y, r] = L.hero;
    const sAlpha = 1 - seg(t, 3.3, 3.8);
    $('#s-hero').style.opacity = t < 3.8 ? sAlpha : 0;
    show($('#s-hero .kicker'), seg(t, 0.9, 1.4), (1 - outCubic(seg(t, 0.9, 1.4))) * 16);
    show($('#s-hero .headline'), seg(t, 1.3, 2.0), (1 - outCubic(seg(t, 1.3, 2.0))) * 30);
    const p = seg(t, 0, HERO_LAND);
    const exit = 1 - inCubic(seg(t, 3.3, 3.8));
    const angle = 4 * Math.PI * (1 - outCubic(p)) + 0.22 * Math.sin((t - 1.3) * 1.7) * seg(t, 1.3, 2.0);
    if (t < 3.8) place(logo, x, y, r * outBack(p) * exit, angle, 0.05 * Math.sin(t * 1.2));
  }

  // 2. 徽章墙：两个工具各 12 枚，依次弹出
  {
    const a = alpha(t, 3.8, 7.8);
    $('#s-wall').style.opacity = a;
    show($('#s-wall .caption'), 1, (1 - outCubic(seg(t, 3.8, 4.3))) * 24);
    [...document.querySelectorAll('.wall-grid img')].forEach((img, i) => {
      const start = wallPopAt(i);
      const p = seg(t, start, start + 0.45);
      img.style.opacity = seg(t, start, start + 0.18);
      img.style.transform = `translateY(${Math.sin(t * 1.4 + i * 0.7) * 4}px) scale(${0.5 + 0.5 * outBack(p)})`;
    });
    document.querySelectorAll('.wall-group h3').forEach((h, i) => (h.style.opacity = seg(t, 4.0 + i * 0.66, 4.3 + i * 0.66)));
  }

  // 3. 分级升级：Token 里程碑从铜翻到白金，每翻一次高光扫过
  {
    const [x, y, r] = L.tier;
    $('#s-tier').style.opacity = alpha(t, 7.8, 11.8);
    show($('#s-tier .caption'), 1, (1 - outCubic(seg(t, 7.8, 8.3))) * 24);
    const k = Math.max(0, tierIdx);
    let angle = 0.12 * Math.sin(t * 1.6);
    let flip = null;
    for (let c = 1; c < TIER_AT.length; c++) {
      const w = seg(t, TIER_AT[c] - 0.3, TIER_AT[c] + 0.3);
      if (w > 0 && w < 1) flip = w;
    }
    if (flip !== null) angle += 2 * Math.PI * inOutCubic(flip);
    const appear = outBack(seg(t, 7.85, 8.4));
    const exit = 1 - inCubic(seg(t, 11.3, 11.75));
    tiers.forEach((it, i) => {
      if (i === k && t >= 7.8 && t < 11.8) place(it, x, y, r * appear * exit, angle, 0.04 * Math.sin(t));
      else it.holder.visible = false;
    });
    const tier = tokens.tiers[k];
    const chip = $('#tier-chip');
    chip.style.setProperty('--metal', METAL_COLORS[tier.metal]);
    $('#tier-steps').style.setProperty('--metal', METAL_COLORS[tier.metal]);
    chip.querySelector('.tier-metal').textContent = tierName(tier.metal, LANG);
    chip.querySelector('.tier-label').textContent = TEXT.tokens(tier.label);
    const since = t - TIER_AT[k];
    show(chip, seg(t, 8.1, 8.4), 0, 1 + 0.08 * Math.max(0, 1 - since / 0.35) * (k > 0 ? 1 : 0));
    $('#tier-steps').style.opacity = seg(t, 8.1, 8.4);
    $('#tier-steps').querySelectorAll('i').forEach((el, i) => el.classList.toggle('on', i <= k));
  }

  // 4. 跟 Agent 说一句：打字，然后一行行完成
  {
    $('#s-agent').style.opacity = alpha(t, 11.8, 16.2);
    show($('#s-agent .caption'), 1, (1 - outCubic(seg(t, 11.8, 12.3))) * 24);
    show($('#term'), 1, (1 - outCubic(seg(t, 11.8, 12.4))) * 40);
    const typed = TYPED[LANG];
    const n = Math.floor(seg(t, TYPE[0], TYPE[1]) * typed.length);
    $('#term-typed').textContent = typed.slice(0, n);
    const typing = t >= TYPE[0] && t < TYPE[1];
    $('#term-cursor').style.opacity = typing || Math.floor(t * 2.4) % 2 === 0 ? 1 : 0;
    const ul = $('#term-lines');
    if (!ul.children.length) {
      ul.innerHTML =
        TEXT['agent.lines'].map((s) => `<li><b>✓</b><span>${s}</span></li>`).join('') +
        `<li class="done"><b>●</b><span>${TEXT['agent.done']}</span></li>`;
    }
    [...ul.children].forEach((li, i) => {
      const at = i < LINE_AT.length ? LINE_AT[i] : DONE_AT;
      show(li, seg(t, at, at + 0.2), (1 - outCubic(seg(t, at, at + 0.25))) * 12);
    });
  }

  // 5. 主页：徽章图出现在 README 里，光标点一下
  {
    $('#s-profile').style.opacity = alpha(t, 16.2, 18.3);
    show($('#s-profile .caption'), 1, (1 - outCubic(seg(t, 16.2, 16.7))) * 24);
    const press = seg(t, CLICK_AT, CLICK_AT + 0.1) * (1 - seg(t, CLICK_AT + 0.1, CLICK_AT + 0.25));
    show($('#profile'), 1, (1 - outCubic(seg(t, 16.2, 16.8))) * 50, 1 - 0.012 * press);
    const m = inOutCubic(seg(t, 16.6, 17.3));
    const cursor = $('#cursor');
    cursor.style.left = `${lerp(L.cursorFrom[0], L.cursorTo[0], m)}px`;
    cursor.style.top = `${lerp(L.cursorFrom[1], L.cursorTo[1], m)}px`;
    cursor.style.opacity = seg(t, 16.5, 16.7);
    const ring = seg(t, CLICK_AT, CLICK_AT + 0.5);
    cursor.style.setProperty('--ring', ring > 0 ? 1 - ring : 0);
    cursor.style.setProperty('--ring-scale', 0.4 + ring);
  }

  // 6. 结尾：标志、命令、一句话、网址
  {
    const [x, y, r] = L.end;
    $('#s-end').style.opacity = seg(t, 18.1, 18.5);
    show($('#s-end .end-title'), seg(t, 18.35, 18.75), (1 - outCubic(seg(t, 18.35, 18.75))) * 20);
    show($('#s-end .end-cmd'), seg(t, 18.6, 19.0), (1 - outCubic(seg(t, 18.6, 19.0))) * 20);
    show($('#s-end .end-tag'), seg(t, 18.85, 19.25), 0);
    show($('#s-end .end-url'), seg(t, 19.05, 19.45), 0);
    if (t >= 18.0) {
      const p = seg(t, END_LAND[0], END_LAND[1]);
      place(logo, x, y, r * outBack(p), 2 * Math.PI * (1 - outCubic(p)) + 0.15 * Math.sin((t - 18.8) * 1.5) * seg(t, 18.8, 19.3), 0.04 * Math.sin(t));
    } else if (t >= 3.8) {
      logo.holder.visible = false;
    }
  }

  // 高光：开场落定、每次升级、结尾落定
  const glints = [
    [...HERO_GLINT, L.hero],
    ...TIER_AT.slice(1).map((at) => [at + 0.28, at + 0.9, L.tier]),
    [...END_GLINT, L.end],
  ];
  const g = glints.find(([a, b]) => t >= a && t <= b);
  if (g) glint(seg(t, g[0], g[1]), ...g[2]);
  else stage.sweep.intensity = 0;

  stage.renderer.render(stage.scene, stage.camera);
}

const ready = prepare().then((objs) => {
  window.__promo = { ready: true, duration: DURATION, width: W, height: H, seek: (t) => frame(t, objs) };
  frame(Number(params.get('t') ?? 0), objs);
});
ready.catch((e) => {
  console.error(e);
  document.body.textContent = e.message;
});
