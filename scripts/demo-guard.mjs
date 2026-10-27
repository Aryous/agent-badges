// 演示站（GitHub Pages 上的 demo/）只能有示例数据：页面里混进本机数据、头像或用户名就返回原因。
// build-site.mjs 用它拦截，tests/avatar.test.js 测它。
export function personalDataIn(html) {
  if (html.includes('__AGENT_BADGES_DATA__ =')) return '演示页里混进了本机数据';
  if (html.includes('__AGENT_BADGES_IDENTITY__ =')) return '演示页里混进了头像或用户名';
  return null;
}
