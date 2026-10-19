// 公开版徽章墙（npx agent-badges profile）：放到 GitHub Pages 上给别人看。
// 网页是公开仓库里的文件，内嵌数据谁都能拿到，所以只放页面上本来就看得到的东西。
import { execFileSync } from 'node:child_process';
import { BRAND_INFO } from './summary.js';

const pad = (n) => String(n).padStart(2, '0');
/** 本地时区的日期 YYYY-MM-DD；页面只显示「更新于几月几日」，不需要时刻。 */
const localDay = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * 清洗采集结果：
 * - 未解锁的隐藏徽章不放（页面上显示 ???，数据里也不该有它的进度）；
 * - 更新时间只保留日期；
 * - 只保留页面用到的字段（进度、每天的用量）。
 */
export function publicData(data) {
  const out = {};
  for (const [id, d] of Object.entries(data)) {
    const info = BRAND_INFO[id];
    if (!info || !d) continue;
    const hidden = new Set(info.badges.filter((b) => b.hidden).map((b) => b.id));
    const progress = Object.fromEntries(Object.entries(d.progress ?? {}).filter(([badgeId, p]) => !hidden.has(badgeId) || p?.unlocked));
    out[id] = { source: 'local', generatedAt: localDay(d.generatedAt), progress, daily: d.daily ?? {} };
  }
  return out;
}

/**
 * 从 git 远端推出 GitHub Pages 网址。只解析 github.com/<owner>/<repo>，
 * 远端 URL 里可能带的用户名、令牌一律不碰。
 * @returns {{ owner: string, repo: string, url: string } | null}
 */
export function pagesFromRemote(remote) {
  const m = String(remote ?? '').trim().match(/github\.com[:/]+([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/);
  if (!m) return null;
  const [, owner, repo] = m;
  const host = `${owner.toLowerCase()}.github.io`;
  // <owner>.github.io 仓库是用户站点，网址就是根目录
  const url = repo.toLowerCase() === host ? `https://${host}/` : `https://${host}/${repo}/`;
  return { owner, repo, url };
}

/** 读目录的 origin 远端；不是 git 仓库或没有远端时返回 null。 */
export function pagesForDir(dir) {
  try {
    const remote = execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return pagesFromRemote(remote);
  } catch {
    return null;
  }
}
