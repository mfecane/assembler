# Mesh asset helper

Status: implemented.

## Functionality

The graph toolbar includes a mesh-asset browser. It lists every selectable mesh
registered in the active editor's mesh catalog, with a rendered preview and the
catalog label and ID. Assets are displayed in a fixed two-column grid inside a
scrollable dialog.

Selecting an asset closes the dialog and creates a Mesh Asset node in the
currently open assembly. The node is created with the selected mesh already
assigned and uses the same centered, cascading placement behavior as the
existing Add node menu.

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
- Key dialog, grid, card, loading, preview, and error elements expose `data-id`
  attributes for browser inspection.

## Implementation

- `AssetHelperDialog.tsx` owns the toolbar trigger, dialog, asset cards, preview
  rendering, and React Flow insertion-position calculation.
- `GraphController.addMeshAsset` creates a configured `MeshAssetGraphNode` in
  the active graph and rejects IDs that are not selectable catalog assets.
- `MeshCatalog.createGeometry` lets the helper obtain disposable geometry
  clones without coupling the UI to the default mesh-repository singleton.

No graph document schema, default graph, or seed data changed.

Static verification: `npx tsc --noEmit --pretty false`.
