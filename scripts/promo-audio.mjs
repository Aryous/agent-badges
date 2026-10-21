// 宣传动画的配乐和音效：全部用代码合成（原创，没有采样，没有版权问题），按 tools/promo/timeline.js 和画面对齐。
// 用法：node scripts/promo-audio.mjs   → 生成 promo-out/audio-{en,zh}.wav，并合进 promo-out 里已有的 4 个 MP4
// 乐理：D 大调，D → Bm → G → A → D，每一幕换一个和弦；120 BPM，拍点从徽章墙开始。
import { execFileSync } from 'node:child_process';
import { existsSync, renameSync, writeFileSync } from 'node:fs';
import * as T from '../tools/promo/timeline.js';

const SR = 48000;
const N = Math.round(T.DURATION * SR);
const TAU = Math.PI * 2;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

function render(lang) {
  // 固定种子：每次生成的声音一样
  let seed = 20261019;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const noise = () => rand() * 2 - 1;

  // 两条总线：干声，以及送进混响的部分
  const dry = [new Float32Array(N), new Float32Array(N)];
  const wet = [new Float32Array(N), new Float32Array(N)];

  /** 写入一个声音。fn(t) 返回该时刻的采样；pan -1 左 … 1 右；send 是送混响的比例。 */
  function voice(start, dur, fn, { gain = 1, pan = 0, send = 0.3 } = {}) {
    const a = Math.max(0, Math.round(start * SR));
    const b = Math.min(N, Math.round((start + dur) * SR));
    const gl = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
    const gr = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
    for (let i = a; i < b; i++) {
      const s = fn((i - a) / SR);
      dry[0][i] += s * gl;
      dry[1][i] += s * gr;
      wet[0][i] += s * gl * send;
      wet[1][i] += s * gr * send;
    }
  }

  // ---------- 乐器 ----------

  /** 柔和的垫底和弦：每个音三支略微失谐的软锯齿波，慢起慢收。 */
  function pad(start, end, notes, gain = 0.05) {
    const attack = 0.9;
    const release = 1.2;
    for (const [k, m] of notes.entries()) {
      for (const [j, cents] of [-7, 0, 7].entries()) {
        const f = midi(m) * 2 ** (cents / 1200);
        const phase = rand() * TAU;
        voice(
          start,
          end - start + release,
          (t) => {
            let s = 0;
            for (let h = 1; h <= 5; h++) s += (Math.sin(TAU * f * h * t + phase * h) / h) * 0.72 ** h;
            const env = Math.min(1, t / attack) * (t > end - start ? Math.max(0, 1 - (t - (end - start)) / release) : 1);
            return s * env * (1 + 0.12 * Math.sin(TAU * 0.25 * t + k));
          },
          { gain: gain / notes.length ** 0.5, pan: (j - 1) * 0.5, send: 0.5 },
        );
      }
    }
  }

  /** 拨弦（Karplus-Strong）：琶音用。 */
  function pluck(m, start, gain = 0.18, pan = 0) {
    const f = midi(m);
    const period = Math.max(2, Math.round(SR / f));
    const len = Math.round(1.4 * SR);
    const y = new Float32Array(len);
    for (let i = 0; i < period; i++) y[i] = noise() * 0.6;
    for (let i = period; i < len; i++) y[i] = 0.4985 * (y[i - period] + y[i - period - 1 >= 0 ? i - period - 1 : 0]);
    voice(start, 1.4, (t) => y[Math.min(len - 1, Math.round(t * SR))] * Math.min(1, t / 0.003), { gain, pan, send: 0.35 });
  }

  /** 钟声：非谐波分音，高光和完成时用。 */
  function bell(m, start, gain = 0.15, dur = 2.6, pan = 0) {
    const f = midi(m);
    const partials = [
      [1, 1, 1],
      [2.0, 0.45, 1.6],
      [2.76, 0.32, 2.3],
      [4.07, 0.18, 3.2],
      [5.4, 0.1, 4.4],
    ];
    voice(
      start,
      dur,
      (t) => {
        let s = 0;
        for (const [r, a, d] of partials) s += a * Math.sin(TAU * f * r * t) * Math.exp((-t * d * 3) / dur);
        return s * Math.min(1, t / 0.002);
      },
      { gain, pan, send: 0.55 },
    );
  }

  /** 闪光：一串很轻的高音铃，随机落在五声音阶上。 */
  function shimmer(start, dur, gain = 0.05) {
    const scale = [86, 88, 90, 93, 95, 98];
    for (let k = 0; k < 7; k++) bell(scale[Math.floor(rand() * scale.length)], start + (k / 7) * dur, gain, 1.2, rand() * 1.4 - 0.7);
  }

  function kick(start, gain = 0.5) {
    let phase = 0;
    let last = 0;
    voice(
      start,
      0.35,
      (t) => {
        phase += TAU * (45 + 85 * Math.exp(-t * 32)) * (t - last);
        last = t;
        return Math.sin(phase) * Math.exp(-t * 9);
      },
      { gain, send: 0.05 },
    );
  }

  function hat(start, gain = 0.06, pan = 0.3) {
    let prev = 0;
    voice(
      start,
      0.06,
      (t) => {
        const x = noise();
        const s = x - prev;
        prev = x;
        return s * Math.exp(-t * 70);
      },
      { gain, pan, send: 0.1 },
    );
  }

  /** 风声：噪声经过一个截止频率滑动的低通滤波器，左右移动。 */
  function whoosh(start, dur, gain = 0.12, { from = 300, to = 5000, panFrom = -0.6, panTo = 0.6 } = {}) {
    let y = 0;
    const steps = Math.round(dur * SR);
    const buf = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const u = i / steps;
      const fc = from * (to / from) ** u;
      const a = 1 - Math.exp((-TAU * fc) / SR);
      y += a * (noise() - y);
      buf[i] = y * Math.sin(Math.PI * u) ** 1.6;
    }
    // 分成几段写入，模拟声像移动
    const parts = 8;
    for (let p = 0; p < parts; p++) {
      const s0 = Math.floor((p / parts) * steps);
      const s1 = Math.floor(((p + 1) / parts) * steps);
      voice(start + s0 / SR, (s1 - s0) / SR, (t) => buf[Math.min(steps - 1, s0 + Math.round(t * SR))], {
        gain,
        pan: panFrom + (panTo - panFrom) * ((p + 0.5) / parts),
        send: 0.25,
      });
    }
  }

  /** 徽章弹出：短促的下滑音。 */
  function blip(m, start, gain = 0.09, pan = 0) {
    const f = midi(m);
    let phase = 0;
    let last = 0;
    voice(
      start,
      0.14,
      (t) => {
        phase += TAU * f * (1 - 0.22 * Math.min(1, t / 0.06)) * (t - last);
        last = t;
        return Math.sin(phase) * Math.exp(-t * 30) * Math.min(1, t / 0.002);
      },
      { gain, pan, send: 0.3 },
    );
  }

  /** 打字：一小段噪声加一个很短的高音。 */
  function keyClick(start, gain = 0.07) {
    voice(start, 0.03, (t) => (noise() * 0.7 + Math.sin(TAU * 2600 * t) * 0.3) * Math.exp(-t * 260), { gain, pan: rand() * 0.4 - 0.2, send: 0.05 });
  }

  function mouseClick(start, gain = 0.18) {
    voice(start, 0.08, (t) => noise() * Math.exp(-t * 500) * 0.6 + Math.sin(TAU * 190 * t) * Math.exp(-t * 70), { gain, send: 0.08 });
  }

  // ---------- 编排 ----------

  const D = 62; // D4
  const CHORDS = {
    hero: [D - 24, D - 12, D - 5, D + 4, D + 11], // D2 D3 A3 F#4 C#5（Dmaj7）
    wall: [D - 27, D - 15, D - 8, D - 5, D + 2, D + 9], // B Bm7(9)
    tier: [D - 31, D - 19, D - 12, D - 3, D + 4, D + 9], // G Gmaj7(9)
    agent: [D - 29, D - 17, D - 10, D - 5, D + 2, D + 6], // A A6
    end: [D - 24, D - 12, D - 5, D + 4, D + 7, D + 11], // D Dmaj9
  };
  const ARP = { wall: [71, 74, 78, 81, 76, 78, 74, 81], tier: [67, 71, 74, 78, 81, 78, 74, 76], agent: [69, 73, 76, 78, 81, 78, 76, 73] };

  pad(0, 3.8, CHORDS.hero, 0.055);
  pad(3.8, 7.8, CHORDS.wall, 0.05);
  pad(7.8, 11.8, CHORDS.tier, 0.055);
  pad(11.8, 16.2, CHORDS.agent, 0.045);
  pad(16.2, 20, CHORDS.end, 0.06);

  // 节拍：120 BPM，从徽章墙开始，主页之前停
  const BEAT = 0.5;
  for (let t = T.SCENES.wall[0]; t < 16.0; t += BEAT) {
    const inAgent = t >= T.SCENES.agent[0];
    kick(t, inAgent ? 0.32 : 0.45);
    if (t >= T.SCENES.tier[0]) hat(t + BEAT / 2, inAgent ? 0.04 : 0.06);
  }
  // 琶音：八分音符
  for (const [scene, notes] of Object.entries(ARP)) {
    const [a, b] = T.SCENES[scene];
    let k = 0;
    for (let t = a; t < Math.min(b, 16.0); t += BEAT / 2, k++) {
      pluck(notes[k % notes.length], t, scene === 'agent' ? 0.09 : 0.14, (k % 2) * 0.5 - 0.25);
    }
  }

  // 开场：风声把标志带进来，落定时钟声和闪光；结尾前一阵上扬的风声接进节拍
  whoosh(0, T.HERO_LAND, 0.16, { from: 250, to: 6000 });
  bell(74, T.HERO_LAND - 0.05, 0.2, 3.2);
  bell(81, T.HERO_LAND - 0.03, 0.12, 3.0, 0.3);
  shimmer(T.HERO_GLINT[0], T.HERO_GLINT[1] - T.HERO_GLINT[0], 0.035);
  whoosh(3.15, 0.65, 0.1, { from: 400, to: 7000, panFrom: 0.5, panTo: -0.5 });

  // 徽章墙：每枚弹出一个音，沿五声音阶往上走
  const PENTA = [74, 76, 78, 81, 83, 86, 88, 90];
  for (let i = 0; i < T.WALL_COUNT; i++) blip(PENTA[i % PENTA.length] + (i >= 12 ? 2 : 0), T.wallPopAt(i) + 0.04, 0.07, i < 12 ? -0.35 : 0.35);

  // 分级：铜出现时一声低钟；每次翻转风声 + 越来越高的钟声 + 闪光
  bell(62, T.TIER_AT[0] + 0.1, 0.14, 2.4);
  [78, 81, 86].forEach((m, c) => {
    const at = T.TIER_AT[c + 1];
    whoosh(at - 0.32, 0.6, 0.09, { from: 500, to: 7000 });
    bell(m, at + 0.28, 0.13 + c * 0.02, 2.4);
    shimmer(at + 0.28, 0.5, 0.025);
  });

  // 终端：每个字一声键盘，每打一个勾一声提示，完成时一个和弦
  const typed = T.TYPED[lang];
  const typeDur = T.TYPE[1] - T.TYPE[0];
  for (let k = 0; k < typed.length; k++) {
    if (typed[k] === ' ') continue;
    keyClick(T.TYPE[0] + ((k + 1) / typed.length) * typeDur - 0.015, 0.05 + rand() * 0.03);
  }
  [81, 83, 85, 88].forEach((m, i) => bell(m, T.LINE_AT[i], 0.07, 1.2, 0.2));
  bell(86, T.DONE_AT, 0.12, 2.2);
  bell(81, T.DONE_AT + 0.02, 0.08, 2.2, -0.3);

  // 主页：卡片升起的轻风声，光标点击
  whoosh(T.SCENES.profile[0] - 0.05, 0.6, 0.07, { from: 300, to: 3000 });
  mouseClick(T.CLICK_AT);

  // 结尾：标志转入，落定时一组钟声和闪光
  whoosh(T.END_LAND[0], T.END_LAND[1] - T.END_LAND[0], 0.12, { from: 250, to: 6000 });
  [74, 78, 81, 86].forEach((m, i) => bell(m, T.END_LAND[1] - 0.05 + i * 0.03, 0.12, 3.5, (i - 1.5) * 0.25));
  shimmer(T.END_GLINT[0], T.END_GLINT[1] - T.END_GLINT[0], 0.03);

  // ---------- 混响（Schroeder：四个梳状 + 两个全通）+ 母带 ----------
  const out = [new Float32Array(N), new Float32Array(N)];
  for (let ch = 0; ch < 2; ch++) {
    const spread = ch * 23;
    const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(d + spread), i: 0, fb: 0.8 }));
    const aps = [556, 441].map((d) => ({ buf: new Float32Array(d + spread), i: 0 }));
    for (let n = 0; n < N; n++) {
      const x = wet[ch][n];
      let s = 0;
      for (const c of combs) {
        const y = c.buf[c.i];
        c.buf[c.i] = x + y * c.fb;
        c.i = (c.i + 1) % c.buf.length;
        s += y;
      }
      s *= 0.25;
      for (const a of aps) {
        const y = a.buf[a.i];
        const v = s + y * 0.5;
        a.buf[a.i] = v;
        a.i = (a.i + 1) % a.buf.length;
        s = y - v * 0.5;
      }
      out[ch][n] = dry[ch][n] + s * 0.35;
    }
  }
  // 软削波 + 归一到 -1 dBFS + 开头 30ms 淡入、最后 1.2 秒淡出
  let peak = 0;
  for (const ch of out) for (let n = 0; n < N; n++) peak = Math.max(peak, Math.abs((ch[n] = Math.tanh(ch[n] * 1.2))));
  const norm = 0.89 / peak;
  for (const ch of out) {
    for (let n = 0; n < N; n++) {
      const t = n / SR;
      const fade = Math.min(1, t / 0.03) * Math.min(1, (T.DURATION - t) / 1.2);
      ch[n] *= norm * fade;
    }
  }
  return out;
}

function wav(file, [l, r]) {
  const buf = Buffer.alloc(44 + l.length * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + l.length * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(l.length * 4, 40);
  for (let n = 0; n < l.length; n++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[n])) * 32767), 44 + n * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[n])) * 32767), 46 + n * 4);
  }
  writeFileSync(file, buf);
}

for (const lang of ['en', 'zh']) {
  const file = `promo-out/audio-${lang}.wav`;
  wav(file, render(lang));
  console.log(file);
  // 合进视频：保留画面，替换（或加上）音轨
  for (const aspect of ['16x9', '9x16']) {
    const video = `promo-out/agent-badges-${aspect}-${lang}.mp4`;
    if (!existsSync(video)) continue;
    const tmp = video.replace('.mp4', '.tmp.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', file, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', tmp]);
    renameSync(tmp, video);
    console.log(`  → ${video}`);
  }
}
