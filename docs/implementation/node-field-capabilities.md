# Node field & capability system — implementation plan

## Status

Implemented. This document retains the staged design rationale behind the field and capability
system. It tracks the original [Composable node capabilities proposal](./node-capabilities-proposal.md)
and the [Node graph model review](../reviews/node-graph-model-review.md).

## Implementation outcome

- Scalar fields are registered by kind and mutate through `setFieldValue`; bespoke controller and
  React hooks remain only for structural or connected-value behavior.
- Mesh Asset, Mesh Selector, and Assembly Instance persist and evaluate a shared embedded
  transform field and render the shared collapsible transform section.
- The viewport recognizes that shared transform field as a capability, so its move, rotate, and
  scale widgets edit embedded and standalone transforms through the same history path.
- Array deliberately has no transform field. Its viewport-only single-axis gizmo edits the
  existing duplication-distance field through a dedicated undoable controller command.
- Geometry inputs are multi-connect by definition. Group uses one geometry input, while Sum
  explicitly declares its single number input as multi-connect. The numbered dynamic-port model
  was removed.
- Transform opts into the generic enabled field and registry-level input/output bypass behavior.
- The retained default graph and seed now use the implemented persisted node and port shapes.

## Goal

Let a new node type — including one with idiosyncratic, "wacky" per-node behavior — be added by
touching only its model class, its registry entry, and its React view. Today it also requires a new
`EditorController` setter per field and a new `useGraphNode.ts` hook per node type, both of which
are boilerplate that scales linearly with node count. Phases 0–4 remove that boilerplate. Phase 5
uses the resulting system to deliver the embedded-transform capability. Phase 6 documents why the
multi-connection-input capability is rejected and what to build instead.

Each phase is independently shippable and individually de-risked below. Do them in order; nothing
here requires a big-bang rewrite.

---

## Phase 0 — `NodeField<T>` value objects

**New file:** `src/parametric/model/fields/NodeField.ts`

```ts
export interface NodeField<T> {
  get(): T
  set(value: T): void
  serialize(): T
}
```

Add `NumberField`, `BooleanField`, `ColorField`, `EnumField` alongside it (one small class each,
same directory). `ColorField` owns the `normalizePresetColor` normalization that today is
duplicated in `ColorGraphNode.setColor` and `MaterialGraphNode.setColor`. `EnumField` owns the
"clamp current value to the option list" logic duplicated across `SelectorGraphNode` and the
`graphInput` enum handling. `Vector3Value` already satisfies this shape structurally (`get`/`set`
equivalent via its own methods, `toSnapshot()` as `serialize()`) — no change needed there beyond
optionally implementing the interface explicitly.

**Migration is non-disruptive by construction:** every `GraphNode` subclass's public API
(`getColor()`/`setColor()`, `getValue()`/`setValue()`, …) stays exactly as-is. Only the *private*
storage changes from a raw field to a composed `NodeField` instance, e.g.:

```ts
export class ColorGraphNode extends GraphNode {
  private readonly colorField: ColorField
  public constructor(id: string, position: GraphPoint, color: string) {
    super(id, position)
    this.colorField = new ColorField(color)
  }
  public getColor(): string { return this.colorField.get() }
  public setColor(color: string): void { this.colorField.set(color) }
}
```

Nothing outside `GraphNode.ts` (registry, controller, hooks, views) needs to change for this phase.
Migrate one class at a time; each is a self-contained, reviewable diff. Suggested order (simplest
first): `NumberInputGraphNode`, `ColorGraphNode`, `MaterialGraphNode`, `SelectorGraphNode`,
`MeshAssetGraphNode`, then the rest as convenient.

**Acceptance:** every scalar field on every `GraphNode` subclass is backed by a `NodeField`
instance. No behavior change, no test change beyond whatever unit tests target the field classes
directly.

---

## Phase 1 — generalize `numericFields` into `fields`

**File:** `src/parametric/model/NodeDefinition.ts`

Replace `NumericFieldDefinition<TNode>` / `numericFields` with a value-kind-tagged equivalent:

```ts
export type FieldKind = 'number' | 'boolean' | 'enum' | 'color'

export interface FieldDefinition<TNode extends GraphNode> {
  kind: FieldKind
  get(node: TNode): unknown
  set(node: TNode, value: unknown): void
  options?(node: TNode): readonly string[]   // enum only
}

// on NodeDefinition<TNode>:
fields?: Record<string, FieldDefinition<TNode>>
```

`NodeRegistry` gets `getFieldValue(node, field)` / `setFieldValue(node, field, value)` replacing
`getNumericValue`/`setNumericValue`, doing kind-appropriate coercion (the existing
`Number.isFinite(value) ? value : 0` normalization becomes the `'number'` branch; add analogous
guards for `'boolean'`/`'enum'`/`'color'`). `GraphModel.setNumericValue` becomes
`GraphModel.setFieldValue`, same shape.

In `defaultNodeRegistry.ts`, generalize `vectorNumericFields` (keep it — it's still correct for
`Vector3Value` triples) and add sibling one-line factories:

```ts
const numberField = <T extends GraphNode>(get: (n: T) => number, set: (n: T, v: number) => void): FieldDefinition<T> =>
  ({ kind: 'number', get, set })
const enumField = <T extends GraphNode>(get: (n: T) => string, set: (n: T, v: string) => void, options: (n: T) => readonly string[]): FieldDefinition<T> =>
  ({ kind: 'enum', get, set, options })
// booleanField, colorField follow the same shape
```

Migrate every existing `numericFields` registration to `fields`, then add `fields` entries for the
node/value pairs that currently have no generic path at all: `ColorGraphNode.color`,
`MaterialGraphNode.color`, `MeshAssetGraphNode.meshId` (if modeled as a constrained option list),
`ArrayGraphNode.axis` (enum), `SumGraphNode.enabled` (boolean), `PrimitiveGraphNode.primitive`
(enum), `SelectorGraphNode.value` (enum, options from `getOptions()`).

Fields that are genuinely structural, not a single scalar assignment, stay outside this mechanism:
`SelectorGraphNode.options` (resizes a list), `MeshSelectorGraphNode.selections` (array of
objects), `TransformGraphNode.uniformScale` (cascades into `scale`), any `DynamicInputPorts`-backed
port list. Do not force these into `fields` — the review's recommendation is "plain field
assignment should be generic," not "everything must be generic."

**Optional, lower priority, do independently:** split the now-larger `NodeDefinition` interface
into segregated capability interfaces (`PortCapability`, `SerializationCapability`,
`EvaluationCapability`, `FieldCapability`, `DynamicPortCapability`) composed via a `defineNode()`
builder, per the review's Finding 2. This is a code-organization improvement, not a functional
unlock — sequence it whenever convenient, it has no dependents in this plan.

**Acceptance:** `NodeRegistry.getFieldValue`/`setFieldValue` work for every scalar field identified
above. `numericFields`/`getNumericValue`/`setNumericValue` are deleted, not kept as a parallel path.

---

## Phase 2 — collapse `EditorController` setters into `setFieldValue`

**File:** `src/parametric/editor/EditorController.ts`

Add:

```ts
public setFieldValue(nodeId: string, field: string, value: unknown): void {
  this.execute(
    `Set ${field} on node "${nodeId}"`,
    () => this.activeModel.setFieldValue(nodeId, field, value),
    `field:${this.activeGraphId}:${nodeId}:${field}`
  )
}
```

Delete and redirect call sites for every setter that is a plain field assignment:
`setPrimitive`, `setColorNodeValue`, `setMeshAsset`, `setMaterialColor`, `setSumEnabled`,
`setArrayAxis`, `setSelectorValue`, `setTransformOrigin`, `setTransformCopy`. Each becomes a direct
`controller.setFieldValue(nodeId, '<field>', value)` call from the relevant view/hook instead of a
named method.

**Keep as named methods** (do not force through `setFieldValue`):
- `setPrimitiveSize`/`setTransformTranslation`/`setTransformRotation`/`setTransformScale` — these
  set a whole `Vector3Value`, not a scalar; leave them, or introduce a `'vector3'` field kind in
  Phase 1 if the duplication starts to bother you, but it's not required for this plan's goal.
- `setTransformUniformScale` — has the scale-normalization side effect (`normalizeUniformScale`),
  genuinely structural.
- `setSelectorOptions`/`addGraphInputOption`/`updateGraphInputOption`/`removeGraphInputOption` —
  resize/reshape a list, not a field.
- `setMeshSelections` — sets a whole array of `{enumValue, meshId}` objects.
- `setTransformNodeValues` (viewport-driven, multi-field, custom merge key) — leave as-is.

**Acceptance:** the eleven single-scalar setters enumerated at the top are gone from
`EditorController`; every other setter remaining has a documented structural reason (comment not
required, but each should genuinely resize/cascade/merge rather than assign one value).

---

## Phase 3 — generic `useNodeFields` hook

**File:** `src/parametric/hooks/useGraphNode.ts`

Add, alongside the existing `useNumericField`:

```ts
export function useField(nodeId: string, field: string) {
  const controller = useEditorController()
  const { model } = useGraphSnapshot()
  const value = model.getFieldValue(nodeId, field)
  const setValue = useCallback(
    (next: unknown) => controller.setFieldValue(nodeId, field, next),
    [controller, nodeId, field]
  )
  return { value, setValue }
}
```

Migrate the hooks whose entire job is "instanceof-check + expose scalar fields" onto plain
`useField`/`useNumericField` calls in their view components, deleting the bespoke hook:
`usePrimitiveNode` (primitive kind + size), `useNumberInputNode`, `useColorNode`,
`useMeshAssetNode` (meshId), `useArrayNode` (axis, count, offset), `useSelectorNode`'s `value`
(keep `setOptions` bespoke).

**Keep bespoke hooks** where cross-edge/cross-field resolution is the actual point:
`useMaterialNode` (resolves the connected-color edge value vs. stored fallback), `useSumNode`
(resolves the connected-`enabled` edge value), `useGroupNode` (dynamic port connection state),
`useTransformNode` (uniform-scale cascading UI state), `useMeshSelectorNode` (selection-list
editing UI). These hooks earn their keep by doing real logic beyond field passthrough — don't
delete them, don't force them onto the generic path.

**Acceptance:** the five "boring" hooks above are deleted; their views call `useField`/
`useNumericField` directly. Bespoke hooks are unchanged.

---

## Phase 4 — fix `NodeRegistry` type erasure

**File:** `src/parametric/model/NodeDefinition.ts`, `register()`

Replace:

```ts
private readonly definitions = new Map<string, NodeDefinition>()
...
this.definitions.set(definition.type, definition as unknown as NodeDefinition)
```

with an internally-`any`-typed map that doesn't lie about tracking a concrete type:

```ts
private readonly definitions = new Map<string, NodeDefinition<any>>()
...
this.definitions.set(definition.type, definition)
```

No dependency on Phases 0–3; do this whenever convenient, including before all of the above if you
want a quick win first. Pure type-safety cleanup, zero behavior change.

---

## Phase 5 — embedded transform capability (builds on Phases 0–4)

Implements the first proposal in `node-capabilities-proposal.md`: a collapsible, non-connectable
transform section on Mesh Asset, Mesh Selector, and Assembly Instance.

1. **`TransformField`** (new, `model/fields/TransformField.ts`): composes `translation`,
   `rotation`, `scale` (each a `Vector3Value`) and `origin`. Deliberately excludes `copy` and
   `uniformScale` — those are UX affordances specific to the standalone Transform node's job of
   duplicating/normalizing a whole subtree, not something an embedded single-source transform needs.
   If a future node genuinely needs them embedded, add a second, explicit `copy`/`uniformScale`
   field to that node's `TransformField` usage rather than baking them into every embed.
2. **Shared apply function**: extract the matrix-building/apply logic currently inline in the
   `transform` node's `evaluate` (`createTransformMatrix`, the instance-mapping in
   `defaultNodeRegistry.ts`) into a standalone exported function taking a `TransformField` and a
   list of scene instances. Both the standalone `TransformGraphNode.evaluate` and any host node's
   `evaluate` call the same function — one implementation, not two kept in sync by discipline.
3. **Field exposure**: any host node (`MeshAssetGraphNode`, `MeshSelectorGraphNode`, or
   `GraphInstanceGraphNode`) composes a `transform: TransformField` and
   registers its sub-fields through
   the same `vectorNumericFields`-style factory used for the standalone Transform node, under a
   prefix (`transform.translation.x`, etc.). This means **no new `EditorController` method and no
   new hook** — Phases 1–3's generic `setFieldValue`/`useField` already cover it.
4. **View**: one shared `<EmbeddedTransformSection>` component (new,
   `parametric/components/EmbeddedTransformSection.tsx`) reusing the existing `Vec3Field`/
   `TransformOriginField` components behind a collapsible disclosure. Each host node's `.tsx` view
   adds one JSX element; no new interaction logic.
5. **Serialization**: `transform` is an optional key in each host node's persisted `data`. Absent
   on load ⇒ default to identity translation/rotation, unit scale, middle origin — the same
   default-on-missing-field pattern already used for `TransformGraphNode`'s `copy`/`uniformScale`
   in `deserialize`. Existing MaxShelf documents remain valid with no migration step.

**Acceptance:** adding the embedded transform to another node type in the future requires only
step 3 and step 4 above for that node — zero controller code, zero hook code. That's the test of
whether Phases 0–4 actually paid off.

---

## Phase 6 — multi-connection geometry input ports (spike required before committing)

The original draft of `node-capabilities-proposal.md` frames this as a property of the `geometry` port
*type* — any input port typed `geometry` inherently accepts several incoming edges — rather than a
per-node opt-in. That framing is meaningfully better than "let selected nodes multi-connect": it
means this isn't a second mechanism bolted next to `DynamicInputPorts`, it's a chance to **replace**
it. If every `geometry` input port is multi-connect by construction, `GroupGraphNode` and
`SumGraphNode` no longer need hand-numbered `input-1`/`input-2`/… ports at all — each collapses to
one `geometry` (or `number`, for Sum) input port that happens to carry a list of edges.
`DynamicInputPorts` and its `sync`/empty-slot-management logic could be deleted entirely once this
lands, not kept alongside it.

This is still real model-layer surgery, not a controller-level trick like Phase 5:

- `GraphModel.connect` currently removes any existing edge to the same target port before adding
  the new one (single-edge-per-port, enforced identically for every node type). This must become
  port-type-aware: `geometry` ports accept N edges, everything else stays single.
- `GraphEvaluator`'s `incomingByTargetPort` map (one `GraphEdge` per key) and `resolveInput` (one
  `GraphValue | undefined` return) both need a plural counterpart for multi-connect ports —
  additive (`resolveInputs` returning a list) so single-connect ports and their callers are
  unaffected.
- Every node whose `evaluate` currently reads a single `geometry` input (`Transform`, `Material`,
  `Array`, …) is unaffected *unless* it's also a target of multiple edges, in which case its
  `evaluate` must decide how to fold a list into one geometry value — for most of them, that's
  "concatenate," which is exactly what `GroupGraphNode.evaluate` already does per port today.
- Serialization (`GraphSerialization.ts`) currently assumes at most one edge per `(targetNodeId,
  targetPort)` pair implicitly through the model; validate that multiple edges to one port
  round-trip correctly through `serializeGraph`/`deserializeGraph`.

**Recommended approach:** spike this as "make `geometry` ports multi-connect, then delete
`DynamicInputPorts` and rebuild Group/Sum on top of it" rather than "add multi-connect as an
additional feature." If, after the spike, Group/Sum genuinely get simpler and no second mechanism
survives, this phase is worth doing. If the spike shows `DynamicInputPorts` still needs to exist
for some case a plain multi-connect port can't express, that's the signal to stop — per
`node-capabilities-proposal.md`'s own discard criterion, don't keep both.

---

## Phase 7 — Toggle capability

A node-level enable/disable that, when off, turns the node into a passthrough instead of running
its own `evaluate`. Fits the field/capability system directly:

1. Add `enabled: BooleanField` to any node opting in (same composition pattern as Phase 0), exposed
   through `fields` (Phase 1) so the UI switch needs no bespoke controller method or hook — this is
   exactly the `Sum` node's existing `enabled` port, generalized to any node instead of being
   `SumGraphNode`-specific.
2. Add an optional `bypass?: { input: string; output: string }` entry to `NodeDefinition`, declaring
   which input port's value should be forwarded to which output port when disabled. `Transform`
   would declare `{ input: 'geometry', output: 'geometry' }`; a future numeric operation node would
   declare its own matching pair.
3. In `NodeRegistry.evaluate` (or `GraphEvaluator.evaluateNodeOutputs`, whichever stays cleaner),
   check the field before running the type-specific `evaluate`: if present and disabled, resolve
   the declared input and return it directly under the declared output key instead of calling the
   node's `evaluate`.

This requires no per-node bypass logic beyond declaring the one input/output pair — a node that
doesn't have a sensible passthrough (e.g. `Primitive`, which has no geometry input) simply doesn't
declare `bypass` and doesn't get a toggle. Low risk, no dependency on Phase 6, only needs Phases
0–1 (the `BooleanField`/`fields` plumbing) to avoid becoming its own one-off controller method.

---

## Sequencing summary

| Phase | Depends on | Risk | Unlocks |
|---|---|---|---|
| 0 — `NodeField` classes | none | low (non-disruptive, per-class) | 1 |
| 1 — `fields` capability | 0 | low-medium (registry API change) | 2, 3, 5, 7 |
| 2 — `EditorController.setFieldValue` | 1 | low | 5, 7 |
| 3 — `useField` hook | 1 | low | 5, 7 |
| 4 — registry type-erasure fix | none | trivial | — |
| 5 — embedded transform | 0–3 | medium (new shared math/UI, but no controller/hook growth) | closes the proposal's Transform capability |
| 6 — multi-connect geometry ports | none (independent, but re-scope Group/Sum after) | high (core model invariant change) — spike first | closes the proposal's Group capability, or rules it out |
| 7 — Toggle capability | 0–1 | low | closes the proposal's Toggle capability |

Phase 4 can be done anytime. Phase 6 is the only high-risk item and is independent of the rest —
spike it in isolation before committing. Phases 0→1→(2,3)→(5,7) are the main chain.
