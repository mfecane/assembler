# Composable geometry nodes

Status: implemented.

## Implementation result

The experiment met its exit criteria and was retained:

- transform state, serialization, evaluation, node UI, and viewport editing are shared by all ordinary
  geometry-producing nodes;
- `GraphNode` remains capability-free; participating concrete nodes compose `TransformState` through
  a transform entry in `NodeDefinition.capabilities`;
- embedded transforms remain local controls and add no input ports;
- only the standalone Transform node exposes a transform-specific geometry input;
- geometry target ports accept and concatenate multiple incoming connections;
- scalar ports retain single-connection replacement behavior;
- Group remains available as an explicit junction but uses one aggregate geometry handle;
- the canonical MaxShelf fixture was edited in place from 37 nodes and 37 edges to 27 nodes and 27
  edges while preserving all non-redundant operations.

## Goal

Reduce graph noise by making the two repeated geometry behaviors part of the nodes that need them:

- every ordinary node that emits geometry exposes an editable transform in its node view;
- every existing geometry input accepts and combines several incoming geometry connections.

Embedding transform controls in a node does not add an input to that node. Only the standalone
Transform node exposes a geometry input specifically for applying a transform to connected geometry.

The implementation should remain small enough for the MVP. It must not introduce schema migrations,
legacy document compatibility, hidden graph nodes, or a speculative general-purpose component system.

## Current architecture and cost

The existing code already has a useful composition boundary. `NodeDefinition` describes ports,
serialization, numeric fields, and evaluation while the `GraphNode` subclasses mainly hold state. The
new behavior belongs at that definition/registry boundary rather than in a new class hierarchy.

Today the repeated behavior is represented by dedicated nodes:

- `TransformGraphNode` owns transform state and transforms one geometry input;
- `GroupGraphNode` owns dynamic `input-N` ports and concatenates geometry;
- `GraphModel.connect` replaces the existing edge on every target port;
- `GraphEvaluator` indexes one incoming edge per target port;
- the Three.js editor only enables transform controls for `TransformGraphNode`.

The seeded graph contains 37 nodes and 37 edges. Seven nodes are Transform nodes and four are Group
nodes. Most of those nodes only compensate for the two limitations above.

## Recommendation: capabilities, not node parts

Call the abstraction a **node capability**. A capability is an observable behavior declared by a node
definition and supported by shared state/evaluation/UI code. This name is preferable to "part" or
"component": it describes what a node can do without implying a React component, inheritance mixin,
or independently addressable graph entity.

Implement only the two capabilities required now:

1. **Transformable geometry output** — reusable transform state plus a common geometry-output
   post-processor and UI section.
2. **Aggregate input value type** — a value-type policy that allows several edges on one port and
   combines their evaluated values.

Do not add a generic capability registry or configurable capability map. A second real use case can
extend the same definition metadata later.

## Transform capability

### Model

Extract the current Transform state into a reusable `TransformState` model containing:

- translation;
- rotation;
- scale;
- origin;
- clone/copy output geometry;
- uniform-scale mode.

`GraphNode` owns no capability state or capability methods. Each participating concrete node composes
one `TransformState` property, while the transform entry in `NodeDefinition.capabilities` supplies the
state accessor, serialization, validation, numeric fields, and output post-processing. The shared
`transformCapability()` factory keeps that declaration consistent. Creation gives every participating
node an identity transform. Scalar nodes and graph boundary input/output nodes neither store nor expose
transform state.

This is the extension rule for another real capability: add its independent state/interface, compose
it only into participating node classes, and add its definition accessor. Do not add optional fields
or methods to `GraphNode`.

The first transformable definitions are:

- Primitive;
- Mesh Asset;
- Mesh Selector;
- Material;
- Array;
- Graph Instance;
- Group, while it remains available as an explicit junction;
- Transform, while it remains available as an explicit extra transform stage.

Graph Input and Graph Output are boundaries, not ordinary geometry producers. Excluding them avoids
ambiguous transforms at an assembly interface. A Graph Instance is transformable because it is the
ordinary node that places the referenced assembly.

### Port boundary

The transform capability does not declare or modify ports. On a composed node it is local state that
post-processes that node's own geometry output:

- Primitive, Mesh Asset, and Mesh Selector remain source nodes with no geometry input;
- Material and Array retain only the operation inputs they already need;
- Graph Instance retains only the public inputs of its referenced graph;
- transform values such as translation, rotation, scale, origin, clone, and uniform scale are edited
  locally and cannot be driven by graph edges.

Only the standalone Transform node exposes a geometry target handle for the transform behavior. That
handle may receive several geometry edges because geometry is an aggregate input type. This keeps an
explicit Transform available when connected upstream geometry needs an additional transform stage,
without adding meaningless transform inputs to every geometry producer.

### Evaluation

A node definition continues to evaluate its own operation first. The registry/evaluator then applies
the node's transform state to every geometry-valued output. This is one shared post-processing path;
individual node evaluators must not repeat matrix logic.

Preserve the current transform semantics and order:

1. evaluate and aggregate inputs;
2. perform the node-specific operation;
3. apply the output transform to every emitted instance;
4. when clone is enabled, emit both the pre-transform and transformed instances.

Instance IDs must retain the producing node and transform branch so preview selection remains stable
and unique.

The standalone Transform node becomes a geometry pass-through whose only operation is the shared
transform capability. Keep it because an extra, branch-specific transform stage cannot always be
folded into the upstream producer without changing its other consumers.

### Persistence

Store composed state in a common top-level `capabilities` object rather than inside every node's
type-specific `data` object:

```json
{
  "id": "meshAsset-4",
  "type": "meshAsset",
  "position": { "x": 0, "y": 0 },
  "capabilities": {
    "transform": {
      "translation": { "x": 0, "y": 0.5, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "scale": { "x": 1, "y": 1, "z": 1 },
      "origin": { "x": "middle", "y": "middle", "z": "middle" },
      "copy": false,
      "uniformScale": true
    }
  },
  "data": { "meshId": "asset:backplate-corner" }
}
```

`NodeRegistry` serializes and deserializes the capability array generically. Each capability owns its
state serialization, validation, numeric fields, and output post-processing. Type-specific serializers
remain concerned only with type-specific data. Runtime deserialization must report the graph ID, node
ID, node type, capability path, and received value when capability data is invalid.

Update `docs/graph.schema.json` directly. There is no old-document migration or fallback transform;
the seeded graph is rewritten to the new shape.

## Aggregate input value types

### Type policy

Replace the assumption that all input ports accept one edge with a small value-type definition:

```ts
interface GraphValueTypeDefinition {
  id: GraphValueType
  connectionMode: 'single' | 'aggregate'
  aggregate?(values: readonly GraphValue[]): GraphValue
}
```

Register the existing value types with these policies:

| Value type | Connection mode | Combination |
| --- | --- | --- |
| `geometry` | `aggregate` | concatenate instance arrays in serialized edge order |
| `number` | `single` | none |
| `enum` | `single` | none |
| `color` | `single` | none |

This makes the behavior a property of the input's value type, so every geometry target handle gets it
automatically. A future type can opt into aggregate connections by supplying its own deterministic
combiner. It does not require new dynamic-port state or node-specific connection code.

Keep Sum's dynamic numeric ports. Sum is an explicit arithmetic operation; silently making all number
inputs additive would change the meaning of Count and other scalar inputs.

### Graph model and evaluation

Change `GraphModel.connect` as follows:

- a `single` target port retains the current replace-existing-edge behavior;
- an `aggregate` target port retains every distinct incoming edge;
- duplicate source/port to target/port connections remain rejected;
- edge IDs continue to identify both endpoints and ports.

Change the evaluator's incoming-edge index from one `GraphEdge` to `GraphEdge[]`. `resolveInput` should
evaluate all incoming edges for an aggregate value type and return the combined `GraphValue`, so node
evaluators do not need special grouping code. No connection still resolves to the existing input
default; one aggregate connection returns the same value shape as today.

Invalid aggregate values must produce an error containing graph ID, target node ID/type, target port,
expected value type, and every contributing edge/source. Silent partial aggregation would make graph
problems difficult to localize.

## Node UI

Create one `TransformSection` React component and use it in every transformable node view. It reuses
the current Position, Rotation, Scale, Uniform, Clone, and Origin controls.

- Place the section inside the node card below its type-specific fields.
- Show a `Transform` header with a Lucide chevron.
- Start collapsed so the graph remains compact; the controls are still available directly in the
  node rather than through another graph node.
- Keep collapse state local UI state. Do not persist it in the graph document.
- Mark the section root with `data-id="node-transform-section-${nodeId}"` and keep the existing key
  node roots/actions inspectable with `data-id`.
- Use the existing Tailwind and shadcn conventions. A native disclosure is sufficient if it matches
  current styling; do not add a dependency only for collapse state.

Replace `useTransformNode` with a capability-based transform binding that works for any transformable
node. Update the Three.js editor checks from `instanceof TransformGraphNode` to the same capability
check, allowing viewport transform controls for any geometry-producing node.

A geometry input renders one target handle, regardless of how many connections it has. React Flow
already renders the individual edges; adding `input-N` rows would recreate the graph noise this work
is intended to remove.

## Seeded graph rewrite

Modify `src/parametric/defaultGraph.json` by parsing and editing the existing document. Do not replace
it with a synthesized graph.

Preserve its geometry as follows:

- fold Transform nodes into their upstream producer when that producer has no branch requiring a
  different transform;
- connect former Group inputs directly to the downstream geometry handle;
- keep a standalone Transform where several inputs must be grouped and transformed together (the
  current `main/transform-7` case);
- preserve the current node positions as closely as possible and place the surviving downstream node
  near the removed junction;
- preserve copy, origin, rotation, negative scale, material, array, and nested assembly behavior.

The result is 27 nodes and 27 edges: 10 fewer of each, or about a 27% reduction.

The seed script already parses `src/parametric/defaultGraph.json` and writes that exact object. Retain
that behavior; no separate graph literal or migration is needed.

## Implementation sequence

1. Add `TransformState`, common transform serialization, definition metadata, schema validation, and
   the shared geometry output post-processor.
2. Add value-type connection policies, multi-edge retention, evaluator aggregation, and contextual
   validation errors.
3. Add the reusable collapsible transform UI/binding and update viewport-editor capability checks.
4. Remove redundant Group/Transform nodes from the parsed seeded graph and transfer their state and
   edges according to the rules above.
5. Update `docs/nodes.md` and graph persistence documentation with the final behavior and document
   shape.
6. Run static TypeScript/build-type checking and JSON/schema checks only. The user will run and
   visually verify the application.

Likely implementation touchpoints:

- `src/parametric/model/GraphNode.ts`
- `src/parametric/model/NodeDefinition.ts`
- `src/parametric/model/GraphModel.ts`
- `src/parametric/model/GraphSerialization.ts`
- `src/parametric/evaluation/GraphEvaluator.ts`
- `src/parametric/nodes/defaultNodeRegistry.ts`
- `src/parametric/hooks/useGraphNode.ts`
- geometry-producing node views and a new shared `TransformSection`
- `src/parametric/three/editor/*`
- `src/parametric/defaultGraph.json`
- `docs/graph.schema.json`
- `docs/nodes.md`

## Acceptance criteria

- A newly created geometry-producing node shows an identity Transform section in its own card.
- Its transform fields and Three.js transform controls update the same state.
- Embedded transform capability does not add target handles or connectable transform fields to a node.
- Only the standalone Transform node exposes a geometry input specifically for an additional
  transform stage.
- Two or more geometry edges can connect to the same geometry target handle and all inputs appear in
  the evaluated result.
- Connecting a second number, enum, or color edge still replaces the first edge.
- Material, Array, standalone Transform, Graph Output, and geometry inputs on Graph Instance all accept
  several geometry sources without a Group node.
- Clone and transform-origin behavior match the current Transform node.
- JSON export/import preserves every embedded transform and every multi-edge connection.
- `defaultGraph.json` remains the full MaxShelf graph, loads against the updated schema, and retains its
  current scene as closely as static rewriting permits.
- UI and console errors for invalid transform or aggregate data include graph/node/port/edge context.
- Static TypeScript and JSON/schema validation pass without running the application.

## Risks and experiment exit criteria

The main risk is transform ownership. Folding a transform into an upstream node changes every branch
from that output. In those cases retain a standalone Transform node; do not duplicate transform state
or silently change branch behavior.

Discard this approach if implementation reveals any of the following:

- geometry aggregation cannot be expressed once at the value-type/evaluator boundary and instead
  needs node-specific branches;
- transform evaluation or serialization must be repeated in individual node definitions;
- viewport editing still depends on concrete node classes after the capability change;
- preserving the seeded graph requires hidden nodes or duplicated transform state;
- the seeded graph cannot achieve a meaningful reduction (roughly 20% or more) while preserving its
  structure and evaluated scene;
- adding a second concrete capability would require changing every existing node class, serializer,
  evaluator, and view rather than extending the definition boundary.

## Alternatives considered

- **Class inheritance or TypeScript mixins:** rejected because nodes need combinations of behavior and
  the registry already provides a clearer composition boundary.
- **Hidden synthetic Group/Transform nodes:** rejected because saved JSON, visible graph topology, and
  evaluated topology would disagree, making debugging harder.
- **A generic component/plugin framework:** rejected for the MVP because only two behaviors are known.
- **Only making Group visually smaller:** rejected because it does not reduce topology or provide
  transforms on producers.
- **Removing standalone Transform entirely:** rejected because branch-specific extra transform stages
  remain legitimate and cannot always be folded into a producer.
