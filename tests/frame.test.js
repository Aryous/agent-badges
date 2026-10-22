import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { forEachFrame } from '../src/viewer/frame.js';

// nextFrame 在页面不可见时用消息通道让出；Node 里也有 MessageChannel，这里把页面设成「不可见」
beforeAll(() => {
  globalThis.document = { visibilityState: 'hidden' };
});
afterAll(() => {
  delete globalThis.document;
});

describe('forEachFrame', () => {
  it('按顺序处理，每个开始前先等 pause', async () => {
    const log = [];
    const done = await forEachFrame([1, 2, 3], async (x) => log.push(`do ${x}`), { pause: async () => log.push('pause') });
    expect(done).toBe(true);
    expect(log).toEqual(['pause', 'do 1', 'pause', 'do 2', 'pause', 'do 3']);
  });

  it('cancelled 返回 true 就停下，结果是 false', async () => {
    const seen = [];
    const done = await forEachFrame([1, 2, 3], (x) => seen.push(x), { cancelled: () => seen.length === 2 });
    expect(seen).toEqual([1, 2]);
    expect(done).toBe(false);
  });

  it('空列表直接完成', async () => {
    expect(
      await forEachFrame([], () => {
        throw new Error('不该调用');
      }),
    ).toBe(true);
  });
});
