# Nested graphs

## Model

Each project document owns a flat collection of reusable graph definitions. `entryGraphId`
selects the definition rendered as the product. A Graph Instance node references another
definition by its document-local ID; there is no external graph address or loading mechanism.

Entry and child graphs share the same model:

- a label and document-local ID;
- public input declarations;
- one geometry output declaration;
- one Graph Input boundary node per public input;
- exactly one Graph Output boundary node;
- graph-local nodes and edges.

Direct and indirect recursive references are rejected.

## Evaluation

Evaluation uses frames containing the active definition, supplied inputs, connection index, node
cache, and graph-instance path. Graph Input nodes resolve supplied values or declaration defaults.
Graph Instance nodes evaluate their referenced definitions recursively and scope both rendered
asset identity and origin-node instance identity, keeping repeated instances distinct in scene
metadata.

Only the graph open in React Flow is used for node previews. The entry graph remains the product
result shown by the normal viewport.

## Editing and navigation

React Flow projects only the open definition. The graph tree is rooted at the entry graph, derives
children from Graph Instance nodes, and lists unreachable definitions under **Unused definitions**.
Repeated instances appear as separate tree rows while opening their shared definition.

Definitions can be created, selected, and removed from the tree, and the active definition can be
renamed by double-clicking its name in the graph toolbar. A definition cannot be
removed while another definition references it, and an instance cannot be added if it would create
a recursive dependency.

## Public inputs

Number, enum, color, and geometry inputs are created as Graph Input nodes. Their labels, defaults,
and enum options are edited on the node. Removing the node also removes its declaration, affected
instance edges, saved entry value, and configuration control.

Configuration controls bind only to compatible public inputs of the entry graph. Inner nodes,
child inputs, instance ports, and instance paths are not binding targets. See
[Editor UI](./editor-ui.md) for panel behavior.

## Persistence

The bundled MaxShelf fixture, JSON Schema, project creation, load/save, and JSON import/export all
use the same nested document shape. See the
[graph document specification](../reference/graph-persistence.md) for the authoritative format.

## Verification

Static TypeScript validation covers the implementation. The project owner still needs to verify
import/export, independent repeated instances, nested mesh identity, tree navigation, entry
controls, and invalid-reference errors in the running application.
