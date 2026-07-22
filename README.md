P

# 3D Node-Based Product Editor

A quick, one-shot demo for testing and iterating on ideas for building configurable products from reusable 3D mesh parts.

## Local development

Start the Codex workspace:

```sh
docker compose up -d kodx
docker compose exec --user root kodx bash
kodx
```

Start the application and its local Supabase services:

```sh
docker compose up --build
```

Open http://localhost:5175/assembler/. See
[the local development guide](./docs/local-development.md) for login details and reset commands.

The editor uses document-local graph definitions to describe how parts are selected, placed,
transformed, repeated, grouped, and instantiated. Authors explicitly expose entry graph inputs
in the configuration panel.

## Architecture and update flow

The parametric editor deliberately favors separation over minimizing renders or graph evaluations.

```text
Class-based graph model
        ↓
Composable node definitions + graph controller
        ↓
Custom React hooks
        ├── React Flow adapter → node editor
        ├── node bindings → node controls
        └── graph evaluator → Three.js scene adapter
```

- `model/` contains framework-independent graph, node, edge, and value classes.
- `nodes/defaultNodeRegistry.ts` composes creation, ports, persistence, and evaluation behavior for each node type.
- `controller/` is the application mutation boundary and publishes revisions through injected editor services.
- `hooks/` converts controller snapshots and commands into view-specific bindings.
- `nodes/` and `ParametricEditor` render React Flow without owning domain state.
- `evaluation/` converts the graph model into renderable mesh descriptions.
- `three/` synchronizes evaluated descriptions with Three.js scene objects.

Views do not mutate model classes directly. A UI event calls a hook callback, the callback sends a command to the controller, the controller updates the model and publishes a new revision, and subscribed hooks rebuild their view data.

## Adding an experimental node

The node registry is intentionally optimized for MVP iteration:

1. Add a small node data class in `model/GraphNode.ts`.
2. Register a definition in `nodes/defaultNodeRegistry.ts`. A definition supplies the capabilities that node needs: construction, ports, serialization, evaluation, numeric fields, or dynamic inputs.
3. Add its React component and register that component in `nodes/nodeViewRegistry.ts`.

Creation menus, graph connection checks, JSON persistence, and evaluator dispatch consume the
definition registry. They do not need new node-specific branches.

Connection value types are open string identifiers. A new type can be introduced directly in a source and target port definition; compatible ports connect when their identifiers match. Styling for its handle can optionally be added as `.port-<value-type>`.

Every graph definition contains one immutable **Graph Output** node. The entry graph output is
rendered in the viewport. Child graph outputs are returned by their graph instances.

## Documentation

- [Documentation index](./docs/index.md) — quick index of product, architecture, and persistence documentation.
- [Project description](./docs/project-description.md) — purpose, architecture, data flow, and current boundaries.
- [Node reference](./docs/nodes.md) — ports, persisted data, evaluation behavior, and defaults for every node type.
- [Graph persistence specification](./docs/graph-persistence.md) — document shape, invariants, and import/export behavior.
- [JSON Schema](./docs/graph.schema.json) — machine-readable graph document schema.
- [Nested graphs implementation](./docs/implementation/nested-graphs.md) — implementation checklist and current status.
- [Local development](./docs/local-development.md) — Docker startup, login, reset, and troubleshooting.
- [Supabase setup](./docs/supabase-setup.md) — hosted Supabase and GitHub Pages configuration.

## Roadmap

### 1. Core editor shell

- Set up the 3D viewport, node canvas, and configuration panel.
- Add Primitive and Transform nodes through the node selector.
- Add basic camera controls and scene lighting.
- Define graph data, node input/output, and evaluation models.
- Use an immutable **Output** node as the graph's single render result.
- Keep graph changes and the 3D preview synchronized.

### 2. Values, vectors, and math

- **Vector** — construct a 2D or 3D vector from numeric components.
- **Split Vector** — expose the individual components of a vector.
- **Vector Math** — add, subtract, multiply, divide, scale, and normalize vectors.
- **Basic Math** — add, subtract, multiply, divide, modulo, minimum, and maximum.
- **Range Math** — absolute value, clamp, map range, and linear interpolation.
- Allow numeric and parameter outputs to drive vector components and math inputs.
- Define predictable integer/float conversion and division-by-zero behavior.

### Typed connections

- Geometry, Number, and Enum ports are distinct connection types.
- An unconnected typed input uses its node-defined local value as a fallback.

### 3. Mesh construction nodes

- **Primitive** — create a Box, Sphere, Cylinder, or Cone selected within the node.
- **Transform Mesh** — control its position, rotation, and scale.
- **Array** — repeat an input using a configurable count, axis, and offset.
- Support connecting nodes and previewing graph results immediately.

### 4. Grouping and composition

- **Group** — collect multiple mesh or group outputs into one composable result.
- Feed a group into Transform, another Group, or the final Output node.
- Use Transform to move, rotate, and scale every mesh in a group as one unit.
- Preserve individual mesh instances inside groups for fast iteration.
- Support nested groups and safely ignore cyclic branches during evaluation.

### 5. Public graph inputs

- Declare number, enum, color, and geometry inputs on graph definitions.
- Use Graph Input boundary nodes to consume declared inputs internally.
- Place public inputs as graph nodes and bind selected entry inputs through the root graph's
  configuration-panel editor.
- Promote child values through parent interfaces instead of binding UI to inner graphs.
- Update nested evaluation and the 3D preview when entry values change.

### 6. Demo workflow

- Provide a small library of sample mesh parts.
- Build one representative configurable product graph.
- Load the checked-in default graph JSON when the editor starts.
- Import and export graph JSON from the node canvas.
- Restore saved parameter values with the graph.
- Add useful empty, loading, and invalid-connection states.

### 7. Validation and polish

- Detect missing inputs, invalid connections, and graph cycles.
- Add duplication, undo, and redo.
- Improve viewport framing and node layout ergonomics.
- Measure preview performance with arrays and nested groups.
- Document findings and decide which ideas should move into a production architecture.

## Out of scope for the first demo

- Destructive geometry merging or advanced boolean operations.
- Production-grade asset management and collaboration.
- Rendering, manufacturing, pricing, or ordering workflows.
- A complete material or animation system.


# TODO

- undo/redo
- intermediate representation of the scene
- composable nodes
- composable inputs
