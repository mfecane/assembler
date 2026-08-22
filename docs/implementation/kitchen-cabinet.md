# Kitchen cabinet assembly

The seeded Kitchen project builds a configurable repeated cabinet assembly from reusable graph
definitions in `scripts/data/kitchen/project.json`.

The Kitchen mesh catalog registers all 20 GLB files in `assets/kitchen`, including the Frame Sink 3
and Sink 3 models; the latter two are available for selection as standalone assets but are not
added to the seeded cabinet graph.

## Assembly hierarchy

- `Kitchen Assembly` is the root repeat graph. It owns the section count, per-section width and
  tabletop arrays, shared height, depth, handle-size, and tabletop-material inputs, and one repeated
  `Cabinet Section` instance. It converts the selected width, height, and depth into a meter-valued
  size vector before entering the repeated cabinet.
- `Cabinet Section` combines Cabinet Frame, Door Facade, and Tabletop & Faucet instances. It exposes
  size, the tabletop visibility switch, and selectors for the tabletop and door styles.
- `Cabinet Frame` owns only the cabinet carcass and legs.
- `Door Facade` owns the front panel plus all three door-and-handle assemblies. Its exported
  `Show front panel` boolean keeps visibility independent from the door selector.
- `Tabletop & Faucet` owns the three stretchable tabletop assets, their size-driven vertical placement, and
  the small top panel.
  Tabletop 2 includes Faucet 1 and Tabletop 3 includes Faucet 2; Tabletop 1 has no faucet.
  Each tabletop preserves its natural Y size because the registered stretch regions only resize X/Z.

The product configuration stores section widths in centimeters for direct editing (50–100 cm in
1 cm increments). The repeat graph converts each selected width to meters immediately after reading
the per-section array; aggregation, placement, and every nested graph receive only meter values.
Height and depth use labeled selectors (100, 110, or 120 cm and 60 or 80 cm respectively) whose
mapping nodes likewise emit meters. The assembly forwards both selectors into every repeated section;
the resulting size vector then reaches the frame, facade, and tabletop graphs. Both selectors are
available in the root preview and product configuration UI. The assembly forwards size, tabletop style,
and handle size directly into the repeated cabinet. The cabinet forwards handle size to the Facade
handle-stretch input and size and style to the tabletop instance. A geometry-toggle node gates the
complete tabletop branch. The door selector offers No door,
Door 1, Door 2, and Door 3; each door option includes the handle, while No door emits no door geometry.
Handle size follows the same boundary rule as width: authors edit centimeters, then a dedicated
conversion node emits meters before the value enters the Cabinet Section and Door Facade graphs.
Tabletop material follows its own input path through the assembly and cabinet graphs and binds only to
the three tabletop assets. Faucet and sink materials remain on their existing internal metal inputs.
Cabinet material remains independent and continues to drive only the frame and facade branches.
An explicit Map to Boolean node translates that selector to `Show front panel`: No door maps to true,
while every non-empty door maps to false. The Tabletop graph uses the same readable mapping pattern
for its small top panel: Tabletop 1 shows it, while Tabletop 2 and Tabletop 3 hide it.

## Seed behavior

The product starts with three sections measuring 78, 100, and 77 cm wide at 100 cm high and 80 cm
deep. Handle size is 20 cm at the product-facing input and 0.2 m throughout the nested graphs. All
three product sections initially use Tabletop 3. The standalone root preview retains three sections
with 100, 200, and 100 cm widths at 120 cm high and 80 cm deep. Both configurations start with marble
tabletops. The seed loader reads the Kitchen graph document directly, so fresh local rebuilds receive
this assembly without a separate migration or generated replacement graph.

Runtime verification remains with the project owner: confirm all tabletop and door selections in the
Kitchen configuration panel, including faucet pairing and the No door option.
