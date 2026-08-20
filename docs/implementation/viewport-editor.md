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
transform values remain on transform-capable graph nodes and are updated through `EditorController`.
Graph evaluation supplies plain scene metadata to `ViewportScene`; its synchronizer resolves the
assets and builds the corresponding Three.js meshes.

Evaluation-triggering graph changes are debounced for 300 milliseconds. Preview evaluation runs as
an asynchronous scheduled task with a monotonically increasing sequence; a newer request cancels a
pending timer and prevents an older task from synchronizing stale metadata after it yields. This
keeps rapid numeric edits responsive and applies only the latest requested preview.

Viewport gizmo drags do not wait for that evaluation. Transform drags apply a transient delta to
the currently rendered preview matrices, including the node's configured transform origin, and
Array distance drags reposition the rendered copies directly. The graph still receives each
undo-grouped drag value, while the debounced evaluation replaces the transient matrices with the
authoritative finished result after interaction settles.
Holding Ctrl or Command during a Transform or Array gizmo drag applies one tenth of the normal delta from the
gesture's starting value. The gizmo and transient meshes follow the precision-adjusted value
together; Array distance persistence uses `0.001` snapping in this mode instead of `0.01`.

Repeated object changes from one transform-control drag share a history group and collapse into
one undo step alongside React Flow graph edits.

## Node preview and transforms

- Every geometry-output node exposes **Open in 3D editor**.
- Opening a standalone Transform or a transform-capable Mesh Asset or Assembly
  Instance node activates translation, rotation, or scale controls.
- The transform toolbar includes **Align**. It replaces the transform controls with 27 clickable
  points at every Min/Mid/Max combination of the preview's world-space bounding box. Clicking a
  point moves that exact bounds point to the world origin as one undoable edit. A connected chevron
  opens the detailed per-axis alignment dialog while the primary Align button controls the gizmo.
- Alignment markers distinguish corners, edge centers, face centers, and the bounds center by
  color. Larger invisible hit targets make them forgiving to acquire; hover recolors only the
  visible marker and switches the viewport cursor to a pointer. Markers and hit targets retain a
  consistent screen size as the camera zoom changes.
- Opening an Array activates a dedicated single-axis distance gizmo at its final duplicate. The
  gizmo follows the Array axis and edits per-copy duplication distance instead of a transform.
- Translation, scale, and Array duplication distance snap to `0.01`; rotation snaps to `15`
  degrees.
- The opened node output is opaque and the active graph output is a transparent context ghost.
- Preview evaluation is scoped to the graph open in React Flow; parent graph output is ignored.
- Selecting a React Flow node alone does not open or close a viewport preview.

## Asset selection

Outside transform mode, evaluated asset meshes can be selected by raycast. Selection displays a
wireframe bounding box and an asset action menu. **Go to original asset node** opens the source
graph, selects the Mesh Asset node that introduced the mesh, and briefly pulses
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
