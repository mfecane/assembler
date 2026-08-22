# Repeat zones

Repeat zones provide Blender Geometry Nodes-style repeated evaluation without introducing a nested
graph definition. Authors add one Repeat Zone menu item and receive two linked persisted nodes:

- Repeat Input owns the effective instance count and emits the current zero-based iteration.
- Repeat Output receives the internal geometry and emits the combined result of all iterations.

The link is stored as `repeatOutput.data.repeatInputId`. Repeat Input uses the normal scalar field
mechanism for its disconnected count fallback. Pair deletion is enforced by `GraphModel`, so deleting
either boundary also deletes the other boundary and every edge attached to either one. Boundary nodes
cannot be copied independently.

## Evaluation

`GraphEvaluator` handles Repeat Output as an evaluation boundary. It resolves the linked Repeat
Input's effective count once, floors it, and clamps it to zero. Every iteration receives a new cache
scope containing only the spatially enclosed nodes plus the linked Repeat Input, a new evaluation
guard, and an iteration-scoped graph instance path. Repeat Input resolves its Iteration output from
that scope. The evaluator resolves the geometry feeding Repeat Output in every iteration frame, then
combines the resulting scene instances and scopes their IDs by output node and iteration.

Edges may enter the zone from outside. Before iteration starts, outside sources feeding an enclosed
node or Repeat Output are evaluated in the enclosing cache scope. Iterations reuse those values instead
of re-evaluating the outside nodes. Cache scopes are layered, so a node outside a nested zone but inside
its parent repeats once per parent iteration rather than once per nested iteration.

This cache boundary is important: ordinary graph nodes are memoized during one evaluation, while
spatially enclosed nodes must execute independently for each iteration. Nested zones work because an
iteration frame still delegates any nested Repeat Output to the same boundary evaluator.

## Editor region

The tinted region is a derived, non-persisted React Flow node behind the real graph nodes. Its bounds
enclose the measured rectangles of both boundaries and every contained node, with minimum dimensions.
A regular node belongs to the zone when its visual center is horizontally between the boundary centers
and vertically inside the region. Node and boundary positions are already persisted, so membership
survives save/load without another schema field.

Node movement normally publishes a presentation-only revision. Graphs containing a Repeat Output
instead publish an evaluation revision after a completed drag because positions affect zone
membership. Enclosed nodes receive an amber outline from the same `RepeatZone.contains` decision used
by the evaluator, keeping the visible assignment and runtime behavior aligned.

Spatial containment defines which evaluations repeat. Edge connectivity independently defines which
values are demanded and may freely cross the zone boundary.

## Number aggregation

Number Aggregator is the first stateful repeat-only node. The smallest containing Repeat Zone owns it.
Before iteration 0, the evaluator resolves Initial Value once in the enclosing frame. A connected
initial source must be outside the owning zone because no internal iteration frame exists yet.

Each iteration frame receives the aggregator's current number. Evaluating its Current Value output
returns that number without applying Add Value. After the Repeat Output geometry inputs have resolved,
the evaluator resolves Add Value in the same iteration frame and stores `current + add` for the next
iteration. This ordering lets geometry use the previous result and lets Add Value depend on any values
calculated during the current iteration.

Aggregator state is held only in evaluation frames. It resets from Initial Value whenever the graph or
owning outer iteration is evaluated again, is never serialized, and cannot be requested outside its
active zone evaluation. Nested zones merge their state maps over enclosing state, matching the layered
node-cache behavior.
