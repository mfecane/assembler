# Kitchen cabinet assembly

The seeded Kitchen project builds one cabinet section from reusable graph definitions in
`scripts/data/kitchen/defaultGraph.json`.

## Assembly hierarchy

- `Kitchen` is the root graph. It contains one `Kitchen Section` instance and owns the saved
  configuration-panel switches.
- `Section` combines Frame, Facade, and Tabletop instances. It exposes size, the tabletop visibility
  switch, and selectors for the tabletop and door styles.
- `Frame` owns only the cabinet carcass and legs.
- `Facade` owns the front panel plus all three door-and-handle assemblies. Its exported
  `Show front panel` boolean keeps visibility independent from the door selector.
- `Tabletop` owns the three stretchable tabletop assets, their size-driven vertical placement, and
  the small top panel.
  Tabletop 2 includes Faucet 1 and Tabletop 3 includes Faucet 2; Tabletop 1 has no faucet.
  Each tabletop preserves its natural Y size because the registered stretch regions only resize X/Z.

The root composes section size from a width slider (60–120 cm in 1 cm increments), a height selector
(100, 110, or 120 cm), and a depth selector (60 or 80 cm). It forwards that size, tabletop visibility,
tabletop style, door style, and handle size into the section. The section forwards handle size to the
Facade handle-stretch input and size and style to the tabletop instance. A geometry-toggle node gates
the complete tabletop branch. The door selector offers No door,
Door 1, Door 2, and Door 3; each door option includes the handle, while No door emits no door geometry.
An explicit Map to Boolean node translates that selector to `Show front panel`: No door maps to true,
while every non-empty door maps to false. The Tabletop graph uses the same readable mapping pattern
for its small top panel: Tabletop 1 shows it, while Tabletop 2 and Tabletop 3 hide it.

## Seed behavior

The section defaults to 120 cm wide, 110 cm high, and 60 cm deep. The tabletop defaults to enabled
with Tabletop 1 selected. Door 1 is the default door. The seed loader already reads the Kitchen graph
document directly, so fresh local rebuilds receive this assembly without a separate migration or
generated replacement graph.

Runtime verification remains with the project owner: confirm all tabletop and door selections in the
Kitchen configuration panel, including faucet pairing and the No door option.
