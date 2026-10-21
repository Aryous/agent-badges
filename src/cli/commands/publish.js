// publish 命令：一条命令部署到 GitHub 主页。
import { t } from '../i18n.js';
import { publicPage } from '../app.js';
import { writeShelf } from './shelf.js';

const PUBLISH_STOPS = {
  'no-gh': () => t('需要 GitHub 命令行工具 gh：https://cli.github.com 。装好后运行 gh auth login 登录，再重试。', 'This needs the GitHub CLI (gh): https://cli.github.com. Install it, run gh auth login, then try again.'),
  'not-logged-in': () => t('gh 还没有登录。请运行 gh auth login，在浏览器里完成登录后再重试。', "gh isn't signed in. Run gh auth login, finish signing in in your browser, then try again."),
  'private-repo': (d) => t(`${d} 是私有仓库。GitHub 只会在主页显示公开仓库的 README，请把它改成公开，或者换一种方式。`, `${d} is private. GitHub only shows the README of a public profile repository.`),
  'pages-source': (d) => t(`这个仓库的 GitHub Pages 已经设置成从其他位置发布（${d}）。为了不打乱你的设置，这里不做改动。`, `GitHub Pages on this repository already publishes from somewhere else (${d}). Leaving your settings alone.`),
  'foreign-index': (d) => t(`${d} 已经存在，而且不是 agent-badges 生成的。为了不覆盖你的网页，这里不做改动。可以改用 npx agent-badges shelf 只生成徽章图。`, `${d} already exists and wasn't made by agent-badges, so it won't be overwritten. Use npx agent-badges shelf for the image only.`),
  'pages-error': () => t('GitHub Pages 构建失败，请到仓库的 Actions / Pages 页面查看原因。', 'The GitHub Pages build failed. Check the Pages section of the repository.'),
};

/**
 * 一条命令部署到 GitHub 主页。不带 --yes 时只检查并列出计划（只读）；
 * 在终端里会问一次，Agent 调用时打印计划后退出，等用户同意再带 --yes 运行。
 */
export async function writePublish(data, opts) {
  const { createGitHub, preparePublish, executePublish, PublishStop } = await import('../../collect/publish.js');
  const { dataHome } = await import('../../collect/common.js');
  const gh = createGitHub();
  try {
    const plan = await preparePublish({ gh, home: dataHome() });
    const readme = {
      create: t('新建 README，只放徽章', 'create the README with your badges'),
      append: t('在 README 最后加上徽章（其他内容不动）', 'add your badges at the end of the README (nothing else changes)'),
      update: t('更新 README 里的徽章（其他内容不动）', 'update your badges in the README (nothing else changes)'),
    }[plan.readme];
    console.log(t('\n部署计划', '\nPlan'));
    console.log(t(`  账号        ${plan.login}`, `  Account     ${plan.login}`));
    console.log(t(`  仓库        ${plan.login}/${plan.login}${plan.createRepo ? '（新建，公开）' : ''}`, `  Repository  ${plan.login}/${plan.login}${plan.createRepo ? ' (new, public)' : ''}`));
    console.log(t(`  README      ${readme}`, `  README      ${readme}`));
    console.log(t(`  网页        ${plan.url}${plan.enablePages ? '（开启 GitHub Pages）' : ''}`, `  Page        ${plan.url}${plan.enablePages ? ' (turns on GitHub Pages)' : ''}`));
    console.log(
      t(
        '  会公开      已解锁的徽章和等级、徽章进度和解锁日期、每天的 Token 用量和对话轮数（热力图）。旧版本会留在 git 历史里。\n              不公开：对话内容、代码、路径、一天中几点在用、模型和工具的名字。',
        '  Public      unlocked badges and tiers, badge progress and unlock dates, daily token counts and turns (the heatmap). Old versions stay in git history.\n              Not public: prompts, code, paths, what hours you work, model and tool names.',
      ),
    );

    if (!opts.yes) {
      if (!process.stdin.isTTY) {
        console.log(t('\n这只是检查，什么都没改。确认后加上 --yes 再运行一次。', '\nNothing has changed yet. Run again with --yes to go ahead.'));
        return;
      }
      const { createInterface } = await import('node:readline/promises');
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = (await rl.question(t('\n继续吗？[y/N] ', '\nGo ahead? [y/N] '))).trim().toLowerCase();
      rl.close();
      if (answer !== 'y' && answer !== 'yes') return console.log(t('已取消，什么都没改。', 'Cancelled. Nothing changed.'));
    }

    const steps = {
      'create-repo': t('新建仓库…', 'Creating the repository…'),
      push: t('推送到 GitHub…', 'Pushing to GitHub…'),
      unchanged: t('徽章没有变化，不需要提交。', 'Nothing changed since last time, so there is nothing to commit.'),
      'enable-pages': t('开启 GitHub Pages…', 'Turning on GitHub Pages…'),
      wait: t('等 GitHub Pages 构建（通常一两分钟）…', 'Waiting for GitHub Pages to build (usually a minute or two)…'),
    };
    const { live } = await executePublish(plan, {
      gh,
      pageHtml: await publicPage(data, opts.name || plan.login),
      renderShelf: (file) => writeShelf(data, { ...opts, out: file }, { snippet: false }),
      log: (step) => console.log(steps[step] ?? step),
    });
    console.log(t(`\n完成。你的主页：${plan.profileUrl}`, `\nDone. Your profile: ${plan.profileUrl}`));
    console.log(
      live
        ? t(`点徽章图会打开：${plan.url}`, `Clicking the badges opens: ${plan.url}`)
        : t(`徽章墙还在构建，过一两分钟再打开：${plan.url}`, `The badge wall is still building. Open it in a minute or two: ${plan.url}`),
    );
  } catch (e) {
    if (e instanceof PublishStop) throw new Error(PUBLISH_STOPS[e.code]?.(e.detail) ?? e.message);
    throw e;
  }
}
