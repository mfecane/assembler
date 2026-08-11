# Root graphs

## Behavior

A project can expose multiple independent top-level assemblies. The assembly selector groups each
root with the graph-instance descendants reachable from it, then lists definitions unreachable from
all roots under **Unused assemblies**. **New root** creates a new empty graph definition and its root
record together. The final remaining root cannot be deleted.

Opening a root makes it the active root context. Opening one of its descendants keeps that context,
so returning through the selector preserves which top-level product the author is working on. The
first persisted root is the default opened after project load.

## Configuration

Every root record owns three pieces of data:

- `graphId`, referencing one graph definition in the same document;
- `inputValues`, storing that root's current public-input values;
- `configurationPanel`, storing its ordered controls and cross-input constraints.

The configurator panel follows the active root context. Its heading includes the root label, and
control changes mutate only that root's values. The configuration-panel editor is available when
the root definition itself is open and edits only that root's controls and constraints.

## Persistence

The schema intentionally replaced the former singular `entryGraphId`, `entryInputValues`, and
top-level `configurationPanel` fields. Import does not translate the former shape. The checked-in
MaxShelf project and new-project seed both use the current `rootGraphs` array and retain identical
content. The Supabase `projects.graph_document` constraint requires top-level `rootGraphs`, `enums`,
and `graphs` arrays, matching the application serializer and rejecting the former shape.

`main` remains the default MaxShelf root with the complete shelving UI. The retained `graph-2`
Corner assembly is also a root with an independent shelf-count slider and finish-color palette, so
the checked-in data exercises multi-root serialization and UI ownership directly.

## Verification

Static TypeScript, JSON, schema, and seed-script validation cover the implementation. Runtime
verification remains with the project owner per repository instructions: switch between both root
trees, change each panel independently, edit both panel definitions, save and reopen the project,
and create and delete an additional root.
