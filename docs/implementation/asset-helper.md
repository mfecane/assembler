# Mesh asset helper

Status: implemented.

## Functionality

The graph toolbar includes a mesh-asset browser. It lists every selectable mesh
registered in the active editor's mesh catalog, with a rendered preview and the
catalog label and ID. Assets are displayed in a fixed two-column grid inside a
scrollable dialog.

The same picker is used in three contexts:

- The graph-toolbar trigger creates a Mesh Asset node in the currently open assembly. The node is
  created with the selected mesh already assigned and uses the same centered, cascading placement
  behavior as the existing Add node menu.
- The Mesh Asset node opens the picker to replace its current mesh while preserving its transform.
- Each Mesh Selector mapping row opens the picker to replace the mesh assigned to that choice while
  preserving the node's other mappings and transform.

Selecting an asset closes the dialog. When replacing an existing selection, the current asset is
marked in the grid.

## UI and rendering

- The toolbar trigger uses the standard shadcn button and tooltip components
  with a Lucide package-search icon.
- Preview images are rendered incrementally so the dialog can open before every
  thumbnail is ready.
- A single temporary Three.js renderer is reused for the entire preview batch,
  avoiding one WebGL context per asset card.
- Preview initialization and per-asset failures are shown directly on the
  affected cards and logged with the asset label, asset ID, list position, and
  underlying error details.
- Key dialog, grid, card, loading, preview, error, node trigger, and mapping-row elements expose
  `data-id` attributes for browser inspection.

## Implementation

- `MeshAssetPickerDialog.tsx` owns the reusable controlled dialog, selection trigger, asset cards,
  selected state, and preview rendering.
- `AssetHelperDialog.tsx` owns only the toolbar trigger and React Flow insertion-position
  calculation.
- `MeshAssetNode.tsx` and `MeshSelectorNode.tsx` provide their node-specific selection callbacks to
  the shared picker.
- `EditorController.addMeshAsset` creates a configured `MeshAssetGraphNode` in
  the active graph and rejects IDs that are not selectable catalog assets.
- `MeshCatalog.createGeometry` lets the helper obtain disposable geometry
  clones without coupling the UI to the default mesh-repository singleton.

No graph document schema, default graph, or seed data changed.

Static verification: `npx tsc --noEmit --pretty false`.
