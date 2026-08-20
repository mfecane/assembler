# Graph document specification

The graph document contains everything required to edit and evaluate one product:

- `client` is either `maxshelf` or `kitchen`; it selects the client-specific mesh catalog.
- `rootGraphs` identifies every independently configurable top-level graph. Each item owns the
  saved `inputValues`, optional `layoutMetadata`, and `configurationPanel`, including its saved
  configuration templates, for its referenced graph.
- `enums` stores reusable document-level enum definitions.
- `graphs` contains every graph definition available for instantiation.
- `layout` stores the selected product-level row or single layout, reusable slot rules, and graph
  instances with their instance-specific input values.

The first `rootGraphs` item is the default root opened after load and used by callers that request
the document's default product result. Selecting another root in the editor evaluates that graph
with its own saved values.

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
- Exactly one exported `input` node, with the same ID, for each public input.

An `inputReference` node may point to any public input of its containing graph. It persists only the
target `inputId`; its output type and evaluated value are derived from that graph input, so a
reference node never owns a duplicate default or override. Removing a public input removes its
references from the same graph.

Every persisted node has its own non-empty `name`, independent of graph-interface labels and
configuration-control labels. Names are editable from node headers and do not affect evaluation or
port identity.

A `pin` node stores the value type of the output that created it. It has one same-typed input and
output, passes evaluation through unchanged, and can fan that output out to multiple destinations.
Pins use the existing node and edge document shape, so adding them does not change existing graph
documents or require seed-data rewrites.

An edge between `vector3` and `number` ports stores a `component` of `x`, `y`, or `z`. Vector-to-number
evaluation extracts that component. Number-to-vector evaluation replaces that component on the
target port's stored/default vector and preserves its other two components. Edges between matching
types omit `component`.

A root graph has exactly the same definition structure as every reusable child graph. Its root
record supplies top-level values and presentation configuration without duplicating its definition.
A graph can occur at most once in `rootGraphs`.

Root `layoutMetadata.axisBinding` is optional. Its optional `primary`, `secondary`, and `tertiary`
entries map a public number input or one component of a public vector input to the graph’s width,
depth, and height respectively:

```json
{
  "axisBinding": {
    "primary": { "inputId": "facade-size", "component": "x" },
    "secondary": { "inputId": "facade-size", "component": "z" },
    "tertiary": { "inputId": "facade-size", "component": "y" }
  }
}
```

Number inputs omit `component`. Removing every binding removes `layoutMetadata` entirely.

Node data also stores overrides only for registered node defaults. This includes identity transform
values: zero translation and rotation, unit scale, and middle origins are omitted independently;
any changed transform component remains saved. Array nodes omit repeat counts of one and offsets of
zero; Multi Array nodes omit its default x axis and offset of one.

## Enum definitions

Enum option lists live once in the top-level `enums` collection:

```json
{
  "id": "post-height",
  "name": "Post height",
  "options": ["1200 mm", "1400 mm", "1600 mm"]
}
```

An enum input node stores `enumId` instead of `options`. Its zero-based numeric default remains
local to that node and must index the referenced definition. Definitions have document-unique IDs,
non-empty names, and non-empty unique option lists.

## Graph instances

A `graphInstance` node stores one `graphId`, an embedded transform, and an `inputValues` object for
instance-specific non-geometry input values. The graph ID must resolve to a definition in the same
document. Every stored input value must target a declared non-geometry input and match its type;
choice values must be valid option indices in the referenced choice set and colors must use `#RRGGBB`. There is
no external graph address or loading mechanism.

The instance input ports and geometry output port are derived from the referenced definition. Its
inputs resolve from connected parent values first, instance-specific values second, and declared
defaults third. Its transform is applied to the complete evaluated child assembly.

Definitions may instantiate other definitions. The dependency graph must remain acyclic.

## Product layouts

`layout.activeProductId` selects one persisted product. Each product selects a reusable layout with
`layoutId` and owns the items that fill it. Each layout definition owns the customer configuration
panel's `configurationHeader`. A row layout distributes items along the x axis and accepts up to
its `slotsCount.max`; a single layout accepts one item. `slotId` explicitly assigns one product type
to each layout. The Product Editor can create additional products and product types.

A slot definition owns its label, the root graph IDs it permits, and width/depth/height bounds. Each
layout item may persist `layoutMetadata.axisBinding` entries for `primary`, `secondary`, and
`tertiary`; graph definitions carry none of this layout data. A binding points to a number input ID
or a vector input component such as `size.x`. Row positioning does not require these bindings: it
derives each item's transformed bounds from its evaluated scene and places the next item's left
bound against the preceding item's right bound. Each occupied slot is represented by a layout graph
instance with a unique ID, an allowed root `graphId`, and instance-owned `inputValues`. Missing
values use the graph input defaults. Creating an instance uses the first saved configuration
template for the chosen graph when one exists, otherwise it starts with graph defaults.

The active layout is evaluated above the graph layer: every instance evaluates the same graph
definition independently, its scene metadata is translated to the slot origin, and all results are
combined for the layout viewport. Configuration controls are derived from the selected root graph's
configuration panel but write to the layout instance instead of the root preview values.

## Configuration panel

Each root record owns a configuration panel whose controls bind only to public inputs of that root:

```json
{
  "id": "finish-control",
  "inputId": "finish",
  "label": "Finish",
  "type": "material",
  "options": ["#eaceac", "#f4f4f5", "#27272a"]
}
```

Controls cannot address graph IDs, node IDs, instance IDs, instance paths, or ports. A child value
must be promoted through parent graph interfaces until it becomes an input of the owning root.

Root input values are independent from UI presentation. Hiding a control does not remove its input
or reset its saved value. Controls in one root never affect another root.

Each root configuration panel can also store named templates. A template is a set of values keyed
by the root inputs currently exposed by that panel. Creating a template captures the current
configuration. Applying it updates those values together. Templates are reconciled whenever the
panel schema changes: values for removed controls are discarded, values for newly exposed controls
use their graph-input defaults, and values that no longer fit an input or number-array control reset
to the applicable default. This keeps saved templates usable as the configuration panel evolves.

Each control stores its rendered element type and only types compatible with its input are
valid:

- Number inputs support `number` controls with `step`, or `slider` controls with `min`, `max`,
  and `step`.
- Number-array inputs support `numberArray`. The control owns one display label per array item, a
  positive `step`, and a non-negative `total` maximum shared by all items. Changing the label count
  resizes the root value; lowering the total preserves earlier values and reduces later values.
- Enum inputs support `select`.
- Material inputs support `material`; the control uses the registered material catalog.
- Boolean inputs support `switch`.
- Geometry inputs cannot be mapped to the configuration panel.

The number-array control stores related values and their total limit together:

```json
{
  "id": "shelf-counts-control",
  "inputId": "shelf-counts",
  "label": "Shelves by size",
  "type": "numberArray",
  "labels": ["Big shelves", "Small shelves"],
  "total": 6,
  "step": 1
}
```

The configuration-panel editor is available while any root graph is open. It presents that root's
ordered control list and lets authors manually add a predefined compatible UI item, bind it to an
unused root input, configure its presentation settings, drag it into display order, or remove it.
Number-array items additionally edit their value labels, item count, step, and shared total.
Input nodes own their local defaults. Their Export switch creates or removes the matching public
graph input without deleting the local node. A material input stores a registered material ID.
When a root material input is exposed to customers, its configuration control presents the
registered materials. Choice Input nodes select or create a shared choice set, show how many graph
inputs reference it, keep their own default selection, and open a separate dialog for editing the
shared name and options.

## Semantic validation

Application validation enforces rules that JSON Schema cannot express:

1. Graph, input, node, edge, and control IDs are unique in their scopes.
2. Every `rootGraphs.graphId` is unique and resolves inside `graphs`; at least one root is required.
3. Every instance reference resolves inside the current document.
4. Graph dependencies are acyclic.
5. Every public input matches an exported Input node with the same ID, type, and default.
6. Edge endpoints and ports exist in their containing graph.
7. Connected ports have identical value types.
8. At most one edge targets an input port.
9. Root and graph-instance values match their input declarations.
10. Configuration controls target compatible inputs on their owning root only.
11. Every material input and stored material value is a non-empty registered-material ID.
12. Number-array controls have one or more labels and stored values of the same length whose sum
    does not exceed the control total.
13. Enum IDs are unique, every enum input resolves one definition, and its default belongs to that
    definition.
14. The active layout, layout slot references, allowed root graph IDs, unique instance IDs, maximum
    slot counts, slot bounds, and every instance input override are valid.
15. Every graph layout-axis binding resolves to an exported number input or vector component.
16. Every root layout-axis binding resolves to a public number input or vector component.

## Import and export

Export writes the complete current document with two-space JSON formatting. Import accepts
only the document shape described here and rebuilds every graph scope against the document's
local graph interface index.

Top-level `client`, `layout`, `rootGraphs`, `enums`, and `graphs`; root-level `inputValues`, optional
`layoutMetadata`, and `configurationPanel`;
enum-input `enumId` is required when its input type is `enum`.
Documents from the former singular `entryGraphId` / `entryInputValues` shape, documents that store
choice options on graph inputs, and documents using the earlier `layout.layouts[].slotIds` plus
instance-like `layout.slots[]` shape are intentionally unsupported. No compatibility migration is
provided.

Choice to Mesh and Geometry Toggle add persisted `choiceToMeshMap` and `geometryToggle` node types.
Choice to Mesh stores stable input IDs and matching enum indices; Toggle stores its disconnected boolean
fallback. Builds predating these node types cannot import documents that contain them; no
compatibility migration is provided.

Evaluated meshes, Three.js objects, editor selection, graph-tree expansion, and viewport state
are runtime data and are not serialized.

## Checked-in default

[`scripts/data/defaultGraph.json`](../../scripts/data/defaultGraph.json) is the shared minimal template
for the New Project action. It contains one root graph with a box primitive connected to the graph
output, and `createDefaultGraph` assigns the selected client before creation.

The local seed uses the separate complete graphs at
[`scripts/data/maxshelf/defaultGraph.json`](../../scripts/data/maxshelf/defaultGraph.json) and
[`scripts/data/kitchen/defaultGraph.json`](../../scripts/data/kitchen/defaultGraph.json), creating one
project per client for each seeded user. These files are copies of the corresponding fixtures under
`projects/`. A project's client remains immutable while it is open; importing a graph for another
client is rejected.
