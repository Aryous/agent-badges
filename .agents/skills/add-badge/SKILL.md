---
name: add-badge
description: Use when adding or redesigning a badge in the agent-badges repo — a new achievement for Claude Code or Codex, a new tier or top tier, a holiday or limited badge, a hidden badge, or reworking an existing badge's look ("add a badge", "new achievement", "新增徽章", "加一枚徽章", "做个节日徽章", "重新设计这枚徽章"). Walks through data, badge file, series, rule, sample data, copy, human design review and checks. Not for checking the user's own badges (use the `badges` skill) and not for adding a whole new tool (see CONTRIBUTING.md › Adding a tool).
---

# Add a badge

A badge is one config file plus one rule. Follow the steps in order and do not skip the design review: a badge is a visual object, and tests only catch part of what makes it right.

Background lives elsewhere; read it when a step points there:

- `AGENTS.md`: the project contracts and the test that enforces each, the data boundary, which checks to run.
- `CONTRIBUTING.md` › Adding a badge, Building blocks, Design principles.
- `references/parts.md`: shapes, materials, relief kinds, shared parts, palette keys, tier helpers.
- `references/design-principles.md`: the four principles with do / don't examples and the lessons from the 0.5.0 review.
- `references/template.js`: a complete one-time badge file with every field explained.

Placeholders below: `<tool>` is `claude-code` or `codex`; `<series>` is `milestones`, `habits`, `features` or `limited`; `<id>` is the badge id.

## 1. Pick the series and id

- Series: `milestones` (cumulative totals and firsts), `habits` (streaks, rhythm, single-day peaks), `features` (first use of a tool feature), `limited` (holidays, dates, hidden surprises). They live in `src/brands/<tool>/<series>/`.
- Id: kebab-case, unique within the tool. Grep before choosing: `grep -rn "id: '<id>'" src/brands/<tool>/`. The same id in both tools is fine when it means the same thing (for example `productive-day`).
- Tiered (bronze → silver → gold, levels up) or one-time? Tiered suits cumulative counts; one-time suits a peak, a first, or a date.
- If both tools get the badge, do steps 3, 4, 6 and 7 once per tool (each tool has its own badge file, series index, mock data and copy). The rule (step 5) goes in each tool's `RULES`, or once in `COMMON_RULES` when the rule is identical in both. `FIXTURES` in `tests/contracts.test.js` is one shared entry per id, not one per tool.

## 2. Check the data exists and is allowed

The rule can only read what the daily ledger already stores. The fields are listed in `emptyDay` in `src/data/claude-code-metrics.js` and `src/data/codex-metrics.js` (for example `sessions`, `threads`, `toolCalls`, `maxParallel`, `hours`, `models`, and feature flags such as `spawn` or `plan`).

- If the field exists, go on.
- If it does not, stop and ask the human before continuing. A new field means: extract it in the parser (`extractFacts` / `extractRolloutFacts`, `threadFacts`), aggregate it per day, merge it in the ledger merge, and add a leak-test case to `tests/claude-code-metrics.test.js` or `tests/codex-metrics.test.js` that plants secrets, prompts and paths and proves none reach the output. Readers live in `src/collect/claude-code.js` and `src/collect/codex.js`.
  - Codex: `src/collect/codex.js` caches the facts extracted from each rollout file under `CACHE_VERSION`. When per-file facts change (a new field, a changed extraction rule), bump `CACHE_VERSION` and add a line to its comment. Otherwise anyone with an existing cache never re-parses their old files, never gets the new field, and the badge silently reads 0.
  - Claude Code: `src/collect/claude-code.js` has no per-file cache or version; every run re-reads all transcript files, so there is nothing to bump. Days whose transcripts were already deleted live only in the ledger (`mergeLedger` keeps their old values), so they never gain the new field; that is expected.
- Allowed: tool names, event types, timestamps, token counts, mode values. Never: conversation text, command arguments or output, file paths, file contents, credentials. Never open the files AGENTS.md › Data boundary lists, not even to debug. A badge idea that needs forbidden data is dropped, not worked around.

## 3. Write the badge file

Copy `references/template.js` to `src/brands/<tool>/<series>/<id>.js` and edit it. The template's imports assume `src/brands/claude-code/habits/`; adjust them for the tool and series.

- Round medal (milestones, habits, limited): `medal()` from `src/brands/<tool>/medal.js`. It wraps `roundMedal` in `src/brands/shared/layout.js`, which draws rim, contour edge line, text ring, center disc and your `art`, and fits them to the outline with breathing room.
- Feature badge: Claude Code uses `appIcon()` from `src/brands/claude-code/app-icon.js`; Codex uses `featureBadge()` from `src/brands/codex/feature-frame.js`.
- Art: parts from `src/brands/shared/parts.js`, plus the tool's anchor: `clawd()` from `src/brands/claude-code/mascot.js` or `codexMark()` from `src/brands/codex/mark.js`. Names, parameters and palette keys: `references/parts.md`. Colors are palette keys, never hex.
- One-time: `criteria: { target }` (optionally `unit`, or `dynamic: true` if the rule computes the target). Tiered: `tiers: [{ threshold, metal, label, accent? }]` and no `criteria`; use `'$metal'`, `'$accent'` and `'{label}'` in the design; wrap with `withTopTier()` from `src/brands/shared/top-tier.js` to add the random top-tier designs (see `src/brands/claude-code/milestones/dispatches.js`). `src/engine/validate.js` rejects a config that mixes the two.
- Hidden: `hidden: true`.
- Start the file with a one-line Chinese comment describing the shape and scene, like the other badge files. Code comments in `src/` are Chinese.

## 4. Register it in the series

Import the file in `src/brands/<tool>/<series>/index.js` and add it to `badges`. The order of that array is the order on the wall, so place it next to related badges.

Then add the id to the tool's list in the `NEW` map in `tests/layout.test.js`, so it gets its own named layout test. Never add it to `LEGACY`.

## 5. Add the rule

Add `'<id>': (c, badge) => …` to `RULES` in `src/data/claude-code-metrics.js` or `src/data/codex-metrics.js`. If both tools have the badge and count it identically, put it once in `COMMON_RULES` in `src/data/metrics-common.js` instead (each tool's `RULES` keys must equal exactly its own badge ids, so a common rule needs the badge in both tools).

Read the threshold from the badge (`badge.criteria.target` or `badge.tiers`), never a number literal. The config is the single source of the number: the wall's progress bar, both descriptions and the README all show it, and maintainers retune thresholds by editing the config alone. `tests/contracts.test.js` proves this by moving the target and checking the unlock moves with it, so a literal in a counted badge's rule fails the test (tiered rules are not covered by that check, which makes the habit matter more there).

The context `c` comes from `metricsContext` in `src/data/metrics-common.js`. Common shapes:

| Badge | Rule |
| --- | --- |
| A per-day field reaches the target once | `(c, b) => c.peak('threads', b.criteria.target)` |
| Cumulative tiered count | `tierOf('sessions')` |
| First day something happened | `(c) => once(c.first((d) => d.midnight))` |
| A date (holiday) | `(c) => c.on(holidays['new-year'])`; add new dates to `holidays` |
| A feature flag, including days with only sub-agent activity | `(c) => once(c.firstAll((d) => d.spawn))` |

Import any helper you use (`once`, `holidays`, `tier`, …) from `src/data/metrics-common.js`.

A counted one-time badge (no `tiers`, `target > 1`, not `dynamic`) also needs an entry in `FIXTURES` in `tests/contracts.test.js`: a function `(brandId, n)` that builds a ledger where the field is exactly `n`. The contract test fails with "FIXTURES 缺 <id>" until you add it. For a rule with real logic (not one helper call), also add a behavior case to the tool's metrics test.

## 6. Add sample data

Add an entry to the default export of `src/data/mock-claude-code.js` or `src/data/mock-codex.js` so the demo (`?source=mock`) and the landing page show it. One-time: `{ unlocked: true, earnedAt: 'YYYY-MM-DD' }` or `{ unlocked: false, progress: { current, target } }`. Tiered: `{ value, earnedAt }`. Mix states across the file so the demo stays varied.

## 7. Write the copy

- `title` (Chinese) and `description` (Chinese, one or two sentences: what you did, then a line of scene that matches the art).
- `titleEn` (uppercase, engraved on the back) and `en: { title, description }`.
- Both descriptions state the target number in digits ("20 sessions", "一天之内开启 20 个会话"). `tests/contracts.test.js` checks this for counted badges; a number inside another number (5 in 50) does not count.
- The text ring's `bottom` and any `text` reliefs use only glyphs in the badge font; the validator names missing ones (add glyphs in `scripts/build-font.mjs`).
- READMEs: update the badge counts in both `README.md` ("**N badges across two tools.** N for Claude Code, N for Codex") and `README.zh-CN.md` ("N 枚徽章", "Claude Code N 枚，Codex N 枚"). `tests/docs.test.js` fails until they match. If the counting rule isn't obvious, add a row to "How badges are counted" (README.md) and 「统计口径」 (README.zh-CN.md).

## 8. Design review

Read `references/design-principles.md` first. Principles 1 (inside follows outside) and 2 (6% breathing room) are tested; 3 (calm outlines) and 4 (series feel) are your judgment and the human's. Check your screenshots for the lessons from the 0.5.0 review:

- an inner ring cutting across flower petals;
- round arcs and sharp points mixed in one outline;
- an edge line glued to the outline with no breathing room;
- rings and polygons used out of habit rather than for the theme.

Preview:

```bash
npx vite --port 5199          # keep running
node scripts/peek.mjs "http://localhost:5199/?preview=unlocked&source=mock" front.png <id>
node scripts/peek.mjs "http://localhost:5199/?preview=unlocked&source=mock" back.png <id> 3.14159
```

Add `&source=mock` to every preview URL. Without it, a machine that has local data for only one tool lists only that tool, and `brand=` for the other falls back to it; `source=mock` lists both tools with sample data. Add `&brand=codex` for Codex badges.

For tiered badges add `&tier=N` for each tier. `N` is 0-based and clamped to the last tier (`src/app/preview.js`); without it the top tier is shown. The top tier has three variants, and the URL cannot pick one: the variant is chosen by a hash of the tier's `salt` plus the badge's `earnedAt` (`pickVariant` in `src/data/normalize.js`), and preview keeps the sample data's `earnedAt`. To see all three, change `earnedAt` in the badge's mock-data entry until each variant has come up (keep the final value varied), or check them in the design review through the studio (`src/project/studio.js`, `tools/studio.html`), which renders the sample state. `npm test` already runs `layoutIssues` on every variant. Do not ship a top tier you have only seen once.

`hold:0.6` as the angle pins the badge at a slant to check the sides of holographic and metal parts. In a browser: `http://localhost:5199/?preview=unlocked&source=mock#<id>`.

Show the human the front, back and every tier, say which principles you checked, and iterate until they approve. Do not approve your own design.

## 9. Checks

```bash
npm test                 # contracts, layout, docs, validation
npm run build
npm run check:browser    # dev server on 5199; every badge renders on both walls, no console errors
```

Also `npm run check:pack` if you touched collectors or `package.json` `files`. Commit only after the human has approved the design review (step 8); the message ends with the `Co-Authored-By` line the session uses.

What each test catches if a step was missed:

| Missed | Fails |
| --- | --- |
| Rule (step 5) | `tests/contracts.test.js`: RULES keys equal the badge ids |
| Number literal in the rule, or no fixture | `tests/contracts.test.js`: thresholds follow the config |
| Number missing from a description | `tests/contracts.test.js`: zh / en descriptions state the target |
| `criteria` and `tiers` together, unknown shape / material / color | `tests/validate.test.js`, `tests/badge.test.js` |
| Edge line or breathing room | `tests/layout.test.js` |
| README counts | `tests/docs.test.js` |
| A badge that throws while rendering | `npm run check:browser` (thumbnail count, console errors) |
| Sample data (step 6), design (step 8) | Nothing. That is why they are steps |

## Adding a tier to an existing badge

- Add `{ threshold, metal, label }` to `tiers` in its badge file, in ascending order; the rule reads `badge.tiers`, so it needs no change.
- If it has a top tier (`withTopTier()` / `topTierFromLast()` from `src/brands/shared/top-tier.js`), the new tier goes before it; the top tier stays last.
- Update the mock data value (step 6), the descriptions if they name thresholds, and the badge's row in the READMEs' counting table ("How badges are counted" / 「统计口径」) if it lists the thresholds. A new metal also needs a palette key in each brand and a `tier` value in the READMEs' JSON output notes (`tests/docs.test.js` checks that).
- Preview each tier with `&tier=N`, run the same review and checks.

## Redesigning an existing badge

Edit only its badge file; the rule, id and threshold stay. If it is on `LEGACY` in `tests/layout.test.js` and the redesign passes, remove it from `LEGACY` and add it to `NEW`. Same review and checks as above.
