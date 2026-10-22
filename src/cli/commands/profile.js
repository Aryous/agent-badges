// profile 命令：往主页仓库目录写入徽章图和公开版徽章墙。
import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SHELF_FILE, SHELF_LIGHT_FILE } from '../../share/publish.js';
import { t } from '../i18n.js';
import { publicPage } from '../page.js';
import { shelfPicture, writeShelf } from './shelf.js';

/**
 * 个人主页：往主页仓库写两样东西，一起提交、一起推送。
 *   index.html               公开版徽章墙（开启 GitHub Pages 后可访问）
 *   agent-badges-shelf.png   README 里的徽章图，点它跳到上面的网页
 * 不改 README，不提交，不推送。
 */
export async function writeProfile(data, opts) {
  const { pagesForDir } = await import('../../share/public.js');
  const dir = resolve(opts.dir);
  if (!existsSync(dir)) throw new Error(t(`目录不存在：${dir}`, `No such directory: ${dir}`));
  const pages = pagesForDir(dir);
  const page = join(dir, 'index.html');
  writeFileSync(page, await publicPage(data, opts.name || pages?.owner || ''));
  console.log(t(`\n公开版徽章墙：${page}`, `\nPublic badge wall: ${page}`));
  await writeShelf(data, { ...opts, out: join(dir, SHELF_FILE) }, { snippet: false });

  const url = pages?.url ?? 'https://<you>.github.io/<repo>/';
  console.log(t('\nREADME 里这样写，点图片就会打开徽章墙：', '\nIn the README, link the image to the badge wall:'));
  console.log(shelfPicture(SHELF_FILE, SHELF_LIGHT_FILE, url));
  console.log(
    t(
      `\n网页会公开你每天的 Token 用量和对话轮数（热力图）、徽章进度和解锁日期；推送后旧版本会留在 git 历史里。\n第一次需要开启 GitHub Pages：仓库 Settings → Pages → Deploy from a branch → main / (root)`,
      `\nThe page makes your daily token counts and turns (the heatmap), badge progress and unlock dates public, and old versions stay in git history.\nFirst time only, turn on GitHub Pages: repo Settings → Pages → Deploy from a branch → main / (root)`,
    ),
  );
  if (pages) console.log(`  gh api -X POST repos/${pages.owner}/${pages.repo}/pages -f 'source[branch]=main' -f 'source[path]=/'`);
  console.log(t('然后提交并推送这两个文件。', 'Then commit and push both files.'));
}
