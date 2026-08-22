# MaxShelf Configurator (v24.4) — Logic Reference

Source: [`maxshelf-configurator-v24.4.html`](./maxshelf-configurator-v24.4.html), a retained
single-file HTML/CSS/JS prototype. This document reverse-engineers its construction rules so the
shelving logic can be reused, audited, or reimplemented independently.

## 1. Product Model

The app configures one "bay run" at a time (a linear or corner section of shelving) and lets the user stack multiple configured runs into a **Cart** before exporting/quoting.

### 1.1 Bay Types (`C.type`)
| Type | Value | Description |
|---|---|---|
| Wall Bay | `wall` | Single-sided run fixed to a wall. Uprights get wall brackets. |
| Gondola | `gondola` | Free-standing double-sided run (island). Every quantity that is "per face" doubles (`G=2`): base legs, kickplates, base shelves, shelves, shelf brackets, back panels, ticket strips. Adds Top Cover + Top Cap parts. No wall brackets. |
| Internal Corner | `icorner` | Two wall runs meeting at a 90° internal corner, joined by a fixed 750mm diagonal corner unit. Computed as two independent wall BOMs merged, plus corner-specific parts (see §5). |

### 1.2 Global Attributes
- **Colour** (`C.colour`): Jura White / Silver / Graphite / Black — drives which SKU variant is looked up for almost every part.
- **Upright thickness** (`C.uThick`): `30`, `60`, `80`, `110`, `uch` (U-Channel). Each thickness has a fixed, hard-coded set of available heights (`UT_HEIGHTS`), e.g. 60mm supports 9 heights (900–3000mm) while 30/uch only support 2800mm.
  - **110mm is Graphite-only.** Selecting 110mm forces colour to Graphite and locks the colour swatches (`applyColourLock`); switching colour away is blocked while 110mm is selected.
  - Changing thickness rebuilds the height dropdown (`updateHeights`), preserving the current height if still valid, else snapping to the nearest available height.
- **Upright height** (`C.uH`): drives back-panel zone height and ticket-strip count (see below).
- **Base depth** (`C.bDepth`): depth of the base leg / base shelf.

## 2. Bay Width Fill Logic (the core packing algorithm)

Bay widths come from a fixed catalogue of upright spacings: **`SIZES = [1250, 1000, 800, 665, 500]` mm** (descending). Every "run" of shelving (a wall bay run, or each wall of a corner) is expressed as a multiset of these five widths that sums exactly to a target length. There is no partial/cut bay — if the target can't be hit exactly, the algorithm reports failure with the nearest achievable lengths above/below.

Two fill strategies, selectable per section:
- **Greedy Fill**: user enters a target run length; the app computes the fill for them (`minBaysFill`).
- **Custom Mix**: user manually specifies quantity of each of the 5 widths; the app just sums them.

### 2.1 `minBaysFill(total)` — optimal-bay-count solver
Goal: express `total` mm as a sum of values from `SIZES` using the **fewest bays (uprights) possible**, with tie-breaking preferences for a nicer merchandising look. This is solved lexicographically:

1. **Fewest bays.** A DP (`dpN`, unbounded coin-change / minimum-coins over `SIZES`) computes the minimum number of pieces `n` that sum to `total`. If `total` is unreachable, the DP is re-run over an extended range to report the nearest reachable lengths below (`lo`) and above (`hi`) — capped at `total + 5000` or `40000`mm, whichever is smaller.
2. **Fewest distinct widths.** Among all multisets of exactly `n` pieces summing to `total`, the app searches for a solution using 1, then 2, then 3, then 4, then 5 distinct widths (in that order, stopping at the first non-empty tier). This is solved combinatorially:
   - d=1: any single width `w` where `w*n==total`.
   - d=2: for every pair of widths, solve `a*w1 + b*w2 = total` with `a+b=n`, `a,b≥1` (closed form via `solve2`).
   - d=3/4/5: nested loops fixing counts for the extra widths and solving the remaining two-width system the same way.
3. **Tie-break (`better()`).** Among equal-distinct-count candidates, prefer the one with the **largest dominant-width share** (most bays of a single width), then the **widest dominant width**.

Result: `{sections:[{width,qty},...], n, distinct}` sorted widest-first.

Additionally, if the optimal fill isn't uniform (`distinct>1`), the solver looks for a **uniform alternative** — a single width that evenly divides `total` — at the smallest bay count above `n`. The UI surfaces this as a one-click "Prefer uniform? Use N×Wmm (+k bays)" link (`applyUniform`), which switches the section into Custom mode pre-filled with that uniform mix.

### 2.2 Section-specific application
- **Wall Bay run** (`getBays`): greedy uses `C.bwRun` (default 5000mm) as target; custom uses `C.bwCustom` per-width quantities.
- **Internal Corner, each wall** (`cornerWallFill`): the greedy target is `fullLen − 750mm` (the diagonal corner unit's footprint is reserved first). Minimum wall length is **1250mm** (750 corner + at least one 500mm bay). Custom mode places exact widths directly (no corner subtraction needed since the corner is added separately in the BOM).

## 3. Bill of Materials Construction (`calcBOM`)

Given `n` bays and `sections` (width→qty), the BOM is built as an ordered list of `{cat, name, qty, size, sku}` rows. `G` = 2 for gondola, 1 otherwise (doubles per-face quantities). `nU = n + 1` uprights (one more upright than bays, i.e. shared posts between adjacent bays).

### 3.1 Uprights & Base (always present)
- **Upright** × `nU`, sized `{thickness} × {uH}mm`.
- **Wall Bracket** × `nU` (wall bays only — 1 per upright; omitted for gondola).
- **Base Leg** × `nU * G`, sized by `bDepth` (front only for wall; front+back for gondola).
- **Kickplate** × `qty * G` per width section.
- **Base Shelf** × `qty * G` per width section, sized `width × bDepth` (shares the same SKU family as an adjustable Shelf at that depth).

### 3.2 Adjustable Shelves
Two shelf-count modes (`C.shMethod`):
- **Uniform**: `C.nSh` shelves per section, all at `C.shDepth`.
- **Custom Mix**: per-depth quantities from `C.shCustom` (depths `SH_DEPTHS = [570,470,370,300,250,200]`, deepest-first — used so the isometric drawing stacks deep shelves toward the bottom for a realistic look).

For each depth present, per section: **Shelf** × `count*qty*G` and **Shelf Bracket** × `count*qty*G` (brackets are sold in pairs, 1 pair per shelf).

### 3.3 Back Panels
Back-panel "zone" height is always **`uH − 100mm`** (doubled conceptually for gondola since both faces get filled, though panels are counted, not physically doubled in height). Panel type (`C.pType`) determines fill strategy:

- **`plain`**: fills the zone with panels from `[500,400,300,200,100]`mm using a greedy fill (largest-first, take as many as fit, repeat down the list) — either fully automatic (**Greedy Fill**) or via **Custom Mix** where the user picks counts of 400mm-Perforated / 100mm-U-Slat, and any remainder is greedy-filled with plain panels. Any leftover gap after fill is reported as a warning.
- **`perf`** (Perforated): fills with as many 400mm perforated panels as fit (`floor(zone/400)`), remainder filled with plain panels via the same greedy cascade.
- **`slat`** (U-Slat): fills entirely with 100mm slat panels, `ceil(zone/100)` count (may slightly overshoot the zone — no warning for overshoot, only undershoot elsewhere).
- **`led` / `rgb`**: fixed 1200mm panel. Requires zone ≥1200mm (i.e. upright height ≥1400mm), else falls back to all-plain with a warning. If satisfied: one 1200mm LED/RGB panel + greedy-plain fill for the remainder above 1200mm. **Not available in 500mm width** — 500mm-wide sections always get plain-panel fill instead, with a warning.
- **`none`**: no back panel rows at all (not shown as an explicit case in code — simply no `if` branch matches, so panels are skipped).

All back-panel SKUs are per-`{colour, width, height}` except LED/RGB which are universal across colours (`LED|width`, `RGB|width`).

### 3.4 Ticket Strips
If `C.ticket` is on: **Ticket Strip** × `(nShEff+1) * qty * G` per width section — i.e. one strip per shelf level (including the base) per bay per face. Coloured independently via `C.tCol` (`TKMAP`/`TCOL` palettes, separate from the 4 structural colours — includes Transparent, Red, Blue, Orange, Yellow, Green in addition to the 4 structural colours). Some ticket colour/width combos have no SKU (`"NO HAVE"` in the SKU table) and surface as missing-SKU rows in the BOM.

### 3.5 Gondola-only additions
- **Top Cover** × `qty` per width section.
- **Top Cap** × 2 (one per end).

### 3.6 Validation warnings emitted by `calcBOM`
- 110mm upright selected with a non-Graphite colour → invalid SKU warning.
- Max adjustable-shelf depth exceeds base leg depth → warning (shelves would overhang the base).
- Any panel-fill remainder/gap → warning with the leftover mm.
- LED/RGB zone too short, or 500mm width with LED/RGB → warning + automatic plain-panel substitution.

## 4. SKU Resolution

All physical parts are resolved through a single flat lookup table `SKUS` (~440 entries), keyed by pipe-delimited strings, e.g.:
- `UP|{colour}|{thickness}|{height}` — upright
- `WB|{colour}` — wall bracket
- `BL|{colour}|{depth}` — base leg
- `KP|{colour}|{width}` — kickplate
- `SH|{colour}|{width}|{depth}` — shelf (adjustable & base, same family)
- `BR|{depth}` — shelf bracket (colour-independent)
- `PP|{colour}|{width}|{height}` — plain back panel
- `PF|{colour}|{width}` — perforated back panel (fixed 400mm height, not in the key)
- `US|{colour}|{width}` — U-slat back panel
- `LED|{width}` / `RGB|{width}` — LED/RGB back panel (colour-independent)
- `TK|{ticketColour}|{width}` — ticket strip
- `TC|{colour}|{width}` — gondola top cover
- `CAP|{colour}` — gondola top cap
- `ICSH|{colour}|{depth}`, `ICKP|{colour}|{depth}` — internal-corner shelf/kickplate

Lookup via `SK(key) = SKUS[key] || null`. Missing keys render as **"no SKU"** in red in the BOM table (`.sku.miss`), and some entries are literally placeholder strings like `"NO HAVE"` (e.g., blue/orange/yellow ticket strips at 500mm) which are treated as present-but-unfulfillable text, not resolved to `null`.

## 5. Internal Corner Logic

An internal corner is modeled as **two independent wall runs** (A and B) meeting at a fixed **750mm diagonal corner unit** (`IC_CORNER = 750`), each wall configured independently (own greedy/custom fill, own run-length input).

1. Each wall's bay fill is computed via `cornerWallFill` (§2.2), producing its own `{sections, n, wallLen}` where `wallLen = 750 + run`.
2. `calcCornerBOM(nA,secA,nB,secB)`:
   - Computes each wall's full BOM independently via `calcBOM`, then merges the row lists by `(cat,name,size,sku)` key, summing quantities. This means each wall's own "first-post" upright at the 750mm junction is already counted in that wall's own `calcBOM` — no separate accounting needed for those two posts.
   - Adds the **net-new corner-specific parts**, category `Internal Corner`:
     - **Corner Upright (45°)** × 1 — the single back-corner post shared by both walls.
     - **Corner Base Leg** × 1.
     - **Internal Kickplate** × 1.
     - **Base Corner Shelf** × 1.
     - **Corner Shelf** + **Corner Shelf Bracket** per adjustable-shelf depth (brackets: `ceil(count*3/2)` — 3 brackets per shelf, sold in pairs, rounded up).
     - **Corner Back Panel** × greedy-filled at a fixed **665mm width**, ×2 (both interior faces of the corner).
     - **Ticket Strip** at fixed 500mm width, with colour substitution if the selected ticket colour has no 500mm SKU (`IC_TICKET_SUB`: Blue→Transparent, Orange→Red, Yellow→Green), flagged as a warning ("client cuts to size").
   - **Corner shelf/kickplate SKUs only exist for depths in `IC_DEPTHS = [300,370,470,570]`** — 200mm and 250mm base depth/shelf depths on a corner produce a missing-SKU warning.
   - Rows are re-sorted into a fixed category order: Uprights → Base → Shelves → Back Panel → Accessories → Gondola → Internal Corner.
3. Minimum wall length is 1250mm (`IC_MIN_WALL`) — the 750mm corner plus at least one 500mm bay; shorter inputs are rejected outright.

### 5.1 Current graph-fixture approximation

[`projects/maxshelf/maxshelf.json`](../../projects/maxshelf/maxshelf.json) represents the internal
corner as two independent instances of the reusable Wing graph plus a corner assembly. Wing repeats a
separate Wing Section subgraph; the section owns one shelf bay, shelf-level repetition, its starting
post and base, and the optional terminal post and base.
The second section is rotated 90 degrees, with its depth axis mirrored so its shelves face away
from the wall. Both sections are offset by one 1.26-unit shelf span from the corner origin. Section
count and one `[big, small]` shelf-count array are forwarded to both wings. Each Wing Section uses
470 mm shelves with matching brackets for the lower group and 300 mm shelves with matching brackets
for the upper group. This retired configuration used ordered shelf bundles and paired count arrays;
the active editor uses Repeat Zones for repetition instead.

Wing Section also exposes `Mirror shelves and base`, a boolean authoring input that defaults to
off. When enabled on a Wing Section instance, it adds a second set of both shelf groups, their
brackets, and every section base on the opposite side of the backplate. The mirrored branch reflects
the geometry across the backplate plane while leaving the posts and backplates single-sided. A Sum
node converts the boolean to an optional Array count of zero or one, keeping the behavior within the
existing persisted node vocabulary.

The shelf-count configuration widget labels the two entries **Big shelves** and **Small shelves**,
uses whole-number steps, and limits their combined total to six. Editing either entry clamps it to
the remaining shared total. Authors can add or remove size entries, rename every entry, and change
the total or step from the root graph's Configuration Panel dialog.

The Wing graph's `include-last-support` input is intentionally not promoted to the Root graph or
configuration panel. It is forwarded to Wing Section as `Include last post and base`. Section
instances and their far bracket repeat along negative local X. Wing A disables the terminal support
while Wing B keeps it enabled.

The Root graph exposes `Finish material` as a material configuration control. It presents the
registered Wood, Marble, and Plastic PBR materials. The selected material is forwarded through every
graph-instance boundary. Each graph combines its output geometry and applies the forwarded material
through its final Apply Material node, so the finish covers every emitted mesh.

`Post height` is an enum configuration control with 1200, 1400, 1600, 2100, 2400, 2600, and
2800 mm options. Root forwards the selection through both Wing instances and the Corner 2 assembly.
The Wing Section and Corner 2 graphs connect one Mesh Asset per height to Choice-to-Mesh maps, so
all repeated wing and corner posts change together.

`Backplate type` is an enum configuration control with Plain, Perforated, and Corner options. Root
forwards it through each Wing into Wing Section, where Choice to Mesh chooses between separately
placed backplate assets. The three legacy backplate asset IDs currently resolve to the same 1000 × 300 mm
source GLB, so the selection is persisted and drives the correct asset identity but does not yet
produce a visual mesh difference. Corner 2 retains its fixed 665 × 400 mm plain panels because no
same-size perforated or corner assets exist in the catalog.

Backplates repeat vertically according to the selected post height. Wing Section maps post height
to 4, 5, 6, 7, 8, 9, or 10 repeated 300 mm panels. Corner 2 maps it to 3, 4, 4, 6, 6, 7, or 7
repeated 400 mm panels. Counts use ceiling division so the backplate stack reaches the top of every
post, including heights that are not exact multiples of the available panel height.

Asset choice still needs no product-specific node. Enum graph inputs carry selections across graph
boundaries and Choice to Mesh performs enum-to-asset mapping. Dynamic repetition does require the
generic Choice to Scalar node because Array accepts a numeric count and the selected post height is
stored internally as an enum. This node stores editable choice-to-number mappings and can be reused
anywhere a choice must drive a numeric graph input.

The detailed MaxShelf fixture remains in `projects/maxshelf/maxshelf.json` and is copied to
`scripts/data/maxshelf/defaultGraph.json` for local seeding. The New Project action uses the shared
one-primitive `scripts/data/defaultGraph.json` template instead.

No dedicated internal-corner GLB assets are registered. The Corner graph therefore builds an MVP
L-shaped infill by pairing the available 1000 × 300 back panel, 470mm base leg, and 1000 × 370 shelf
meshes with rotated copies. This fixture demonstrates composition and configuration topology rather
than the exact 750mm diagonal production geometry described above.

## 6. Visualization

Two isometric SVG renderers, hand-built (no 3D library), using a fixed axonometric projection `P(x,y,z) = [(x−z)*0.866, (x+z)*0.5−y]`:
- `drawBay(n, sections)` — straight wall/gondola run.
- `drawCornerIso(data)` — L-shaped corner (two walls at 90° joined by the triangular 750mm corner footprint).

Both derive face shading (top/front/side/edge) from the selected colour's hex by lightening/darkening (`sh()` helper: ±28%/±50% blend toward white/black). Drawing dimensions (upright width, kick height, base thickness, shelf thickness, panel heights) are separate fixed pixel constants from the real mm values — it's a stylized, not scaled-exact, isometric.

## 7. Cart, Config Snapshot & Export

- **Cart** (`CART[]`): each `addToCart()` call snapshots the full current config (`snapshotConfig`, deep-clones `C` plus raw DOM input values) alongside the computed BOM rows and summary string. Items can be renamed, reloaded (`loadCart` → `applyConfig`, fully restores all inputs and re-renders), or removed.
- **Zoho CSV export** (`buildZohoCSV`/`exportZohoCSV`): flattens the cart's BOM rows into a CSV for import.
- **Zoho CRM push**: optional — reads a saved Zoho endpoint URL + company/salesperson selection from `localStorage`, POSTs a JSON payload (`buildZohoPayload`) with an admin lock/unlock gate (`toggleAdmin`/`lockAdmin`/`unlockAdmin`) restricting who can change the endpoint config. This is the only network I/O in the app; everything else is pure client-side computation.
- **Image export**: SVG viz + BOM can be rendered to a downloadable PNG (`svgToCanvas`, `dlCanvas`) with a watermark (`drawWatermark`).

## 8. Summary of Hard-Coded Business Rules

| Rule | Value / Source |
|---|---|
| Bay widths (upright spacing) | 500, 665, 800, 1000, 1250 mm only |
| Shelf depths | 200, 250, 300, 370, 470, 570 mm |
| Back-panel zone height | `uprightHeight − 100mm` |
| Back-panel piece sizes | 100/200/300/400/500 mm (greedy cascade) |
| Perforated panel fixed size | 400mm height |
| LED/RGB panel fixed size | 1200mm height; not offered in 500mm width |
| 110mm uprights | Graphite colour only |
| Upright heights per thickness | 30mm & U-Channel: 2800 only · 80mm: 2100/2400 · 110mm: 2400 only · 60mm: 9 heights 900–3000 |
| Internal corner unit | Fixed 750mm diagonal reserve per wall |
| Internal corner min wall length | 1250mm (750 + 500) |
| Internal corner back panel width | Fixed 665mm, both faces |
| Internal corner shelf/kickplate depths | 300/370/470/570mm only |
| Ticket strip count per section | shelves + 1 (one per level including base) |
| Gondola multiplier | ×2 on all per-face quantities (legs, kickplates, base shelves, shelves, brackets, panels, tickets) |
