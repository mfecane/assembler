# Graph document specification

The graph document contains everything required to edit and evaluate one product:

- `rootGraphs` identifies every independently configurable top-level graph. Each item owns the
  saved `inputValues` and `configurationPanel` for its referenced graph.
- `enums` stores reusable document-level enum definitions.
- `graphs` contains every graph definition available for instantiation.

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
- Exactly one `graphInput` boundary node for each public input.

Every persisted node has its own non-empty `name`, independent of graph-interface labels and
configuration-control labels. Names are editable from node headers and do not affect evaluation or
port identity.

A root graph has exactly the same definition structure as every reusable child graph. Its root
record supplies top-level values and presentation configuration without duplicating its definition.
A graph can occur at most once in `rootGraphs`.

## Enum definitions

Enum option lists live once in the top-level `enums` collection:

```json
{
  "id": "post-height",
  "name": "Post height",
  "options": ["1200 mm", "1400 mm", "1600 mm"]
}
```

An enum graph input stores `enumId` instead of `options`. Its default remains local to that graph
interface and must be present in the referenced definition. Definitions have document-unique IDs,
non-empty names, and non-empty unique option lists. Standalone Enum nodes remain local value-source
nodes and continue to persist their own options.

## Graph instances

A `graphInstance` node stores one `graphId`, an embedded transform, and an `inputValues` object for
instance-specific scalar input values. The graph ID must resolve to a definition in the same
document. Every stored input value must target a declared non-geometry input and match its type;
choice values must also belong to the referenced choice set and colors must use `#RRGGBB`. There is
no external graph address or loading mechanism.

The instance input ports and geometry output port are derived from the referenced definition. Its
inputs resolve from connected parent values first, instance-specific values second, and declared
defaults third. Its transform is applied to the complete evaluated child assembly.

Definitions may instantiate other definitions. The dependency graph must remain acyclic.

## Configuration panel

Each root record owns a configuration panel whose controls bind only to public inputs of that root:

```json
{
  "id": "finish-control",
  "inputId": "finish",
  "label": "Finish",
  "type": "color",
  "options": ["#eaceac", "#f4f4f5", "#27272a"]
}
```

Controls cannot address graph IDs, node IDs, instance IDs, instance paths, or ports. A child value
must be promoted through parent graph interfaces until it becomes an input of the owning root.

Root input values are independent from UI presentation. Hiding a control does not remove its input
or reset its saved value. Controls and constraints in one root never affect another root.

Each control stores its rendered element type and only types compatible with its input are
valid:

- Number inputs support `number` controls with `step`, or `slider` controls with `min`, `max`,
  and `step`.
- Enum inputs support `select`.
- Color inputs support `color`; the control owns a non-empty, unique list of `#RRGGBB` choices.
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
numeric inputs on the same root, and one numeric input cannot belong to multiple constraints. Each constrained
slider's effective maximum is the group maximum minus the other constrained values. If a selector
change lowers the maximum below the current total, inputs are reduced in `inputIds` order: earlier
values are preserved and later values are reduced first. Constrained values must be non-negative.

The configuration-panel editor is available while any root graph is open. It presents that root's
ordered control list and lets authors manually add a predefined compatible UI item, bind it to an
unused root input, configure its presentation settings, drag it into display order, or remove it.
Its Constraints section can add or remove `sumMaximumByEnum` rules, choose the enum selector, select
at least two number inputs, reorder their preservation priority, and edit the maximum for every enum
option. Number inputs already used by another constraint are disabled. Creating a constraint starts
with the first two available number inputs and initializes every maximum to their current total, so
the document remains valid while the author configures the rule.
Public inputs for all graphs are created, configured, and removed as nodes on the canvas. A color
input stores only an arbitrary `#RRGGBB` default, edited with an RGB picker on its Graph Input node.
When a root color input is exposed to customers, its configuration control owns and edits the
available RGB choices. Choice Graph Input nodes select or create a shared choice set, show how many graph
inputs reference it, keep their own default selection, and open a separate dialog for editing the
shared name and options.

## Semantic validation

Application validation enforces rules that JSON Schema cannot express:

1. Graph, input, node, edge, and control IDs are unique in their scopes.
2. Every `rootGraphs.graphId` is unique and resolves inside `graphs`; at least one root is required.
3. Every instance reference resolves inside the current document.
4. Graph dependencies are acyclic.
5. Boundary nodes match their containing graph interface.
6. Edge endpoints and ports exist in their containing graph.
7. Connected ports have identical value types.
8. At most one edge targets an input port.
9. Root and graph-instance values match their input declarations.
10. Configuration controls target compatible inputs on their owning root only.
11. Every color input and stored color value uses `#RRGGBB`; every color configuration control owns
    a non-empty, unique RGB option list containing its current root value.
12. Configuration constraints reference compatible inputs on their owning root, completely map
    their selector's options, do not overlap numeric inputs, and are satisfied by persisted values.
13. Enum IDs are unique, every enum input resolves one definition, and its default belongs to that
    definition.

## Import and export

Export writes the complete current document with two-space JSON formatting. Import accepts
only the document shape described here and rebuilds every graph scope against the document's
local graph interface index.

Top-level `rootGraphs`, `enums`, and `graphs`; root-level `inputValues` and `configurationPanel`;
enum-input `enumId`; color-control `options`; and root configuration constraints are required.
Documents from the former singular `entryGraphId` / `entryInputValues` shape and documents that
store choice or color options on graph inputs are intentionally unsupported. No compatibility
migration is provided.

Evaluated meshes, Three.js objects, editor selection, graph-tree expansion, and viewport state
are runtime data and are not serialized.

## Checked-in default

`projects/maxshelf/maxshelf.json` is the editable MaxShelf project fixture, and
`src/data/defaultGraph.json` is its identical new-project and local-seed copy. The fixtures preserve
the full shelving example—including assets, required copy and assembly transforms, arrays,
configurable inputs, and connections—rather than a reduced smoke-test graph.
`scripts/seed-local-supabase.mjs` reads the default copy directly instead of carrying embedded data.

The fixture uses five graph definitions and two root records:

- `main` (`Root`) exposes left-section count, separate big- and small-shelf counts, right-section
  count, finish color, post height, and backplate type. It places two Wing instances and one corner
  assembly into the configured-shelving output.
- `graph-4` (`Wing`) repeats and combines instances of `graph-1` (`Wing Section`).
- `graph-1` (`Wing Section`) builds one shelving section with 470 mm lower shelves and 300 mm upper
  shelves. Separate arrays share a 0.2-unit level spacing; the upper array starts at the lower
  array's effective count through Array's `startIndex` input. Mesh Selector nodes choose its post
  height and repeated backplate type from choice inputs forwarded by Wing. Its optional
  `mirror-shelves-and-base` boolean input adds reflected shelf, bracket, and base geometry behind the
  backplate without duplicating posts or panels. A Choice to Number node maps post height to the
  repeated backplate count.
- `graph-2` (`Corner`) builds the paired-panel MVP corner infill retained in the project.
- `graph-3` (`Corner 2`) builds the corner assembly currently instantiated by Root. Its post Mesh
  Selectors share Root's post-height choice; its 665 × 400 mm back panels remain fixed because the
  catalog has no matching alternate backplate-type assets. Its own Choice to Number mapping repeats
  those panels high enough to fill the selected posts.

`main` is the first root and retains the complete MaxShelf configuration panel. `graph-2` is a
second root with its own shelf-count and finish-color controls, demonstrating that roots persist
and evaluate independent UI configurations without copying their graph definitions.

The fixture defines `post-height` and `backplate-type` once in the document-level enum collection.
Every Root, Wing, Wing Section, and Corner 2 input that forwards those choices references the same
definition rather than persisting another option array.

Every graph exposes the finish-color input, forwards it through child graph instances, combines its
output geometry, and applies the color with a final Material node. The `main` root binds this input
to a color configuration control rendered from the allowed list stored on the control. Its panel
enables all nine standard presets and binds post height and backplate type to select controls. A
`sumMaximumByEnum` constraint limits the combined big- and small-shelf count from the selected post
height. The fixture uses generic graph-input, mesh-selector, and enum-to-number nodes rather than
introducing product-specific nodes.
