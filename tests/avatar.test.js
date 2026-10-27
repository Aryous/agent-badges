// 头像：只有用户同意后才通过 gh 取，存在数据目录；页面拿到的是内嵌的 data URL，页面本身不联网。
// gh 和 fetch 都用替身，不联网；数据目录用临时目录。
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { consentOf, declineAvatar, fetchAvatar, pageIdentity, readIdentity } from '../src/share/identity.js';
import { identityScript, injectData } from '../src/share/inject.js';
import { maybeAskAvatar, runAvatar } from '../src/cli/commands/avatar.js';
import { parseArgs } from '../src/cli/args.js';

// 1×1 的透明 PNG
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000' + '1f15c4890000000d49444154789c63f8ffff3f0005fe02fea7d5a3c20000000049454e44ae426082', 'hex');
const USER = { login: 'octo', id: 1, avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4' };
const fakeGh = ({ available = true, user = USER } = {}) => ({ available: async () => available, user: async () => user });
function fakeFetch({ body = PNG, type = 'image/png', status = 200 } = {}) {
  const f = async (url) => {
    f.calls.push(url);
    return new Response(body, { status, headers: { 'content-type': type } });
  };
  f.calls = [];
  return f;
}

let home;
beforeEach(() => (home = mkdtempSync(join(tmpdir(), 'agent-badges-avatar-'))));
afterEach(() => rmSync(home, { recursive: true, force: true }));

describe('取头像', () => {
  it('同意后：通过 gh 拿到头像地址，取 256 像素的图，存进数据目录，记住登录名和日期', async () => {
    const fetch = fakeFetch();
    const r = await fetchAvatar(home, { gh: fakeGh(), fetch, now: () => new Date('2026-10-27T10:00:00Z') });
    expect(r).toEqual({ status: 'ok', login: 'octo' });
    expect(new URL(fetch.calls[0]).searchParams.get('s')).toBe('256');
    expect(readFileSync(join(home, 'avatar.png'))).toEqual(PNG);
    expect(readIdentity(home)).toEqual({ consent: true, login: 'octo', file: 'avatar.png', fetchedAt: '2026-10-27' });
    expect(consentOf(home)).toBe(true);
  });

  it('没装 gh、gh 没登录：不联网，什么都不写', async () => {
    const fetch = fakeFetch();
    expect(await fetchAvatar(home, { gh: fakeGh({ available: false }), fetch })).toEqual({ status: 'no-gh' });
    expect(await fetchAvatar(home, { gh: fakeGh({ user: null }), fetch })).toEqual({ status: 'not-logged-in' });
    expect(fetch.calls).toEqual([]);
    expect(consentOf(home)).toBe(null);
  });

  it('不是 PNG / JPEG、超过 1 MB、HTTP 出错：不保存', async () => {
    expect((await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch({ type: 'text/html' }) })).status).toBe('bad-image');
    expect((await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch({ body: Buffer.alloc(1024 * 1024 + 1) }) })).status).toBe('bad-image');
    expect((await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch({ status: 404 }) })).status).toBe('fetch-failed');
    expect(existsSync(join(home, 'avatar.png'))).toBe(false);
    expect(consentOf(home)).toBe(null);
  });

  it('不要了：删掉头像文件，记住「不要」', async () => {
    await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch() });
    declineAvatar(home);
    expect(existsSync(join(home, 'avatar.png'))).toBe(false);
    expect(readIdentity(home)).toEqual({ consent: false });
    expect(consentOf(home)).toBe(false);
  });
});

describe('页面拿到的身份', () => {
  it('没问过、不同意、文件没了：都是 null', async () => {
    expect(pageIdentity(home)).toBe(null);
    declineAvatar(home);
    expect(pageIdentity(home)).toBe(null);
    await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch() });
    rmSync(join(home, 'avatar.png'));
    expect(pageIdentity(home)).toBe(null);
  });

  it('同意了：登录名和内嵌的 data URL', async () => {
    await fetchAvatar(home, { gh: fakeGh(), fetch: fakeFetch() });
    expect(pageIdentity(home)).toEqual({ login: 'octo', avatar: `data:image/png;base64,${PNG.toString('base64')}` });
  });

  it('identity.json 被改成别的文件名：不读', () => {
    writeFileSync(join(home, 'identity.json'), JSON.stringify({ consent: true, login: 'octo', file: '../secret.png' }));
    expect(pageIdentity(home)).toBe(null);
  });

  it('注入页面：单独一个变量，转义 <，不和公开版标记混用', () => {
    const id = { login: 'a</script><b>', avatar: 'data:image/png;base64,AAAA' };
    expect(identityScript(null)).toBe('');
    const html = injectData('<html><head></head><body></body></html>', {}, null, id);
    expect(html).toContain('window.__AGENT_BADGES_IDENTITY__ = ');
    expect(html).not.toContain('</script><b>');
    expect(html).not.toContain('__AGENT_BADGES_PUBLIC__');
    expect(html.match(/<\/head>/g)).toHaveLength(1);
    expect(injectData('<html><head></head></html>', {})).not.toContain('__AGENT_BADGES_IDENTITY__');
  });
});

describe('命令行', () => {
  const deps = (over = {}) => {
    const out = { home, gh: fakeGh(), fetch: fakeFetch(), isTTY: true, asked: 0, logs: [], ...over };
    out.prompt = async () => {
      out.asked++;
      return over.answer ?? true;
    };
    out.log = (s) => out.logs.push(s);
    return out;
  };

  it('参数：avatar 命令和 --remove', () => {
    expect(parseArgs(['avatar'])).toMatchObject({ command: 'avatar', remove: false });
    expect(parseArgs(['avatar', '--remove'])).toMatchObject({ command: 'avatar', remove: true });
    expect(parseArgs(['avatar', '--yes'])).toMatchObject({ command: 'avatar', yes: true });
  });

  it('avatar：非终端不带 --yes 只打印说明，不取', async () => {
    const d = deps({ isTTY: false });
    await runAvatar({ yes: false, remove: false }, d);
    expect(d.fetch.calls).toEqual([]);
    expect(consentOf(home)).toBe(null);
  });

  it('avatar --yes：直接取；终端里问了说不要：记住不要', async () => {
    const d = deps({ isTTY: false });
    await runAvatar({ yes: true, remove: false }, d);
    expect(consentOf(home)).toBe(true);
    const no = deps({ answer: false });
    await runAvatar({ yes: false, remove: false }, no);
    expect(no.asked).toBe(1);
    expect(consentOf(home)).toBe(false);
  });

  it('avatar --remove：删掉头像，记住不要', async () => {
    await runAvatar({ yes: true, remove: false }, deps({ isTTY: false }));
    await runAvatar({ yes: false, remove: true }, deps());
    expect(existsSync(join(home, 'avatar.png'))).toBe(false);
    expect(consentOf(home)).toBe(false);
  });

  it('第一次在终端里打开：问一次；回答被记住，以后不再问', async () => {
    const first = deps();
    await maybeAskAvatar(first);
    expect(first.asked).toBe(1);
    expect(consentOf(home)).toBe(true);
    const again = deps();
    await maybeAskAvatar(again);
    expect(again.asked).toBe(0);
  });

  it('插件、Agent、脚本里（非终端）不问；没装或没登录 gh 也不问，下次装好了再问', async () => {
    const plugin = deps({ isTTY: false });
    await maybeAskAvatar(plugin);
    expect(plugin.asked).toBe(0);
    const noGh = deps({ gh: fakeGh({ available: false }) });
    await maybeAskAvatar(noGh);
    const loggedOut = deps({ gh: fakeGh({ user: null }) });
    await maybeAskAvatar(loggedOut);
    expect(noGh.asked + loggedOut.asked).toBe(0);
    expect(consentOf(home)).toBe(null);
  });
});

describe('演示站和文档', () => {
  it('演示站构建脚本会拦住身份脚本', () => {
    const src = readFileSync(new URL('../scripts/build-site.mjs', import.meta.url), 'utf8');
    expect(src).toContain("demo.includes('__AGENT_BADGES_IDENTITY__ =')");
  });

  it('README 写明页面不联网，命令行只在 publish 和取头像时联网', () => {
    const en = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const zh = readFileSync(new URL('../README.zh-CN.md', import.meta.url), 'utf8');
    expect(en).toContain('npx agent-badges avatar');
    expect(en).not.toContain('There are no network calls and no analytics.');
    expect(zh).toContain('npx agent-badges avatar');
    expect(zh).not.toContain('不发任何网络请求，也没有任何统计。');
  });
});
