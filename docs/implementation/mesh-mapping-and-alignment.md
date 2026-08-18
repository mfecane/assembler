# Mesh Mapping and Viewport Alignment

## Choice-driven meshes

The editor exposes three indexed-choice mapping nodes: Map to Scalar, Map to Vector 3, and Map to
Mesh. Map to Mesh owns only stable `{ id, enumIndex }` mappings. Every mapping is a separate geometry
input, normally supplied by an ordinary Mesh Asset node. It does not select assets itself and has no
embedded transform.

The former `meshSelector` node was removed. Its persisted instances were expanded into one Mesh
Asset per choice, retaining the original embedded transform, plus one `choiceToMeshMap`. The former
`geometrySwitch` node was renamed to the same map type. These schema changes intentionally have no
legacy deserialization path.

## Viewport alignment

Opening any transform-capable node exposes an Align action beside Move, Rotate, and Scale. Align
replaces the transform controls with a 27-point gizmo containing every Min/Mid/Max combination of
the current opaque preview's world-space bounding box. Clicking a point aligns that precise point
to the world origin on all three axes. A connected chevron beside Align opens the detailed dialog
for per-axis Min/Mid/Max choices and a custom target point without hiding the direct gizmo workflow.

The markers are color-coded by anchor type: red corners, amber edge centers, blue face centers, and
a white bounds center. Each marker has a larger invisible hit target. Hovering changes only the
visible marker to lime and changes the canvas cursor, while the invisible hit target remains hidden.

For every enabled axis, the editor adds this delta to the node's stored translation:

`target point − selected bounding-box coordinate`

The selected coordinate is the minimum, midpoint, or maximum on each axis. Rotation and scale are
unchanged, and the complete alignment is stored as one undoable viewport transform action.
