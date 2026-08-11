# Shared document enums

## Purpose

Enum option lists are document-owned definitions. Graph inputs reference those definitions instead
of copying the same options into every graph interface that forwards a choice.

Each persisted enum has a document-local ID, editable name, and non-empty unique option list. An
enum graph input stores `enumId` and its own default value. Defaults remain input-specific while the
available options are shared by every referencing input.

## Editing flow

Adding a Choice Graph Input creates a new definition with one `Option` value and binds the input to
it. The Graph Input node provides a choice-set selector, a create-and-bind action, a usage count,
the input-specific default selector, and an Edit choices action. That action opens a focused dialog for
the shared name and values. Editing from any referencing input updates the single document
definition in one history command.

Rebinding an input removes its previous definition when that definition has no remaining users.
Removing an enum input or graph performs the same unused-definition cleanup.

Option changes reconcile all dependent state in the same command. Renames preserve graph defaults,
entry values, graph-instance overrides, configuration-constraint maximums, Mesh Selector rows, and
Choice to Number rows. Removals discard invalid overrides and mapping rows, select a valid default,
and rebuild constraint keys from the remaining options. New constraint keys start at the current
combined constrained value so the document remains valid.

## Persistence

The graph document requires a top-level `enums` array. Enum graph inputs require `enumId` and must
not contain `options`. Imports using the earlier graph-local enum option shape are intentionally
unsupported; this is a one-shot schema replacement with no compatibility migration.

Standalone Enum nodes retain their local options. They are concrete graph value sources, while
document enums define reusable graph-interface choice domains.

## Verification

Static TypeScript validation covers model and component integration. The project owner must verify
definition switching, shared option editing, undo/redo, instance overrides, mapping reconciliation,
configuration constraints, JSON import/export, project reset, and seeded-project creation in the
running application.
