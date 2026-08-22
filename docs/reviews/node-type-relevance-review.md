# Node type relevance review

## Scope and conclusion

Reviewed the 24 registered parametric node types in
`src/parametric/nodes/defaultNodeRegistry.ts`, their evaluator behavior, connection rules, and both
retained seed graphs:

- `scripts/data/defaultGraph.json`
- `scripts/data/kitchen/project.json`

`vector3Components` (**Split XYZ**) is the only node type that is now redundant enough to mark for
deletion review. No other registered type has a strictly more capable replacement in the current
graph model.

## Removed array-count pipeline

The obsolete Number Array UI widget, `numberArray` graph value, Mesh Array node, and Multi Array
node have been removed. Repeat Zone with ordinary Number inputs is the supported repetition flow.
Primitive Array remains available for typed lookup data, and all Vector3 node types remain intact.

## Marked for deletion review: Split XYZ (`vector3Components`)

The node takes one `vector3` input and emits three number outputs. Component-bound graph edges now
perform the same extraction directly: a Vector3 output may connect to a Number input with an `x`,
`y`, or `z` component selected. `GraphEdge.supportsVectorComponentInterop` and
`GraphEvaluator.applyVectorComponent` enforce and evaluate this path.

Direct component edges are more capable for this use case because they:

- avoid an intermediate node and three permanent output handles;
- allow each target to choose its required component independently; and
- work for every Number input, including Expression, Transform, Array, and repeat controls.

Neither retained seed graph contains a `vector3Components` node. It has no persisted data or unique
evaluation behavior to preserve, so removal does not require a seed-graph rewrite.

Before deletion, confirm that imported or user-stored documents are intentionally out of scope.
Under the current one-shot MVP policy, no compatibility layer is recommended. The removal should
delete its registry entry, model class, view, view-registration entry, color entry, documentation,
and JSON-schema enum value together.

## Marked for seed-graph cleanup only: Group (`group`)

Group is not marked for node-type deletion. Geometry inputs are multi-connect by definition, and
the evaluator already concatenates multiple geometry values when resolving such an input. Therefore,
the five Group nodes in the kitchen seed are unnecessary intermediates: each feeds one geometry port
on a Choice to Mesh node, whose target port can receive the Group's current incoming branches
directly.

Removing those five *instances* would simplify the retained kitchen graph without changing its
evaluated geometry. The replacements must retain every incoming connection to the same Choice to
Mesh port before removing its Group node.

Keep the Group node type itself. It remains the explicit geometry-composition node when a graph
needs a named shared branch.

## Types retained after review

The apparent overlaps below are not deletion candidates:

- Vector3 is still the reusable, fan-out-able way to compose three numbers into a vector. Component
  edges only replace a component at an existing vector target.
- Expression does not replace Sum: Sum accepts an unbounded multi-connection input and conditionally
  includes its stored constant, while Expression has a finite indexed-input surface and no boolean
  conditional.
- Repeat Zone does not replace Array: Array produces a native three-dimensional Cartesian grid and
  exposes its placement behavior to the viewport. Repeat Zone is more general for per-iteration
  logic, but recreating a grid requires nested regions, transforms, and expressions.
- Mesh Asset and Stretchable Asset are complementary: the latter requires stretch metadata and
  deforms a selected asset, while the former emits every catalog asset unchanged.
- Toggle, choice-map, Input Reference, Number Aggregator, Get Nth Element, Rotate Animation Hint,
  material, transform, graph-boundary, and geometry-source nodes each retain behavior with no
  equivalent alternative.

## Recommended sequence

1. Remove `vector3Components` as one coherent working-tree change and update the permissive graph
   schema and node reference alongside it.
2. Rewire the five kitchen Group instances directly into their Choice to Mesh ports, then remove the
   instances from `scripts/data/kitchen/project.json`.
3. Use Repeat Zone and Number Aggregator when repetition needs per-iteration state or placement.
