<p align="center">
  <img src="assets/banner.png" alt="Agent Badges: 3D achievement badges for Claude Code and Codex" width="880" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/agent-badges"><img src="https://img.shields.io/npm/v/agent-badges?color=e8b45a&label=npm" alt="npm version" /></a>
  <a href="https://github.com/Aryous/agent-badges/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Aryous/agent-badges/ci.yml?branch=main&label=CI" alt="CI status" /></a>
  <img src="https://img.shields.io/node/v/agent-badges?color=5b8def" alt="Node.js version" />
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/agent-badges?color=8f8b82" alt="MIT license" /></a>
  <a href="https://aryous.github.io/agent-badges/demo/"><img src="https://img.shields.io/badge/demo-live-e8b45a" alt="Live demo" /></a>
  <a href="https://github.com/Aryous/agent-badges/stargazers"><img src="https://img.shields.io/github/stars/Aryous/agent-badges?style=flat&color=f0eee6" alt="GitHub stars" /></a>
</p>

<p align="center">
  <b>English</b> · <a href="README.zh-CN.md">简体中文</a> · <a href="https://aryous.github.io/agent-badges/">Website</a> · <a href="https://aryous.github.io/agent-badges/demo/">Live demo</a>
</p>

Turn your Claude Code and Codex history into collectible 3D achievement badges, Apple Watch style.

```bash
npx agent-badges
```

One command opens your badge wall. Everything runs on your machine: it reads only timestamps and usage counts from your logs, never your conversations, and uploads nothing ([privacy details](#privacy)).

**Or ask your agent.** [Install the skill](#use-it-in-claude-code-and-codex) in Claude Code or Codex, then say *"check my badges"*.

<p align="center">
  <img src="assets/spin.gif" alt="Three badges spinning: Claude Code First Session, the Agent Badges logo, Codex First Thread" width="720" />
</p>

## What you get

- **62 badges across two tools.** 32 for Claude Code, 30 for Codex: milestones, streaks and habits, features to discover, holidays, and a few hidden ones. Tiered badges level up through bronze, silver and gold (the Token badges add platinum), and the top tier unlocks one of three special designs at random.
- **Real 3D.** Every badge is generated with three.js from a small config: enamel, polished and brushed metal, ceramic, holographic foil, crystal. Drag to spin it, flip it over to read the engraving on the back.
- **A profile.** Unlock ring, total tokens, active days, longest streak, recently earned, and what you are closest to unlocking next.
- **Your year as a heatmap.** Daily token usage on a calendar, both tools overlaid (a day you used both is split in two colors), with a dot on every day you unlocked a badge.
- **Things to share.** Export any badge as a 2048 px PNG (transparent or ink background), generate a poster of your whole wall, or put an achievement card on your GitHub profile.
- **English and Chinese.** The page follows your browser, with a switch in the top bar.

![The badge wall: profile, annual heatmap and the first badges](assets/screenshot-wall.png)

<details>
<summary><b>All badges</b></summary>

**Claude Code**

![All Claude Code badges](assets/gallery-claude-code.png)

**Codex**

![All Codex badges](assets/gallery-codex.png)

Badges shown as `???` are hidden achievements. They reveal themselves when you earn them.

</details>

## Quick start

Requires **Node.js 22.15 or later** (it uses Node's built-in zstd and SQLite). Developed on macOS and tested on Linux in CI; Windows should work but hasn't been tried yet.

```bash
npx agent-badges                    # collect local stats and open your badge wall
npx agent-badges collect            # collect only, print a summary in the terminal
npx agent-badges collect --json     # the same summary as JSON
npx agent-badges export ./my-wall   # a static page you can open offline (contains your stats)
npx agent-badges publish            # put your badges on your GitHub profile (asks first)
npx agent-badges shelf              # your unlocked badges as a PNG for your GitHub profile
npx agent-badges card               # an achievement card SVG for your GitHub profile
```

| Option | |
| --- | --- |
| `--brand claude-code\|codex` | Only one tool |
| `--port <n>` | Local page port (default 4747; the next free one if taken) |
| `--no-open` | Don't open the browser |
| `--json` | Print the summary as JSON (`collect`) |
| `--lang en\|zh` | Language of the summary, the shelf and the card (the summary follows your system by default, the shelf and card default to English) |
| `--out <file>` | Where `shelf` or `card` saves its file |
| `--yes` | `publish`: go ahead without asking (only after you've seen the plan) |
| `--name <name>` | Name on the card and the public badge wall (defaults to your GitHub username) |
| `--theme dark\|light` | Card colors |

| Environment variable | Default |
| --- | --- |
| `AGENT_BADGES_HOME` | `~/.agent-badges` (where the ledger and cache live) |
| `CLAUDE_CONFIG_DIR` | `~/.claude` |
| `CODEX_HOME` | `~/.codex` |

The first run reads every session log you have, which can take a while if you have gigabytes of Codex history. Later runs only read new or changed files.

## Use it in Claude Code and Codex

With the skill installed, just ask in plain words: "check my badges", "what did I just unlock?", or "看看我的徽章". Your agent runs the CLI on your machine and tells you what's new, your totals, and which badges you're closest to.

```text
> check my badges

New since last time: Bash Maniac.
Claude Code: 27 / 32 unlocked.
Almost there: MCP Connector 2 / 3 · Subagent Commander 3 / 5 · 10B Tokens 4.8B / 10B.

Want me to open the 3D badge wall, or make a card for your GitHub profile?
```

<sub>An example reply, made from sample data.</sub>

### Claude Code

```text
/plugin install agent-badges --marketplace Aryous/agent-badges
```

On older versions, add the marketplace first with `/plugin marketplace add Aryous/agent-badges`, then run `/plugin install agent-badges@agent-badges`.

### Codex

```bash
codex plugin marketplace add Aryous/agent-badges
codex plugin add agent-badges@agent-badges
```

To install just the skill without the plugin, ask Codex:

```text
$skill-installer install https://github.com/Aryous/agent-badges/tree/main/skills/badges
```

Start a new Codex session afterwards so it picks up the skill.

### Other agents

The skill is a plain [Agent Skills](https://agentskills.io) folder, [`skills/badges`](skills/badges). Copy it into any agent that reads `SKILL.md` files, or have your agent call the CLI directly and read its [JSON output](#json-output).

### What the skill does

- **Calling it.** Just ask about your badges. To call it by hand, run `/agent-badges:badges` in Claude Code, or type `$` and pick `agent-badges:badges` in Codex (`$badges` if you installed only the skill).
- **What it runs.** `npx -y agent-badges@latest collect --json`. It always uses the latest version on npm, so new badges arrive without reinstalling anything.
- **Permissions.** In Claude Code the skill pre-approves only read-only commands (`collect`, and `publish` without `--yes`); anything that changes something still asks you first. In Codex, commands run in the sandbox; npx needs the network and the CLI writes to `~/.agent-badges`, so Codex usually asks you to approve the command.
- **No guessing.** The agent only reports what the CLI prints and never makes up badges, dates or numbers. Opening the badge wall, making a profile image or exporting a page are offered, not done on its own, and it asks before committing or pushing your profile repository.

### JSON output

For scripts, or for agents without the skill:

```bash
npx agent-badges collect --json --lang en
```

```json
{
  "home": "/Users/you/.agent-badges",
  "brands": [
    {
      "id": "claude-code",
      "brand": "Claude Code",
      "unlocked": 27,
      "total": 32,
      "newUnlocks": [{ "id": "bash-maniac", "title": "Bash Maniac", "earnedAt": "2025-11-19" }],
      "recent": [{ "id": "anniversary", "title": "One Year", "earnedAt": "2026-03-02" }],
      "nearMiss": [{ "id": "tokens", "title": "100M Tokens", "current": 48000000, "target": 100000000 }]
    }
  ]
}
```

- `newUnlocks`: badges earned since the previous run, empty on the first run. Tiered badges also carry `tier` (`bronze`, `silver`, `gold`, `platinum`, or at the top tier the design you got: `ivory-gold`, `onyx-gold`, `sapphire`) and `upgrade: true` when they moved up a tier.
- `recent`: the three most recently earned badges.
- `nearMiss`: up to three badges closest to unlocking.
- A tool that isn't installed is left out. Use `--brand codex` for one tool and `--lang zh` for Chinese titles.

## Show it on your GitHub profile

Ask your agent to "put my badges on my GitHub profile", or run:

```bash
npx agent-badges publish
```

Your profile shows a badge image, and clicking it opens your 3D badge wall on GitHub Pages. See it live: [github.com/Aryous](https://github.com/Aryous) → [aryous.github.io/Aryous](https://aryous.github.io/Aryous/).

It checks everything and prints a plan first. Once you confirm, it:

1. creates your profile repository (`<you>/<you>`, public) if you don't have one;
2. renders your unlocked badges in a browser tab;
3. writes the public badge wall and the image, and adds the image to your README between `<!-- agent-badges:start -->` and `<!-- agent-badges:end -->`. If you already have a profile README, the badges go at the end and nothing else in it changes;
4. commits, pushes, turns on GitHub Pages and waits until the page is live.

Run it again whenever you want to refresh your badges. It keeps its own copy of the repository in `~/.agent-badges/profile/`, so you don't need to clone anything.

**Requires** the [GitHub CLI](https://cli.github.com), signed in with `gh auth login`. Pushes borrow gh's login; your git config is left alone.

**What becomes public:** your unlocked badges and tiers, badge progress and unlock dates, and your daily token counts and turns (the heatmap). The page embeds only what it shows: locked hidden badges are left out, the update time is just a date, and the detailed ledger (hours of the day, tool calls, model names) never leaves your machine. Old versions stay in the repository's git history.

It stops and tells you, without changing anything, if your profile repository is private, GitHub Pages already publishes from somewhere else, or the repository root has an `index.html` it didn't write.

To manage the repository yourself, `npx agent-badges profile path/to/<you>` only writes the image and the page into that folder and prints the README line. Nothing is committed for you.

### Badge image only

```bash
npx agent-badges shelf --out path/to/<you>/agent-badges-shelf.png
```

The 3D badges need WebGL, so this opens a browser tab, draws every badge you've unlocked and saves the result as PNGs. You get two: one for GitHub's dark theme and one for the light theme (`agent-badges-shelf-light.png`). Both have transparent backgrounds; only the text color differs. The image shows unlocked badges with their names and tiers, and no dates or usage numbers. The **GitHub profile image** button on your badge wall makes the same thing.

Reference it like this so visitors see the version that matches their theme:

```html
<picture>
  <source media="(prefers-color-scheme: light)" srcset="./agent-badges-shelf-light.png">
  <img src="./agent-badges-shelf.png" alt="Agent Badges" width="720">
</picture>
```

<p align="center">
  <img src="assets/shelf-example.png" alt="Example badge shelf (sample data)" width="600" />
</p>

### Achievement card

```bash
npx agent-badges card --name "Your Name"
```

This writes `agent-badges-card.svg`: unlock counts, totals, streaks and a grid of recent activity. The card contains numbers only, and it needs no browser, so it also works on a remote machine.

```markdown
![Agent Badges](./agent-badges-card.svg)
```

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="assets/card-light.svg" />
    <img src="assets/card-dark.svg" alt="Example achievement card (sample data)" width="540" />
  </picture>
</p>

## Privacy

Agent Badges reads the logs Claude Code and Codex keep on your machine, so the rules are strict, and every one of them is covered by tests.

- **Local only.** It reads `~/.claude` and `~/.codex` and writes to `~/.agent-badges`. The page is served on `127.0.0.1`, so nothing else on your network can reach it. There are no network calls and no analytics.
- **Metadata only.** Each log line is reduced to an allowlist of fields the moment it is parsed: timestamps, token counts, tool names, mode values. Prompts, code, tool inputs and outputs are dropped immediately and never stored. Names that could hint at what you work on (MCP server names, Codex model names) are hashed; Claude model names are reduced to the family (opus, sonnet, haiku, fable).
- **Files it never opens.** Claude Code: `settings.json`, `.credentials.json`, MCP configs, `history.jsonl`, `shell-snapshots`, `session-env`, `paste-cache`, `file-history`. Codex: `auth.json`, `config.toml`, `*.env`, `history.jsonl`, `transcription-history.jsonl`, `thread_history*.sqlite`, `logs*.sqlite`, `memories*`, `shell_snapshots`, `chatgpt-meetings`.
- **Codex thread index.** `state_*.sqlite` is opened read-only and only six columns are selected (created time, source, thread type, model, reasoning effort, approval mode). Titles, first messages, previews, paths, git info and account ids are never read.
- **What is saved.** `~/.agent-badges` holds a per-day ledger of numbers, dates and hashes, so badges you earned stay earned even after the tools clean up old logs. Files are written to a temporary file first and then swapped in, so an interrupted run never leaves a half-written ledger, and the previous ledger is kept as `<tool>.ledger.json.bak`. If a ledger is ever damaged, the tool says which file it is and how to restore it from that copy, and never overwrites it.
- **Tested.** The test suite plants fake secrets, prompts, paths and thread titles in fake `~/.claude` and `~/.codex` folders, runs the real collector and export, and checks none of them appear in any output.

The public demo and the npm package contain no personal data. Only `export`, `card`, `shelf` and `profile` write files about your usage, and only where you tell them to. `publish` and `profile` make a page that is meant to be public; [Show it on your GitHub profile](#show-it-on-your-github-profile) lists exactly what it contains.

## How badges are counted

| | Claude Code | Codex |
| --- | --- | --- |
| Sessions / threads | Sessions in your Claude Code logs (sub-agent logs excluded) | Threads you started (VS Code, CLI, `exec`); sub-agents and auto-review excluded |
| Tokens | Input + output + cache writes + cache reads (same as ccusage), including sub-agent logs; each message once, with the most complete counts | Input (cache reads included) + output, each response once; history a forked or sub-agent thread copies from its parent counts once |
| Tool calls | Main session only (sub-agent calls excluded) | — |
| Night Owl / Early Bird | Local time of the messages you send (00:00–05:00 / 05:00–07:00) | Local time of the turns you start |
| Marathon | Active time in one session; gaps over 30 minutes don't count | Same |
| Streaks | Consecutive days with any activity | Same |
| Active hours | Time any session was active, merged across sessions (running in parallel counts once); gaps over 30 minutes don't count | Same, for threads you started |
| Past Midnight | One session active before 23:00 and still active after 02:00 the next day, with no gap over 60 minutes in between | Same |
| Productive Day / Multitasker | 20 sessions started in one day / 3 sessions active at the same moment (sub-agents excluded) | Same, for threads you started |
| Perfect Month | Every weekday (Monday to Friday) of a calendar month has activity | Same |
| Dispatches | Sub-agents launched from your main sessions | `spawn_agent` calls in threads you started |
| Web research / File edits | `WebSearch` + `WebFetch` / `Edit` + `MultiEdit` + `Write` + `NotebookEdit` calls, sub-agents included | — |
| Holidays | Any activity on January 1, Lunar New Year, December 25, or Claude Code's launch day (February 24) | Same, with Codex CLI's launch day (April 16) |

Badge definitions live in [`src/brands`](src/brands). Each tool's metrics are in `src/data/<tool>-metrics.js`.

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the dev setup, the project layout, and how to add a badge or a tool.

## Credits

- Ring lettering uses glyphs from [Outfit](https://fonts.google.com/specimen/Outfit) Bold (SIL Open Font License 1.1).
- The Codex mark path comes from [LobeHub Icons](https://github.com/lobehub/lobe-icons) (MIT).
- The Claude Code pixel mascot is redrawn cell by cell from the Claude Code icon in [Simple Icons](https://simpleicons.org/).
- Rendering by [three.js](https://threejs.org/).

## Disclaimer

Agent Badges is an unofficial, non-commercial hobby project. It is not affiliated with, endorsed by, or sponsored by Anthropic or OpenAI. Claude, Claude Code, Codex and related logos are trademarks of their respective owners and are used here only to identify which tool each badge is for. The MIT license covers this project's code and grants no rights to those trademarks.

## License

[MIT](LICENSE) © 2026 Aryous
