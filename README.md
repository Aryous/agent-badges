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

Turn your Claude Code and Codex history into collectible 3D achievement badges, Apple Watch style. Entirely on your machine, nothing uploaded.

```bash
npx agent-badges
```

**Or ask your agent.** Install the [skill for Claude Code or Codex](#ask-your-agent), then say *"check my badges"*.

<p align="center">
  <img src="assets/spin.gif" alt="Three badges spinning: Claude Code First Session, the Agent Badges logo, Codex First Thread" width="720" />
</p>

## What you get

- **39 badges across two tools.** 19 for Claude Code, 20 for Codex: milestones, streaks, features to discover, and a few hidden ones. Tiered badges level up from bronze to platinum.
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

The two `???` in each row are hidden achievements. They reveal themselves when you earn them.

</details>

## Ask your agent

Agent Badges comes with a skill for Claude Code and Codex. Ask in plain words, such as "check my badges", "what did I just unlock?" or "我的徽章". The agent runs the CLI on your machine and tells you what's new, your totals, and what you're closest to.

```text
> check my badges

New since last time: Bash Maniac.
Claude Code: 15 / 19 unlocked.
Almost there: MCP Connector 2 / 3 · Subagent Commander 3 / 5 · 100M Tokens 48M / 100M.

Want me to open the 3D badge wall, or make a card for your GitHub profile?
```

<sub>An example reply, made from sample data.</sub>

### Install

**Claude Code**

```text
/plugin install agent-badges --marketplace Aryous/agent-badges
```

On older versions, add the marketplace first with `/plugin marketplace add Aryous/agent-badges`, then run `/plugin install agent-badges@agent-badges`.

**Codex**

```bash
codex plugin marketplace add Aryous/agent-badges
codex plugin add agent-badges@agent-badges
```

To install just the skill without the plugin, ask Codex:

```text
$skill-installer install https://github.com/Aryous/agent-badges/tree/main/skills/badges
```

Start a new Codex session afterwards so it picks up the skill.

**Other agents**

The skill is a plain [Agent Skills](https://agentskills.io) folder, [`skills/badges`](skills/badges). Copy it into any agent that reads `SKILL.md` files, or have your agent call the CLI directly and read its [JSON output](#json-output).

### How it works

| | Claude Code | Codex |
| --- | --- | --- |
| Use it | Ask about your badges, or run `/agent-badges:badges` | Ask about your badges, or type `$` and pick `agent-badges:badges` (`$badges` if you installed only the skill) |
| What it runs | `npx -y agent-badges@latest collect --json` | The same |
| Permissions | The skill pre-approves `npx -y agent-badges@latest …`. Anything else asks you first. | Commands run in Codex's sandbox. npx needs the network and the CLI writes to `~/.agent-badges`, so Codex usually asks you to approve the command. |

- The agent only reports what the CLI prints. It doesn't make up badges, dates or numbers.
- Opening the badge wall, making a profile image and exporting a page are offered, never run without asking. The agent asks before committing or pushing your profile repository.
- The skill always runs the latest version on npm, so new badges arrive without reinstalling anything. In Claude Code, the pre-approval applies to whichever version is latest.

### JSON output

For scripts, or agents without the skill:

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
      "unlocked": 15,
      "total": 19,
      "newUnlocks": [{ "id": "bash-maniac", "title": "Bash Maniac", "earnedAt": "2025-11-19" }],
      "recent": [{ "id": "anniversary", "title": "One Year", "earnedAt": "2026-03-02" }],
      "nearMiss": [{ "id": "tokens", "title": "100M Tokens", "current": 48000000, "target": 100000000 }]
    }
  ]
}
```

- `newUnlocks`: badges earned since the previous run, empty on the first run. Tiered badges also carry `tier` (`bronze`, `silver`, `gold`, `platinum`) and `upgrade: true` when they moved up a tier.
- `recent`: the three most recently earned badges.
- `nearMiss`: up to three badges closest to unlocking.
- A tool that isn't installed is left out. Use `--brand codex` for one tool and `--lang zh` for Chinese titles.

## Quick start

Requires **Node.js 22.15 or later** (it uses Node's built-in zstd and SQLite). Developed on macOS and tested on Linux in CI; Windows should work but hasn't been tried yet.

```bash
npx agent-badges                    # collect local stats and open your badge wall
npx agent-badges collect            # collect only, print a summary in the terminal
npx agent-badges collect --json     # the same summary as JSON
npx agent-badges export ./my-wall   # a static page you can open offline (contains your stats)
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
| `--theme dark\|light`, `--name` | Card options |

| Environment variable | Default |
| --- | --- |
| `AGENT_BADGES_HOME` | `~/.agent-badges` (where the ledger and cache live) |
| `CLAUDE_CONFIG_DIR` | `~/.claude` |
| `CODEX_HOME` | `~/.codex` |

The first run reads every session log you have, which can take a while if you have gigabytes of Codex history. Later runs only read new or changed files.

## Show it on your GitHub profile

Commit either image to your profile repository (`<you>/<you>`) and reference it from its README. Both are static images, so re-run the command when you want to refresh them. Or ask your agent to "update my GitHub profile badges".

### Badge shelf

```bash
npx agent-badges shelf --out path/to/<you>/agent-badges-shelf.png
```

The 3D badges are rendered with WebGL, so this opens a tab in your browser, renders every badge you have unlocked, hands the PNG back to the terminal and exits. The image has a transparent background and reads on GitHub's light and dark themes. It shows unlocked badges only, with names and tiers: no dates and no usage numbers. You can also make it from the **GitHub profile image** button on your badge wall.

```html
<img src="./agent-badges-shelf.png" alt="Agent Badges" width="720">
```

<p align="center">
  <img src="assets/shelf-example.png" alt="Example badge shelf (sample data)" width="600" />
</p>

### Achievement card

```bash
npx agent-badges card --name "Your Name"
```

This writes `agent-badges-card.svg`: unlock counts, totals, streaks and a grid of recent activity. It needs no browser, so it also works on a remote machine.


```markdown
![Agent Badges](./agent-badges-card.svg)
```

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="assets/card-light.svg" />
    <img src="assets/card-dark.svg" alt="Example achievement card (sample data)" width="540" />
  </picture>
</p>

The card contains numbers only.

## Privacy

It reads the logs your tools already keep on your machine, so the rules are strict and covered by tests.

- **Local only.** It reads `~/.claude` and `~/.codex` and writes to `~/.agent-badges`. The page is served on `127.0.0.1`, so nothing else on your network can reach it. There are no network calls and no analytics.
- **Metadata only.** Each log line is reduced to an allowlist of fields the moment it is parsed: timestamps, token counts, tool names, mode values. Prompts, code, tool inputs and outputs are dropped immediately and never stored. Names that could hint at what you work on (MCP server names, Codex model names) are hashed; Claude model names are reduced to the family (opus, sonnet, haiku, fable).
- **Files it never opens.** Claude Code: `settings.json`, `.credentials.json`, MCP configs, `history.jsonl`, `shell-snapshots`, `session-env`, `paste-cache`, `file-history`. Codex: `auth.json`, `config.toml`, `*.env`, `history.jsonl`, `transcription-history.jsonl`, `thread_history*.sqlite`, `logs*.sqlite`, `memories*`, `shell_snapshots`.
- **Codex thread index.** `state_*.sqlite` is opened read-only and only six columns are selected (created time, source, thread type, model, reasoning effort, approval mode). Titles, first messages, previews, paths, git info and account ids are never read.
- **What is saved.** `~/.agent-badges` holds a per-day ledger of numbers, dates and hashes, so badges you earned stay earned even after the tools clean up old logs.
- **Tested.** The test suite plants fake secrets, prompts, paths and thread titles in fake `~/.claude` and `~/.codex` folders, runs the real collector and export, and checks none of them appear in any output.

The public demo and the npm package contain no personal data. Only `export`, `card` and `shelf` write files about your usage, and only where you tell them to.

## How badges are counted

| | Claude Code | Codex |
| --- | --- | --- |
| Sessions / threads | Sessions in your Claude Code logs (sub-agent logs excluded) | Threads you started (VS Code, CLI, `exec`); sub-agents and auto-review excluded |
| Tokens | Input + output + cache writes (cache reads excluded), each message once | Uncached input + output, each response once |
| Night Owl / Early Bird | Local time of the messages you send (00:00–05:00 / 05:00–07:00) | Local time of the turns you start |
| Marathon | Active time in one session; gaps over 30 minutes don't count | Same |
| Streaks | Consecutive days with any activity | Same |

Badge definitions live in [`src/brands`](src/brands). Each tool's metrics are in `src/data/<tool>-metrics.js`.

## Development

```bash
npm install
npm run collect          # collect local data into ~/.agent-badges (the dev server injects it)
npm run dev              # http://localhost:5173 (the badge wall)
npm test                 # unit tests and CLI end-to-end tests
npm run build            # dist/index.html, a single file with no personal data
npm run build:site       # dist-site/: the landing page plus the demo (sample data)
npm run check:pack       # pack, install into a temp folder, and run the CLI
```

Browser checks need a running dev server (`npx vite --port 5199`) and Google Chrome: `npm run check:browser` for the wall, `npm run check:site` for the built site. `node scripts/assets.mjs` regenerates the images in this README from sample data.

Useful URL parameters on the wall: `?source=mock` (sample data), `?lang=en|zh`, `?brand=codex`, `#<badge-id>` (open a badge), `?preview=unlocked&tier=2` (preview every badge unlocked at a given tier).

```
src/
├─ engine/    badge engine: shapes, materials, relief, text, tiers (no brand knowledge)
├─ brands/    one folder per tool: palette, badge configs, English text
├─ data/      metrics, daily series, mock data
├─ collect/   local collectors, summary, achievement card (used by the CLI)
├─ viewer/    stage, wall, inspector, heatmap, poster, export
├─ site/      landing page
└─ project/   the Agent Badges logo and the asset studio
bin/          the CLI
skills/       the agent skill, shared by Claude Code and Codex
.claude-plugin/              Claude Code plugin and marketplace
plugin.json, .agents/plugins/  Codex plugin and marketplace
```

### Adding a badge

Add a config to the right series file in `src/brands/<tool>/series/` and its English text to `src/brands/<tool>/en.js`. No engine changes needed.

- **Shapes:** `circle` (optionally with a reeded edge), `polygon`, `starburst`, `shield`, `gear`
- **Materials:** `enamel`, `polished-metal`, `brushed-metal`, `ceramic`, `anodized`, `holographic`, `crystal`
- **Relief:** `capsule`, `circle`, `ring`, `pixels` (ASCII art), `text-arc`, `text`, `gem`, `path` (SVG)
- **Tiers:** `tiers: [{ threshold, metal, label, accent? }]`, then use `'$metal'`, `'$accent'` and `'{label}'` in the design
- **Hidden:** `hidden: true` shows a pixel question mark until it is earned

Configs are validated at startup, and mistakes show up on the page in dev mode.

### Adding a tool

Create `src/brands/<id>/` (palette, helpers, badges, `en.js`), register it in `src/brands/index.js`, add a data source and sample data in `src/data/progress.js`, and write a collector in `src/collect/` with a leak test. Pull requests welcome.

## Credits

- Ring lettering uses glyphs from [Outfit](https://fonts.google.com/specimen/Outfit) Bold (SIL Open Font License 1.1).
- The Codex mark path comes from [LobeHub Icons](https://github.com/lobehub/lobe-icons) (MIT).
- The Claude Code pixel mascot is redrawn cell by cell from the Claude Code icon in [Simple Icons](https://simpleicons.org/).
- Rendering by [three.js](https://threejs.org/).

## Disclaimer

Agent Badges is an unofficial, non-commercial hobby project. It is not affiliated with, endorsed by, or sponsored by Anthropic or OpenAI. Claude, Claude Code, Codex and related logos are trademarks of their respective owners and are used here only to identify which tool each badge is for. The MIT license covers this project's code and grants no rights to those trademarks.

## License

[MIT](LICENSE) © 2026 Aryous
