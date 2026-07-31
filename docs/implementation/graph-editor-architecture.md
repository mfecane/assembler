# Graph editor architecture

## Ownership

`Editor` is the graph editor's composition root. One instance is created for a loaded project and
owns the complete editor lifetime:

```text
Editor
├── EditorController
│   ├── GraphState
│   ├── HistoryController
│   ├── CommandFactory
│   ├── GraphEvaluator
│   ├── NodeRegistry
│   └── MeshCatalog
├── ReactBridge
└── ViewportEditor
    ├── ViewportEditorController
    └── ViewportScene
```

`GraphState` owns the mutable graph document, active graph, active graph model, render revision,
and persistent document-version identity. `EditorController` owns `GraphState` and is the only
application-facing mutation boundary. React components and hooks select state and call explicit
controller methods; they do not receive arbitrary model-mutation callbacks.

`ReactBridge` owns shared UI-only state: history availability, viewport preview and transform
mode, mesh selection, context menus, graph focus requests, and contextual editor errors. None of
that state is serialized.

React Flow remains the graph interaction implementation. Its callbacks are thin adapters to
`EditorController`; the graph editor does not add another canvas event or interaction-routing
abstraction. The existing Three.js raycast handlers remain local to the viewport.

## Commands and history

Every persistent graph mutation is executed through the `EditorCommand` interface and the shared
`HistoryController`. This includes topology, node values, graph interfaces, configuration values,
JSON import, and transforms performed with the Three.js gizmo.

Commands retain serialized before and after graph checkpoints. This intentionally favors simple,
exact undo behavior for compound MVP operations over a hierarchy of handwritten inverse commands.
Repeated field, node-position, and transform updates with the same merge key are coalesced within
a short interaction window. A fresh command after undo clears redo history.

Undo and redo restore both the graph document and the active graph captured by the command. Merely
opening another graph is navigation: it publishes a render revision but does not enter history or
mark the document dirty.

The bridge publishes `canUndo` and `canRedo` for toolbar controls. Keyboard integration supports
`Ctrl/Command+Z`, `Ctrl/Command+Shift+Z`, and `Ctrl+Y` outside editable form controls.

## Three.js coordination

The viewport subscribes to `EditorController` state. After a graph command, it evaluates the
active graph or preview node into plain scene metadata and synchronizes Three.js objects from that
metadata. Graph evaluation remains independent of Three.js objects.

Viewport selection, preview, and transform mode update only `ReactBridge`. A transform-control
drag sends graph ID, node ID, before/after values, and a drag history group to `EditorController`.
Those updates enter the same history as React Flow changes, while repeated changes from one drag
coalesce into one undo step.

## Persistence and dirty state

The serialized graph schema is unchanged. `revision` is monotonic and exists only to refresh
subscribers. `documentVersion` identifies graph content states and is restored by undo/redo.
Project saving records the saved version, so undoing exactly to that state makes the project clean
again and redoing away from it makes the project dirty.

`EditorProvider` retains and releases the root editor with deferred disposal so React Strict Mode's
development effect replay does not destroy a live viewport subscription.

## Verification

Static TypeScript validation covers integration. Runtime graph editing, viewport rendering,
history behavior, and autosave behavior remain manual checks for the project owner.
