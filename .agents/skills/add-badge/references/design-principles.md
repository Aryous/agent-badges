# Design principles

Four principles, the same ones listed in CONTRIBUTING.md › Design principles. They are principles, not a whitelist: any shape, color or scene is fine as long as it keeps them. The maintainer's phrase for this is 随心所欲不逾矩: free within the rules.

Principles 1 and 2 are executable: `layoutIssues()` in `src/engine/layout.js` checks them, and `tests/layout.test.js` runs it on every badge, every tier and every top-tier design. Principles 3 and 4 are judged by eye in design review.

## 1. Inside follows outside

The thin edge line inside the rim follows the outline. On a star, flower, shield or polygon, use a `contour` relief; a round edge `ring` belongs on round badges only.

- Do: `medal()` adds `{ kind: 'contour', inset: 0.155, width: 0.012, ... }` for you, so a ten-point star gets a ten-point edge line.
- Don't: put `{ kind: 'ring', radius: 0.86, width: 0.012 }` (a centered ring 0.02 wide or thinner) inside an octagon. The check reports "非圆外形里用了圆形细描边，应改用沿外形的描边（contour）".

## 2. Breathing room

Centered content (the text ring, the center disc and its metal ring, any centered circle or ring wider than 0.02) keeps at least `BREATHING` = 0.06 of the radius from the inner edge of the edge line (or of the face, when there is no edge line).

- Do: let `medal()` size the content. It computes the inner radius of the outline and shrinks the text ring and disc so the gap is 0.065.
- Don't: hand-place a text ring at radius 0.72 inside a flower whose notches reach in to 0.8. The check reports "内容离外框太近：留白 …, 至少 0.06".

## 3. Calm outlines

At most 8 sides; beyond that use a circle (a pentagon is fine). Lobed shapes use a few broad lobes. One outline never mixes sharp corners and round arcs. Flower notches are always rounded.

- Do: a six-petal `flower` with `valley: 0.12`, or a ten-point `starburst` with `tipRoundness: 0.22, valleyRoundness: 0.12` (both tips and valleys rounded).
- Don't: a 12-sided polygon, a starburst with sharp tips (`tipRoundness: 0`) next to rounded valleys, or 16 thin petals.

## 4. Series feel

Feature badges use the tool's feature family: `appIcon()` for Claude Code, `featureBadge()` for Codex. Other series pick a shape that suits the theme, and the art includes the tool's anchor (the Claude pixel mascot or the Codex mark) so the badge reads as that tool at a glance.

- Do: a new Codex feature badge built with `featureBadge({ ..., band, panel, label, art })`, art showing the mark doing the feature.
- Don't: a Codex feature badge as a round medal, or a habit badge that is a ring inside a polygon because that is what the last badge did.

## Lessons from the 0.5.0 review

These came up when the maintainer reviewed the 0.5.0 badges. Check your screenshots for each:

- **Inner ring over flower petals.** A round ring inside a flower cut across the petals. Follow the outline with `contour`, and leave room in the notches.
- **Arcs and sharp points in one outline.** The Codex Christmas flower once had round petals meeting in sharp notches. The engine now rounds flower notches (`valley`), and `src/brands/codex/limited/christmas.js` shows the result. Apply the same rule to every shape: all corners round, or all corners sharp.
- **Edge line glued to the outline.** An edge line with no gap to the rim reads as a seam. Keep the contour inset (`medal()` uses rim inset 0.11 + gap 0.045) and the 6% breathing room inside it.
- **Rings and polygons by habit.** Not every badge needs a ring or a polygon. Start from the theme: what is the scene, what shape holds it best.
- **What was praised.** The cobalt (Klein blue) band and calm, rounded outlines. Rich color with a quiet silhouette works.

## Legacy badges

Older badges that predate principles 1–2 are on the `LEGACY` list in `tests/layout.test.js` until they are redesigned. Never add to that list; a redesign removes its badge from it. New badges go in the `NEW` map in the same file so each gets its own named test.
