# Product layouts

## Scope

The Product Editor configures one or more products one level above root graphs. A product selects a
reusable layout definition and stores the choices that fill it. The initial seed has row and single
layout definitions plus separate products using them.

- **Product row** places up to 20 graph instances along the x axis.
- **Single product** contains at most one graph instance at the origin.

The layouts share a slot definition. That definition explicitly lists which root graph definitions
can be newly instantiated and stores expected instance bounds; it may intentionally have no eligible
graphs. Existing items remain valid after their graph is removed from the slot's eligible list. There is no migration or compatibility
adapter for the earlier layout scaffold.

## Document model

The top-level `layout` object owns `activeProductId`, reusable `layouts`, reusable `slots`, and
`products`. A product owns its `layoutId` and graph instances. Each instance has an ID, an allowed
root graph ID, and input overrides. Layout definitions own the customer-panel
`configurationHeader`, product type assignment, and capacity; slot definitions remain reusable.

`LayoutModel` validates intrinsic IDs, ranges, maximum counts, and references. `GraphDocumentModel`
adds cross-layer validation for root graph eligibility and input value compatibility. Layout edits
use the normal editor command history and therefore participate in undo, redo, dirty state, export,
and autosave.

## 3D flow

`LayoutEvaluator` evaluates every active product item with its own input values, namespaces its
scene instance IDs, translates it to the product layout's slot origin, and combines the scene
metadata. Positioning is isolated behind the `ProductLayout` interface: `RowLayout` spaces items
along the x axis, while `SingleItemLayout` keeps its only item at the origin. Row placement derives
each item's axis-aligned bounds from all of its evaluated assets, including their transforms. It
keeps the first item at its authored origin and translates each following item until its left bound
meets the preceding item's right bound. The next-slot action is anchored at the center of the
average evaluated item bounding box, placed immediately after the row.

The next available slot is a world-space position, not a CSS percentage. `LayoutViewportScene`
uses the blocky photo studio KTX2 texture for its blurred background and image-based lighting. The
environment-lighting contribution is reduced to 50% while the background retains its original
brightness. The custom shader floor has a circular semi-transparent fill that smoothly fades into
that background, and it omits the technical grid and axis helper. It projects the next position
through the live Three.js camera on every camera update and resize. React
renders a floating Plus button at the resulting screen coordinate. Activating it creates the first
allowed root graph using its first saved configuration template when available, or graph defaults,
and the next row slot action moves alongside the newly created instance.
The transparent `cat.png` scale-reference billboard sits on the floor at the front center of the
evaluated assembly at 0.45 m high. Its shader keeps it vertical while using the camera view and
projection matrices to face the camera only around the Y axis. It remains alpha-blended for soft
cutout edges but uses a higher transparent render order than the floor, preventing camera-dependent
floor blending over the cat while retaining depth tests against opaque assembly geometry.
The Product Editor camera uses the OrbitControls polar-angle limit to stop orbiting at the
ground-facing hemisphere.

## Configuration flow

The editor has two separate sibling panels. The left panel exposes only customer-facing choices for
the active product. **Product options** is the configurator-admin surface:
it selects the active product's layout, edits layout-owned values, and opens the standalone product-type
editor for the definition referenced by that layout. The popup owns width/depth/height bounds,
the definition name, and product eligibility. Product options explicitly assigns one available
definition to each layout; selecting a definition inside the popup only changes which definition is
being edited. Dimension bindings are defined once on the root graph in the Graph Editor's layout-dimensions
dialog. **Current configurations** is the product-user surface on the left of the viewport: it uses the active
layout's editable call-to-action heading and renders one card per occupied slot with deletion and
the graph's configured customer controls. Those controls write only to
that layout instance's `inputValues`; root preview configuration remains independent.

Adding and deleting items is available both through the current-configurations panel and the
3D slot action. The single layout hides the 3D add action and disables further additions after its
first instance.

## Verification

Static TypeScript compilation and JSON parsing cover integration and checked-in fixtures. Camera
interaction, mesh appearance, and control behavior require owner-run browser verification.
