---
name: badges
description: Check the user's Claude Code and Codex achievement badges with the agent-badges CLI — badges just unlocked, badges almost unlocked, and totals. Use when the user asks about their badges, achievements, streaks or usage milestones ("check my badges", "what did I unlock", "how close am I to 100M tokens", "我的徽章", "解锁了什么"). Can also open the 3D badge wall, or put the user's badges on their GitHub profile with a public badge wall ("update my GitHub profile badges", "更新主页徽章"). Not for designing badges or editing this project's code.
license: MIT
compatibility: Requires Node.js 22.15+ and network access the first time (npx downloads the agent-badges package from npm). Works in Claude Code, Codex and other agents that can run shell commands.
allowed-tools: Bash(npx -y agent-badges@latest collect *) Bash(npx -y agent-badges@latest publish)
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
- Output is JSON: `{ home, brands: [{ id, brand, unlocked, total, newUnlocks, recent, nearMiss }], failed }`. A tool that isn't installed is simply absent.
  - `newUnlocks`: earned since the last run, `[{ id, title, earnedAt, tier?, upgrade? }]`. `upgrade: true` means a tiered badge moved up (for example bronze → silver). It is empty on the very first run.
  - `recent`: the three most recently earned badges, `[{ id, title, earnedAt }]`.
  - `nearMiss`: up to three badges closest to unlocking, `[{ id, title, current, target }]`.
  - `failed`: ids of tools that couldn't be collected this run (for example a damaged ledger). Tell the user which tool and relay the message the command printed on stderr, including any restore command; don't run it for them.

## Report

Keep it short: a few lines per tool, in the user's language.

1. If anything is in `newUnlocks`, lead with it and congratulate briefly. Name the tier for upgrades.
2. Then `unlocked / total` for each tool.
3. Then `nearMiss` with progress, for example "10K Tool Calls — 8.7K / 10K". Round large numbers (59.8M).
4. If there are no new unlocks, mention `recent` in one line instead.

Only report what the JSON contains. Do not invent badges, dates or numbers. Hidden badges are never listed until earned; don't speculate about them.

Then offer one of these, without running them unasked:

- **Open the 3D badge wall:** `npx -y agent-badges@latest`. It starts a local server on 127.0.0.1 and keeps running until stopped, so run it in the background and give the user the URL it prints.
- **GitHub profile:** see below.
- **Offline copy:** `npx -y agent-badges@latest export ./my-wall`. Mention that this file contains the user's stats.

## GitHub profile

When the user wants their badges on their GitHub profile ("put my badges on my GitHub profile", "update my profile badges"), use `publish`. It does everything: finds or creates their `<user>/<user>` repository, renders the badge image, writes a public 3D badge wall, updates only its own block in the README, commits, pushes, turns on GitHub Pages and waits until the page is live. Don't edit the README, commit or push by hand.

1. Check first. This only reads; it changes nothing:

   ```bash
   npx -y agent-badges@latest publish
   ```

   It prints a plan: account, repository (new or existing), what happens to the README, the page URL, and what becomes public. Relay the plan to the user in a few lines, including what becomes public: unlocked badges and tiers, badge progress and unlock dates, and daily token counts and turns (the heatmap). Old versions stay in git history. Prompts, code, paths, hours of the day and model or tool names are never published.
2. Only if the user agrees, run it for real. Mention that a browser tab will open to render the badges:

   ```bash
   npx -y agent-badges@latest publish --yes
   ```

   Add `--lang zh` only if they want Chinese labels on the image. It takes a minute or two, most of it waiting for GitHub Pages.
3. Give the user both links it prints: their profile, and the badge wall the image opens.

If it stops:

- **gh missing or not signed in:** tell the user to install the GitHub CLI (https://cli.github.com) and run `gh auth login` themselves (in Claude Code they can type `! gh auth login`). Don't try to work around it.
- **Private repository, GitHub Pages publishing from elsewhere, or an existing `index.html`:** explain the message. Don't change their settings. Offer the image only instead (below).
- **A tool couldn't be collected:** `card`, `shelf`, `profile` and `publish` refuse to run so a result missing that tool never replaces a complete one. Relay the message printed above it (it names the file and how to restore it) and let the user fix it first.
- **Sandbox (Codex):** it needs the network, `gh`, git and a browser tab on 127.0.0.1. Request escalation for this exact command.

Image only, no public page: `npx -y agent-badges@latest shelf --out <path>/agent-badges-shelf.png`. With no desktop browser (a remote machine), offer the numbers-only card: `npx -y agent-badges@latest card --out <path>/agent-badges-card.svg`. Ask the user where to save, and ask before committing or pushing anything.

## Privacy questions

Data stays in `~/.agent-badges` (override with `AGENT_BADGES_HOME`). The README's Privacy section lists every file it reads and every file it never opens: https://github.com/Aryous/agent-badges#privacy
