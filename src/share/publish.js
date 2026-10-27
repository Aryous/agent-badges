// npx agent-badges publish：把徽章图和公开版徽章墙部署到用户的 GitHub 主页仓库。
// 分两段：prepare 只读（检查 + 计划），execute 才改东西（写文件、提交、推送、开启 Pages）。
// gh 和 git 都通过注入的 run 调用，测试里换成假的 gh 和本地 bare 仓库。
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pagesFromRemote } from './public.js';

export const BLOCK_START = '<!-- agent-badges:start -->';
export const BLOCK_END = '<!-- agent-badges:end -->';
export const SHELF_FILE = 'agent-badges-shelf.png';
/** 浅色主题用的徽章图（GitHub 按访客的主题自动切换） */
export const SHELF_LIGHT_FILE = 'agent-badges-shelf-light.png';
const PAGE_MARK = '__AGENT_BADGES_PUBLIC__';
// git 网络操作临时用 gh 的凭证，不改用户的全局 git 配置
const GH_CREDENTIAL = ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential'];

/** 运行命令，不抛异常：{ code, stdout, stderr }；命令不存在时 code 为 127。 */
export function run(cmd, args, { cwd } = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error ? (error.code === 'ENOENT' ? 127 : typeof error.code === 'number' ? error.code : 1) : 0;
      resolve({ code, stdout: stdout ?? '', stderr: stderr ?? '' });
    });
  });
}

/** 停止部署的原因。code 供 CLI 选文案，detail 是补充信息。 */
export class PublishStop extends Error {
  constructor(code, detail = '') {
    super(`${code}${detail ? `: ${detail}` : ''}`);
    this.code = code;
    this.detail = detail;
  }
}

// ---------- GitHub ----------

export function createGitHub(exec = run) {
  async function api(path, args = []) {
    const r = await exec('gh', ['api', path, ...args]);
    if (r.code === 0) return r.stdout.trim() ? JSON.parse(r.stdout) : null;
    if (/HTTP 404/.test(r.stderr)) return null;
    throw new Error((r.stderr || r.stdout).trim() || `gh api ${path} failed`);
  }
  return {
    async available() {
      return (await exec('gh', ['--version'])).code === 0;
    },
    /** 已登录返回 { login, id, avatarUrl }，没登录返回 null。 */
    async user() {
      const r = await exec('gh', ['api', 'user']);
      if (r.code !== 0) return null;
      const u = JSON.parse(r.stdout);
      return { login: u.login, id: u.id, avatarUrl: u.avatar_url ?? null };
    },
    async repo(owner, name) {
      const r = await api(`repos/${owner}/${name}`);
      return r && { private: Boolean(r.private), defaultBranch: r.default_branch || 'main' };
    },
    async pages(owner, name) {
      const p = await api(`repos/${owner}/${name}/pages`);
      return p && { branch: p.source?.branch ?? null, path: p.source?.path ?? null, url: p.html_url ?? null };
    },
    async createRepo(name) {
      const r = await exec('gh', ['repo', 'create', name, '--public', '--description', 'GitHub profile']);
      if (r.code !== 0) throw new Error(r.stderr.trim() || 'gh repo create failed');
    },
    async enablePages(owner, name, branch) {
      await api(`repos/${owner}/${name}/pages`, ['-X', 'POST', '-f', `source[branch]=${branch}`, '-f', 'source[path]=/']);
    },
    /** 最近一次 Pages 构建：{ status, commit }。 */
    async latestBuild(owner, name) {
      const b = await api(`repos/${owner}/${name}/pages/builds/latest`);
      return b && { status: b.status ?? null, commit: b.commit ?? null };
    },
  };
}

// ---------- README 标记块 ----------

/** 主页 README 里那一块：徽章图链接到公开版徽章墙。 */
export function readmeBlock(url) {
  return [
    BLOCK_START,
    `<a href="${url}"><picture><source media="(prefers-color-scheme: light)" srcset="./${SHELF_LIGHT_FILE}"><img src="./${SHELF_FILE}" alt="Achievement badges earned with Claude Code and Codex" width="720"></picture></a>`,
    '',
    '<sub>Earned with Claude Code and Codex · made with <a href="https://github.com/Aryous/agent-badges">agent-badges</a></sub>',
    BLOCK_END,
  ].join('\n');
}

/**
 * 只改标记之间的内容；没有标记时，空 README 就只放这一块，否则加在最后。
 * @returns {{ text: string, action: 'create' | 'append' | 'update' }}
 */
export function upsertBlock(readme, block) {
  const text = readme ?? '';
  const start = text.indexOf(BLOCK_START);
  const end = start === -1 ? -1 : text.indexOf(BLOCK_END, start);
  if (start !== -1 && end !== -1) {
    return { text: text.slice(0, start) + block + text.slice(end + BLOCK_END.length), action: 'update' };
  }
  if (!text.trim()) return { text: `${block}\n`, action: 'create' };
  return { text: `${text.replace(/\s*$/, '')}\n\n${block}\n`, action: 'append' };
}

// ---------- 检查 + 计划（只读） ----------

/**
 * @param {object} o
 * @param {ReturnType<createGitHub>} o.gh
 * @param {string} o.home        数据目录（~/.agent-badges）
 * @param {(login) => string} [o.remoteFor]  测试用：换成本地 bare 仓库
 * @param {typeof run} [o.exec]
 */
export async function preparePublish({ gh, home, remoteFor = (l) => `https://github.com/${l}/${l}.git`, exec = run }) {
  if (!(await gh.available())) throw new PublishStop('no-gh');
  const user = await gh.user();
  if (!user) throw new PublishStop('not-logged-in');
  const { login } = user;
  const repo = await gh.repo(login, login);
  if (repo?.private) throw new PublishStop('private-repo', `${login}/${login}`);
  const branch = repo?.defaultBranch ?? 'main';
  const pages = repo ? await gh.pages(login, login) : null;
  if (pages && !(pages.branch === branch && pages.path === '/')) throw new PublishStop('pages-source', `${pages.branch ?? '?'} ${pages.path ?? '?'}`);

  // 工具自己管理的工作副本：每次先和远端对齐
  const dir = join(home, 'profile', login);
  const remote = remoteFor(login);
  const git = (args, opts = {}) => exec('git', [...(opts.net ? GH_CREDENTIAL : []), ...args], { cwd: opts.cwd ?? dir });
  mkdirSync(dir, { recursive: true });
  let hasCommits = false;
  if (repo) {
    const heads = await git(['ls-remote', '--heads', remote, branch], { net: true, cwd: home });
    if (heads.code !== 0) throw new Error(heads.stderr.trim() || 'git ls-remote failed');
    hasCommits = heads.stdout.trim() !== '';
  }
  if (!existsSync(join(dir, '.git'))) {
    await must(git(['init', '-q']));
    await must(git(['remote', 'add', 'origin', remote]));
  } else {
    await must(git(['remote', 'set-url', 'origin', remote]));
  }
  if (hasCommits) {
    await must(git(['fetch', '-q', 'origin', branch], { net: true }));
    await must(git(['checkout', '-q', '-B', branch, `origin/${branch}`]));
    await must(git(['reset', '-q', '--hard', `origin/${branch}`]));
    await must(git(['clean', '-qfd']));
  } else {
    await git(['checkout', '-q', '-B', branch]);
  }

  // 不覆盖别人的首页
  const index = join(dir, 'index.html');
  if (existsSync(index) && !readFileSync(index, 'utf8').includes(PAGE_MARK)) throw new PublishStop('foreign-index', `${login}/${login}/index.html`);

  const url = pagesFromRemote(`https://github.com/${login}/${login}`).url;
  const readmePath = join(dir, 'README.md');
  const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';
  return {
    login,
    id: user.id,
    dir,
    branch,
    remote,
    createRepo: !repo,
    enablePages: !pages,
    readme: upsertBlock(readme, readmeBlock(url)).action,
    url,
    profileUrl: `https://github.com/${login}`,
  };
}

async function must(p) {
  const r = await p;
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || 'git failed');
  return r;
}

// ---------- 执行 ----------

/**
 * @param {object} plan  preparePublish 的结果
 * @param {object} o
 * @param {string} o.pageHtml                   公开版徽章墙
 * @param {(file: string) => Promise<void>} o.renderShelf   在浏览器里渲染徽章图并写到 file
 * @param {ReturnType<createGitHub>} o.gh
 * @param {(msg: string) => void} [o.log]
 * @param {number} [o.waitMs]                    等 Pages 构建的最长时间
 * @returns {Promise<{ changed: boolean, live: boolean }>}
 */
export async function executePublish(plan, { pageHtml, renderShelf, gh, exec = run, log = () => {}, waitMs = 180_000, fetchStatus = defaultFetchStatus, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const { dir, login, branch } = plan;
  const git = (args, opts = {}) => exec('git', [...(opts.net ? GH_CREDENTIAL : []), ...args], { cwd: dir });

  if (plan.createRepo) {
    log('create-repo');
    await gh.createRepo(login);
  }

  writeFileSync(join(dir, 'index.html'), pageHtml);
  writeFileSync(join(dir, '.nojekyll'), '');
  await renderShelf(join(dir, SHELF_FILE));
  const readmePath = join(dir, 'README.md');
  const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';
  writeFileSync(readmePath, upsertBlock(readme, readmeBlock(plan.url)).text);

  await must(git(['add', 'README.md', 'index.html', '.nojekyll', SHELF_FILE, SHELF_LIGHT_FILE]));
  const staged = await git(['diff', '--cached', '--quiet']);
  const changed = staged.code !== 0;
  if (changed) {
    // 用户没配置 git 身份时，用 GitHub 的 noreply 邮箱，只对这次提交生效
    const hasEmail = (await git(['config', 'user.email'])).stdout.trim();
    const identity = hasEmail ? [] : ['-c', `user.name=${login}`, '-c', `user.email=${plan.id}+${login}@users.noreply.github.com`];
    await must(exec('git', [...identity, 'commit', '-q', '-m', 'Update agent badges'], { cwd: dir }));
    log('push');
    await must(git(['push', '-q', 'origin', `HEAD:${branch}`], { net: true }));
  } else {
    log('unchanged');
  }

  if (plan.enablePages) {
    log('enable-pages');
    await gh.enablePages(login, login, branch);
  }

  // 等这次提交的 Pages 构建完、网址能打开。刚推送时 latest 可能还是上一次的构建，所以按提交号对
  if (!changed && !plan.enablePages) return { changed, live: (await fetchStatus(plan.url)) === 200 };
  const head = (await must(git(['rev-parse', 'HEAD']))).stdout.trim();
  log('wait');
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const build = await gh.latestBuild(login, login).catch(() => null);
    if (build?.commit === head) {
      if (build.status === 'errored') throw new PublishStop('pages-error');
      if (build.status === 'built' && (await fetchStatus(plan.url)) === 200) return { changed, live: true };
    }
    await sleep(5000);
  }
  return { changed, live: false };
}

async function defaultFetchStatus(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return r.status;
  } catch {
    return 0;
  }
}
