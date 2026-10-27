// 分享海报上的 GitHub 头像：只有用户明确同意后才取。
// 同意记录、登录名和头像图片存在数据目录（~/.agent-badges）。页面拿到的是内嵌的 data URL，页面本身不发网络请求。
// 纯逻辑：gh 和 fetch 由调用方传进来，测试里换成替身；不输出到控制台。
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const IDENTITY_FILE = 'identity.json';
const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg' };
const FILES = new Set(['avatar.png', 'avatar.jpg']);
export const AVATAR_MAX = 1024 * 1024;

export function readIdentity(home) {
  try {
    return JSON.parse(readFileSync(join(home, IDENTITY_FILE), 'utf8'));
  } catch {
    return null;
  }
}

function save(home, data) {
  mkdirSync(home, { recursive: true });
  writeFileSync(join(home, IDENTITY_FILE), `${JSON.stringify(data, null, 2)}\n`);
}

function removeAvatarFiles(home, keep = null) {
  for (const f of FILES) if (f !== keep) rmSync(join(home, f), { force: true });
}

/** 用户的回答：没问过 null，同意 true，不要 false。 */
export const consentOf = (home) => readIdentity(home)?.consent ?? null;

/** 不要头像：删掉已存的图片，记住「不要」，以后不再问。 */
export function declineAvatar(home) {
  removeAvatarFiles(home);
  save(home, { consent: false });
}

/**
 * 取 GitHub 头像（调用前必须已经得到用户同意）：gh 拿登录名和头像地址，fetch 下载 256 像素的图，存进数据目录。
 * 只接受 PNG 和 JPEG，不超过 1 MB。失败时什么都不写。
 * @param {string} home
 * @param {{ gh: { available(): Promise<boolean>, user(): Promise<{ login, avatarUrl } | null> }, fetch?: typeof fetch, now?: () => Date }} deps
 */
export async function fetchAvatar(home, { gh, fetch: get = globalThis.fetch, now = () => new Date() }) {
  if (!(await gh.available())) return { status: 'no-gh' };
  const user = await gh.user();
  if (!user) return { status: 'not-logged-in' };
  if (!user.avatarUrl) return { status: 'fetch-failed', detail: 'no avatar_url' };
  const url = new URL(user.avatarUrl);
  url.searchParams.set('s', '256');
  let res;
  try {
    res = await get(url.href);
  } catch (e) {
    return { status: 'fetch-failed', detail: e.message };
  }
  if (!res.ok) return { status: 'fetch-failed', detail: `HTTP ${res.status}` };
  const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return { status: 'bad-image', detail: type || 'unknown type' };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > AVATAR_MAX) return { status: 'bad-image', detail: `${buf.length} bytes` };
  const file = `avatar.${ext}`;
  mkdirSync(home, { recursive: true });
  writeFileSync(join(home, file), buf);
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
