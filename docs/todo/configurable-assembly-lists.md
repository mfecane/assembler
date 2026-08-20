# Configurable assembly lists

## Status

Design proposal only. Implementation requires an intentionally non-backward-compatible graph-schema
change and explicit approval before modifying the schema, checked-in graphs, or seed data.

## Use case

A Kitchen root assembly contains an ordered row of independently configured cabinet units. Each
cabinet kind remains a reusable subgraph, for example:

- sink cabinet;
- oven cabinet;
- simple storage cabinet.

Every occurrence can have its own public-input values. Width, height, door count, door placement,
finish, and type-specific options are not fixed by the selected cabinet template. Customers can add,
remove, reorder, and configure units without editing the React Flow graph.

The same mechanism should later be reusable for other ordered products without embedding Kitchen
behavior in the generic graph model.

## Core decision

Add a first-class ordered `assemblyList` graph value and a `Linear Assembly` node.

Do not add or remove React Flow nodes from the customer configuration panel. React Flow remains the
authoring surface. The configuration panel changes one root input value, while the evaluator expands
that value into repeated child-subgraph evaluations.

```text
Cabinet row root input (`assemblyList`)
  -> Linear Assembly node
    -> evaluate configured cabinet subgraph for column 1
    -> evaluate configured cabinet subgraph for column 2
    -> evaluate configured cabinet subgraph for column N
    -> place results consecutively on the selected axis
  -> root geometry output
```

This preserves the existing division between graph definition, saved root values, and configuration
presentation.

## Terminology

- **Assembly definition**: a reusable graph definition, such as Sink Cabinet.
- **Assembly template**: an allowed cabinet kind referencing one assembly definition and providing
  starting defaults plus its linear-layout length binding.
- **Assembly unit**: one configured occurrence of a template in an `assemblyList` value.
- **Column**: the customer-facing position of one unit in the Kitchen row. Column order is list order.
- **Assembly set**: the reusable collection of templates allowed by one `assemblyList` input.

A template is not a fixed preset. It selects the implementation graph and initial values; every
compatible public input selected by the panel author remains editable independently on every unit.

## Proposed persisted model

The exact JSON names remain open for review. The intended ownership is:

```json
{
  "assemblySets": [
    {
      "id": "base-cabinets",
      "name": "Base cabinets",
      "templates": [
        {
          "id": "sink",
          "label": "Sink cabinet",
          "graphId": "sink-cabinet",
          "lengthInputId": "width",
          "defaultInputValues": {
            "width": 800,
            "height": 900
          }
        },
        {
          "id": "storage",
          "label": "Storage cabinet",
          "graphId": "storage-cabinet",
          "lengthInputId": "width",
          "defaultInputValues": {
            "width": 600,
            "height": 900,
            "door-count": 2
          }
        }
      ]
    }
  ]
}
```

A root graph input references the assembly set:

```json
{
  "id": "cabinet-row",
  "label": "Cabinet row",
  "valueType": "assemblyList",
  "assemblySetId": "base-cabinets",
  "defaultValue": []
}
```

The root value stores ordered, independently configured units:

```json
[
  {
    "id": "cabinet-1",
    "templateId": "storage",
    "inputValues": {
      "width": 600,
      "height": 900,
      "door-count": 2,
      "door-placement": 0
    }
  },
  {
    "id": "cabinet-2",
    "templateId": "sink",
    "inputValues": {
      "width": 800,
      "height": 900,
      "sink-position": 400
    }
  }
]
```

Unit IDs are stable and must not be derived from array indexes. Reordering therefore preserves scene
identity, selection identity, and undo/redo behavior.

Runtime business data should be owned by `AssemblyList` and `AssemblyUnit` classes. Plain objects are
serialization snapshots, not the mutable source of truth.

## Cabinet subgraph contract

Cabinet definitions continue using normal public graph inputs. No Kitchen-specific field is added to
the generic graph interface.

Each template identifies one numeric public input as `lengthInputId`. For a Kitchen row this is the
cabinet width. Height, door count, placement, and other properties are ordinary independent inputs.

For deterministic side-by-side placement:

- the configured length must be finite and greater than zero;
- cabinet geometry must use a consistent local orientation;
- the cabinet origin must represent its left placement plane;
- the next cabinet starts at the cumulative preceding lengths plus the authored gap.

Visual mesh bounds must not determine layout length. Handles, countertops, sinks, and door overhangs
can extend outside the cabinet's logical footprint.

## Linear Assembly node

The node consumes `assemblyList` and outputs combined geometry. Its authored fields are axis and gap;
Kitchen initially uses positive X and a zero gap.

For each unit, evaluation:

1. Resolves the assembly set and template.
2. Resolves the referenced graph definition.
3. Starts with the graph's declared defaults, applies template defaults, then applies unit values.
4. Evaluates the child graph using the same recursive path as a normal Assembly Instance.
5. Reads the effective `lengthInputId` value.
6. Translates the child geometry by the current linear cursor.
7. Advances the cursor by length plus gap.

The evaluated instance path includes the Linear Assembly node ID and stable unit ID. Repeated use of
the same cabinet definition therefore produces distinct mesh and origin-node identities.

The graph evaluator should own recursive child evaluation. The node should request child evaluation
through evaluation context rather than instantiate an evaluator or access global editor state.

An empty list is valid and emits empty geometry. Minimum cabinet-count rules should not be added until
a real product rule requires them.

## Configuration-panel authoring

The configuration-panel editor gains an **Assembly list** item compatible only with an `assemblyList`
root input.

The input supplies the assembly set. The control stores presentation only:

- customer-facing row label;
- available templates, which may be a subset of the assembly set;
- the child public inputs exposed for each template;
- label and widget settings for every exposed child input.

Nested fields reuse the existing number, slider, number-array, select, material, and switch
presentation definitions. Their binding target is a public input on the template's graph instead of
another root input. Internal graph, template, and input IDs are never displayed to customers.

The panel author can expose width, height, door count, and door placement for every applicable
template. Sink-only or oven-only fields appear only in their corresponding template configuration.
Technical inputs can remain hidden without losing their saved value or graph default.

Assembly semantics do not live in the control. Removing the control hides customer editing but does
not delete the root value, assembly set, or evaluated row.

## Runtime configuration panel

The configured Assembly list occupies the full panel width instead of participating in the normal
label/value grid. It renders one collapsible section per current column:

```text
Cabinet row

  Column 1 · Storage cabinet
    Width          [600]
    Height         [900]
    Doors          [2]
    Door placement [Pair]
    [Move] [Remove]

  Column 2 · Sink cabinet
    Width          [800]
    Height         [900]
    Sink position  [400]
    [Move] [Remove]

  [Add cabinet]
```

The UI uses shadcn `Collapsible`, `Button`, existing field controls, and Lucide icons. The panel body
scrolls when columns exceed viewport height. A separate Sheet should be introduced only if actual
templates prove too dense for the panel; it is not required for the first implementation.
The list root and every unit section use stable `data-id` values derived from the root input ID and
unit ID so browser inspection does not depend on the current array position.

Runtime operations are:

- **Add**: choose an allowed template, append a unit with a fresh stable ID and effective defaults.
- **Remove**: remove exactly one unit.
- **Reorder**: change list order; placement follows immediately.
- **Change type**: retain the stable unit ID, preserve only values whose input ID and value type exist
  on both definitions, and initialize all other values from the new template defaults.
- **Edit field**: update only that unit's input value.

Add, remove, reorder, and type change are each one undo command. Text and numeric edits should use a
coalesced editing transaction rather than serialize graph history on every keystroke.

## Shared row values

The first implementation keeps all cabinet values unit-scoped. If a later requirement needs one
finish, height, or plinth setting shared by every cabinet, it should remain a separate normal root
input and use an explicit broadcast/mapping node. The evaluator must not infer shared behavior from
matching input names.

This keeps per-unit configuration correct and avoids adding speculative common-input machinery now.

## Validation and reconciliation

Validation fails with assembly-set ID, template ID, unit ID, graph ID, and input ID context when:

- assembly-set, template, or graph references do not resolve;
- template dependencies create direct or indirect graph recursion;
- the length binding is missing, non-numeric, non-finite, or non-positive;
- unit IDs are empty or duplicated;
- a unit value is incompatible with the referenced graph input;
- nested panel fields target missing, geometry, or incompatible inputs;
- one nested input has multiple controls in the same template section.

Graphs referenced by assembly templates are protected from deletion. Removing a template that has
configured units is blocked until the author explicitly removes or replaces those units. No values
are silently redirected to another template.

When a cabinet graph input is renamed, removed, or changes type, template defaults, configured unit
values, and nested panel fields must be reconciled in the same authoring command, following the same
maximum-effort behavior used by ordinary graph-instance inputs.

## Why configuration must not mutate graph topology

Adding Graph Instance nodes directly from the customer panel would make saved customer choices part
of the authoring graph. It would also require controls to address node IDs or instance paths, make
reordering a canvas-layout operation, and risk deleting author wiring when a customer removes a
cabinet.

An `assemblyList` keeps the root graph static and makes the variable row explicit data. The Linear
Assembly node is the single graph-level operation that interprets that data.

## Implementation boundaries

The feature requires coordinated changes to:

- graph value and root-input types;
- assembly-set and assembly-list business entities;
- serialization, JSON Schema, semantic validation, and deep copying;
- dependency-cycle and referenced-graph deletion checks;
- graph evaluator recursion and scene instance paths;
- Linear Assembly node model, registry definition, and React view;
- configuration-panel authoring and runtime rendering;
- editor commands and history coalescing;
- all checked-in project/default graphs using the changed schema, plus the local seed script;
- implementation and reference documentation after completion.

There is no migration or legacy compatibility. On implementation, persisted development data is
rebuilt, while checked-in graphs under `projects/` and `src/data/` are updated with maximum effort to
preserve their existing authored content.

## Open design questions

- Should customer-facing sections be named **Column**, **Cabinet**, or a label authored on the
  Assembly list control?
- Should changing a unit's template require confirmation when incompatible configured values will be
  discarded?
- Is positive X with zero gap sufficient for the first Kitchen row, or is an authored gap required
  immediately?
- Does the first Kitchen version need drag reorder, or are explicit move-left and move-right actions
  sufficient and easier to inspect?
