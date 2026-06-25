# B17 · @nabd/bodymap — anatomical body map (React + vendored SVG)

Interface frozen in `src/index.ts`. Renders the vendored body-muscles regions tinted
by coverage. Assets live at repo `assets/body/` (import the index):
`import { FRONT_MUSCLES, BACK_MUSCLES, VIEWBOX, ViewSide } from "../../../assets/body"`
(and `assets/body/meta`). Use `MUSCLE_REGION_MAP` from @nabd/domain + `regionStyle`
from @nabd/coverage? NO — coverage tinting math is local here.

## Behavior
- `regionMuscle(regionId)`: find the MuscleKey whose MUSCLE_REGION_MAP prefixes match
  `regionId` (regionId starts with `<prefix>` then `-left`/`-right` or exact). Return
  that muscle, or null if no prefix matches (decorative region).
- `regionStyle(regionId, coverage, style)`: muscle = regionMuscle(regionId). If null →
  neutral `{ fill: "var(--map-muscle)" }`. Else let c = clamp(coverage[muscle],0,100):
  - heat → `{ fill: "var(--accent)", fillOpacity: 0.34 + 0.66*c/100 }`
  - outline → `{ fill: "var(--map-muscle)", stroke: "var(--accent)", strokeOpacity:
    0.2 + 0.8*c/100 }`
- `BodyMap({side, coverage, style="heat", width})`: render `<svg viewBox=VIEWBOX[side]>`
  containing one `<path d=region.path style=regionStyle(...)>` per region in
  FRONT_MUSCLES/BACK_MUSCLES (by side). Include a `<title>` per muscle region with
  `"<Muscle name> · <pct>%"`.
- `MuscleBar({muscle, pct, showRec})`: a row with the muscle name, a bar filled to
  `pct%` (width style), the pct text, and (if showRec) a rest/push tag: pct>=66→"Rest",
  pct<=38→"Push", else none (matches @nabd/coverage thresholds).

## Test Cases
- regionMuscle: a front-delt region id (e.g. "shoulder-front-left") → "front_delts";
  "traps-mid-right" → "rhomboids"; "gluteus-medius-left" → "abductors"; a decorative id
  ("head","hand-left") → null; exact + -left/-right variants.
- regionStyle: heat opacity at c=0 (0.34), c=100 (1.0), c=50; outline stroke at c=0/100;
  null region → neutral fill. (Build a Coverage fixture.)
- BodyMap: renders an svg with the correct viewBox per side; renders the expected number
  of `<path>` elements (= regions for that side); a muscle region's path carries a tint
  style; renders front vs back. (Use container.querySelectorAll('path').)
- MuscleBar: renders name + pct text; bar width reflects pct; rec tag "Rest" at 70,
  "Push" at 20, none at 50; showRec=false hides the tag.
Cover every export + branch → 100%.

## Boundaries
Code agent: only `packages/B17-bodymap/src/`. Tests RO. Import @nabd/domain, react, and
the vendored `assets/body` data (do NOT edit assets). No signature changes.
