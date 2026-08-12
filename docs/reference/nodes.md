# Node reference

## Port conventions

Ports are written as `port-id: value-type`. Built-in value types are:

- `geometry` — a list of evaluated mesh instances.
- `meshArray` — an ordered array of geometry bundles used by Mesh Array and Multi Array.
- `number` — a JavaScript number.
- `numberArray` — an ordered array of non-negative JavaScript numbers.
- `enum` — one string selected from a source node's options.
- `color` — an RGB color string in `#RRGGBB` format.
- `boolean` — a JavaScript boolean.

Connections require exact value-type equality. Geometry inputs accept any number of incoming edges
and concatenate their scene instances before evaluation. Other inputs accept one edge unless the
port explicitly declares multi-connect behavior; Sum's `number` input does so.

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

### Mesh Selector (`meshSelector`)

Maps an enum value to a registered mesh.

- Inputs: `enum: enum`.
- Outputs: `geometry: geometry`.
- Data: `selections`, an array of `{ enumValue, meshId }` mappings, and an embedded `transform`.
- Editor: each choice mapping opens the shared preview picker and replaces only that row's mesh.
- Default: one mapping per selectable mesh, using the mesh label as the enum value.
- Evaluation: looks up the incoming enum value, emits the matching mesh, and applies the embedded
  transform. A missing input, mapping, or catalog asset produces no output.

## Constant value sources

### Number Input (`numberInput`)

Emits a stored number inside a graph. It does not create a configuration-panel control.

- Inputs: none.
- Outputs: `number: number`.
- Data: `value` number.
- Default: name `Number`, value `1`.
- Normalization: non-finite values set through the model become `0`.

### Selector (`selector`)

Emits one stored string choice inside a graph. It does not create a configuration-panel control.

- Inputs: none.
- Outputs: `enum: enum`.
- Data: non-empty `options` string array; `value`, which must be one of the options.
- Default: name `Choice`, options `Cube`, `Cone`, and `Ring`, with `Cube` selected.
- Normalization: options are trimmed, empty and duplicate values are removed, and an empty list becomes `["Option"]`. An invalid current value becomes the first option.

### Color Input (`color`)

Emits a stored preset material color inside a graph. It does not create a
configuration-panel control.

- Inputs: none.
- Outputs: `color: color`.
- Data: `color` preset hex value.
- Default: name `Color`, color `#eaceac` (Sand).
- Normalization: an unrecognized color becomes the default color.

Supported persisted colors are `#eaceac`, `#f4f4f5`, `#27272a`, `#dc5a5a`, `#e8913a`, `#e3c84f`, `#55a86d`, `#528bd1`, and `#9067c6`.

## Value operations

### Choice to Number (`enumNumberMap`)

Maps an enum value to a number for driving numeric operation inputs.

- Inputs: `enum: enum`.
- Outputs: `number: number`.
- Data: `mappings`, an array of `{ enumValue, value }` mappings.
- Default: no mappings; connecting an enum exposes its options for editing in the node.
- Evaluation: emits the number mapped to the incoming enum value. A missing input or mapping
  produces no output.

## Geometry operations

### Switch (`geometrySwitch`)

Selects one geometry input using an incoming choice value.

- Inputs: `choice: enum`; one geometry input for every persisted case.
- Outputs: `geometry: geometry`.
- Data: `cases`, a non-empty array of unique `{ id, enumValue }` entries. The stable `id` owns the
  geometry port; `enumValue` is the exact incoming choice value that selects it.
- Editor: cases mirror the connected choice output and are displayed as labeled geometry ports.
  Adding, renaming, or removing an upstream choice updates the cases automatically. Existing geometry
  connections keep their stable input IDs across renames; removing a choice removes its connection.
- Evaluation: passes through the selected case's complete geometry bundle. Missing choices,
  unmatched values, and unconnected selected cases produce no output.

### Toggle (`geometryToggle`)

Enables or disables one geometry branch using a boolean value.

- Inputs: `enabled: boolean`; `geometry: geometry`.
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
- Evaluation: transforms all instances. When `copy` is true, both original and transformed instances are emitted.
- Toggle: the stored value is used while `enabled` is disconnected. A connected boolean controls
  the node and disables the fallback switch. When disabled, the geometry input is passed through
  without running transform evaluation.
- Compatibility: missing `copy` defaults to false. Missing `uniformScale` is inferred by checking whether all persisted scale components are equal.

### Material (`material`)

Assigns a standard material color to every incoming instance.

- Inputs: `geometry: geometry`; `color: color`.
- Outputs: `geometry: geometry`.
- Data: `color` preset hex value.
- Default: Sand (`#eaceac`).
- Fallback: when `color` is unconnected, the stored color is used.
- Evaluation: preserves geometry and transforms while replacing each instance's material.

### Array (`array`)

Repeats incoming geometry along one axis.

- Inputs: `geometry: geometry`; `count: number`; `startIndex: number`.
- Outputs: `geometry: geometry`.
- Data: non-negative integer `count`; `axis` (`x`, `y`, or `z`); and `offset`, the editable
  duplication distance.
- Default: count `2`, x-axis, offset `1`.
- Fallback: when `count` is unconnected, the stored count is used; when `startIndex` is
  unconnected, zero is used. `startIndex` is connection-only and does not change persisted data.
- Evaluation: floors the effective count, clamps it to at least zero, and emits copies at
  `(startIndex + index) × offset` along the selected axis. A zero count emits empty geometry.
- 3D editing: opening the node attaches a single-axis gizmo to the final duplicate. Dragging it
  changes the per-copy duplication distance and is recorded as one undoable history action.

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

## Graph boundaries and instances

### Graph Input (`graphInput`)

Exposes one public input of the containing graph.

- Data: `inputId`, referencing an input declared by the containing graph.
- Inputs: none.
- Output: the referenced input ID and value type.
- Placement: add a Number, Choice, Color, Boolean, or Geometry graph input from the node menu.
- Editing: number, boolean, and arbitrary RGB color defaults are edited directly on the node.
  Choice inputs select a document choice set and open a separate dialog to edit its shared name and
  values. A choice set must keep at least one value, and the input default must be one of them.
  Customer-facing color choices are edited on the color item in the configuration-panel dialog.
  The public input label is managed separately by the
  configuration-panel mapping UI; the node's own name is edited from its header like every other
  node.
- Deletion: deleting the node also removes its public input declaration, configuration control,
  saved root value when applicable, and affected graph-instance connections.

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
