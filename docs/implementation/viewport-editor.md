# Viewport editor

## Architecture

The root `Editor` owns the `ViewportEditor` rather than leaving lifetime to its React component:

- `ViewportEditorController` is the mutation entry point for editor actions.
- The root `EditorController` owns graph state and the shared `HistoryController`.
- The root `ReactBridge` publishes UI-only state to React.
- `ViewportScene` owns Three.js rendering, orbit controls, transform controls, selection helpers,
  and canvas lifetime.
- `CanvasEventHandler`, `InteractionHandlerRouter`, and prioritized handlers process synthetic
  canvas events.

`ThreeViewport.tsx` attaches the canvas and renders controls from bridge state. Persistent
transform values remain on graph transform nodes and are updated through `EditorController`.
Graph evaluation supplies plain scene metadata to `ViewportScene`; its synchronizer resolves the
assets and builds the corresponding Three.js meshes.

Repeated object changes from one transform-control drag share a history group and collapse into
one undo step alongside React Flow graph edits.

## Node preview and transforms

- Every geometry-output node exposes **Open in 3D editor**.
- Opening a Transform node activates translation, rotation, or scale controls.
- Translation and scale snap to `0.01`; rotation snaps to `15` degrees.
- The opened node output is opaque and the active graph output is a transparent context ghost.
- Preview evaluation is scoped to the graph open in React Flow; parent graph output is ignored.
- Selecting a React Flow node alone does not open or close a viewport preview.

## Asset selection

Outside transform mode, evaluated asset meshes can be selected by raycast. Selection displays a
wireframe bounding box and an asset action menu. **Go to original asset node** opens the source
graph, selects the Mesh Asset or Mesh Selector node that introduced the mesh, and briefly pulses
it for localization.

Asset provenance is part of every metadata instance and survives Material, Transform, Array,
Group, and nested-graph evaluation. It includes the scoped occurrence of an origin node as well as
the defining graph and node used for navigation. Primitive geometry is excluded from asset
selection and source-node navigation.

## React Flow coordination

React Flow measurement and position events must not republish controlled selection state. Only
explicit selection changes are forwarded to the viewport bridge; this prevents a measurement and
render loop before nodes become visible.

When exactly one edge is selected, adding a compatible node inserts it between the edge's source
and target ports. An incompatible node is added without changing the selected edge.

## Verification

Static TypeScript validation covers integration at build time. Viewport rendering and interaction
remain manual checks for the project owner.
