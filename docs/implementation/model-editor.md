# Model editor

The authenticated model editor is available at `#/models/:modelId`. The **Models** button in the
projects header opens `#/models`; after the current client's catalog loads, that base route replaces
itself with the first model's address.

## Architecture

Each selected model gets one `ModelEditorInstance`, which is the composition root for that editor
lifetime:

```text
ModelEditorInstance
├── ModelProject
├── ModelEditorController
│   ├── ModelCommandFactory
│   ├── HistoryController
│   ├── ModelToolController
│   └── ModelInteractionController
│       ├── CanvasEventHandler
│       ├── InteractionHandlerRouter
│       └── InteractionHandlerRepository
├── ModelReactBridge
└── ModelViewportEditor
    └── ModelPreviewScene
```

`ModelProject` owns the persistent metadata draft, saved record, whole-document dirty comparison,
and observable project snapshot.
`ModelEditorController` is the only mutation and persistence entry point. Metadata edits are
commands, including updates emitted by Three.js stretch gizmos, so the panel and viewport share one
undo/redo history. The header's unsaved state compares the complete draft with the saved record;
the Bounding box section additionally identifies when its measurements differ.

`ModelReactBridge` owns only UI-ephemeral state: absolute stretch-test size, active box-edit axis,
pivot editing mode, checker visibility, active tool identity, save progress, history availability, and contextual
editor/viewport errors. `ModelViewportEditor` owns canvas attachment, resize observation, and scene
synchronization. `ModelPreviewScene` remains a rendering implementation and never talks to React.

`useModelEditor` performs asynchronous composition-root creation and lifetime cleanup. React views
read stable external-store snapshots and invoke explicit controller methods; they do not load,
persist, or mutate model metadata themselves.

## Interaction system

`ModelInteractionController` owns the interaction lifetime and is the extension point for canvas
tools and renderer widgets. `CanvasEventHandler` attaches to the viewport canvas and converts native
pointer, double-click, and wheel events into ordered `ModelInteractionEvent` objects. It detects
clicks separately from double-clicks and emits drag start, drag, and drag end after a small movement
threshold.

Each synthetic event contains canvas coordinates and deltas, keyboard modifiers, the raw browser
event, model identity, and the current renderer hit-test result. The scene hit tester exposes stable
interaction target IDs and target types rather than leaking Three.js objects into tools.

`InteractionHandlerRouter` selects enabled handlers by descending priority. A handler can pass an
event to lower-priority handlers, mark it handled, capture the pipeline across later events, or
release capture. Routing is serialized, so asynchronous handlers cannot reorder pointer events.
Pending events from a detached viewport are invalidated before another viewport can attach.
Handler failures include the handler ID, event type, model ID, coordinates, and hit target in the UI
and console error.

Always-on widgets register `InteractionHandler` implementations with
`ModelEditorController.registerInteractionHandler`. Mutually exclusive tools implement `ModelTool`
and register with `ModelEditorController.registerTool`; controller activation enables one tool
handler, publishes its ID through the React bridge, and deactivates the previous tool.
The existing stretch widget uses a high-priority capturing boundary handler, and its semantic commit
event is routed to a command-producing handler. New widgets can publish the same generic
`WidgetInteraction` without adding branches to the controller, viewport, or React components.

## Catalog and navigation

The model selector reads the runtime mesh registrar using the client persisted by the projects-page client
selector. Changing the selected model updates the hash route, so a particular asset can be refreshed or
linked directly. A route for a model not registered for the current client shows a contextual error and
keeps the valid model selector available. Database metadata is optional and never determines which models
are selectable.

## Preview

The main workspace is a full-height standalone Three.js preview with a docked settings sidebar on
the right. The sidebar can collapse to a narrow docked rail, expanding the viewport without placing
configuration controls over the preview. The preview clones the selected asset's geometry from the
shared mesh repository, adds neutral preview material, frames the camera from the geometry bounds,
and supports orbit controls. Rendering resources and cloned geometry are disposed when the selected
model changes or the route unmounts. A labeled Three.js view helper in the bottom-right corner shows
the camera orientation and accepts axis clicks.

**Scale in viewport** activates a Three.js scale gizmo for every configured geometry axis. Test
sizes are absolute model dimensions initialized from the geometry bounding box. Dragging a handle
updates the preview geometry without persisting the test size. **Finish scale preview**, the viewport exit
action, and switching directly to UV view deactivate the scale tool and restore the source size.

The Pivot section displays the local X/Y/Z pivot and can reset it to zero. **Edit in viewport**
opens a translation gizmo at the current pivot. Its placement mode switches between free movement
and 27 source-bounds points covering every corner, edge center, face center, and the bounds center.
The current pivot is always visible in the 3D view as a depth-independent, screen-size-stable
yellow marker, including when pivot editing is inactive.
Bounds markers use red, amber, blue, and lime categories; the bounds center is lime, and any hovered
marker turns white. Their visible spheres and the persistent pivot marker use a 5-pixel screen-space
radius while the larger invisible hit targets preserve easy selection. Selecting a bounds marker
commits the pivot and exits pivot editing; free-move drag commits leave editing active. Pivot changes
are persisted metadata commands and participate in undo/redo.

The Stretch section has a persisted **Enabled** switch. Disabling it keeps the configured axes,
resets the preview to its source size, closes the active stretch tool, and disables all stretch
controls. Each configured axis has an **Adjust boxes in viewport** toggle. Only the selected axis shows a
translucent face plane behind each spherical handle. The mesh surface inside each box is overlaid in the axis color
and clipped at the box faces, making the exact affected part visible while a face moves. Selecting the toggle
again exits box editing. The face planes, affected surface, yellow wireframe, and yellow vertex points render without
depth testing so hidden topology and box positions stay visible. Orbit controls pause while a handle is dragged.
Scale and box tools are mutually exclusive,
and the active tool can also be exited from
the bottom-left viewport button.

The **Preview** section applies a generated black-and-white checker texture to the preview material.
Its scale slider changes texture repetition from 1× to 16×. Both controls are temporary and never
change model metadata.

The separate **UVs** section summarizes whether the loaded geometry has a UV attribute and, when it
does, reports its coordinate-entry count. An attribute with zero U or V span is explicitly reported
as degenerate; when every entry collapses to one point, the panel shows that coordinate and explains
why the UV view has no visible edges. Its temporary **UV view** switch closes active stretch tools
and replaces the 3D render with the current UV triangle wireframe on an XY plane, framed by an
orthographic camera. A ten-division 0–1 grid provides the reference tile and always fits the viewport;
UVs outside that tile are clipped. Models without a UV attribute show an explicit empty summary and disable the
switch. The inspector orders Preview, Pivot, Stretch, UVs, Materials, and Bounding box as independent
accordion sections. Preview and Stretch default open; diagnostic sections remain collapsed with
their status visible in the section header.

## Metadata

The right panel loads the optional `model_metadata` record and renders only the supported fields.
Its read-only Materials section appears below UVs and reports each source GLTF material's slot
index and name in a compact table. Bounding-box size and center share a copyable X/Y/Z measurement
table. Pivot and stretch metadata have
dedicated editable controls. Other metadata keys are intentionally not rendered; the UI does not
recursively generate fields or labels from arbitrary JSON.

All editor-supported metadata fields are optional. Missing or partial bounds inherit the corresponding
loaded-geometry values without changing the draft; **Refresh** explicitly copies complete geometry
bounds into the draft. Missing or partial pivot coordinates inherit zero. Missing stretch controls
fall back to disabled and an empty axis list, while a missing per-axis texture assignment behaves as
Nothing. Present malformed values still fail with their model ID, field path, and received value.

The searchable model control is the single model-identity surface and matches both display names
and asset IDs. Save, status, and grouped metadata undo/redo controls remain in the main editor
header while the metadata sections scroll. Save is available only when the complete metadata draft
differs from the saved record. Switching models, returning to Projects, or signing out asks for
confirmation before discarding an unsaved draft; closing the page uses the browser unload warning.
The history and dirty state belong to the editor instance and reset when a different model is opened.
The header can export all saved metadata records for the selected client. Its JSON uses the checked-in
asset-metadata seed format, so replacing `scripts/data/kitchen/metadata.json` with the Kitchen export
makes the next local seed populate those metadata records.

## Stretch boxes

**Add axis** is paired with an X/Y/Z selector. Adding an axis creates source-space start and end
faces at 5% and 95% of that geometry axis's bounding-box range, then immediately enters box-editing
mode for the new axis. An axis can be configured once, and a model can contain all three stretch axes.
Each axis contains one or more boxes. **Add box** places another box in the largest uncovered part of
the source bounds. Boxes on one axis are ordered and cannot intersect; numeric inputs and viewport
dragging stop each face at its neighboring box.
**Scale UV** selects U, V, or Nothing independently for each geometry axis. U and V can each belong
to only one geometry axis; the remaining axis can still stretch geometry with Nothing selected.
Values can always be entered in the panel while Stretch is enabled. **Adjust boxes in viewport**
shows the affected mesh surface between two translucent axis-colored face planes. Each plane extends
0.1 world units past both sides of the mesh on the two perpendicular axes and remains exactly at its
saved minimum or maximum. Each face has a camera-scaled spherical handle with a larger invisible sphere
collider and a white hover state. Dragging the sphere moves only that face along its geometry axis;
the previous arrow controls are not used. Axis cards and viewport tool
labels consistently identify X in red, Y in green, and Z in blue while retaining their text labels.
Horizontal dragging of the minimum and maximum fields uses a perceptible step based on 0.1% of the
source axis size; typed values retain fine precision, and Ctrl or Command provides a tenth-step drag adjustment.

The persisted stretch shape includes the master enabled state whenever axes are configured. Metadata
without any stretch configuration remains valid:

```json
{
	"stretchEnabled": true,
	"stretchAxes": [
		{
			"axis": "x",
			"boxes": [
				{ "min": -0.45, "max": -0.15 },
				{ "min": 0.15, "max": 0.45 }
			],
			"textureAxis": null
		}
	]
}
```

Saved model metadata is also refreshed in the shared mesh catalog. Project editors load all model
metadata for their client before graph evaluation, allowing Stretchable Asset nodes to use the same
bounding-box size, stretch boxes, UV assignments, and pivot as the model editor.

The test fields and scale gizmo use target bounding-box dimensions, not percentages. Editable box
and test-size fields use the shared draggable `NumericInput`. Test sizes are constrained by one
shared rule in the panel, controller, and Three.js gizmo: compression stops before the combined
stretch-box length collapses, and expansion stops at ten times the source model size. The dedicated
`ModelStretchService` resets source buffers and deforms geometry. For each configured geometry axis,
it divides the target-size delta by the combined source length of all boxes. Every vertex inside any
box therefore receives the same percentage scaling. Vertices in gaps or outside all boxes receive
the accumulated displacement of the boxes before them, so those parts translate rigidly. This makes
the resulting bounding-box dimension equal the requested value.

After deformation, the preview mesh is translated so its resulting bounds occupy the same space as
ordinary scaling from the source size to the test size around the persisted pivot. At source size
the offset is zero. The viewport scale gizmo is centered on that same pivot, so its visual origin and
the preview placement follow one rule.

When U or V scaling is selected, geometry displacement divided by the combined stretch-box length
is applied to that UV coordinate. Nothing leaves UVs unchanged and permits geometry-only tests
for models without UV data. Every calculation starts from copied original position and UV buffers,
so tests do not accumulate. **Reset size** restores the source bounding-box dimensions; test values
are never included in Save. Entering box editing also resets the test so box values remain in
source coordinates.

The checked-in Kitchen metadata seed was migrated by wrapping every previous min/max region in a
one-element `boxes` list. The seed loader validates that current shape and rejects old or intersecting
box data with the client, asset, axis, and offending values.

Load, render, and save failures include the client/model identifiers, operation, underlying error,
and stack where available in both the UI and console. Editor errors remain above the usable
inspector instead of replacing it, while viewport alerts can be dismissed independently. Invalid
stretch metadata and models without UV
data when a UV stretch test is requested fail with the affected axes and values included.
