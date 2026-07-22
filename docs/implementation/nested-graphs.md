# Nested graphs implementation plan

## Goal

Rebuild the graph document around reusable, nested graph definitions.

Every graph definition belongs to the current document. A graph instance references another
definition by its local graph ID. The application has no document ID, URI, repository lookup,
or other mechanism for resolving a graph outside the current document.

The entry graph and child graphs use the same graph definition, input boundary, output
boundary, editing, and evaluation behavior.

## Product rules

- The document contains one entry graph ID and a flat collection of graph definitions.
- Every definition contains its label, public inputs, geometry output, nodes, and edges.
- A graph instance stores only the referenced graph ID.
- A graph input node exposes one declared public input inside its containing graph.
- Every graph contains exactly one graph output node.
- Graph references must resolve inside the current document.
- Direct and indirect recursive graph references are rejected.
- Configuration-panel controls may bind only to public inputs of the entry graph.
- Inner nodes, child graph inputs, graph instance ports, and instance paths are not UI-binding
  targets.
- Entry input values are stored separately from configuration-panel presentation.
- Number, enum, and color constants do not implicitly appear in the configuration panel.

## Persistent document

```json
{
  "entryGraphId": "main",
  "entryInputValues": {
    "width": 1200
  },
  "graphs": [
    {
      "id": "main",
      "label": "Product",
      "inputs": [
        {
          "id": "width",
          "label": "Width",
          "valueType": "number",
          "defaultValue": 1000
        }
      ],
      "output": {
        "id": "geometry",
        "label": "Product",
        "valueType": "geometry"
      },
      "nodes": [],
      "edges": []
    }
  ],
  "configurationPanel": {
    "controls": [
      {
        "id": "width-control",
        "inputId": "width",
        "label": "Width",
        "type": "slider",
        "min": 400,
        "max": 2000,
        "step": 10
      }
    ]
  }
}
```

## Model and serialization

- [x] Add a document model that owns graph definitions, entry values, and configuration
  controls.
- [x] Add public graph input and output declarations.
- [x] Replace the persisted root node/edge collections with a graph-definition collection.
- [x] Remove external graph-reference shapes from the data model.
- [x] Deserialize all graph instances against an interface index built from the current
  document.
- [x] Reject unresolved and recursive graph references.
- [x] Validate node IDs, edge IDs, boundary-node cardinality, interface values, and UI controls
  without silently accepting invalid document data.
- [x] Replace the JSON Schema with the implemented document shape.

## Node boundaries and ports

- [x] Add `graphInput`, `graphOutput`, and `graphInstance` model nodes.
- [x] Derive graph-input ports from the containing graph interface.
- [x] Derive graph-instance ports from the referenced local graph interface.
- [x] Make port resolution aware of the containing document and graph.
- [x] Add React Flow views for graph input, graph output, and graph instance nodes.
- [x] Show public port labels and value types on boundary and instance nodes.
- [x] Open a graph definition when its instance node is activated.

## Evaluation

- [x] Add evaluation frames containing a graph definition, supplied inputs, node cache, and
  connection index.
- [x] Evaluate entry values through graph input boundary nodes.
- [x] Recursively evaluate graph instances using connected values and declared defaults.
- [x] Prefix evaluated instance identity with the containing graph-instance path.
- [x] Cover repeated instances, nested instances, disconnected inputs, and enum option flow in
  the evaluator implementation.
- [x] Keep graph preview behavior scoped to the graph currently open in React Flow.

## React Flow graph editing

- [x] Project only the active graph's nodes and edges into React Flow.
- [x] Route all React Flow mutations to the active graph.
- [x] Add graph instances through the existing node menu.
- [x] Prevent adding an instance that would create a recursive graph dependency.
- [x] Keep selection and preview state valid when switching graphs.
- [x] Display the active graph name above the canvas.

## Document graph tree

The graph tree is a persistent side panel beside the React Flow canvas.

It represents definitions and their instance relationships:

```text
Product
├─ Shelf assembly
│  ├─ Upright
│  └─ Shelf
└─ Base assembly

Unused definitions
└─ Experimental bracket
```

- [x] Root the primary tree at the entry graph.
- [x] Derive children from `graphInstance` nodes.
- [x] Show repeated instances as separate tree rows while opening their shared definition.
- [x] Prevent infinite rendering when invalid input is inspected.
- [x] Show definitions not reachable from the entry graph in an `Unused definitions` section.
- [x] Select a graph definition by clicking a tree row.
- [x] Highlight the graph currently open in React Flow.
- [x] Add a document-local graph definition from the tree.
- [x] Rename and remove definitions from the tree.
- [x] Prevent removing a definition while local instances reference it.

## Graph inputs and configuration-panel editor

- [x] Add number, enum, color, and geometry inputs from the node menu.
- [x] Create the public declaration when its graph input node is placed.
- [x] Edit input labels, defaults, and enum options directly on graph input nodes.
- [x] Remove the declaration and dependent bindings when its graph input node is deleted.
- [x] Show the configuration-panel editor only for the entry graph.
- [x] Map entry inputs to compatible number field, slider, select, and color controls.
- [x] Configure control labels, ordering, and numeric element settings independently.
- [x] Do not offer UI binding for geometry inputs.
- [x] Do not display inner graphs, nodes, instance ports, or paths as binding targets.
- [x] Render the normal configuration panel from explicit controls and entry values.

## Bundled document and storage

- [x] Replace the bundled graph document with a small nested-graph example.
- [x] Update the project storage constraint to accept the implemented document keys.
- [x] Ensure project create, load, save, and JSON import/export use the same document shape.

## Verification

- [x] Pass TypeScript static analysis.
- [ ] Smoke-test import and export in the running application.
- [ ] Smoke-test two instances of one definition with independent inputs.
- [ ] Smoke-test nested geometry and mesh identity in the viewport.
- [ ] Smoke-test graph-tree navigation and React Flow scope changes.
- [ ] Smoke-test entry configuration controls.
- [ ] Smoke-test invalid reference rejection through JSON import.

Runtime smoke testing is intentionally left to the project owner.

## Implementation log

- Added the document-level graph model and local graph interface index.
- Added document-local reference and dependency-cycle checks.
- Added graph boundary and graph instance model nodes with context-derived ports.
- Reworked evaluation around recursive graph frames and instance-scoped mesh identity.
- Added scoped React Flow navigation, document graph tree, and graph instance creation.
- Moved public input creation and editing onto Graph Input nodes.
- Rebuilt the root-only configuration-panel editor around explicit typed UI controls.
- Replaced the bundled document, schema, storage constraint, and persistence documentation.
- Completed TypeScript static analysis; runtime smoke testing remains external.
