# Node reference

## Port conventions

Ports are written as `port-id: value-type`. Built-in value types are:

- `geometry` — a list of evaluated mesh instances.
- `meshArray` — an ordered array of geometry bundles used by Mesh Array and Multi Array.
- `number` — a JavaScript number.
- `numberArray` — an ordered array of non-negative JavaScript numbers.
- `vector3` — an `{ x, y, z }` connection value for driving vector fields or graph inputs.
- `enum` — a zero-based numeric index into a source node's ordered options.
- `materialInstance` — a selected registered PBR material.
- `color` — a six-digit hexadecimal color string.
- `boolean` — a JavaScript boolean.

Connections require exact value-type equality. Geometry inputs accept any number of incoming edges
and concatenate their scene instances before evaluation. Other inputs accept one edge unless the
port explicitly declares multi-connect behavior; Sum's `number` input does so.

Hovering a connection shows its source and target nodes, port IDs, value types, and optional Vector3
component. Hovering an input or output handle shows the owning node, port details, and every connected
endpoint.

`vector3` and `number` ports also interoperate through a component-bound edge. Completing a mixed
connection opens an x/y/z selector. Vector-to-number reads the selected component; number-to-vector
replaces that component on the target's stored/default vector. The selected component appears on
the edge in its axis color, and the connected input and output handles use the same color.

All nodes persist the common fields `id`, non-empty `name`, `type`, `position: { x, y }`, and
type-specific `data`. Every node header displays a Lucide icon for its type. Node bodies remain
neutral gray, while muted mid-tone headers are color-coded by function: purple for inputs, blue for
geometry, red for appearance, amber for operations, and green for outputs. Header icons, names, and
actions use dark foregrounds for contrast. Double-click the node name to edit it; Enter or leaving
the field saves the trimmed name, while Escape cancels.

Geometry nodes with embedded transform capability can be opened in the 3D editor and edited with
the same move, rotate, and scale widgets as a standalone Transform node.

## Geometry sources

### Primitive (`primitive`)

Creates built-in geometry.

- Inputs: none.
- Outputs: `geometry: geometry`.
- Data: `primitive` (`box`, `sphere`, `cylinder`, or `cone`); `size` (`{ x, y, z }`).
- Default: box with size `{ x: 1, y: 1, z: 1 }`.
- Evaluation: emits one identity-transformed instance with mesh ID `primitive:<primitive>`.

### Mesh Asset (`meshAsset`)

Emits one registered catalog mesh.

- Inputs: none.
- Outputs: `geometry: geometry`.
- Data: `meshId` string and an embedded `transform` (translation, rotation, scale, and origin).
- Default: the first selectable mesh in the injected catalog, or an empty ID.
- Editor: clicking the current mesh opens the shared preview picker; choosing an asset replaces the
  mesh while preserving the embedded transform.
- Evaluation: emits one instance using catalog bounds and applies the embedded transform. An
  unknown asset ID produces no output.

### Stretchable Asset (`stretchableAsset`)

Emits one registered catalog mesh deformed with its model-editor stretch metadata.

- Inputs: one numeric stretch input for each enabled model stretch axis (`stretchX`, `stretchY`,
  and/or `stretchZ`).
- Outputs: `geometry: geometry`.
- Data: `meshId` string; `targetSize` (`{ x, y, z }`); and the same embedded `transform` used by
  Mesh Asset.
- Default: the first selectable mesh with at least one enabled stretch axis and its natural
  `metadata.boundingBox.size` dimensions.
- Editor: only assets with at least one enabled stretch axis can be selected. Choosing another mesh
  resets its stored target dimensions to that asset's natural metadata size and removes connections
  to axes the new asset does not define. The embedded transform remains unchanged and supports the
  same viewport widgets.
- Evaluation: connected dimensions override stored dimensions. Each configured model stretch axis
  may contain multiple non-intersecting boxes. Boxes share one stretch percentage while geometry
  outside them translates rigidly. Every axis uses the model editor's piecewise deformation and
  optional UV adjustment. UV displacement uses the model-level texel size ratio in UV units per
  model-space unit. Target dimensions are
  constrained by the same minimum fixed-region gap and ten-times-natural-size maximum. Changing an
  axis without enabled stretch boxes fails with the asset ID, requested size, natural size, and
  configured axes.
- Placement: model `pivot` metadata becomes the asset's local origin after deformation, so expanding
  around a custom origin preserves the same anchor behavior as the model editor and the viewport
  transform gizmo starts at that origin. The node's embedded transform is applied afterward.

## Input values

### Input (`input`)

Stores a graph-local value and optionally exports it through the containing graph interface.

- Output: `value`, using the node's persisted `valueType`.
- Data: `valueType`, local `value`, `exported`, and `enumId` for choices.
- Export off: evaluation uses the local value and the node is absent from `graph.inputs`.
- Export on: a matching graph input with the node ID accepts supplied values and uses the local value
  as its default.
- Material values accept `color: color`; the connected palette value tints the material instance.
- Disabling Export removes dependent instance values and connections while preserving the node.

### Input Reference (`inputReference`)

Emits the effective value of an existing input on the current graph.

- Inputs: none.
- Outputs: `value`, using the referenced graph input's value type.
- Data: `inputId`, the ID of a current graph input. No value or default is stored on the node.
- Evaluation: resolves the graph input after root values, assembly-instance values, and connections have
  been applied. Changing the referenced input's value, type, or choice set is reflected immediately.
- Editor: the selector lists only the current graph's inputs. Changing the selection removes this
  node's outgoing connections because its output type may have changed. Removing the source graph
  input removes its references and their connections.

### Split XYZ (`vector3Components`)

Splits an XYZ vector into three numeric component outputs.

- Inputs: `vector3: vector3`.
- Outputs: `x: number`; `y: number`; `z: number`.
- Data: empty object.
- Evaluation: emits each finite vector component on its matching numeric output.

### Vector3 (`vector3`)

Combines three numeric values into an XYZ vector for vector inputs such as Transform translation.

- Inputs: `x: number`; `y: number`; `z: number`.
- Outputs: `vector3: vector3`.
- Data: empty object.
- Default: every unconnected component is `0`.
- Evaluation: emits `{ x, y, z }` using connected finite numbers and zero for unconnected components.

## Value operations

### Pin (`pin`)

Routes one connection through a movable point and fans its value out to any number of destinations.

- Creation: drag from any output handle and release on empty graph canvas.
- Inputs: `value`, using the source output's persisted value type. Only one connection is accepted.
- Outputs: `value`, using the same value type. The output can connect to multiple compatible inputs.
- Data: `valueType`, copied from the source output when the pin is created.
- Evaluation: passes the complete incoming value through unchanged.
- Choice values: option labels are resolved through chained pins, so downstream choice mapping nodes
  retain their editable options.
- Editing: pins can be moved, selected, deleted, undone, and redone like regular nodes. Dropping a
  connection from an existing pin on empty canvas creates another pin.

### Map to Scalar (`choiceToScalarMap`)

Maps an enum value to a number for driving numeric operation inputs.

- Inputs: `enum: enum`.
- Outputs: `number: number`.
- Data: `mappings`, an array of `{ enumIndex, value }` mappings.
- Default: no mappings; connecting an enum exposes its options for editing in the node.
- Evaluation: emits the number mapped to the incoming enum index. A missing input or mapping
produces no output.

### Map to Boolean (`choiceToBooleanMap`)

Maps an enum value to a boolean for driving Toggle nodes and boolean graph-instance inputs.

- Inputs: `enum: enum`.
- Outputs: `boolean: boolean`.
- Data: `mappings`, an array of `{ enumIndex, value }` mappings with boolean values.
- Default: no mappings; connecting an enum exposes its options as Switch controls.
- Evaluation: emits the boolean mapped to the incoming enum index. A missing input or mapping
  produces no output.

### Map to Vector 3 (`choiceToVector3Map`)

Maps an enum option index to an XYZ vector, primarily for driving Transform translation.

- Inputs: `enum: enum`.
- Outputs: `vector3: vector3`.
- Data: `mappings`, an array of `{ enumIndex, value: { x, y, z } }` mappings.
- Default: no mappings; connecting an enum exposes its options and three numeric fields per option.
- Evaluation: emits the vector mapped to the incoming enum index. A missing input or mapping
  produces no output.

## Geometry operations

### Map to Mesh (`choiceToMeshMap`)

Maps an enum option to one separately connected mesh input.

- Inputs: `enum: enum`; one geometry input for every persisted mapping.
- Outputs: `geometry: geometry`.
- Data: `mappings`, a non-empty array of unique `{ id, enumIndex }` entries. The stable `id` owns the
  geometry port; `enumIndex` is the incoming option index that selects it.
- Editor: mappings mirror the connected choice output and are displayed as labeled mesh ports.
  Adding, renaming, or removing an upstream choice updates the mappings automatically. Existing mesh
  connections keep their stable input IDs across renames; removing a choice removes its connection.
- Evaluation: passes through the selected input's complete geometry bundle. Missing choices,
  unmatched values, and unconnected selected inputs produce no output.

### Toggle (`geometryToggle`)

Enables or disables one geometry branch using a boolean value.

- Inputs: `enabled: boolean`; `translation: vector3`; `geometry: geometry`.
- Outputs: `geometry: geometry`.
- Data: `enabled` boolean fallback used while the boolean input is disconnected.
- Editor: the fallback uses a Switch control and is disabled while a boolean connection controls
  the node.
- Evaluation: passes through the complete input bundle when enabled and emits explicit empty
  geometry when disabled or when the enabled geometry input is missing.

### Transform (`transform`)

Applies translation, rotation, scale, and a selectable pivot to every incoming instance.

- Inputs: `enabled: boolean`; `geometry: geometry`.
- Outputs: `geometry: geometry`.
- Data:
  - `translation`, `rotation`, and `scale` vectors (`{ x, y, z }`).
  - `origin`, with `x`, `y`, and `z` each set to `min`, `middle`, or `max`.
  - `copy` boolean.
  - `uniformScale` boolean.
  - `enabled` boolean.
- Default: zero translation and rotation, unit scale, middle origin, `copy: false`,
  `uniformScale: true`, and `enabled: true`.
- Units: rotation values are degrees. Translation uses scene units.
- Fallback: the persisted translation is used while `translation` is disconnected. A connected
  vector overrides the complete translation without changing rotation, scale, or origin.
- Evaluation: transforms all instances. When `copy` is true, both original and transformed instances are emitted.
- Toggle: the stored value is used while `enabled` is disconnected. A connected boolean controls
  the node and disables the fallback switch. When disabled, the geometry input is passed through
  without running transform evaluation.
- Editor: the node shows Enabled and Position by default. Rotation, Scale, Origin, and Clone Input
  are optional sections available from the `Add...` menu and can be hidden again without changing
  their stored values.
- Compatibility: missing `copy` defaults to false. Missing `uniformScale` is inferred by checking whether all persisted scale components are equal.

### Apply Material (`applyMaterial`)

Assigns an incoming material instance to every incoming geometry instance.

- Inputs: `geometry: geometry`; `material: materialInstance`.
- Outputs: `geometry: geometry`.
- Data: empty object.
- Evaluation: preserves geometry and transforms while replacing each instance's material.

### Array (`array`)

Repeats incoming geometry in a three-dimensional grid.

- Inputs: `geometry: geometry`; `countX`, `countY`, `countZ`, `offsetX`, `offsetY`, and `offsetZ`: `number`.
- Outputs: `geometry: geometry`.
- Data: integer counts of at least `1` and numeric offsets for each of the x, y, and z axes.
- Default: every count is `1`; every offset is `0`.
- Fallback: stored count and offset values are used while their corresponding ports are disconnected.
- Evaluation: floors each effective count, clamps it to at least `1`, and emits the Cartesian
  product of the three counts at `(x × offsetX, y × offsetY, z × offsetZ)`.

### Mesh Array (`meshArray`)

Preserves multiple incoming geometry branches as an ordered array of bundles.

- Inputs: one multi-connect `geometry: geometry` port.
- Outputs: `meshes: meshArray`.
- Data: empty object.
- Evaluation: each incoming geometry value becomes one array item; meshes within a connected Group
  remain in the same bundle.

### Multi Array (`multiArray`)

Repeats multiple geometry bundles using matching entries from a number array and one shared step.

- Inputs: `meshes: meshArray`; `counts: numberArray`.
- Outputs: `geometry: geometry`.
- Data: `axis` (`x`, `y`, or `z`) and numeric `offset` step distance.
- Default: x-axis, offset `1`.
- Evaluation: the first bundle is copied by the first count, the second by the second count, and so
  on. Placement indices continue across bundle boundaries. Count and bundle lengths must match;
  counts are floored and clamped to zero.

### Group (`group`)

Combines any number of geometry values.

- Inputs: one multi-connect `geometry: geometry` port.
- Outputs: `geometry: geometry`.
- Data: empty object.
- Evaluation: concatenates all valid connected geometry inputs. Empty or invalid inputs contribute nothing.

Groups may be nested and may feed Transform, Material, Array, another Group, or Output.

## Numeric operations

### Sum (`sum`)

Adds any number of numeric inputs to an optionally enabled stored constant.

- Inputs: `enabled: boolean`; one multi-connect `number: number` port.
- Outputs: `number: number`.
- Data: `constant` number; `enabled` boolean.
- Default: constant `0`, enabled.
- Fallback: when `enabled` is unconnected, the stored enabled value is used.
- Evaluation: starts with the constant when enabled or zero when disabled, then adds each valid
  connected numeric value. Disabling the node suppresses only its stored constant; numeric inputs
  continue to be summed. Missing numeric inputs contribute zero.

### Expression (`mathExpression`)

Calculates one number from a compact expression and indexed number inputs.

- Inputs: indexed `number` ports whose internal IDs are zero-based indexes. One compact, unlabeled
  placeholder is shown after the highest occupied port, up to the 26 automatically named inputs.
  Removing a connection immediately removes trailing variable rows that are no longer occupied.
- Outputs: `number: number`.
- Data: `expression` string, beginning with `=`.
- Default: `= $x`.
- Variables: indexes are assigned without editing: `0` is `$x`, `1` is `$y`, `2` is `$z`, then
  `3` is `$a`, `4` is `$b`, through `$w`. Further indexes use `$v26`, `$v27`, and so on.
- Syntax: finite numeric literals, generated variables, `+`, `-`, `*`, `/`, parentheses, and unary
  `+` or `-`. For example: `= $x + ($y + $z) / $a`.
- Editor validation: invalid drafts remain editable and show the parser's exact error and character
  position inside the node. Only valid expressions are committed to the graph and undo history.
- Evaluation: every variable referenced by the expression must have a connected finite number.
  An unconnected referenced input, division by zero, or non-finite result produces no output.

## Graph boundaries and instances

### Graph Output (`graphOutput`)

Defines the geometry result of its containing graph.

- Input: the containing graph output ID with value type `geometry`.
- Outputs: none.
- Data: empty object.
- Creation/deletion: not available through the node menu.

Every graph contains exactly one Graph Output. An open root graph uses its saved root values in the
main viewport; child graph results are returned through graph instances.

### Graph Instance (`graphInstance`)

Creates one independently evaluated instance of another graph definition in the same document.

- Data: `graphId`, referencing a document-local graph definition, and an embedded `transform`.
- Inputs: derived from the referenced definition's public inputs.
- Output: derived from the referenced definition's geometry output.
- Creation: choose a graph from the node menu.
- Navigation: activate the instance to open its shared definition.
- Evaluation: independently evaluates the referenced assembly, scopes its instance IDs, then applies
  the embedded transform to the complete result.

Instances may be nested. Recursive definition dependencies are rejected.
