---
name: badges
description: Check the user's Claude Code and Codex achievement badges with the agent-badges CLI — badges just unlocked, badges almost unlocked, and totals. Use when the user asks about their badges, achievements, streaks or usage milestones ("check my badges", "what did I unlock", "how close am I to 100M tokens", "我的徽章", "解锁了什么"). Can also open the 3D badge wall, or put the user's badges on their GitHub profile with a public badge wall ("update my GitHub profile badges", "更新主页徽章"). Not for designing badges or editing this project's code.
license: MIT
compatibility: Requires Node.js 22.15+ and network access the first time (npx downloads the agent-badges package from npm). Works in Claude Code, Codex and other agents that can run shell commands.
allowed-tools: Bash(npx -y agent-badges@latest *)
---

# Agent Badges

[agent-badges](https://github.com/Aryous/agent-badges) turns local Claude Code and Codex logs into achievement badges. It runs entirely on this machine and reads metadata only (timestamps, token counts, tool names). It never reads prompts, code, command output or credentials, and it uploads nothing.

## Check badges

Run this exactly, with `--lang zh` if the user writes in Chinese and `--lang en` otherwise:

```bash
npx -y agent-badges@latest collect --json --lang en
```

Add `--brand claude-code` or `--brand codex` if the user only asks about one tool.

- Requires Node.js 22.15 or later. If it fails with a Node version error, tell the user to upgrade Node and stop.
- The first run reads all session logs and can take a minute on large Codex histories. Later runs are fast.
- **Sandboxed agents (such as Codex):** the command needs network access (npx downloads the package) and writes its ledger to `~/.agent-badges`, outside the workspace. If the sandbox blocks it, request escalated permissions for this exact command and say why in one line; don't try workarounds.
- Output is JSON: `{ home, brands: [{ id, brand, unlocked, total, newUnlocks, recent, nearMiss }] }`. A tool that isn't installed is simply absent.
  - `newUnlocks`: earned since the last run, `[{ id, title, earnedAt, tier?, upgrade? }]`. `upgrade: true` means a tiered badge moved up (for example bronze → silver). It is empty on the very first run.
  - `recent`: the three most recently earned badges, `[{ id, title, earnedAt }]`.
  - `nearMiss`: up to three badges closest to unlocking, `[{ id, title, current, target }]`.

## Report

Keep it short: a few lines per tool, in the user's language.

1. If anything is in `newUnlocks`, lead with it and congratulate briefly. Name the tier for upgrades.
2. Then `unlocked / total` for each tool.
3. Then `nearMiss` with progress, for example "10K Tool Calls — 8,667 / 10,000". Round large numbers (59.8M).
4. If there are no new unlocks, mention `recent` in one line instead.

Only report what the JSON contains. Do not invent badges, dates or numbers. Hidden badges are never listed until earned; don't speculate about them.

Then offer one of these, without running them unasked:

- **Open the 3D badge wall:** `npx -y agent-badges@latest`. It starts a local server on 127.0.0.1 and keeps running until stopped, so run it in the background and give the user the URL it prints.
- **GitHub profile:** see below.
- **Offline copy:** `npx -y agent-badges@latest export ./my-wall`. Mention that this file contains the user's stats.

## GitHub profile

When the user wants their badges on their GitHub profile:

1. Ask where their profile repository is checked out (the repo named after their username, `<user>/<user>`) unless they already said. Don't guess or search their disk.
2. Ask which they want, unless it's already clear:
   - **Image + public badge wall (default):** the README image links to their 3D badge wall on GitHub Pages.
   - **Image only:** just the PNG, nothing else made public.
3. Run one of these, adding `--lang zh` only if they want Chinese labels on the image:

   ```bash
   npx -y agent-badges@latest profile <profile-repo>
   npx -y agent-badges@latest shelf --out <profile-repo>/agent-badges-shelf.png
   ```

   Both open a tab in the user's browser, render their unlocked badges with WebGL and save a transparent PNG (up to two minutes). Tell the user a browser tab will open. `profile` also writes `<profile-repo>/index.html`, the public badge wall. In a sandbox they need to listen on 127.0.0.1 and write outside the workspace; request escalation for this exact command.
   With no desktop browser (a remote machine), offer the numbers-only card instead: `npx -y agent-badges@latest card --out <profile-repo>/agent-badges-card.svg`.
4. **Before the badge wall goes public for the first time,** tell the user in one or two lines what it publishes: daily token counts and turns (the heatmap), badge progress and unlock dates. Old versions stay in git history after they push. Locked hidden badges and anything beyond what the page shows are left out.
5. Tell the user the README line the CLI printed: for `profile`, the image wrapped in a link to their GitHub Pages URL; for `shelf`, the image alone.
6. **Ask before committing or pushing** the profile repository, and before turning on GitHub Pages (the CLI prints a `gh api` command for it). Never do any of these unasked.

To refresh later, run the same command again, then commit and push.

## Privacy questions

Data stays in `~/.agent-badges` (override with `AGENT_BADGES_HOME`). The README's Privacy section lists every file it reads and every file it never opens: https://github.com/Aryous/agent-badges#privacy
