# Project description

## Purpose

The 3D Node-Based Product Editor is a node-based product configurator. It builds products out of 3D models selected from a predefined catalog of reusable assets. Authors use a visual node graph to place assets, transform them, create arrays, group geometry, modify materials, and perform other composition operations. The graph combines the resulting mesh instances into one final 3D group representing the configured product, which is rendered as a Three.js scene.

The node graph and all editable configuration values are serialized as a JSON document. A primary design goal is to make this format AI-friendly: schemas should remain explicit, predictable, easy to parse, and easy for an LLM to inspect or modify. Node payloads therefore use small plain objects, stable type identifiers, named ports, and minimal nesting.

The project is intentionally in MVP mode. It favors the simplest implementation that supports rapid experimentation with parametric product configuration, including simple schemas and direct behavior, over a general-purpose node framework or production infrastructure. It is not a production asset-management, manufacturing, pricing, ordering, or collaboration system.

## User experience

The application has three coordinated views:

- A node canvas for authoring the product graph.
- A 3D viewport that shows the evaluated result.
- A configuration panel generated from explicit bindings to entry graph inputs.

Graph authors build the graph and decide which values are exposed. Product configurators then change those exposed values without editing graph topology. Graphs can be imported from and exported to JSON.

The node canvas supports zooming from React Flow's default minimum scale up to `4×` for close
inspection and editing of node controls.

## Main concepts

### Graph

A graph consists of nodes and directed edges. Nodes contain editor positions and type-specific persistent data. Edges connect a named output port to a named input port.

Ports have open string value types. The built-in registry uses `geometry`, `number`, `enum`, and `color`. A connection is valid only when its source and target value types are identical. Each input port accepts at most one incoming edge, while one output may feed multiple inputs.

The built-in graph vocabulary includes nodes for placing a fixed mesh asset, selecting an asset from an enum value, creating primitive geometry, transforming geometry, repeating it in an array, changing its material, grouping multiple geometry branches, and selecting the final output. Number, selector, color, and sum nodes provide supporting configurable values.

### Geometry value

A geometry value is a list of evaluated mesh instances. Each instance identifies a primitive or registered mesh asset and carries its size, transformation matrix, and optional material. Graph evaluation does not destructively merge geometry.

### Output

The graph has one non-creatable, non-removable Output node. It resolves the combined mesh instances into the final 3D product group shown in the main viewport. Disconnected branches remain editable but are not part of the final product.

### Public graph input

Every graph declares a public interface. Authors create its declarations by placing Number,
Enum, Color, or Geometry Graph Input nodes and edit their labels and defaults directly on those
nodes. The entry graph receives saved values from `entryInputValues`; graph instances receive
connected parent values and declaration defaults.

The configuration panel is an independent presentation layer. Its controls bind only to public
inputs of the entry graph and never to inner nodes or child graph paths. Its root-only editor
maps those inputs to compatible number field, slider, select, and color-picker controls.

## Architecture

```text
Persisted JSON
     ↓ deserialize
Graph model ← commands → Graph controller
     │                       ↓ revisions
     ├─ Node/edge hooks → React Flow editor
     ├─ Entry input bindings → configurator panel
     └─ Graph evaluator → evaluated mesh instances
                              ↓
                    Three.js scene synchronization
```

The implementation is divided by responsibility:

- `src/parametric/model/` contains framework-independent graph, node, edge, serialization, and value models.
- `src/parametric/nodes/defaultNodeRegistry.ts` is the source of truth for built-in node construction, ports, persistence, evaluation, and numeric fields.
- `src/parametric/controller/` is the mutation boundary and publishes graph revisions.
- `src/parametric/hooks/` adapts controller snapshots and commands for React.
- `src/parametric/nodes/` and `src/parametric/components/` implement node and editor UI.
- `src/parametric/evaluation/` evaluates only the branches needed by an output.
- `src/parametric/three/` registers assets and synchronizes evaluated instances with the scene.

UI code does not directly own graph state. An interaction invokes a controller command, the controller updates the model and publishes a revision, and subscribed views derive new bindings or evaluated geometry.

## Evaluation behavior

Evaluation starts at the Output node and walks upstream. Node outputs are cached for the duration of one evaluation. If a branch reaches a node already being evaluated, that cyclic branch produces no value. Missing or invalid required inputs also produce no output for that node.

Unconnected inputs may have node-defined local fallbacks. Array uses its stored count, and Material uses its stored color. These fallbacks are ignored when compatible incoming edges are present.

## Persistence

The graph document contains an entry graph ID, saved entry input values, every document-local
graph definition, and configuration-panel controls. Each definition owns its interface, nodes,
and edges. Runtime-only values such as Three.js matrices, evaluated mesh instances,
subscriptions, controller revisions, selection, and graph-tree state are not persisted.

Graph instances reference definitions only by IDs resolved inside the current document.

See [Graph persistence](./graph-persistence.md) for format rules and
[graph.schema.json](./graph.schema.json) for the machine-readable schema.

To remain straightforward for both conventional tooling and LLMs, the persistence model uses:

- One flat collection of graph definitions.
- Flat node and edge collections inside each definition.
- A stable type discriminator on every node.
- Type-specific data in a single plain `data` object.
- Explicit endpoint and port names on every edge.
- A closed schema for the current built-in node set, with no runtime-only scene data.

Schema evolution should preserve these properties and avoid abstraction or nesting that does not solve a current MVP requirement.

## Extending the editor

A built-in node type normally requires:

1. A node data class in `src/parametric/model/GraphNode.ts`.
2. A definition in `src/parametric/nodes/defaultNodeRegistry.ts`.
3. A React view registered in `src/parametric/nodes/nodeViewRegistry.ts`.
4. A new node variant in `docs/graph.schema.json` and an entry in [the node reference](./nodes.md).

The shared node registry makes creation menus, connection validation, persistence, evaluation, and configuration discovery consume the same definition.

## Current boundaries

- Import performs structural and graph-reference checks before constructing the document.
- Recursive graph references are rejected.
- There is no undo/redo or collaboration.
- Mesh references depend on assets registered by the running application.
- JSON Schema can validate document shape, but reference integrity and port compatibility require graph-aware validation.
