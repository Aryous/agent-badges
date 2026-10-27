// 把采集结果内嵌进页面：CLI 提供的本地页面、导出的静态文件、开发服务器都用它。

/** 生成注入用的 <script>。转义 "<" 防止数据里出现 </script> 提前闭合标签。 */
export function dataScript(dataByBrand) {
  const json = JSON.stringify(dataByBrand).replace(/</g, '\\u003c');
  return `<script>window.__AGENT_BADGES_DATA__ = ${json};</script>`;
}

/** 用户同意后的 GitHub 登录名和头像：单独一个变量，不和公开版标记混用（那个会把页面切成「给别人看」）。 */
export function identityScript(identity) {
  if (!identity) return '';
  const json = JSON.stringify({ login: identity.login, avatar: identity.avatar }).replace(/</g, '\\u003c');
  return `<script>window.__AGENT_BADGES_IDENTITY__ = ${json};</script>`;
}

/**
 * @param {object} [publicMeta]  公开版（profile）才有：{ name, home }，页面据此切换成「给别人看」的样子
 * @param {{ login: string, avatar: string } | null} [identity]  用户同意后的身份（pageIdentity 的结果）
 */
export function injectData(html, dataByBrand, publicMeta = null, identity = null) {
  let tag = dataScript(dataByBrand);
  if (publicMeta) tag += `\n<script>window.__AGENT_BADGES_PUBLIC__ = ${JSON.stringify(publicMeta).replace(/</g, '\\u003c')};</script>`;
  if (identity) tag += `\n${identityScript(identity)}`;
  // 用函数做替换：数据里的 $& $' 之类不会被当成替换模式
  return html.includes('</head>') ? html.replace('</head>', () => `${tag}\n</head>`) : tag + html;
}
