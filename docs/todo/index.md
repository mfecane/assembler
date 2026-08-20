# Implementation queue

Only unimplemented proposals belong in this folder. Move completed work into `docs/implementation/`
or the appropriate reference and remove abandoned proposals.

- [LLM graph editing](./mcp.md) — define the minimum context and tool surface needed to edit graph
  documents reliably.
- [Configurable assembly lists](./configurable-assembly-lists.md) — configure an ordered row of
  independently editable child assemblies without mutating React Flow topology.
- **Investigate sluggish numeric editing** — profile the keystroke-to-command path, especially full-document
  history serialization and synchronous graph publication. Keep draft text immediate, then debounce or
  coalesce model commits into one undo command; use a worker only if profiling finds heavy CPU evaluation.
