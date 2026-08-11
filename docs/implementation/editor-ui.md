# Editor UI

## Graph toolbar

- Actions use compact icon buttons with accessible labels and tooltips.
- The delete-edge action appears only when one or more edges are selected.
- Configuration-panel editing, node creation, asset browsing, and JSON import/export are launched
  from the canvas toolbar.
- The project header presents a breadcrumb-like hierarchy: a folder icon identifies the project,
  followed by a directional separator and a grouped assembly control. The full current-assembly
  control opens the assembly tree, keeping the dropdown anchored to the name it changes. Each graph
  definition can appear below multiple roots or instances when those paths share it.
- The assembly selector and adjacent actions button use a shared button group so they read as one
  control. The actions menu provides Rename assembly, Clear assembly, and Delete assembly. Rename
  uses a focused dialog. Clearing retains the Output node, while deletion removes the complete
  assembly; both destructive actions require confirmation. Deletion is unavailable for the final
  remaining root or an assembly that still has instances. Hovering or focusing the disabled delete
  action explains the exact restriction, including the referencing assemblies and instance count
  when applicable. Separate **New root** and **New assembly** actions create top-level products and
  reusable definitions respectively.
- Node controls and viewport tools remain beside the content they affect.
- The Add node menu stays within the viewport and scrolls internally when its node groups exceed
  the available height.

## Configuration-panel editor

Public inputs are created and edited as Graph Input nodes on the canvas. The configuration-panel
dialog does not create inputs; it maps compatible inputs from the open root graph to that root's
configurator controls.

The dialog shows the configured UI items rather than an inventory of every graph input. **Add item**
offers predefined number-field, slider, select, color-picker, and switch items. Adding an item binds
it to the first unused compatible root input; its Graph input selector can then link it to another
unused compatible input. Each root input can back at most one UI item in that root's panel.

Items expose their label, widget type, graph-input binding, and type-specific settings inline:

- Number inputs support number fields and sliders.
- Choice inputs support selects.
- Color inputs support color controls. Each control edits the non-empty RGB choice list shown in
  the runtime configurator; graph and graph-instance nodes remain unrestricted RGB pickers.
- Boolean inputs support switches.
- Geometry inputs cannot be exposed in the panel.

The grip on each item uses React DnD to reorder configuration controls. Crossing the midpoint of
another item updates the displayed order immediately, while the document receives one ordered-array
update when the gesture ends. The runtime configurator therefore renders the same order without a
separate layout field. Removing an item affects only its UI mapping; the graph input and its current
value remain intact.

The editor is available while any root graph is open and edits only that root's UI configuration.
Runtime controls follow the active root context and use an even label/control grid. The runtime
panel can be collapsed, but collapsed state is view-only and is not persisted in the graph document.

## Node headers

Every node uses the shared header treatment: a Lucide type icon, its persisted node name, any
node-specific actions, and a three-dots actions menu. The header icon and title are drag surfaces;
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

## Verification

Static TypeScript validation covers component integration. Runtime layout and interaction remain
manual checks for the project owner.
