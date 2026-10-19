# 一条命令部署到 GitHub 主页（publish）— 设计规格

- 日期：2026-10-19
- 状态：已确认（命令执行、技能沟通；已有 README 时徽章放在最下面）
- 依赖：`profile`（徽章图 + 公开版徽章墙）、`shelf`（浏览器渲染）

## 1. 目标

用户对 Agent 说「把我的徽章放到 GitHub 主页」，确认一次，就得到：主页 README 里的徽章图，点击打开 GitHub Pages 上的公开徽章墙。以后「更新主页徽章」同样一句话。

做不了网页上的一键部署：数据在用户电脑上，网页读不到。

## 2. 命令

```
npx agent-badges publish [--yes] [--name <名字>] [--lang en|zh] [--port <端口>] [--no-open]
```

两段式：

1. **检查并列出计划（只读）**：不带 `--yes` 时只做这一段。在终端里会问 y/N；不在终端里（Agent 调用）打印计划后退出，等用户同意后带 `--yes` 再跑。
2. **执行**：渲染、写文件、提交、推送、开启 Pages、等网页能打开。

### 检查

| 情况 | 处理 |
|---|---|
| 没装 `gh` | 停止，给安装地址 |
| `gh` 没登录 | 停止，请用户自己运行 `gh auth login`（Agent 代替不了） |
| 主页仓库是私有的 | 停止：主页 README 只认公开仓库 |
| Pages 已开但来源不是默认分支根目录 | 停止，不替用户改设置 |
| 仓库根目录已有别人的 `index.html` | 停止，不覆盖 |

### 计划里写明

账号、仓库（新建公开 / 已有）、README（新建 / 末尾加一块 / 更新那一块）、Pages（开启 / 已开）、会公开什么、最终网址。

### 执行

- 工作副本由工具管理：`~/.agent-badges/profile/<用户名>/`。每次先和远端对齐（fetch + reset 到远端分支），用户不需要懂 git。
- 写入：`index.html`（公开版徽章墙，内嵌数据规则同 profile）、`agent-badges-shelf.png`、`.nojekyll`（跳过 Jekyll，构建更快）。
- README 只改标记之间的内容：

  ```
  <!-- agent-badges:start -->
  …徽章图（链接到 Pages）和一行来源说明…
  <!-- agent-badges:end -->
  ```

  没有标记时：新仓库 README 只有这一块；已有 README 就加在最后。其他内容一个字不动。
- 没有变化就不提交。提交身份用用户的 git 配置，没有就用 GitHub noreply 邮箱（只对这次提交生效）。
- git 网络操作临时使用 `gh auth git-credential` 认证，不改用户的全局 git 配置。
- 第一次开启 Pages（默认分支、根目录），然后等构建完成、网址返回 200（最多约 3 分钟；超时就说「还在构建，稍后打开」）。

## 3. Agent 技能

1. 运行 `npx -y agent-badges@latest publish`（不带 `--yes`），把计划和「会公开什么」告诉用户。
2. 用户同意后运行 `npx -y agent-badges@latest publish --yes`，提醒会弹出浏览器标签页。
3. `gh` 没装或没登录：告诉用户怎么做（Claude Code 里可以用 `! gh auth login`），不要尝试绕过。
4. 只给网址，不再手动改 README、不再手动提交推送。

预先放行的命令收窄为 `collect …` 和不带参数的 `publish`（只读）。`publish --yes` 等会改外部状态的命令照常弹出权限确认，作为第二道保险。

## 4. 验证

- 单元测试：README 标记块（新建 / 追加 / 替换 / 重复运行不变 / 保留其他内容）；检查阶段的各种停止情况（假的 gh）；完整执行流程用本地 bare 仓库代替 GitHub（假的 gh、真的 git），覆盖「新仓库」和「已有仓库再次更新」，再次运行无变化时不提交。
- 真实账号：先只跑检查，确认计划正确，再由用户决定是否执行。
