# Editor UI

## Graph toolbar

- Actions use compact icon buttons with accessible labels and tooltips.
- The delete-edge action appears only when one or more edges are selected.
- Assembly deletion, assembly clearing, configuration-panel editing, node creation, asset
  browsing, and JSON import/export are launched from the toolbar.
- Destructive assembly actions retain confirmation dialogs.
- Node controls and viewport tools remain beside the content they affect.
- The Add node menu stays within the viewport and scrolls internally when its node groups exceed
  the available height.

## Configuration-panel editor

Public inputs are created and edited as Graph Input nodes on the canvas. The configuration-panel
dialog does not create inputs; it maps compatible inputs from the entry graph to configurator
controls.

Each compatible entry input has a switch. Enabling it creates a control and exposes the compatible
element types and settings inline:

- Number inputs support number fields and sliders.
- Enum inputs support selects.
- Color inputs support color controls.
- Geometry inputs cannot be exposed in the panel.

The editor is available only while the entry graph is open. Runtime controls use an even
label/control grid. The runtime panel can be collapsed, but collapsed state is view-only and is
not persisted in the graph document.

## Verification

Static TypeScript validation covers component integration. Runtime layout and interaction remain
manual checks for the project owner.
