// 分享海报上的 GitHub 头像：只有用户明确同意后才取。
// 同意记录、登录名和头像图片存在数据目录（~/.agent-badges）。页面拿到的是内嵌的 data URL，页面本身不发网络请求。
// 纯逻辑：gh 和 fetch 由调用方传进来，测试里换成替身；不输出到控制台；出错只返回状态，不往外抛。
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { replaceFile, writeJSON } from '../collect/common.js';

const IDENTITY_FILE = 'identity.json';
const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg' };
const FILES = new Set(['avatar.png', 'avatar.jpg']);
const AVATAR_MAX = 1024 * 1024;
const TIMEOUT = 10_000;

export function readIdentity(home) {
  try {
    return JSON.parse(readFileSync(join(home, IDENTITY_FILE), 'utf8'));
  } catch {
    return null;
  }
}

const save = (home, data) => writeJSON(join(home, IDENTITY_FILE), data);

function removeAvatarFiles(home, keep = null) {
  for (const f of FILES) if (f !== keep) rmSync(join(home, f), { force: true });
}

/** 用户的回答：没问过 null，同意 true，不要 false。 */
export const consentOf = (home) => readIdentity(home)?.consent ?? null;

/** 用户同意了：先记下回答（取头像失败也不再问），已有的头像和登录名保留。 */
export function acceptAvatar(home) {
  save(home, { ...readIdentity(home), consent: true });
}

/** 不要头像：删掉已存的图片，记住「不要」，以后不再问。 */
export function declineAvatar(home) {
  removeAvatarFiles(home);
  save(home, { consent: false });
}

/**
 * 取 GitHub 头像（调用前必须已经得到用户同意）：gh 拿登录名和头像地址，fetch 下载 256 像素的图，存进数据目录。
 * 只接受 https 地址、PNG 和 JPEG、不超过 1 MB，10 秒超时。任何失败都只返回状态，什么都不写。
 * @param {string} home
 * @param {{ gh: { available(): Promise<boolean>, user(): Promise<{ login, avatarUrl } | null> }, fetch?: typeof fetch, now?: () => Date }} deps
 * @returns {Promise<{ status: 'ok', login: string } | { status: 'no-gh' | 'not-logged-in' | 'bad-image' | 'fetch-failed', detail?: string }>}
 */
export async function fetchAvatar(home, { gh, fetch: get = globalThis.fetch, now = () => new Date() }) {
  let user;
  try {
    if (!(await gh.available())) return { status: 'no-gh' };
    user = await gh.user();
  } catch (e) {
    return { status: 'fetch-failed', detail: e.message };
  }
  if (!user) return { status: 'not-logged-in' };
  let buf;
  let ext;
  try {
    const url = new URL(user.avatarUrl);
    if (url.protocol !== 'https:') return { status: 'fetch-failed', detail: `not https: ${url.protocol}` };
    url.searchParams.set('s', '256');
    const res = await get(url.href, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return { status: 'fetch-failed', detail: `HTTP ${res.status}` };
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    ext = TYPES[type];
    if (!ext) return { status: 'bad-image', detail: type || 'unknown type' };
    const declared = Number(res.headers.get('content-length'));
    if (declared > AVATAR_MAX) return { status: 'bad-image', detail: `${declared} bytes` };
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return { status: 'fetch-failed', detail: e.message };
  }
  if (buf.length > AVATAR_MAX) return { status: 'bad-image', detail: `${buf.length} bytes` };
  const file = `avatar.${ext}`;
  replaceFile(join(home, file), (tmp) => writeFileSync(tmp, buf));
  removeAvatarFiles(home, file);
  save(home, { consent: true, login: user.login, file, fetchedAt: now().toISOString().slice(0, 10) });
  return { status: 'ok', login: user.login };
}

/** 页面要的身份：同意了且图片在，返回 { login, avatar: data URL }；否则 null。 */
export function pageIdentity(home) {
  const id = readIdentity(home);
  if (id?.consent !== true || !id.login || !FILES.has(id.file)) return null;
  const path = join(home, id.file);
  if (!existsSync(path)) return null;
  const type = id.file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return { login: String(id.login), avatar: `data:${type};base64,${readFileSync(path).toString('base64')}` };
}

/**
 * 公开页（publish / profile）的身份：同意过、图片在，而且是页面主人自己的账号才放，免得公开关联两个账号。
 * skipped：有头像但账号不同（或不知道页面主人）时，是头像那个账号的登录名，命令行据此提示一行。
 */
export function publicIdentity(home, owner) {
  const id = pageIdentity(home);
  if (!id) return { identity: null, skipped: null };
  const same = Boolean(owner) && id.login.toLowerCase() === String(owner).toLowerCase();
  return same ? { identity: id, skipped: null } : { identity: null, skipped: id.login };
}
