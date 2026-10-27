// avatar 命令：在分享海报上显示 GitHub 头像。只有用户明确同意才取（终端里问，或带 --yes）。
// 第一次在终端里打开徽章墙时也会问一次（maybeAskAvatar），回答记在数据目录，以后不再问。
// 插件、Agent、脚本里（非终端）一律不问；没装或没登录 gh 时不问。
import { t } from '../i18n.js';

const STATUS = {
  'no-gh': () => t('需要 GitHub 命令行工具 gh：https://cli.github.com 。装好并 gh auth login 后再运行 npx agent-badges avatar。', 'This needs the GitHub CLI (gh): https://cli.github.com. Install it, run gh auth login, then run npx agent-badges avatar again.'),
  'not-logged-in': () => t('gh 还没有登录。运行 gh auth login 后再试。', "gh isn't signed in. Run gh auth login and try again."),
  'bad-image': (d) => t(`取到的头像不是 PNG 或 JPEG，或者太大（${d}），继续用示意头像。`, `The avatar isn't a PNG or JPEG, or it's too large (${d}). Keeping the placeholder.`),
  'fetch-failed': (d) => t(`没取到头像（${d}），继续用示意头像。可以稍后再运行 npx agent-badges avatar。`, `Couldn't fetch the avatar (${d}). Keeping the placeholder. You can run npx agent-badges avatar later.`),
};

const QUESTION = () =>
  t(
    '\n要在分享海报上显示你的 GitHub 头像吗？会通过 gh 读取你的用户名，并从 GitHub 下载头像，存在 ~/.agent-badges。[y/N] ',
    '\nShow your GitHub avatar on the share poster? This reads your username through gh and downloads your avatar from GitHub into ~/.agent-badges. [y/N] ',
  );

async function ask(question) {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(question)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

async function defaults(deps) {
  const { dataHome } = await import('../../collect/common.js');
  const { createGitHub } = await import('../../share/publish.js');
  return { home: dataHome(), gh: createGitHub(), fetch: globalThis.fetch, isTTY: Boolean(process.stdin.isTTY), prompt: ask, log: console.log, ...deps };
}

async function fetchAndReport(d) {
  const { fetchAvatar } = await import('../../share/identity.js');
  const r = await fetchAvatar(d.home, { gh: d.gh, fetch: d.fetch });
  d.log(r.status === 'ok' ? t(`已保存 @${r.login} 的头像，下次打开徽章墙时就会出现在分享海报上。`, `Saved the avatar for @${r.login}. It shows on the share poster next time you open the badge wall.`) : STATUS[r.status](r.detail));
}

/** npx agent-badges avatar [--yes] [--remove] */
export async function runAvatar(opts, deps = {}) {
  const d = await defaults(deps);
  const { declineAvatar } = await import('../../share/identity.js');
  if (opts.remove) {
    declineAvatar(d.home);
    return d.log(t('已删除头像，分享海报改回示意头像。', 'Avatar removed. The share poster goes back to the placeholder.'));
  }
  if (!opts.yes) {
    if (!d.isTTY) {
      return d.log(t('这会通过 gh 读取你的 GitHub 用户名并下载头像，什么都还没做。确认后加上 --yes 再运行一次。', 'This reads your GitHub username through gh and downloads your avatar. Nothing has happened yet. Run again with --yes to go ahead.'));
    }
    if (!(await d.prompt(QUESTION()))) {
      declineAvatar(d.home);
      return d.log(t('好的，不取头像。', 'OK, no avatar.'));
    }
  }
  await fetchAndReport(d);
}

/** 第一次在终端里打开徽章墙时问一次。非终端、已经回答过、没装或没登录 gh：都不问。 */
export async function maybeAskAvatar(deps = {}) {
  const d = await defaults(deps);
  if (!d.isTTY) return;
  const { consentOf, declineAvatar } = await import('../../share/identity.js');
  if (consentOf(d.home) !== null) return;
  if (!(await d.gh.available()) || !(await d.gh.user())) return;
  if (!(await d.prompt(QUESTION()))) {
    declineAvatar(d.home);
    return d.log(t('好的。以后想加，运行 npx agent-badges avatar。', 'OK. To add it later, run npx agent-badges avatar.'));
  }
  await fetchAndReport(d);
}
