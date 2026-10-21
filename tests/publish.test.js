// 一条命令部署到 GitHub 主页（publish）：README 标记块、检查阶段的停止情况、完整执行流程。
// 用假的 gh 和本地 bare 仓库代替 GitHub，真的跑 git；不碰用户的全局 git 配置。
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from '../src/cli/args.js';
import { BLOCK_END, BLOCK_START, PublishStop, executePublish, preparePublish, readmeBlock, upsertBlock } from '../src/collect/publish.js';

const URL = 'https://me.github.io/me/';
const block = readmeBlock(URL);

describe('README 标记块', () => {
  it('空 README：只放这一块', () => {
    expect(upsertBlock('', block)).toEqual({ text: `${block}\n`, action: 'create' });
  });

  it('已有内容：加在最后，原内容不动', () => {
    const { text, action } = upsertBlock('# Hi\n\nI build things.\n', block);
    expect(action).toBe('append');
    expect(text.startsWith('# Hi\n\nI build things.\n')).toBe(true);
    expect(text.trimEnd().endsWith(BLOCK_END)).toBe(true);
  });

  it('已有标记：只替换标记之间，前后不动；重复运行结果不变', () => {
    const before = `# Hi\n\n${BLOCK_START}\nold\n${BLOCK_END}\n\nBye\n`;
    const once = upsertBlock(before, block);
    expect(once.action).toBe('update');
    expect(once.text).toBe(`# Hi\n\n${block}\n\nBye\n`);
    expect(upsertBlock(once.text, block).text).toBe(once.text);
  });

  it('徽章图链接到公开版徽章墙', () => {
    expect(block).toContain(`<a href="${URL}"><picture><source media="(prefers-color-scheme: light)" srcset="./agent-badges-shelf-light.png"><img src="./agent-badges-shelf.png"`);
  });
});

// ---------- 假的 GitHub ----------

let root;
const savedEnv = {};
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'agent-badges-publish-'));
  // 不用用户的 git 配置：既保证测试可重复，也覆盖「没配置 git 身份」的情况
  for (const k of ['GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM']) savedEnv[k] = process.env[k];
  writeFileSync(join(root, 'gitconfig'), '');
  process.env.GIT_CONFIG_GLOBAL = join(root, 'gitconfig');
  process.env.GIT_CONFIG_NOSYSTEM = '1';
});
afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  rmSync(root, { recursive: true, force: true });
});

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

function world(name, { exists = false, isPrivate = false, pages = null, files = null } = {}) {
  const base = join(root, name);
  const bare = join(base, 'remote.git');
  const home = join(base, 'home');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
  if (files) {
    // 远端已有内容：先在临时目录里提交再推上去
    const seed = join(base, 'seed');
    execFileSync('git', ['init', '-q', '-b', 'main', seed]);
    for (const [f, c] of Object.entries(files)) writeFileSync(join(seed, f), c);
    git(seed, 'add', '-A');
    git(seed, '-c', 'user.name=x', '-c', 'user.email=x@x', 'commit', '-q', '-m', 'seed');
    git(seed, 'push', '-q', bare, 'HEAD:main');
  }
  const state = { exists, pages, calls: [] };
  const gh = {
    available: async () => true,
    user: async () => ({ login: 'me', id: 42 }),
    repo: async () => (state.exists ? { private: isPrivate, defaultBranch: 'main' } : null),
    pages: async () => state.pages,
    createRepo: async (n) => {
      state.calls.push(['createRepo', n]);
      state.exists = true;
    },
    enablePages: async (...a) => {
      state.calls.push(['enablePages', ...a]);
      state.pages = { branch: 'main', path: '/' };
    },
    latestBuild: async () => ({ status: 'built', commit: git(bare, 'rev-parse', 'main') }),
  };
  const prepare = () => preparePublish({ gh, home, remoteFor: () => bare });
  const execute = (plan, extra = {}) =>
    executePublish(plan, {
      gh,
      pageHtml: '<html><script>window.__AGENT_BADGES_PUBLIC__ = {};</script></html>',
      renderShelf: async (file) => (writeFileSync(file, 'PNG'), writeFileSync(file.replace('.png', '-light.png'), 'PNG')),
      fetchStatus: async () => 200,
      sleep: async () => {},
      ...extra,
    });
  return { gh, state, bare, home, prepare, execute };
}

const remoteFile = (bare, f) => git(bare, 'show', `main:${f}`);

describe('检查阶段的停止情况', () => {
  const stop = async (p) => {
    const e = await p.catch((x) => x);
    expect(e).toBeInstanceOf(PublishStop);
    return e.code;
  };

  it('没装 gh、没登录', async () => {
    const w = world('stop-gh');
    expect(await stop(preparePublish({ gh: { ...w.gh, available: async () => false }, home: w.home }))).toBe('no-gh');
    expect(await stop(preparePublish({ gh: { ...w.gh, user: async () => null }, home: w.home }))).toBe('not-logged-in');
  });

  it('私有仓库、Pages 从别处发布', async () => {
    expect(await stop(world('stop-private', { exists: true, isPrivate: true }).prepare())).toBe('private-repo');
    expect(await stop(world('stop-pages', { exists: true, pages: { branch: 'gh-pages', path: '/' }, files: { 'README.md': 'x' } }).prepare())).toBe('pages-source');
  });

  it('根目录已有别人的 index.html，不覆盖', async () => {
    expect(await stop(world('stop-index', { exists: true, files: { 'index.html': '<h1>my site</h1>' } }).prepare())).toBe('foreign-index');
  });
});

describe('完整流程', () => {
  it('新用户：新建仓库、README 只有徽章、开启 Pages', async () => {
    const w = world('fresh');
    const plan = await w.prepare();
    expect(plan).toMatchObject({ login: 'me', createRepo: true, enablePages: true, readme: 'create', url: URL, branch: 'main' });
    // 检查阶段什么都没改
    expect(w.state.calls).toEqual([]);

    const r = await w.execute(plan);
    expect(r).toEqual({ changed: true, live: true });
    expect(w.state.calls).toEqual([['createRepo', 'me'], ['enablePages', 'me', 'me', 'main']]);
    expect(remoteFile(w.bare, 'README.md')).toBe(block);
    expect(remoteFile(w.bare, 'agent-badges-shelf.png')).toBe('PNG');
    expect(remoteFile(w.bare, 'index.html')).toContain('__AGENT_BADGES_PUBLIC__');
    expect(git(w.bare, 'ls-tree', '--name-only', 'main')).toContain('.nojekyll');
    // 没配置 git 身份时用 GitHub 的 noreply 邮箱
    expect(git(w.bare, 'log', '-1', '--format=%ae', 'main')).toBe('42+me@users.noreply.github.com');
  });

  it('再次运行：徽章没变就不提交；变了只更新那一块', async () => {
    const w = world('again');
    await w.execute(await w.prepare());
    const first = git(w.bare, 'rev-parse', 'main');

    const plan2 = await w.prepare();
    expect(plan2).toMatchObject({ createRepo: false, enablePages: false, readme: 'update' });
    expect(await w.execute(plan2)).toEqual({ changed: false, live: true });
    expect(git(w.bare, 'rev-parse', 'main')).toBe(first);

    await w.execute(await w.prepare(), { renderShelf: async (file) => (writeFileSync(file, 'PNG2'), writeFileSync(file.replace('.png', '-light.png'), 'PNG2')) });
    expect(git(w.bare, 'rev-list', '--count', 'main')).toBe('2');
    expect(remoteFile(w.bare, 'agent-badges-shelf.png')).toBe('PNG2');
    expect(w.state.calls.filter(([c]) => c === 'enablePages')).toHaveLength(1);
  });

  it('已有主页 README：徽章加在最后，原内容不动；别人在网页上改过的内容会先拉下来', async () => {
    const w = world('existing', { exists: true, files: { 'README.md': '# Hi there\n' } });
    const plan = await w.prepare();
    expect(plan).toMatchObject({ createRepo: false, enablePages: true, readme: 'append' });
    await w.execute(plan);
    expect(remoteFile(w.bare, 'README.md')).toBe(`# Hi there\n\n${block}`);

    // 用户在 GitHub 网页上改了 README 开头，下次更新要保留
    const edit = join(root, 'existing', 'edit');
    execFileSync('git', ['clone', '-q', w.bare, edit]);
    writeFileSync(join(edit, 'README.md'), readFileSync(join(edit, 'README.md'), 'utf8').replace('Hi there', 'Hello'));
    git(edit, '-c', 'user.name=x', '-c', 'user.email=x@x', 'commit', '-qam', 'edit');
    git(edit, 'push', '-q', 'origin', 'HEAD:main');

    await w.execute(await w.prepare(), { renderShelf: async (file) => (writeFileSync(file, 'PNG3'), writeFileSync(file.replace('.png', '-light.png'), 'PNG3')) });
    expect(remoteFile(w.bare, 'README.md')).toBe(`# Hello\n\n${block}`);
  });

  it('Pages 一直没构建好：不报错，提示稍后再看', async () => {
    const w = world('slow');
    const plan = await w.prepare();
    const r = await w.execute(plan, { fetchStatus: async () => 404, waitMs: 0 });
    expect(r).toEqual({ changed: true, live: false });
  });

  it('工作副本放在数据目录下，由工具管理', async () => {
    const w = world('where');
    const plan = await w.prepare();
    expect(plan.dir).toBe(join(w.home, 'profile', 'me'));
    expect(existsSync(join(plan.dir, '.git'))).toBe(true);
  });
});

describe('publish 参数', () => {
  it('--yes', () => {
    expect(parseArgs(['publish'])).toMatchObject({ command: 'publish', yes: false });
    expect(parseArgs(['publish', '--yes', '--lang', 'zh'])).toMatchObject({ command: 'publish', yes: true, cardLang: 'zh' });
  });
});
