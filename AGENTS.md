# AGENTS.md

agent-badges turns local Claude Code and Codex usage metadata into Apple-Watch-style 3D achievement badges (three.js). It ships as an npm CLI (`npx agent-badges`, zero runtime dependencies) plus a Claude Code / Codex plugin. Offline; nothing is uploaded unless the user runs `publish`, and the only other network use is the opt-in avatar download (`avatar`, asks first, never in non-TTY runs).

Docs and code are one thing: every contract below is enforced by a test. If you change a contract, change the test and this file in the same commit. Human-facing details live in [CONTRIBUTING.md](CONTRIBUTING.md); [README.md](README.md) is for users only.

## Commands

| Command | What it checks |
| --- | --- |
| `npm test` | Vitest: unit, CLI end-to-end, contract and docs tests (`tests/**/*.test.js`) |
| `npm run build` | `dist/index.html`, the single-file wall the CLI serves (no personal data) |
| `npm run check:pack` | `npm pack`, install into a temp dir, run the CLI (catches files missing from `files`) |
| `npm run check:shelf` | `shelf` / `profile` end to end with fake logs and a real browser (run `build` first) |
| `npm run check:browser` | Real-browser run on sample data (`source=mock`): every badge on both walls gets a thumbnail, open/close, drag snapping and PNG export on a few badges, profile heatmap, the proof set's 3D month medals (hover, pop-out and fly-back), filters, share poster, phone overflow, no console errors; saves screenshots of the walls. Does not screenshot every badge front and back (use `peek.mjs`). Needs `npx vite --port 5199` running and Google Chrome (found automatically; `CHROME_PATH` overrides, `CHROME_GL=software` reproduces CI) |
| `npm run build:site` then `npm run check:site` | GitHub Pages site (landing + demo): renders, no horizontal overflow on phones, demo has sample data only |
| `node scripts/peek.mjs <url> <out.png> [badge-id] [angle\|hold:angle]` | One-off screenshot of a badge while designing |
| `node scripts/bench-inspector.mjs [url] [badge-id...]` | What the inspector costs once a badge has settled: frames, renders and draw calls per second, main-thread and GPU-process time. Defaults to the 5199 dev server, `first-session` (renders stop once supersampling converges) and `bash-maniac` (breathing glow, keeps rendering) |

`npm run dev` serves the wall on :5173 with data from `~/.agent-badges` (`npm run collect` fills it). Wall URL params: `?source=mock`, `?lang=en|zh`, `?brand=<tool>`, `#<badge-id>`, `?preview=unlocked&tier=N`.

CI runs `check:browser` and `check:site` on Linux with software rendering; `scripts/visual.mjs` compares pixels, needs a real GPU and runs only locally.

## Map

| Path | Owns | May import |
| --- | --- | --- |
| `src/engine/` | Badge rendering: shapes, materials, relief, text, tier resolution, config validation (`validate.js`), layout checks (`layout.js`). No brand knowledge | engine, three, json |
| `src/brands/` | Tool registry (`index.js`: `BRANDS`, `BRAND_IDS`, `brandById`, `getBrand`, `DEFAULT_BRAND`); per tool: `brand.js` (palette, `launchDate`), one file per badge under `milestones/ habits/ features/ limited/`; `shared/` medal layout, parts, top-tier designs, display states (`display-states.js`) | brands (Node built-ins only) |
| `src/data/` | Per-tool metrics (`<tool>-metrics.js`: fact extraction, `aggregateDays`, `mergeLedger`, `RULES`, `computeProgress`), shared rules and `createComputeProgress` (`metrics-common.js`), ledger normalization, daily series, tiers, sample data (`mock-<tool>.js`), `progress.js` (`DATA_SOURCES`, page data loading) | data, brands (Node built-ins only) |
| `src/collect/` | Local collectors (`<tool>.js`: `BRAND_ID`, `TURNS_FIELD`, `collect()`), `COLLECTORS`, the data home and ledger files (`common.js`). Pure logic: no `console.`, no i18n import (guarded) | collect, data, brands (Node built-ins only) |
| `src/share/` | Sharing what was collected: achievement card SVG (`card.js`), public page data (`public.js`), data injection into pages (`inject.js`), `publish` to GitHub (`publish.js`), the shelf image the page hands back (`receive.js`), the opt-in avatar and identity for the poster (`identity.js`). Same rules as `collect/` | share, collect, data, brands (Node built-ins only) |
| `src/cli/` | Argument parsing and help (`args.js`, every flag literal), terminal summary (`summary.js`: `BRAND_INFO`), page HTML (`page.js`), terminal output and i18n, local HTTP server, commands (`commands/*.js`) | cli, share, collect, data, brands (Node built-ins only) |
| `src/viewer/` | Browser UI parts: stage, grid/wall, inspector, heatmap, poster, shelf, profile, i18n, describe, mount-badge, badge-renderer, snapshot, export | viewer, engine, data, brands, three |
| `src/app/` | The wall page split into panels (context, load, topbar, overview, wall, inspect, export, poster, shelf, loop, `window.__badgeApp` automation). Panels talk via `ctx.emit`, not imports | anything (entry layer) |
| `src/site/` | Landing page (`main.js`, `strings.js`, `site.css`) | anything (entry layer) |
| `src/project/` | The Agent Badges logo (`logo.js`) | anything (entry layer) |
| `src/styles/` | Wall CSS by component; `src/style.css` `@import`s them in order | CSS only |
| `src/main.js`, `src/style.css` | Wall page composer and the CSS entry | anything (entry layer) |
| `bin/` | `agent-badges.mjs`, a thin entry into `src/cli/main.js` (relative imports only into `src/cli/`, guarded) | cli |
| `tools/` | Dev-only pages: `studio.html` and `studio/main.js` (asset studio) | anything (entry layer) |
| `scripts/` | Build, check, screenshot and asset scripts (`*.mjs`, run by hand or npm scripts) | anything |
| `skills/` | The user-facing `badges` skill, shipped with the plugin. Don't move it | — |
| `.agents/skills/` | Contributor skills for this repo (`add-badge`); `.claude/skills/` links here | — |
| `.claude-plugin/`, `plugin.json`, `.agents/plugins/` | Claude Code and Codex plugin manifests and marketplaces. Don't move them | — |

## Contracts

1. One tool list: `src/brands/index.js`. `COLLECTORS`, `DATA_SOURCES` and `BRAND_INFO` have exactly the same ids; every brand has `launchDate`; every collector exports `TURNS_FIELD` — `tests/contracts.test.js`
2. No hand-written tool ids (`'claude-code'`, `'codex'`) in `src/`, `bin/`, `vite.config.js` outside tool-specific files (`brands/<id>/`, `collect/<id>.js`, `data/<id>-metrics.js`, `data/mock-<id>.js`, `brands/index.js`) and files marked `// showcase` — `tests/contracts.test.js`
3. Showcase lists (`{ brand, id }` in the site and `scripts/`) name badges that exist — `tests/contracts.test.js`
4. Every badge has exactly one rule: `Object.keys(RULES)` equals the brand's badge ids, and `computeProgress` handles an empty ledger — `tests/contracts.test.js`
5. Thresholds live only in the badge config (`criteria.target` / `tiers`). Rules read them; unlocking follows the config; the zh and en descriptions state the configured number — `tests/contracts.test.js`
6. `criteria` is `{ target, unit?, dynamic? }` for one-time badges; tiered badges have no `criteria` — `tests/contracts.test.js`, `tests/validate.test.js`
7. Layering follows the Map's "May import" column; brands, data, collect, share and cli use only `node:` built-ins — `tests/contracts.test.js`
8. The CLI loads only files listed in `package.json` `files`, with no third-party packages (no three) — `tests/package-files.test.js`
9. Every badge config validates and assembles — `tests/validate.test.js`, `tests/badge.test.js`
10. Design principles 1–2 (edge line follows the outline; 6% breathing room) hold for every badge except the pending `LEGACY` list — `tests/layout.test.js`
11. Collected data holds only counts, dates and hashes: planted secrets, prompts, paths and titles never reach the ledger, cache or export — `tests/claude-code-metrics.test.js`, `tests/codex-metrics.test.js`, `tests/cli.test.js`
12. Claude Code: only main-session and sub-agent transcripts are read — `tests/claude-code-files.test.js`
13. The public profile page embeds only what it shows (no locked hidden badges, date-only update time) — `tests/profile.test.js`
14. Plugin manifests match `package.json` (name, version); the skill's commands are pre-approved and its CLI flags exist — `tests/plugin.test.js`
15. `src/collect/` and `src/share/` have no `console.` and no i18n import; `src/app/` does not import `src/share/`; `bin/` imports only `src/cli/` — `tests/contracts.test.js`
16. Docs match the code: this Map lists every `src/` dir, cited tests exist, README badge counts (the exact count sentence), tool birthdays and `tier` values match the registry, and README anchors linked from the READMEs, landing page and skill exist — `tests/docs.test.js`
17. Badges with the same outline share body geometry. Shared geometry and textures carry `userData.shared`; free a badge only with `disposeBadge` (`src/engine/badge.js`), which keeps shared resources; the wall builds badges with a shared placeholder engraving and generates the real one only while a badge is open — `tests/badge.test.js`. Relief `segments` / `share` (geometry budget for tiny repeated pieces) are opt-in and unused on the wall; `disposeBadge` frees each geometry and material once — `tests/relief-budget.test.js`
18. Badge images are made through `createBadgeRenderer` (`src/viewer/badge-renderer.js`); the only other `renderBadgePNG` caller is the export panel, which captures the badge being inspected — `tests/contracts.test.js`. The display states for the landing page and studio are `peakState` / `surpriseKeptState` in `src/brands/shared/display-states.js` — `tests/display-states.test.js`

## Workflows

- **Add a badge:** use the `add-badge` skill (`.agents/skills/add-badge/SKILL.md`). In short: badge file in `src/brands/<tool>/<series>/<id>.js` → line in the series `index.js` → rule in `src/data/<tool>-metrics.js` `RULES` → sample data in `src/data/mock-<tool>.js` → human design review → checks. Update the README counts (the docs test fails until you do).
- **Add a tool:** follow CONTRIBUTING.md › Adding a tool. Every per-tool table is listed there; `tests/contracts.test.js` fails until all of them have the new id.
- **Release:** bump the version in `package.json`, `package-lock.json` (two places), `plugin.json`, `.claude-plugin/plugin.json`; commit `release: X.Y.Z — summary`; tag `vX.Y.Z`; push branch and tag. `.github/workflows/release.yml` publishes to npm with provenance. Never run `npm publish` by hand.

Which checks to run:

| Change | Run |
| --- | --- |
| Any change | `npm test` |
| Badge config, engine, materials | + `npm run build`, `npm run check:browser`, `peek.mjs` screenshots for review |
| Wall UI (`src/app/`, `src/viewer/`, `src/styles/`) | + `npm run build`, `npm run check:browser` |
| CLI, collectors, sharing (`src/share/`), `package.json` `files` | + `npm run build`, `npm run check:pack` |
| `shelf`, `profile`, `publish` | + `npm run build`, `npm run check:shelf` |
| Landing page (`src/site/`, `landing.html`) | + `npm run build:site`, `npm run check:site` |
| Refactors that must not change how anything looks (engine, `src/viewer/`, rendering) | + `node scripts/visual.mjs capture <dir>` before and after (dev server on 5199, same day), then `node scripts/visual.mjs compare <before> <after>`: any differing pixel fails |

## Data boundary

- Keeps only tool names, event types, timestamps, token counts and mode values: each log line is reduced to an allowlist the moment it is parsed.
- Conversation text, command arguments and output, file paths and file contents are dropped at parse time and never stored, logged or printed. MCP server names and Codex model names are hashed; Claude model names keep only the family.
- Never opens (also when debugging on a real machine). Claude Code, under `~/.claude`: `settings.json`, `.credentials.json`, MCP configs, `history.jsonl`, `shell-snapshots`, `session-env`, `paste-cache`, `file-history`. Codex, under `~/.codex`: `auth.json`, `config.toml`, `*.env`, `history.jsonl`, `transcription-history.jsonl`, `thread_history*.sqlite`, `logs*.sqlite`, `memories*`, `shell_snapshots`, `chatgpt-meetings`. Also the CC Switch database. (`src/collect/claude-code.js` and `codex.js` header comments list the same `~/.claude` / `~/.codex` files, not the CC Switch database; keep README Privacy in sync.)
- Codex `state_*.sqlite` is opened read-only and only six columns are selected (created time, source, thread type, model, reasoning effort, approval mode).
- Writes only to `~/.agent-badges` (or `AGENT_BADGES_HOME`), plus the output of `export`, `card`, `shelf` and `profile`. Files are written to a temp file and renamed into place; ledgers keep the previous version as `<tool>.ledger.json.bak`, and a corrupt ledger is never overwritten. If any tool fails to collect, `card`, `shelf`, `profile` and `publish` stop instead of sharing a result without it (`tests/storage.test.js`). A new ledger field needs a privacy review and a leak-test case.

## House rules

- Behavior is part of the contract: badge looks, counts, CLI output and the `window.__badgeApp` API don't change in a refactor.
- Code comments and test names are in Chinese. README has English and Chinese versions, kept in sync. AGENTS.md, CONTRIBUTING.md and skills are English only.
- Commit at each verified milestone; don't wait to be asked. Never commit videos: promo output stays in `promo-out/` (git-ignored).
- Don't move `.claude-plugin/`, `plugin.json`, `.agents/plugins/` or `skills/`: installed users depend on those paths.
