# Shared document enums

## Purpose

Enum option lists are document-owned definitions. Graph inputs reference those definitions instead
of copying the same options into every graph interface that forwards a choice.

Each persisted enum has a document-local ID, editable name, and non-empty unique option list. An
enum graph input stores `enumId` and its own zero-based numeric default index. Defaults remain input-specific while the
available options are shared by every referencing input.

## Editing flow

Adding a Choice Input creates a new definition with one `Option` value and binds the node to it.
Input and Choice Widget nodes use the same compact choice-set selector and edit button. Choice Inputs
also show their local default selector. The editor action opens a focused dialog for the shared name
and values. Editing from any referencing node updates the single document definition in one history
command. Choice labels enter rename mode on double-click and can be reordered by their drag handles.

Rebinding an input removes its previous definition when that definition has no remaining users.
Removing an enum input or graph performs the same unused-definition cleanup.

Runtime and persisted choice identity is the numeric option index, never the display label. Renames
therefore need no reference rewrite. Reordering remaps graph defaults, root values, graph-instance
overrides and Choice-to-Scalar, Choice-to-Vector-3, and Choice-to-Mesh mappings so they remain
attached to the same label. Removals discard mappings for the removed index, shift later indices,
and select a valid fallback where required.

## Persistence

The graph document requires a top-level `enums` array. Enum graph inputs require `enumId`, use
numeric defaults, and must not contain `options`. Switch cases and mapping nodes persist
`enumIndex`. Imports containing string choice values or the earlier graph-local enum option shape
are intentionally unsupported; this is a one-shot schema replacement with no compatibility migration.

Choice Input nodes use document enums whether they remain local or are exported, so the same node can
cross the graph boundary without changing its value domain.

## Verification

Static TypeScript validation covers model and component integration. The project owner must verify
definition switching, shared option editing, undo/redo, instance overrides, mapping reconciliation,
JSON import/export, project reset, and seeded-project creation in the
running application.
