import { describe, expect, it } from 'vitest';
import { chromeArgs, chromePath } from '../scripts/browser.mjs';

// 各检查脚本共用的 Chrome 启动参数：Mac 用真实显卡，其他系统（CI 的 Linux）用软件渲染
describe('浏览器启动参数', () => {
  it('CHROME_PATH 优先', () => {
    expect(chromePath({ CHROME_PATH: '/opt/chrome' }, 'linux')).toBe('/opt/chrome');
  });
  it('Mac 用 Metal 显卡', () => {
    expect(chromeArgs({}, 'darwin')).toEqual(['--use-angle=metal', '--enable-gpu']);
  });
  it('Linux 用 SwiftShader 软件渲染', () => {
    expect(chromeArgs({}, 'linux')).toEqual(['--use-angle=swiftshader', '--enable-unsafe-swiftshader']);
  });
  it('CHROME_GL=software 可以在 Mac 上复现 CI 的软件渲染', () => {
    expect(chromeArgs({ CHROME_GL: 'software' }, 'darwin')).toEqual(['--use-angle=swiftshader', '--enable-unsafe-swiftshader']);
  });
});
