# Project save UX

Project documents autosave 800 milliseconds after the latest persisted document change. The
toolbar also provides a manual save action and supports `Ctrl+S` and `Command+S`. Manual saving
remains available when the document has no detected changes, allowing users to explicitly
persist the current document at any time.

## States

- **Clean**: **Save** remains enabled; no redundant status line is shown.
- **Unsaved changes**: autosave is queued and **Save now** is enabled.
- **Saving…**: the save button, project Back button, and user menu are disabled so an active
  write cannot outlive an in-app discard action.
- **Saved**: a confirmation check is shown for two seconds before returning to the clean state;
  the button remains available for another manual save.
- **Could not save**: changes remain dirty, **Retry** is enabled, and complete technical details
  are available from the adjacent disclosure.

The save split button communicates the transient save state. Its arrow menu provides **Save as…**,
which opens a name dialog and creates a new project from the editor's current document before
opening the copy. The source project is not renamed or overwritten. Save and Save as failures
preserve the relevant project ID, requested name, document revision, underlying error, and stack
in the details disclosure and console.

## Project rename

The pencil beside the project name enables an inline editor. Enter or blur persists a non-empty
name; Escape cancels. Project rename and document save writes do not run concurrently. Rename
failures preserve and expose the project ID, user ID, previous name, requested name, underlying
error, and stack in the toolbar and console.

## Dirty tracking

The graph controller publishes two revisions:

- `revision` changes for every controller update and drives view subscriptions.
- `documentRevision` changes only when serialized project content changes.

Opening another graph changes the active editor view but not `documentRevision`, so navigation
does not produce a false unsaved state or an unnecessary autosave.
