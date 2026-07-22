# Graph toolbar UI

## Implemented

- The selected-connection delete action is part of the main graph toolbar and appears only while
  one or more connections are selected.
- Every graph-toolbar action uses a compact icon button with an accessible label and tooltip.
- Assembly deletion, assembly clearing, configuration-panel editing, node creation, and JSON file
  actions are all launched from the main graph toolbar. Destructive assembly actions retain their
  confirmation dialogs.
- Node-local controls and 3D viewport tools remain close to the content they operate on rather than
  being treated as graph-toolbar actions.

## Verification

Static TypeScript validation is required. Runtime interaction verification remains manual because
the workspace workflow does not permit agents to launch the application.
