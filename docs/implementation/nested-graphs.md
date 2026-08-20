# Nested graphs

## Model

Each project document owns a flat collection of reusable graph definitions. `rootGraphs` selects
one or more independently configurable top-level definitions. A Graph Instance node references
another definition by its document-local ID; there is no external graph address or loading
mechanism.

Root and child graphs share the same definition model:

- a label and document-local ID;
- public input declarations;
- one geometry output declaration;
- one exported Input node per public input;
- exactly one Graph Output boundary node;
- graph-local nodes and edges.

Direct and indirect recursive references are rejected.

## Evaluation

Evaluation uses frames containing the active definition, supplied inputs, connection index, node
cache, and graph-instance path. Exported Input nodes resolve supplied values or their local defaults;
non-exported Input nodes always use their local values.
Graph Instance inputs resolve connected parent values first, instance-specific values second, and
the referenced declaration's defaults last. Graph Instance nodes evaluate their referenced
definitions recursively and scope both rendered asset identity and origin-node instance identity,
keeping repeated instances distinct in scene metadata.

Only the graph open in React Flow is used for node previews. When that graph is a root, its own
saved root inputs are used; non-root previews use declaration defaults.

## Editing and navigation

React Flow projects only the open definition. The graph selector renders every root as a dependency
tree, with each instantiated definition nested beneath its containing definition. Repeated instances
of the same definition in one containing graph collapse to one tree entry. Definitions with no root
status and no incoming instance reference appear in a separate unused-graphs forest, along with any
dependencies they contain. Selecting a dependency from a root tree also selects that tree's root
navigation context; selecting an unused graph keeps the current root context.

Root definitions and reusable assemblies can be created separately, selected, edited, and removed.
Editing can promote a subgraph to a root or demote a root to a subgraph. Demotion removes the root's
configuration state after confirmation but preserves the definition. The project's final root
cannot be demoted or removed. Any definition referenced by an instance is also protected from
deletion, and an instance cannot be added if it would create a recursive dependency.

## Public inputs

Number, number-array, vector 3, enum, material, color, boolean, and geometry values are created as Input nodes.
Their Export switch controls whether they appear in the graph interface. Labels and defaults are
edited on the node; material defaults and disconnected material instance values use the
registered PBR material catalog. Enum inputs select a document-level enum definition whose name and
options are shared by every referencing graph input; the same node edits that shared definition and
shows its usage count. Disabling Export removes its declaration, affected instance edges and values,
saved root value, and configuration control while preserving the node. An enum definition is removed when its last
referencing input is removed or rebound. Assembly Instance
nodes expose inline editors for disconnected number, number-array, vector 3, enum, material, and boolean inputs. Connected
inputs are disabled because their incoming edge takes precedence; geometry inputs remain
connection-only.

Each root owns configuration controls that bind only to compatible public inputs of that root.
Inner nodes, child inputs, instance ports, and instance paths are not binding targets. Material
controls use the registered material catalog. See
[Editor UI](./editor-ui.md) for panel behavior.

## Persistence

The bundled MaxShelf fixture, JSON Schema, project creation, load/save, and JSON import/export all
use the same nested document shape. See the
[graph document specification](../reference/graph-persistence.md) for the authoritative format.

## Verification

Static TypeScript validation covers the implementation. The project owner still needs to verify
import/export, independent repeated instances, nested mesh identity, multi-root tree navigation,
per-root controls, and invalid-reference errors in the running application.
