// 启动无头 Chrome，供检查、截图和素材脚本共用。
// 路径：环境变量 CHROME_PATH 优先，否则按系统查找常见的安装位置。
// 显卡：Mac 用真实显卡（Metal）；其他系统（如 CI 的 Linux）用 SwiftShader 软件渲染。
// CHROME_GL=software 可以在 Mac 上强制软件渲染，用来在本机复现 CI。
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CANDIDATES = {
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  win32: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'],
};

export function chromePath(env = process.env, platform = process.platform) {
  if (env.CHROME_PATH) return env.CHROME_PATH;
  const found = (CANDIDATES[platform] ?? []).find((p) => existsSync(p));
  if (!found) throw new Error('没有找到 Google Chrome：安装后重试，或用环境变量 CHROME_PATH 指定路径');
  return found;
}

export function chromeArgs(env = process.env, platform = process.platform) {
  const software = env.CHROME_GL === 'software' || platform !== 'darwin';
  return software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu'];
}

export const launchChrome = (options = {}) => chromium.launch({ executablePath: chromePath(), headless: true, args: chromeArgs(), ...options });
