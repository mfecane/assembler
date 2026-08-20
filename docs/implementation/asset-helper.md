# Mesh asset helper

Status: implemented.

## Functionality

The graph toolbar includes a mesh-asset browser. It lists every selectable mesh
registered in the active editor's mesh catalog, with a rendered preview and the
catalog label and ID. Assets are displayed in a fixed two-column grid inside a
scrollable dialog and can be filtered by name with a case-insensitive text search.

The same picker is used in three contexts:

- The graph-toolbar browser gives every asset an **Add instance** action. Assets with at least one
  enabled stretch axis also expose **Add stretchable instance**. Both actions use the centered,
  cascading placement behavior of the existing Add node menu.
- The Mesh Asset node opens the picker to replace its current mesh while preserving its transform.
- The Stretchable Asset node opens a filtered picker that contains only assets with enabled stretch
  axes; choosing one resets its stored sizes to the asset's natural metadata size.

Selecting an asset closes the dialog. When replacing an existing selection, the current asset is
marked in the grid. The name filter is cleared whenever the dialog closes.

## UI and rendering

- The toolbar trigger uses the standard shadcn button and tooltip components
  with a Lucide package-search icon.
- Assets with enabled stretch axes are identified by an icon badge with a tooltip.
- Preview images are rendered incrementally so the dialog can open before every
  thumbnail is ready.
- A single temporary Three.js renderer is reused for the entire preview batch,
  avoiding one WebGL context per asset card.
- Preview initialization and per-asset failures are shown directly on the
  affected cards and logged with the asset label, asset ID, list position, and
  underlying error details.
- Key dialog, filter, empty-filter state, grid, card, loading, preview, error, node trigger, and
  mapping-row elements expose `data-id` attributes for browser inspection.

## Implementation

- `MeshAssetPickerDialog.tsx` owns the reusable controlled dialog, selection trigger, asset cards,
  selected state, and preview rendering.
- `AssetHelperDialog.tsx` owns the toolbar trigger and React Flow insertion-position calculation
  for both instance types.
- `MeshAssetNode.tsx` and `StretchableAssetNode.tsx` provide their node-specific selection
  callbacks to the shared picker.
- `EditorController.addMeshAsset` creates a configured `MeshAssetGraphNode` in
  the active graph and rejects IDs that are not selectable catalog assets.
- `EditorController.addStretchableAsset` and `setStretchableAssetMesh` accept only selectable
  assets with computed bounds and at least one enabled stretch axis.
- `MeshCatalog.createGeometry` lets the helper obtain disposable geometry
  clones without coupling the UI to the default mesh-repository singleton.
- Every newly added asset must be registered in its client runtime registrar,
  model seed catalog, and metadata seed so it is both selectable in graphs and
  available in the model editor after a local catalog rebuild.

Choice-driven assets use separate Mesh Asset nodes connected to Choice to Mesh.

Static verification: `npx tsc --noEmit --pretty false`.
