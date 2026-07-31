# Node reference

## Port conventions

Ports are written as `port-id: value-type`. Built-in value types are:

- `geometry` — a list of evaluated mesh instances.
- `number` — a JavaScript number.
- `enum` — one string selected from a source node's options.
- `color` — a preset color string.
- `boolean` — a JavaScript boolean.

Connections require exact value-type equality. An input accepts at most one incoming edge. Group and Sum maintain dynamic `input-N` ports: connected ports are retained and one empty port is kept available.

All nodes persist the common fields `id`, non-empty `name`, `type`, `position: { x, y }`, and
type-specific `data`. Every node header displays a Lucide icon for its type. Double-click the node
name to edit it; Enter or leaving the field saves the trimmed name, while Escape cancels.

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
- Data: `meshId` string.
- Default: the first selectable mesh in the injected catalog, or an empty ID.
- Evaluation: emits one instance using catalog bounds. An unknown asset ID produces no output.

### Mesh Selector (`meshSelector`)

Maps an enum value to a registered mesh.

- Inputs: `enum: enum`.
- Outputs: `geometry: geometry`.
- Data: `selections`, an array of `{ enumValue, meshId }` mappings.
- Default: one mapping per selectable mesh, using the mesh label as the enum value.
- Evaluation: looks up the incoming enum value and emits the matching mesh. A missing input, mapping, or catalog asset produces no output.

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
- Default: name `Enum`, options `Cube`, `Cone`, and `Ring`, with `Cube` selected.
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

## Geometry operations

### Transform (`transform`)

Applies translation, rotation, scale, and a selectable pivot to every incoming instance.

- Inputs: `geometry: geometry`.
- Outputs: `geometry: geometry`.
- Data:
  - `translation`, `rotation`, and `scale` vectors (`{ x, y, z }`).
  - `origin`, with `x`, `y`, and `z` each set to `min`, `middle`, or `max`.
  - `copy` boolean.
  - `uniformScale` boolean.
- Default: zero translation and rotation, unit scale, middle origin, `copy: false`, and `uniformScale: true`.
- Units: rotation values are degrees. Translation uses scene units.
- Evaluation: transforms all instances. When `copy` is true, both original and transformed instances are emitted.
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

- Inputs: `geometry: geometry`; `count: number`.
- Outputs: `geometry: geometry`.
- Data: `count` integer of at least 1; `axis` (`x`, `y`, or `z`); `offset` number.
- Default: count `2`, x-axis, offset `1`.
- Fallback: when `count` is unconnected, the stored count is used.
- Evaluation: floors the effective count, clamps it to at least one, and emits copies at `index × offset` along the selected axis. The first copy remains at the input position.

### Group (`group`)

Combines any number of geometry values.

- Inputs: dynamic `input-N: geometry` ports.
- Outputs: `geometry: geometry`.
- Data: `inputPorts`, a unique non-empty array of `input-N` IDs.
- Default: `["input-1"]`.
- Evaluation: concatenates all valid connected geometry inputs. Empty or invalid inputs contribute nothing.

Groups may be nested and may feed Transform, Material, Array, another Group, or Output.

## Numeric operations

### Sum (`sum`)

Adds any number of numeric inputs to an optionally enabled stored constant.

- Inputs: `enabled: boolean`; dynamic `input-N: number` ports.
- Outputs: `number: number`.
- Data: `constant` number; `enabled` boolean; `inputPorts`, a unique non-empty array of `input-N` IDs.
- Default: constant `0`, enabled, ports `["input-1"]`.
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
- Placement: add a Number, Enum, Color, Boolean, or Geometry graph input from the node menu.
- Editing: default values and enum options are edited directly on the node. The public input label
  is managed separately by the configuration-panel mapping UI; the node's own name is edited from
  its header like every other node.
- Deletion: deleting the node also removes its public input declaration, configuration control,
  saved entry value, and affected graph-instance connections.

### Graph Output (`graphOutput`)

Defines the geometry result of its containing graph.

- Input: the containing graph output ID with value type `geometry`.
- Outputs: none.
- Data: empty object.
- Creation/deletion: not available through the node menu.

Every graph contains exactly one Graph Output. The entry graph result is displayed in the main
viewport; child graph results are returned through graph instances.

### Graph Instance (`graphInstance`)

Creates one independently evaluated instance of another graph definition in the same document.

- Data: `graphId`, referencing a document-local graph definition.
- Inputs: derived from the referenced definition's public inputs.
- Output: derived from the referenced definition's geometry output.
- Creation: choose a graph from the node menu.
- Navigation: activate the instance to open its shared definition.

Instances may be nested. Recursive definition dependencies are rejected.
