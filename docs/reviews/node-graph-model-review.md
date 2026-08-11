# Node graph model — architecture review

## Scope

Reviewed `src/parametric/model/*`, `src/parametric/nodes/*`, `src/parametric/hooks/useGraphNode.ts`,
`src/parametric/editor/EditorController.ts`, and `src/parametric/evaluation/GraphEvaluator.ts`
against one requirement: the system must absorb **hundreds of node types with idiosyncratic
behavior** without the addition of a single node type becoming a multi-file, hand-copied ritual.

Verdict: the **registry/definition layer** (`NodeDefinition`, `NodeRegistry`, `GraphModel`,
`GraphDocumentModel`) is a genuinely good foundation — data-driven dispatch, no god-switch, no
`instanceof` chains at the model boundary. The **node layer above it** (`GraphNode` subclasses,
`EditorController` setters, `useGraphNode.ts` hooks) has not adopted the same discipline: it is
still one hand-written class + one hand-written controller method + one hand-written hook *per
field, per node type*. That layer is the one that will not survive hundreds of node types. Nothing
here is a rewrite-everything problem; it's "finish applying the pattern you already invented for
numeric fields to everything else."

## What is already right — keep this shape

- **`NodeRegistry` as the single polymorphic dispatch point.** Ports, serialization, evaluation,
  and connectability all go through `registry.*(node, …)`, never through a `switch (node.type)` or
  a chain of `instanceof` checks at the model layer. This is exactly the right shape and is the
  reason adding a *model-level* node type is currently one `registry.register({...})` call
  (`src/parametric/nodes/defaultNodeRegistry.ts`), not an edit to `GraphModel`/`GraphEvaluator`.
- **`GraphModel`, `GraphEdge`, `GraphDocumentModel`, `GraphEvaluator` are node-type-agnostic.** None
  of them need to change when a node type is added. That boundary is correctly closed for
  extension. Do not let any of the fixes below leak node-type knowledge back into these classes.
- **`NodePortDefinition` is properly interface-segregated**: `inputs`, `outputs`,
  `getInputDefault`, `getOutputOptions` are independent optional capabilities, each a plain
  function of `(node, context)`. This is the template to replicate elsewhere (see Finding 2).
- **`vectorNumericFields` (`defaultNodeRegistry.ts:99`) and `DynamicInputPorts`
  (`model/DynamicInputPorts.ts`) are the two real composition wins in the codebase.**
  `vectorNumericFields` is a *field-capability factory*: it takes a getter/setter pair and returns
  three registry-shaped numeric field descriptors. `DynamicInputPorts` is a small standalone class
  with a two-method interface (`getIds`/`sync`) that `GroupGraphNode` and `SumGraphNode` compose by
  holding an instance, not by inheriting from a shared base. Both are proof the pattern the user is
  asking for already works in this codebase in miniature — it just stops at "numeric fields" and
  "dynamic ports" instead of covering every field kind and every cross-cutting behavior.
- **`docs/implementation/node-capabilities-proposal.md` already asks the right question** (capability composition for
  embeddable transforms / multi-input ports) and correctly refuses to implement until the
  abstraction is proven. Findings 1–3 below are the general-purpose version of exactly that
  proposal — solve them first and the transform/multi-input capability becomes a two-line addition
  instead of a new parallel mechanism.

## Findings, ranked by leverage

### 1. No generic field abstraction — every node hand-rolls private fields + getter/setter pairs

`GraphNode.ts` defines ~14 subclasses (`PrimitiveGraphNode`, `NumberInputGraphNode`,
`SelectorGraphNode`, `ColorGraphNode`, `MeshSelectorGraphNode`, `TransformGraphNode`,
`MaterialGraphNode`, `ArrayGraphNode`, `SumGraphNode`, …). Each one is a class whose entire body is
`private field; getField(); setField(value)`, repeated per field, per node. There is no shared
notion of "a field" — no interface a `NumberField`, `EnumField`, `BooleanField`, or `ColorField`
implements. Compare this to `Vector3Value`, which *is* a real composed value object (used by
`PrimitiveGraphNode.size`, `TransformGraphNode.translation/rotation/scale`) — it's the one field
kind that already got this treatment, and it shows immediately: `vectorNumericFields` can generate
registry metadata for any node that holds a `Vector3Value`, generically, without knowing which node
type it is. Numbers, enums, booleans, and colors have no equivalent value type, so every node that
holds one re-derives get/set/normalize logic by hand. `ColorGraphNode.setColor` and
`MaterialGraphNode.setColor` (`GraphNode.ts:175` and `:310`) are the same three lines of
`normalizeRgbColor` normalization, copy-pasted because there is no `ColorField` value object to
own that behavior once.

**Why this breaks at hundreds of types:** the copy-paste is currently ~14×small; at hundreds of
node types with "wacky" per-node behavior it becomes the dominant cost of adding a type, and every
copy is a place a normalization rule (like color-preset validation) can drift out of sync.

**Fix:** promote the `Vector3Value` pattern to a family of small composed field-value classes with
one shared shape, e.g.:

```ts
interface NodeField<T> {
  get(): T
  set(value: T): void
  serialize(): T
}
```

`NumberField`, `BooleanField`, `EnumField(options)`, `ColorField`, and the existing `Vector3Value`
all implement it. A `GraphNode` subclass composes named `NodeField` instances instead of raw
private fields:

```ts
class MaterialGraphNode extends GraphNode {
  readonly color = new ColorField(defaultMaterialColor)
}
```

This alone doesn't remove the subclass (identity/position/name inheritance from `GraphNode` is
shallow and fine to keep — see "What's already right"), but it removes the hand-written
getter/setter boilerplate and — critically — lets the registry and the controller (Finding 3) and
the hooks (Finding 4) all walk `Record<string, NodeField<unknown>>` generically instead of needing
type-specific code.

### 2. `NodeDefinition<TNode>` is one flat, ever-growing interface, not composed capabilities

`model/NodeDefinition.ts:45-57` — `type`, `label`, `creatable`, `create`, `ports`, `isOutput`,
`syncInputPorts`, `numericFields`, `serialize`, `deserialize`, `evaluate` are eleven sibling
optional/required keys on one interface. `numericFields` is visibly a later addition bolted onto
the side of the original shape rather than a first-class capability the interface was designed
around, and it will not be the last such addition (Finding 1's field system, Finding 6's future
transform-embedding capability from `node-capabilities-proposal.md`, and whatever "wacky" per-node behavior
shows up next will all want the same treatment: a new optional key on this one interface).

**Why this breaks at hundreds of types:** this is the literal opposite of interface segregation —
a single god-interface that every node definition partially implements, growing without bound as
new *kinds* of node behavior are invented, with no way to express "this capability requires that
capability" or to unit-test/reuse a capability's shape independent of `NodeDefinition` as a whole.

**Fix:** split into segregated capability interfaces and compose them with a small builder,
mirroring the already-correct shape of `NodePortDefinition`:

```ts
interface PortCapability<T>        { ports: NodePortDefinition<T> }
interface SerializationCapability<T> { serialize(node: T): unknown; deserialize(...): T }
interface EvaluationCapability<T>  { evaluate(node: T, ctx: NodeEvaluationContext): EvaluatedNodeOutputs }
interface FieldCapability<T>       { fields: Record<string, NodeField<unknown>> }   // replaces numericFields, generalized (Finding 1/3)
interface DynamicPortCapability<T> { syncInputPorts(node: T, connected: ReadonlySet<string>): void }
```

`NodeDefinition<T>` becomes an intersection of the capabilities a given node actually needs, built
through `defineNode(type, label).withPorts(...).withSerialization(...).withEvaluation(...)`, so a
new capability is a new interface + a new builder method, never a widening edit to a shared type
every existing node definition silently inherits an unused optional key from.

### 3. `EditorController` hand-writes one setter method per field, per node type

`EditorController.ts` has `setPrimitive`, `setPrimitiveSize`, `setSelectorOptions`,
`setSelectorValue`, `setColorNodeValue`, `setMeshSelections`, `setMeshAsset`, `setMaterialColor`,
`setSumEnabled`, `setArrayAxis`, `setTransformTranslation/Rotation/Scale/Origin/Copy/UniformScale` —
eleven methods (lines 386–538), each calling the identical private helper
`updateNode<TNode>(nodeId, expectedType, label, update, mergeKey)`. The only thing that differs
between them is which field they close over. Meanwhile `setNumericValue` (line 378) already proves
the generic path works: *one* method, driven by `nodeRegistry.setNumericValue(node, field, value)`,
covers every numeric field on every node type with zero new controller code.

**Why this breaks at hundreds of types:** this is a strict N-methods-per-node-field growth rate on
the one class that every UI mutation must funnel through. Hundreds of node types each averaging a
handful of non-numeric fields means hundreds of near-identical controller methods, each requiring
its own expected-type string, its own command label string, and its own mergeKey convention chosen
by hand. This is the single biggest boilerplate source in the codebase today and the sharpest
violation of "the system should not hold us back."

**Fix:** extend the `numericFields`-style generic path (Finding 1's `NodeField` +
Finding 2's `FieldCapability`) to booleans/enums/colors/lists, and collapse the eleven setters into
one:

```ts
public setFieldValue(nodeId: string, field: string, value: unknown): void {
  this.execute(`Set ${field} on node "${nodeId}"`,
    () => this.activeModel.setFieldValue(nodeId, field, value),
    `field:${this.activeGraphId}:${nodeId}:${field}`)
}
```

Non-generic mutations that are genuinely structural rather than field assignment — `setSelectorOptions`
(resizes the enum's option list), `setTransformUniformScale` (has a side effect that rewrites two
other fields), array/dynamic-port syncing — are legitimately special and should stay as named
methods. The point is not "zero named methods ever," it's "a plain field set should never require
writing a controller method," which is true today for numbers and false for everything else.

### 4. `useGraphNode.ts` hand-writes one binding hook per node type

Twelve `useXNode` hooks (`usePrimitiveNode`, `useNumberInputNode`, `useSelectorNode`,
`useColorNode`, `useMeshSelectorNode`, `useMeshAssetNode`, `useMaterialNode`, `useArrayNode`,
`useGroupNode`, `useSumNode`, `useTransformNode`, plus `useVectorNumericFields`/`useNumericField`)
in one 393-line file. Each follows the identical shape: read the node via `model.getNode(id)`,
`instanceof`-check it, wrap every setter in `useCallback(() => controller.setX(...))`, return a
binding object. `useNumericField` (line 29) is, again, the one hook that's already generic — it
takes a field name string and needs no node-type knowledge at all.

**Why this breaks at hundreds of types:** same shape of problem as Finding 3, one layer up. A new
node type with three fields currently means writing a new interface + a new hook with three
`useCallback`s, even when nothing about those fields is unusual.

**Fix:** once fields are generic (`NodeField`/`FieldCapability`), add a `useNodeFields(nodeId,
NodeClass)` hook that returns `{ [fieldName]: { value, setValue } }` driven entirely by registry
metadata — the direct hook-layer analogue of `useNumericField`. Views for "boring" nodes (a single
number, a single enum, a single toggle) never need a bespoke hook. Reserve hand-written hooks
(`useMaterialNode`'s connected-color resolution, `useSumNode`'s connected-enabled resolution) for
cases with genuine cross-field or cross-edge logic, exactly as they're used today — that pattern is
fine and should remain the escape hatch, not the default path.

### 5. `NodeRegistry.register` erases the generic type parameter

`model/NodeDefinition.ts:71`:

```ts
this.definitions.set(definition.type, definition as unknown as NodeDefinition)
```

`NodeDefinition<TNode>`'s generic parameter exists to make `ports.inputs`, `serialize`,
`evaluate`, etc. all agree on the same concrete node subclass at the call site where they're
defined — and then is thrown away at registration via `as unknown as`. Every stored definition is
`NodeDefinition<GraphNode>` from that point on; nothing statically prevents a `serialize` closure
written for one node's shape from being paired with another's `deserialize`, and a mismatch is only
caught by a runtime crash inside `evaluate`/`serialize` when the wrong shape is accessed.

**Why this matters at hundreds of types:** the more node definitions accumulate in one file (or,
better, spread across many files as Finding 6 recommends), the more valuable it is that a
copy-paste-and-rename mistake between two similarly-shaped node definitions fails at compile time
or registration time, not at evaluation time in production.

**Fix:** at minimum, keep the registry's internal map typed as `Map<string, NodeDefinition<any>>`
(the erasure to `any` is honest about "we don't statically track per-entry types here," versus `as
unknown as NodeDefinition` which actively lies about it being the base type). Better: add a
dev-mode assertion in `register()` that the definition's `create`/`deserialize` actually produce an
instance of the same class, so a mismatched definition fails loudly the moment it's registered
instead of the first time a user touches that node.

### 6. Registering one node type still touches ~6 files

Today, adding a node type means editing: `GraphNode.ts` (new class), `defaultNodeRegistry.ts` (new
registration), a new `nodes/XNode.tsx` (view), `nodeViewRegistry.ts` (view + menu presentation),
`useGraphNode.ts` (new hook), and `EditorController.ts` (new setters) — six touchpoints, five of
which are boilerplate once Findings 1–4 are fixed. This finding is not independent of the others;
it's the visible symptom of them. Re-verify it after applying Findings 1–4: the two touchpoints
that *should* remain irreducible per node type are the model class (data + "wacky" per-node
evaluate logic) and the React view (bespoke layout), because those are the two places genuine
per-node variation lives. View *registration* (`nodeViewTypes`/`nodeViewPresentation` in
`nodeViewRegistry.ts`) is itself a flat two-object-literal pattern already close to fine as-is — it
doesn't need a capability system, just entries.

## Non-findings (considered, not flagged)

- **`GraphNode` as an abstract base class subclassed by every node type** is inheritance, but it's
  shallow (one level), stable (id/position/name only), and not the thing fighting the user's
  "hundreds of wacky node types" goal — the per-subclass *data modeling* is (Finding 1). Don't flatten
  this into composition-only; it's not where the pain is.
- **Per-type `serialize`/`deserialize`/`evaluate` as registry-provided closures** is correctly
  segregated already (single responsibility, one function per concern, dispatched through the
  registry, no shared god-method). No change recommended beyond Finding 2's repackaging into named
  capability interfaces.
- **`GraphModel`/`GraphDocumentModel`/`GraphEvaluator`** need no changes for this goal; they're
  already node-type-agnostic. Confirmed by reading, not just assumed.

## Suggested sequencing

1. Build the `NodeField<T>` family (Finding 1) and generalize `vectorNumericFields`'s pattern to
   `numberField`/`enumField`/`booleanField`/`colorField` factories.
2. Replace `numericFields` on `NodeDefinition` with a general `fields` capability (Finding 2/3) and
   collapse `EditorController`'s eleven setters into `setFieldValue` (keeping true structural
   setters as named methods).
3. Add `useNodeFields` (Finding 4) and migrate the "boring" hooks
   (`usePrimitiveNode`/`useNumberInputNode`/`useColorNode`/`useMeshAssetNode`/`useArrayNode`) onto
   it, leaving `useMaterialNode`/`useSumNode`-style connected-value resolution as hand-written.
4. Tighten `NodeRegistry.register`'s type erasure (Finding 5) — cheap, do any time, no dependency on
   1–3.
5. Only then revisit `docs/implementation/node-capabilities-proposal.md`'s embeddable-transform / multi-input-port
   proposal — it should fall out of the field/capability system almost for free instead of needing
   its own parallel mechanism.
