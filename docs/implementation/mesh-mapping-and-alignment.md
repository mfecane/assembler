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

Opening any transform-capable node exposes an Align action beside Move, Rotate, and Scale. The
dialog contains one enable checkbox and Min/Mid/Max selector for each axis, plus one XYZ alignment
point. Apply measures the world-space bounding box of all meshes in the current opaque preview.

For every enabled axis, the editor adds this delta to the node's stored translation:

`target point − selected bounding-box coordinate`

The selected coordinate is the minimum, midpoint, or maximum on that axis. Unchecked axes retain
their current translation. Rotation and scale are unchanged, and the complete alignment is stored
as one undoable viewport transform action. The editor bridge retains the last successfully applied
axis checkboxes, methods, and target point across dialog and node-preview remounts. Closing without
applying discards the draft and restores the last applied settings next time.
