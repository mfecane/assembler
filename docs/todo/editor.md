3d view should be rebuilt from scratch as full featured editor using editor-architecture skill

proper abstractions, separation of business logic from react via bridge

ui state, editor state

interaction system

all nodes with 3d object output should have open in editor button (currently the eye button)

opening a transform node with its dedicated 3D editor button activates the transform gizmo,
allowing its values to be edited in the 3D view

if not in transform mode

separate parts of final assembly are raycastable and selctable with wireframe box depicting selected state

also context menu should be opened upon selection with one option for now - go to original asset node, which introduced this exact mesh to a project

only for assets right now, ignore shapes, they most likely will be cut from project, no need to do anything with them

## Implemented editor structure

The 3D viewport is owned by a `ViewportEditor` root rather than by the React component. It owns:

- `ViewportEditorController`, the mutation entry point for editor actions.
- `HistoryController` and transform commands.
- `ViewportReactBridge`, which publishes UI-only state to React.
- `ViewportScene`, which owns Three.js rendering, orbit controls, transform controls, selection
  helpers, and canvas lifetime.
- `CanvasEventHandler`, `InteractionHandlerRouter`, and prioritized interaction handlers for
  synthetic canvas events.

`ThreeViewport.tsx` only attaches the canvas and renders controls from bridge state. Persistent
transform values continue to live in graph transform nodes and are changed through the graph
controller.

## Implemented interactions

- Every geometry-output node exposes **Open in 3D editor**.
- Opening a transform node through **Open in 3D editor** activates move, rotate, or scale gizmos.
- Selecting a node on the graph canvas does not change the 3D editor.
- Transform movement and scale snap to `0.01`; rotation snaps to `15` degrees.
- While a node is open, its output is opaque and the current graph output is a transparent ghost.
  Parent graph output is ignored.
- Gizmo changes update the transform node's translation, rotation, and scale values.
- Outside transform mode, evaluated asset meshes can be raycast-selected.
- Selection is shown with a wireframe bounding box and opens an asset action menu.
- **Go to original asset node** opens the source graph and selects the mesh asset or mesh selector
  node that introduced the selected mesh.
- Primitive shapes are excluded from asset selection and origin navigation.

Asset provenance is attached during graph evaluation and survives material, transform, array,
group, and nested-assembly evaluation.

## Verification

Static TypeScript validation is required. Runtime interaction verification remains manual because
the workspace workflow does not permit agents to launch the application.

React Flow node measurement and position events must not republish controlled selection state.
Only explicit selection changes are forwarded to the 3D editor bridge; this prevents the graph
canvas from entering a measurement/render loop before its nodes become visible.
