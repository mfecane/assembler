# Root graphs

## Behavior

A project can expose multiple independent top-level assemblies. The graph selector renders each root
as a dependency tree and places unreferenced non-root definitions under **Unused graphs**. Repeated
instances of one definition in the same parent collapse to one entry. **New root** creates a new
empty graph definition and its root record together. The graph edit dialog can promote a subgraph
by creating an empty root record, or demote a root by removing its saved input values and
configuration panel after confirmation. The final remaining root cannot be demoted or deleted.

Opening a root makes it the active root context. Opening one of its descendants keeps that context,
so returning through the selector preserves which top-level product the author is working on. The
first persisted root is the default opened after project load.

## Configuration

Every root record owns three pieces of data:

- `graphId`, referencing one graph definition in the same document;
- `inputValues`, storing that root's current public-input values;
- `configurationPanel`, storing its ordered controls and their type-specific settings.

The configurator panel follows the active root context. Its heading includes the root label, and
control changes mutate only that root's values. The configuration-panel editor is available when
the root definition itself is open and edits only that root's controls.

## Persistence

The schema intentionally replaced the former singular `entryGraphId`, `entryInputValues`, and
top-level `configurationPanel` fields. Import does not translate the former shape. The checked-in
MaxShelf project and new-project seed both use the current `rootGraphs` array and retain identical
content. The Supabase `projects.graph_document` constraint requires top-level `rootGraphs`, `enums`,
and `graphs` arrays, matching the application serializer and rejecting the former shape.

`main` remains the default MaxShelf root with the complete shelving UI. The retained `graph-5`
assembly is also a root with an independent number slider, so the checked-in data exercises
multi-root serialization and UI ownership directly.

## Verification

Static TypeScript, JSON, schema, and seed-script validation cover the implementation. Runtime
verification remains with the project owner per repository instructions: switch between both root
trees, change each panel independently, edit both panel definitions, save and reopen the project,
and create and delete an additional root.
