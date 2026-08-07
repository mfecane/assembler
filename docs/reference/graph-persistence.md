# Graph document specification

The graph document contains everything required to edit and evaluate one product:

- `entryGraphId` selects the graph rendered in the viewport.
- `entryInputValues` stores current values supplied to the entry graph.
- `graphs` contains every graph definition available for instantiation.
- `configurationPanel.controls` describes the entry inputs exposed in the product configurator.
- `configurationPanel.constraints` stores cross-input rules enforced by both the document model and
  configurator UI.

The machine-readable shape is [graph.schema.json](./graph.schema.json).

## Shared projects

Every authenticated user can list, open, edit, rename, and delete every project. A project records
the creator's auth user ID and email when it is created; the dashboard displays that email on the
project card. Anonymous access remains blocked by row-level security.

## Graph definitions

Every graph definition contains:

- A document-local `id` and human-readable `label`.
- Public `inputs`.
- One geometry `output`.
- Its own nodes and edges.
- Exactly one `graphOutput` boundary node.
- Exactly one `graphInput` boundary node for each public input.

Every persisted node has its own non-empty `name`, independent of graph-interface labels and
configuration-control labels. Names are editable from node headers and do not affect evaluation or
port identity.

The entry graph has exactly the same structure as every child graph. Its only special behavior
is that `entryGraphId` selects it as the document result.

## Graph instances

A `graphInstance` node stores one `graphId`, an embedded transform, and an `inputValues` object for
instance-specific scalar input values. The graph ID must resolve to a definition in the same
document. Every stored input value must target a declared non-geometry input and match its type and,
for enums and colors, its current options. There is no external graph address or loading mechanism.

The instance input ports and geometry output port are derived from the referenced definition. Its
inputs resolve from connected parent values first, instance-specific values second, and declared
defaults third. Its transform is applied to the complete evaluated child assembly.

Definitions may instantiate other definitions. The dependency graph must remain acyclic.

## Configuration panel

Configuration controls bind only to public inputs of the entry graph:

```json
{
  "id": "finish-control",
  "inputId": "finish",
  "label": "Finish",
  "type": "color"
}
```

Controls cannot address graph IDs, node IDs, instance IDs, instance paths, or ports. A child
value must be promoted through parent graph interfaces until it becomes an entry input.

Entry input values are independent from UI presentation. Hiding a control does not remove its
input or reset its saved value.

Each control stores its rendered element type and only types compatible with its input are
valid:

- Number inputs support `number` controls with `step`, or `slider` controls with `min`, `max`,
  and `step`.
- Enum inputs support `select`.
- Color inputs support `color`; the control lists only the input's configured color options.
- Boolean inputs support `switch`.
- Geometry inputs cannot be mapped to the configuration panel.

The `sumMaximumByEnum` constraint limits the combined value of two or more number inputs according
to the selected value of an enum input:

```json
{
  "type": "sumMaximumByEnum",
  "inputIds": ["big-shelves", "small-shelves"],
  "selectorInputId": "post-height",
  "maximums": {
    "1200 mm": 4,
    "1400 mm": 5
  }
}
```

Every selector option requires exactly one non-negative finite maximum. Constrained inputs must be
numeric entry inputs, and one numeric input cannot belong to multiple constraints. Each constrained
slider's effective maximum is the group maximum minus the other constrained values. If a selector
change lowers the maximum below the current total, inputs are reduced in `inputIds` order: earlier
values are preserved and later values are reduced first. Constrained values must be non-negative.

The configuration-panel editor is available only while the entry graph is open. It presents the
ordered control list and lets authors manually add a predefined compatible UI item, bind it to an
unused entry input, configure its presentation settings, drag it into display order, or remove it.
Its Constraints section can add or remove `sumMaximumByEnum` rules, choose the enum selector, select
at least two number inputs, reorder their preservation priority, and edit the maximum for every enum
option. Number inputs already used by another constraint are disabled. Creating a constraint starts
with the first two available number inputs and initializes every maximum to their current total, so
the document remains valid while the author configures the rule.
Public inputs for all graphs are created, configured, and removed as nodes on the canvas. A color
input stores a required, non-empty `options` list selected from the standard preset palette. Authors
configure the allowed subset and default directly on its Graph Input node; at least one color must
remain enabled.

## Semantic validation

Application validation enforces rules that JSON Schema cannot express:

1. Graph, input, node, edge, and control IDs are unique in their scopes.
2. `entryGraphId` resolves inside `graphs`.
3. Every instance reference resolves inside the current document.
4. Graph dependencies are acyclic.
5. Boundary nodes match their containing graph interface.
6. Edge endpoints and ports exist in their containing graph.
7. Connected ports have identical value types.
8. At most one edge targets an input port.
9. Entry and graph-instance values match their input declarations.
10. Configuration controls target compatible entry inputs only.
11. Every color input has a unique, non-empty list of supported preset colors and uses one of them
    as its default.
12. Configuration constraints reference compatible entry inputs, completely map their selector's
    options, do not overlap numeric inputs, and are satisfied by persisted entry values.

## Import and export

Export writes the complete current document with two-space JSON formatting. Import accepts
only the document shape described here and rebuilds every graph scope against the document's
local graph interface index.

Color-input `options` and `configurationPanel.constraints` are required. Documents from earlier
shapes that omit either property are intentionally unsupported and must be rebuilt or edited before
import; no compatibility migration is provided.

Evaluated meshes, Three.js objects, editor selection, graph-tree expansion, and viewport state
are runtime data and are not serialized.

## Checked-in default

`projects/maxshelf/maxshelf.json` is the editable MaxShelf project fixture, and
`src/data/defaultGraph.json` is its identical new-project and local-seed copy. The fixtures preserve
the full shelving example—including assets, required copy and assembly transforms, arrays,
configurable inputs, and connections—rather than a reduced smoke-test graph.
`scripts/seed-local-supabase.mjs` reads the default copy directly instead of carrying embedded data.

The fixture uses five graph definitions:

- `main` (`Root`) exposes left-section count, separate big- and small-shelf counts, right-section
  count, finish color, post height, and backplate type. It places two Wing instances and one corner
  assembly into the configured-shelving output.
- `graph-4` (`Wing`) repeats and combines instances of `graph-1` (`Wing Section`).
- `graph-1` (`Wing Section`) builds one shelving section with 470 mm lower shelves and 300 mm upper
  shelves. Separate arrays share a 0.2-unit level spacing; the upper array starts at the lower
  array's effective count through Array's `startIndex` input. Mesh Selector nodes choose its post
  height and repeated backplate type from enum inputs forwarded by Wing. An Enum to Number node maps
  post height to the repeated backplate count.
- `graph-2` (`Corner`) builds the paired-panel MVP corner infill retained in the project.
- `graph-3` (`Corner 2`) builds the corner assembly currently instantiated by Root. Its post Mesh
  Selectors share Root's post-height choice; its 665 × 400 mm back panels remain fixed because the
  catalog has no matching alternate backplate-type assets. Its own Enum to Number mapping repeats
  those panels high enough to fill the selected posts.

Every graph exposes the finish-color input, forwards it through child graph instances, combines its
output geometry, and applies the color with a final Material node. Root binds this input to a color
configuration control rendered from the allowed list stored on the input. The checked-in MaxShelf
input enables all nine standard presets. Root also binds post height and backplate type enum inputs
to select controls. A `sumMaximumByEnum` constraint limits the combined big- and small-shelf count
from the selected post height. The fixture uses generic graph-input, mesh-selector, and
enum-to-number nodes rather than introducing product-specific nodes.
