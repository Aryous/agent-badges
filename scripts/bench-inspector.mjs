// 单枚查看静止时的开销：打开一枚徽章、等它停稳，再数几秒里 3D 画布画了多少帧、主线程忙了多久。
// 用法：node scripts/bench-inspector.mjs [url] [徽章id...]
//   url 默认 http://localhost:5199/（需要开发服务器：npx vite --port 5199）；徽章默认 first-session（无呼吸发光）和 bash-maniac（有）
//   CHROME_GL=software 用软件渲染；BENCH_SECONDS 改测量时长（默认 5 秒）
//
// 怎么数「渲染」：three 打包在页面模块里，脚本拿不到 WebGLRenderer，所以在页面加载前包住 #stage 画布的 WebGL 上下文，
// 一帧里只要有绘制调用就算渲染了一次（renderer.render 每次都会画），另记绘制调用总数和超采样往叠加画布上的混合次数。
// 主线程忙碌时间取自 Chrome 的 Performance.getMetrics（TaskDuration）；GPU 进程的 CPU 时间取自 SystemInfo.getProcessInfo
// （软件渲染时光栅化全在这里，真实显卡时是提交绘制命令的开销）。
import { launchChrome } from './browser.mjs';

const args = process.argv.slice(2);
const base = args[0]?.startsWith('http') ? args.shift() : 'http://localhost:5199/';
const ids = args.length ? args : ['first-session', 'bash-maniac'];
const SECONDS = Number(process.env.BENCH_SECONDS ?? 5);
/**
 * 停稳后最多再等多少帧才开始测：徽章缩放的缓动、停稳后换 2048 刻字的那次重来、超采样收敛都按帧数走，软件渲染也一样。
 * 连续 IDLE_FRAMES 帧没画就提前开始（收敛后停笔的版本）；一直在画的版本等满 SETTLE_FRAMES。
 */
const SETTLE_FRAMES = 300;
const IDLE_FRAMES = 30;

// 在页面脚本之前运行：只包 #stage（单枚查看的舞台），缩略图等其他画布不算
function instrument() {
  const stats = { frames: 0, renderFrames: 0, draws: 0, blends: 0, idleRun: 0 };
  let drew = false;
  window.__bench = stats;
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const gl = getContext.call(this, type, ...rest);
    if (gl && !gl.__benchWrapped && (this.id === 'stage' || this.id === 'stage-accum')) {
      gl.__benchWrapped = true;
      if (this.id === 'stage') {
        for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
          const fn = gl[name];
          if (!fn) continue;
          gl[name] = function (...a) {
            stats.draws++;
            drew = true;
            return fn.apply(this, a);
          };
        }
      } else {
        const draw = gl.drawImage;
        gl.drawImage = function (...a) {
          stats.blends++;
          return draw.apply(this, a);
        };
      }
    }
    return gl;
  };
  const tick = () => {
    stats.frames++;
    if (drew) stats.renderFrames++;
    stats.idleRun = drew ? 0 : stats.idleRun + 1;
    drew = false;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const browser = await launchChrome();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.error(`页面报错：${e.message}`));
await page.addInitScript(instrument);
const url = base + (base.includes('?') ? '&' : '?') + 'source=mock&lang=zh';
await page.goto(url, { timeout: 180000 });
await page.waitForFunction(() => window.__badgeApp?.ready, null, { timeout: 180000 });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
const sys = await browser.newBrowserCDPSession();
const metric = async () => {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const get = (n) => metrics.find((m) => m.name === n)?.value ?? 0;
  const { processInfo } = await sys.send('SystemInfo.getProcessInfo');
  const gpu = processInfo.filter((p) => p.type === 'GPU').reduce((s, p) => s + p.cpuTime, 0);
  return { task: get('TaskDuration'), script: get('ScriptDuration'), gpu };
};

console.log(`${url}  ${process.env.CHROME_GL === 'software' ? '软件渲染' : '真实显卡'}  测 ${SECONDS} 秒`);
for (const id of ids) {
  const opened = await page.evaluate((id) => {
    if (!window.__badgeApp.ids.includes(id)) return false;
    window.__badgeApp.open(id, { award: false });
    return true;
  }, id);
  if (!opened) {
    console.log(`${id}: 陈列墙上没有这枚，跳过`);
    continue;
  }
  // 停稳：角度、倾斜不再变，再按帧数等超采样走完
  await page.waitForFunction(() => {
    const s = window.__badgeApp.spin;
    return !s.dragging && Math.abs(s.vel) < 1e-3 && Math.abs(s.tiltVel) < 1e-3;
  }, null, { timeout: 180000, polling: 'raf' });
  const f0 = await page.evaluate(() => window.__bench.frames);
  await page.waitForFunction(
    ([n, idle]) => window.__bench.frames >= n || window.__bench.idleRun >= idle,
    [f0 + SETTLE_FRAMES, IDLE_FRAMES],
    { timeout: 600000, polling: 'raf' },
  );

  const a = await page.evaluate(() => ({ ...window.__bench, t: performance.now() }));
  const m0 = await metric();
  await page.waitForTimeout(SECONDS * 1000);
  const b = await page.evaluate(() => ({ ...window.__bench, t: performance.now() }));
  const m1 = await metric();
  const sec = (b.t - a.t) / 1000;
  const rate = (k) => ((b[k] - a[k]) / sec).toFixed(1);
  const busy = (((m1.task - m0.task) / sec) * 1000).toFixed(1);
  const script = (((m1.script - m0.script) / sec) * 1000).toFixed(1);
  const gpu = (((m1.gpu - m0.gpu) / sec) * 1000).toFixed(1);
  console.log(
    `${id}: 帧 ${rate('frames')}/s，渲染 ${rate('renderFrames')}/s，绘制调用 ${rate('draws')}/s，叠加混合 ${rate('blends')}/s，`
    + `主线程忙 ${busy} ms/s（其中脚本 ${script} ms/s），GPU 进程 CPU ${gpu} ms/s`,
  );
  await page.evaluate(() => window.__badgeApp.close());
  await page.evaluate(() => window.__badgeApp.whenClosed?.());
  await page.waitForTimeout(600);
}
await browser.close();
