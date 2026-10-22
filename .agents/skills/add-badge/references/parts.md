# Badge building blocks

Everything here is taken from the code. If a name is not in these files, the validator rejects it:

- shapes, materials, relief kinds, layers, patterns, effects: `src/engine/registry.js`
- shape parameters and defaults: `src/engine/shapes.js`
- validation rules: `src/engine/validate.js`
- shared parts: `src/brands/shared/parts.js`, `src/brands/shared/layout.js`, `src/brands/shared/pixel-art.js`
- palettes: `src/brands/<tool>/brand.js`

When the registry changes, update this file.

## Coordinates and colors

- The badge center is the origin; the outer radius is about 1. `y` points up.
- Shared parts and `medal()` art are designed for a center disc of radius 0.56. `medal()` shrinks everything (factor `k`) when the outline's inner radius is small, so design at k = 1 and let it fit.
- Height (`height`) is extrusion above the surface it sits on; `z` lifts the base. Art on the disc sits at `z: MEDALLION_H` (0.014, from `shared/layout.js`); parts default to it. Stack overlapping art by adding to `z` (see the three terminals in `productive-day.js`).
- Colors are palette keys, never hex. Both tools share these keys: `ivory ink cobalt azure emerald mint violet lilac gold silver rose bronze platinum onyx midnight navy sky teal aqua forest lime crimson scarlet plum magenta amber honey sand slate steel snow ruby sapphire topaz amethyst graphite` plus `background` and `primary` (Claude orange / Codex purple). Codex adds `lavender periwinkle electric orange` (the Codex mark gradient uses the first three).
- Tiered badges may use `'$metal'` and `'$accent'` as colors and `'{label}'` inside any text; each tier fills them in.

## Shapes (`shape.type`)

All shapes take `radius` (outer, about 1–1.1), `depth` (thickness, about 0.2–0.26) and `bevel` (0.015–0.05). `face.inset` must be at least `bevel × 2 + 0.01`.

| Type | Parameters (defaults) | Use it for |
| --- | --- | --- |
| `circle` | `reeded: { count, depth }` adds coin edge knurling | The default. Coins, anniversaries, big milestones |
| `polygon` | `sides` (6), `cornerRadius` (0.12), `rotation` (π/2) | Up to 8 sides; beyond that use a circle. Pentagon is fine |
| `starburst` | `points` (12), `innerRadius` (0.72), `tipRoundness` (0.12), `valleyRoundness` (0.05), `rotation` | Soft stars. Keep tips and valleys both rounded; high `innerRadius` (0.86–0.95) reads calm |
| `flower` | `petals` (5), `petal` (0.44, petal radius as a share of `radius`), `valley` (0.08, notch rounding), `rotation` | A few broad round lobes; notches are always rounded |
| `shield` | `width` (0.86), `top` (0.9), `shoulder` (0.12), `bottom` (-1.02), `cornerRadius` (0.14) | Defense, endurance, streak themes |
| `gear` | `teeth` (12), `rootRadius` (0.84), `roundness` (0.025), `rotation` | Machinery, tool use |

## Layers (`layers`)

Exactly one `rim` and one `face`. `medal()`, `appIcon()` and `featureBadge()` write these for you.

- `rim`: the metal outer band (`material`, `color`).
- `face`: the enamel panel inside the rim (`material`, `color`, `inset` in (0, 0.5), optional `pattern`).

## Materials (`material`)

`enamel` (colored base with clear-coat shine), `polished-metal`, `brushed-metal` (concentric brushing; used for backs), `ceramic` (matte; the Claude mascot), `anodized` (Claude feature rims), `holographic`, `crystal`. `locked` is engine-internal (the silhouette of a locked badge): never use it.

## Relief kinds (`relief[].kind`)

| Kind | Key fields | Notes |
| --- | --- | --- |
| `capsule` | `from`, `to`, `width` | Rounded stroke; lines, hands, rays |
| `circle` | `center`, `radius` | Dots and discs |
| `ring` | `center`, `radius`, `width` | A round ring. As an edge line it belongs on circles only (principle 1) |
| `contour` | `inset`, `width` | A line that follows the badge outline. The edge line on any non-round shape |
| `rounded-rect` | `center`, `half`, `radius` | Square with rounded corners (`half` = half side) |
| `pixels` | `rows` (strings, `'#'` solid), `cell`, `center` | Pixel art |
| `path` | `d` (SVG path), `viewBox` (24), `scale`, `center`, `holesOnly` | Vector icons; `gradient: [keys]` for a vertical gradient |
| `text` | `text`, `size`, `center`, `tracking` | Straight text |
| `text-arc` | `text`, `radius`, `size`, `arc: 'top' \| 'bottom'`, `tracking` | Ring lettering. Only glyphs in the badge font (add glyphs in `scripts/build-font.mjs`) |
| `gem` | `center`, `radius`, `sides` (8) | Faceted gem cap |

Common fields on every relief: `material`, `color`, `height`, `z`, `bevel`. Optional: `pattern: 'sunburst' | 'rings'`, `effect: 'pulse'` (a slow glow, used on the bash-maniac cursor).

## Templates (pick one per badge)

| Helper | File | Builds |
| --- | --- | --- |
| `medal({ bottom, shape, metal, band, disc, art, textSize?, k?, extra?, contour? })` | `src/brands/<tool>/medal.js` (wraps `roundMedal` in `src/brands/shared/layout.js`) | Rim → enamel band → contour edge line → text ring (tool name on top, `bottom` below) → center disc → `art`. Auto breathing room. Use for milestones, habits and limited badges |
| `appIcon({ id, title, description, en, criteria, rim, face, panel, metal, name, art })` | `src/brands/claude-code/app-icon.js` | Claude Code feature family: anodized rounded square, bright panel, `name` on the bottom bar. Art sits on the panel (`mascot`, `px` from the same file) |
| `featureBadge({ id, title, description, en, target, band, panel, label, art })` | `src/brands/codex/feature-frame.js` | Codex feature family: flat-top rounded hexagon, brushed titanium, disc, metal nameplate with `label` |

## Shared parts (`src/brands/shared/parts.js`)

All default to sitting on the center disc (`z = MEDALLION_H`). Each returns one relief item or an array (spread it).

| Part | Draws |
| --- | --- |
| `cap(from, to, width, color, height?, material?, z?)` | A capsule (stroke) with a safe bevel |
| `dot(center, radius, color, height?, material?, z?)` | A small disc |
| `ring(center, radius, width, color, height, material?, z?)` | A small ring (not an edge line) |
| `px(rows, cell, center, color, material?, height?, z?)` | Pixel art |
| `rect(half, radius, center, color, height, z?, material?)` | A rounded rectangle |
| `label(text, size, center, color?, height?)` | Metal text on the disc (defaults to `'$metal'`) |
| `terminal({ center, half, panel?, prompt?, frame?, z? })` | A small terminal window with a `>_` prompt |
| `burst([x, y], r, n, color, width?)` | A firework burst: a dot and `n` rays |
| `dialTicks(r?, color?, minor?)` | 12 clock ticks, long at 3/6/9/12 |
| `midnightHands(color?, y0?)` | Clock hands overlapping at 12 |
| `hourglass(center, cell, { glass, sand, frame })` | A pixel hourglass |
| `plane(center, scale, color?)` | A paper plane (SVG path) |
| `calendar({ center, page, header, ticks, binder })` | A calendar page with 20 weekday ticks |
| `lantern(x, y, cell, { body, trim, top })` | A red lantern hanging from `top` |
| `balloons(list, hand, string?)` | A bunch of balloons tied at `hand` |

From `src/brands/shared/layout.js`: `around(n, radius, start?)` (n points on a circle, clockwise from the top), `MEDALLION_H`, `scaleRelief(item, k)`. Pixel motifs in `src/brands/shared/pixel-art.js`: `PLUS`, `MOON`, `SNOWFLAKE`.

Brand anchors (put one on most badges so the tool is recognizable):

- Claude Code: `clawd({ cell, center, color?, height?, z? })` and `onClawd(...)` for pixel accessories (hats, glasses) in `src/brands/claude-code/mascot.js`.
- Codex: `codexMark({ size, center, ... })` and `onMark(...)` for accessories in `src/brands/codex/mark.js`.

## Tiers, top tier, hidden

- Tiered: `tiers: [{ threshold, metal, label, accent? }]` with increasing thresholds and no `criteria`. Metals are palette keys (`bronze`, `silver`, `gold`, `platinum`).
- Top tier: `withTopTier(base, { threshold, label }, '<tool>/<id>')` adds a final tier that unlocks one of three designs at random (Ivory Gold, Onyx Gold, Sapphire); `topTierFromLast(config, '<tool>/<id>')` turns the existing last tier into it. Both in `src/brands/shared/top-tier.js`. See `src/brands/claude-code/milestones/dispatches.js`.
- Hidden: `hidden: true` shows a pixel question mark and `???` until earned (see `src/brands/codex/limited/compactor.js`).
- `criteria.unit` (for example `'h'` on marathon) and `criteria.dynamic` (the rule computes the target itself, as perfect-month does) are the only other criteria fields.
