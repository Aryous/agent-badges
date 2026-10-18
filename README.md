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

Turn your Claude Code and Codex history into collectible 3D achievement badges, Apple Watch style. One command, entirely on your machine, nothing uploaded.

```bash
npx agent-badges
```

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

## Quick start

Requires **Node.js 22.15 or later** (it uses Node's built-in zstd and SQLite). Developed on macOS and tested on Linux in CI; Windows should work but hasn't been tried yet.

```bash
npx agent-badges                    # collect local stats and open your badge wall
npx agent-badges collect            # collect only, print a summary in the terminal
npx agent-badges collect --json     # the same summary as JSON
npx agent-badges export ./my-wall   # a static page you can open offline (contains your stats)
npx agent-badges card               # an achievement card SVG for your GitHub profile
```

| Option | |
| --- | --- |
| `--brand claude-code\|codex` | Only one tool |
| `--port <n>` | Local page port (default 4747; the next free one if taken) |
| `--no-open` | Don't open the browser |
| `--out`, `--theme dark\|light`, `--name`, `--lang en\|zh` | Card options |

| Environment variable | Default |
| --- | --- |
| `AGENT_BADGES_HOME` | `~/.agent-badges` (where the ledger and cache live) |
| `CLAUDE_CONFIG_DIR` | `~/.claude` |
| `CODEX_HOME` | `~/.codex` |

The first run reads every session log you have, which can take a while if you have gigabytes of Codex history. Later runs only read new or changed files.

## Achievement card for your GitHub profile

```bash
npx agent-badges card --name "Your Name"
```

This writes `agent-badges-card.svg`: unlock counts, totals, streaks and a grid of recent activity. Commit it to your profile repository (`<you>/<you>`) and add it to the README:

```markdown
![Agent Badges](./agent-badges-card.svg)
```

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="assets/card-light.svg" />
    <img src="assets/card-dark.svg" alt="Example achievement card (sample data)" width="540" />
  </picture>
</p>

The card contains numbers only. Re-run the command whenever you want to refresh it.

## Privacy

It reads the logs your tools already keep on your machine, so the rules are strict and covered by tests.

- **Local only.** It reads `~/.claude` and `~/.codex` and writes to `~/.agent-badges`. The page is served on `127.0.0.1`, so nothing else on your network can reach it. There are no network calls and no analytics.
- **Metadata only.** Each log line is reduced to an allowlist of fields the moment it is parsed: timestamps, token counts, tool names, mode values. Prompts, code, tool inputs and outputs are dropped immediately and never stored. Names that could hint at what you work on (MCP server names, Codex model names) are hashed; Claude model names are reduced to the family (opus, sonnet, haiku, fable).
- **Files it never opens.** Claude Code: `settings.json`, `.credentials.json`, MCP configs, `history.jsonl`, `shell-snapshots`, `session-env`, `paste-cache`, `file-history`. Codex: `auth.json`, `config.toml`, `*.env`, `history.jsonl`, `transcription-history.jsonl`, `thread_history*.sqlite`, `logs*.sqlite`, `memories*`, `shell_snapshots`.
- **Codex thread index.** `state_*.sqlite` is opened read-only and only six columns are selected (created time, source, thread type, model, reasoning effort, approval mode). Titles, first messages, previews, paths, git info and account ids are never read.
- **What is saved.** `~/.agent-badges` holds a per-day ledger of numbers, dates and hashes, so badges you earned stay earned even after the tools clean up old logs.
- **Tested.** The test suite plants fake secrets, prompts, paths and thread titles in fake `~/.claude` and `~/.codex` folders, runs the real collector and export, and checks none of them appear in any output.

The public demo and the npm package contain no personal data. Only `export` and `card` write files with your numbers in them, and only where you tell them to.

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
