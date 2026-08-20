# Editor UI

## Graph toolbar

- Actions use compact icon buttons with accessible labels and tooltips.
- The delete-edge action appears only when one or more edges are selected.
- Delete and Backspace remove the selected connections and removable nodes from the graph canvas.
  Removing a node also removes its connected edges; the required Output node remains protected. The
  entire selection is recorded as one graph command, so one Undo restores the complete deletion.
- Configuration-panel editing, node creation, asset browsing, and JSON import/export are launched
  from the canvas toolbar. Node creation opens a searchable dialog from either the toolbar button or
  the Space shortcut. Its filter receives focus immediately, matches names, descriptions, and
  categories, and Enter adds the first visible result.
- The project header presents a breadcrumb-like hierarchy: a folder icon identifies the project,
  followed by a directional separator and a grouped assembly control. The full current-assembly
  control opens the graph selector, keeping the dropdown anchored to the name it changes. The
  selector presents root graphs as dependency trees. A child definition appears once per containing
  graph even when that parent has multiple instances of it. Unreferenced non-root definitions are
  presented separately under **Unused graphs**, with their own dependencies nested beneath them.
- The assembly selector and adjacent actions button use a shared button group so they read as one
  control. The actions menu provides Edit graph, Copy assembly, Clear assembly, and Delete assembly.
  Copy assembly duplicates the complete graph definition and opens the copy; root assemblies retain
  their root input values and configuration controls. Edit graph
  changes both the graph name and whether it is a root or subgraph. Promoting a subgraph creates an
  empty root configuration. Demoting a root requires confirmation because it removes that root's
  saved input values and configuration controls; the graph definition and its nodes
  remain. The project's only root cannot be demoted. Clearing retains the Output node, while
  deletion removes the complete assembly; both destructive actions require confirmation. Deletion
  is unavailable for the final remaining root or an assembly that still has instances. Hovering or
  focusing the disabled delete action explains the exact restriction, including the referencing
  assemblies and instance count when applicable. Separate **New root** and **New assembly** actions
  create top-level products and reusable definitions respectively.
- Node controls and viewport tools remain beside the content they affect.
- The Add node dialog scrolls internally when its node groups exceed the available height.

## Configuration-panel editor

Values are created and edited as Input nodes on the canvas. Enabling Export exposes a value as a
public graph input; disabling it keeps the value local. The configuration-panel
dialog does not create inputs; it maps compatible inputs from the open root graph to that root's
configurator controls.

The dialog shows the configured UI items rather than an inventory of every graph input. **Add item**
offers predefined number-field, slider, number-array, select, material-select, and switch items. Adding an item binds
it to the first unused compatible root input; its Graph input selector can then link it to another
unused compatible input. Each root input can back at most one UI item in that root's panel.

Items expose their label, widget type, graph-input binding, and type-specific settings inline:

- Number inputs support number fields and sliders.
- Number-array inputs support a multi-value number editor with author-defined labels, item count,
  step, and shared total maximum.
- Choice inputs support selects.
- Material inputs support material controls. The runtime configurator, graph inputs, and graph
  instances all select from the registered PBR material catalog.
- Boolean inputs support switches.
- Geometry inputs cannot be exposed in the panel.

The grip on each item uses React DnD to reorder configuration controls. Crossing the midpoint of
another item updates the displayed order immediately, while the document receives one ordered-array
update when the gesture ends. The runtime configurator therefore renders the same order without a
separate layout field. Removing an item affects only its UI mapping; the graph input and its current
value remain intact.

The editor is available while any root graph is open and edits only that root's UI configuration.
Runtime controls use an even label/control grid. A root graph renders its configured controls; a
subgraph bypasses that mapping and renders controls for every non-geometry exported input from the
definition itself. Editing a subgraph control changes that input's declaration default, which is
also used by the subgraph preview. The runtime panel can be collapsed, but collapsed state is
view-only and is not persisted in the graph document.

## Node headers

Every node uses the shared header treatment: a muted function-category background with dark text,
a Lucide type icon, its persisted node name, any node-specific actions, and a three-dots actions
menu. Hovering or focusing the icon shows the node's canonical type. Node bodies remain neutral gray.
The header icon and title are drag surfaces;
renaming is intentionally available only from the actions menu so editing gestures do not compete
with node movement. Copy duplicates a node with all of its current field values, gives it a fresh
ID, offsets it slightly from the source, and leaves it disconnected. Copy is omitted for assembly
Input and Output boundary nodes. Rename opens a focused dialog, while Delete retains a confirmation
step and is omitted for the required Output node. Assembly-input cards edit defaults. Choice cards
also select or create a document choice set and show a usage count that makes the cross-graph effect
explicit. Their Edit choices action opens a focused dialog for changing the shared name and values.
Their public labels remain owned by the separate configuration mapping UI.

Assembly instances retain their explicit open action for navigation. Labels above transform vector
inputs are also drag surfaces, while the inputs themselves remain interactive and do not move nodes.

Node-local numeric fields pair their typed input with a horizontal-drag control marked by the
left/right chevrons icon. Drag distance advances a configurable rounded step and repeated values are
ignored. Transform position and scale plus Array and Multi Array offsets use `0.01`; transform
rotation uses `1`, and integer count inputs retain step `1`.

All numeric editing surfaces use the same `NumericInput`. It owns focused draft text, parsing,
minimum constraints, commits rounded to at least three decimal places, and dragging. Integer count
fields remain explicitly rounded to whole values. Its internal field is a decimal-keyboard text
input, so browser number steppers are not rendered; border, background, radius, focus, and disabled
visuals belong only to the shared wrapper. Disabled inputs reject typed and pointer-drag mutations,
including a drag that was already captured when the input became disabled.
Focused draft text remains authoritative while typing, so graph updates from an intermediate valid
number cannot replace subsequent rapid keystrokes. Blur commits the field's latest text directly.
Holding Ctrl or Command while dragging uses one tenth of the configured drag step for precision adjustment.

## Verification

Static TypeScript validation covers component integration. Runtime layout and interaction remain
manual checks for the project owner.
