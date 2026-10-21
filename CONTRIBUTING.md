# Contributing to agent-badges

Thanks for helping. This file is for people working on the code; [README.md](README.md) is for people using the tool, and [AGENTS.md](AGENTS.md) is the dense version of this file for AI agents (it lists every project contract and the test that enforces it).

The project has one rule above the others: the docs and the code are one thing. Anything a doc states is checked by a test, so if you change behavior, update the doc and the test together.

## Setup and commands

Requires Node.js 22.15 or later. Browser checks also need Google Chrome.

```bash
npm install
npm run collect          # collect local data into ~/.agent-badges (the dev server injects it)
npm run dev              # http://localhost:5173 (the badge wall)
npm test                 # unit, CLI end-to-end, contract and docs tests
npm run build            # dist/index.html, a single file with no personal data
npm run build:site       # dist-site/: the landing page plus the demo (sample data)
npm run check:pack       # pack, install into a temp folder, and run the CLI
npm run check:shelf      # shelf / profile end to end with fake logs (run build first)
```

Browser checks:

- `npm run check:browser` drives the app in a real browser on sample data: every badge on both walls gets a thumbnail, plus drag snapping, PNG export, the profile view and phone layout, with no console errors. It saves screenshots of the walls, not of every badge (use `peek.mjs` for those). Start the dev server on port 5199 first: `npx vite --port 5199`.
- `npm run check:site` checks the built site (run `npm run build:site` first; it serves `dist-site/` itself).
- `node scripts/assets.mjs` regenerates the README and landing-page images from sample data (dev server on 5199).

Useful URL parameters on the wall: `?source=mock` (sample data), `?lang=en|zh`, `?brand=codex`, `#<badge-id>` (open a badge), `?preview=unlocked&tier=2` (preview every badge unlocked at a given tier). Dev-only pages: `/tools/studio.html` (asset studio) and `/tools/promo.html` (promo animation).

## Project layout

```
src/
├─ engine/    badge engine: shapes, materials, relief, text, tiers, validation (no brand knowledge)
├─ brands/    the tool registry (index.js) and one folder per tool: palette, launch date,
│             one file per badge grouped by series
├─ data/      per-tool metrics and rules, shared rules, normalization, daily series, sample data
├─ collect/   local collectors, summary, achievement card, public page, publish (used by the CLI)
├─ cli/       argument parsing and help, terminal output, local server, commands/
├─ viewer/    stage, wall, inspector, heatmap, poster, shelf, i18n, snapshot and export
├─ app/       the wall page, one module per panel; src/main.js composes them
├─ styles/    wall CSS by component; src/style.css imports them in order
├─ site/      landing page
└─ project/   the Agent Badges logo and the asset studio
bin/          the CLI entry (thin wrapper around src/cli/main.js)
tools/        dev-only pages: studio.html, promo.html, promo/
scripts/      build, check, screenshot, asset and promo scripts
tests/        Vitest suites, including contracts.test.js and docs.test.js
skills/       the user-facing agent skill, shipped with the plugin
.agents/skills/              contributor skills for this repo (add-badge); .claude/skills/ links here
.claude-plugin/              Claude Code plugin and marketplace
plugin.json, .agents/plugins/  Codex plugin and marketplace
```

Layers only import downward: `engine` stands alone, `brands` imports nothing else, `data` reads `brands`, `collect` and `cli` build on those, `viewer` adds `engine` and three.js. `app`, `site`, `project` and `tools` are entry points and may import anything. The CLI side (`brands`, `data`, `collect`, `cli`) uses only Node built-ins, and the npm package ships only what `package.json` `files` lists. `tests/contracts.test.js` and `tests/package-files.test.js` enforce this.

## Extending agent-badges

### Adding a badge

The [`add-badge` skill](.agents/skills/add-badge/SKILL.md) walks through this step by step (agents pick it up automatically). In short:

1. **Badge file:** `src/brands/<tool>/<series>/<badge-id>.js` holds its config, its own pixel art and its text (`title`/`description` in Chinese, `en` in English).
2. **Series index:** add one line to the series' `index.js`; that order is the order on the wall.
3. **Rule:** add `'<badge-id>': (ctx, badge) => …` to `RULES` in `src/data/<tool>-metrics.js` (or to `COMMON_RULES` in `src/data/metrics-common.js` when both tools have the badge). Read the threshold from `badge.criteria.target` or `badge.tiers`; never write the number in the rule. One-time badges use `criteria: { target, unit?, dynamic? }`; tiered badges put thresholds in `tiers` and have no `criteria`.
4. **Sample data:** add an entry to `src/data/mock-<tool>.js` so the demo shows it (`target` can be left out).
5. **Review and checks:** screenshot it, get a human design review, run the checks below, and update the counts in both READMEs.

### Building blocks

```
src/brands/
├─ shared/        layout.js (round medal, text ring, medallion), parts.js (terminal, fireworks,
│                 lantern, calendar…), top-tier.js (the three top-tier designs), pixel-art.js, text.js
├─ claude-code/   brand.js (palette), mascot.js (the pixel mascot), app-icon.js (feature family),
│                 medal.js, milestones/ habits/ features/ limited/
└─ codex/         brand.js, mark.js (the Codex mark), feature-frame.js, medal.js, the same four series
```

- **Quickest start:** `medal({ bottom, shape, metal, band, disc, art })` from the tool's `medal.js` builds a round medal: metal rim, an edge line that follows the outline, a text ring and a center disc. It sizes the content to the outline, so star, flower and shield shapes keep their breathing room. Draw `art` for a disc of radius 0.56.
- **Shapes:** `circle` (optionally `reeded`), `polygon`, `starburst`, `flower` (round petals with rounded notches), `shield`, `gear`.
- **Materials:** `enamel`, `polished-metal`, `brushed-metal`, `ceramic`, `anodized`, `holographic`, `crystal`.
- **Relief:** `capsule`, `circle`, `ring`, `contour` (a line that follows the badge outline), `pixels` (ASCII art, `'#'` is solid), `rounded-rect`, `text-arc`, `text`, `gem`, `path` (SVG).
- **Patterns:** `pattern: 'sunburst' | 'rings'` on the `face` layer or on a relief.
- **Stacking:** a relief's `z` lifts it above the face, for example to sit art on the center disc.
- **Tiers:** `tiers: [{ threshold, metal, label, accent? }]`, then use `'$metal'`, `'$accent'` and `'{label}'` in the design. `withTopTier` / `topTierFromLast` from `shared/top-tier.js` turn the top tier into the three random designs (Ivory Gold, Onyx Gold, Sapphire).
- **Hidden:** `hidden: true` shows a pixel question mark and `???` until it is earned.
- **Coordinates and colors:** the badge center is the origin and its outer radius is about 1; colors are palette keys, not hex values.

Configs are validated at startup (`src/engine/validate.js`), and mistakes show up on the page in dev mode. To look at one badge while designing:

```bash
node scripts/peek.mjs "http://localhost:5199/?preview=unlocked" out.png <badge-id> [angle]
```

Pass `3.14159` as the angle for the back; `hold:0.6` pins the badge at an angle to check the sides of holographic and other materials.

### Adding a tool

`src/brands/index.js` is the only tool list. Everything else either derives from it (the CLI `--brand` check and help, `BRAND_INFO` in `src/collect/summary.js`, the dev server's data injection, `scripts/assets.mjs`) or keeps its own table keyed by tool id, which `tests/contracts.test.js` checks against the registry. A new tool `<id>` needs:

1. `src/brands/<id>/`: `brand.js` (`id`, `name`, `launchDate` for the tool-birthday badge, `palette` with at least `background` and `graphite`, `ui`, `engraving`), `index.js` (default export: all badges; `SERIES`), `medal.js` and one folder per series with one file per badge.
2. `src/brands/index.js`: add `{ brand, badges, series }` to `BRANDS`.
3. `src/collect/<id>.js`: exports `BRAND_ID`, `TURNS_FIELD` (the ledger field that counts the user's turns) and `collect({ env, home, now })`, which reads the tool's logs, keeps only allowlisted metadata, and saves with `saveBrand(home, BRAND_ID, ledger, progress, { turnsField: TURNS_FIELD })`. Return `null` when the tool isn't installed.
4. `src/collect/index.js`: add the module to `COLLECTORS`.
5. `src/data/<id>-metrics.js`: fact extraction and aggregation into the daily ledger, `RULES` (one per badge id, built from `COMMON_RULES` and `birthdayRule(brand.launchDate)` in `src/data/metrics-common.js`) and `computeProgress(ledger, badges, today)`.
6. `src/data/mock-<id>.js`: exports `BRAND_ID`, `MOCK_DAILY` (heatmap sample settings) and a default function returning sample progress.
7. `src/data/progress.js`: add the mock module to the list `DATA_SOURCES` is built from.
8. `package.json` `files`: add `src/data/<id>-metrics.js` (`tests/package-files.test.js` fails otherwise).
9. Tests: a leak test that plants secrets, prompts and paths in fake logs and checks none reach the output (see `tests/claude-code-metrics.test.js`); add the tool to the per-tool maps in `tests/contracts.test.js` (`METRICS`, `baseDay`) and `tests/layout.test.js`.
10. Docs: the README badge counts and the "How badges are counted" table (`tests/docs.test.js` checks the counts and the launch date).

Pull requests welcome.

## Design principles

1. **Inside follows outside.** The thin edge line follows the outline (`contour`); a round edge line belongs on round badges only.
2. **Breathing room.** Text rings and discs keep at least 6% of the radius from the edge.
3. **Calm outlines.** At most 8 sides (beyond that, use a circle); lobed shapes use a few broad lobes, and one outline never mixes sharp and round corners.
4. **Series feel.** Features use the tool's feature family; other series pick shapes that suit the theme.

`tests/layout.test.js` checks principles 1 and 2 on every badge, tier and top-tier design. Older badges that predate them are on its `LEGACY` list until each one is redesigned; don't add to that list. Principles 3 and 4 are checked in design review.

## Before you open a pull request

- [ ] `npm test` passes.
- [ ] `npm run build` passes, and the checks for what you touched pass (see the table in [AGENTS.md](AGENTS.md#workflows)): `check:browser` for badges and the wall, `check:pack` for the CLI and `files`, `check:shelf` for `shelf` / `profile`, `build:site` + `check:site` for the landing page.
- [ ] New or changed badges: screenshots front and back, reviewed by a human.
- [ ] No new data leaves the allowlist: no prompts, arguments, paths, file contents or credentials. A new ledger field comes with a leak-test case.
- [ ] README (English and Chinese) updated if users see the change. Code comments and test names follow the existing Chinese style.
- [ ] No videos or personal data committed.
