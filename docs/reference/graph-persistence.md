# Graph document specification

The graph document contains everything required to edit and evaluate one product:

- `entryGraphId` selects the graph rendered in the viewport.
- `entryInputValues` stores current values supplied to the entry graph.
- `graphs` contains every graph definition available for instantiation.
- `configurationPanel.controls` describes the entry inputs exposed in the product configurator.

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

The entry graph has exactly the same structure as every child graph. Its only special behavior
is that `entryGraphId` selects it as the document result.

## Graph instances

A `graphInstance` node stores one `graphId`. That ID must resolve to a definition in the same
document. There is no external graph address or loading mechanism.

The instance input ports and geometry output port are derived from the referenced definition.
Its inputs resolve from connected parent values first and declared defaults second.

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
- Color inputs support `color`.
- Geometry inputs cannot be mapped to the configuration panel.

The configuration-panel editor is available only while the entry graph is open. It lists every
compatible entry input, and an input's switch adds or removes its configuration control. Enabled
inputs expose their compatible control type and presentation settings inline. Public inputs for
all graphs are created, configured, and removed as nodes on the canvas.

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
9. Entry values match their input declarations.
10. Configuration controls target compatible entry inputs only.

## Import and export

Export writes the complete current document with two-space JSON formatting. Import accepts
only the document shape described here and rebuilds every graph scope against the document's
local graph interface index.

Evaluated meshes, Three.js objects, editor selection, graph-tree expansion, and viewport state
are runtime data and are not serialized.

## Checked-in default

`src/parametric/defaultGraph.json` is the canonical new-project and local-seed fixture. It
preserves the full MaxShelf shelving example—including its mesh selectors, transforms, arrays,
groups, material, configurable inputs, and connections—rather than a reduced smoke-test graph.
Schema changes must update this fixture in place while retaining as much of that graph as the
new shape permits. `scripts/seed-local-supabase.mjs` reads this exact file instead of carrying a
second embedded copy.

The fixture uses two graph definitions:

- `main` exposes bay count, shelves per bay, shelf style, back-panel style, and finish. Every
  input has a configuration-panel control. It instantiates one wing, copies and rotates that
  result into the second side, and combines both sides with the corner infill.
- `wing` contains one complete straight shelving wing. Its five public inputs replace the
  former embedded number, selector, and color value nodes while preserving the original wing's
  mesh, transform, array, grouping, and material topology.
