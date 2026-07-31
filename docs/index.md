# Documentation

This index is the entry point for the current application. Implementation notes describe shipped
behavior; only files under **Planned work** are pending.

## Overview

- [Project description](./project-description.md) — purpose, concepts, architecture, and current
  boundaries.

## Technical reference

- [Graph document specification](./reference/graph-persistence.md) — persisted shape, invariants,
  validation, and import/export behavior.
- [Graph JSON Schema](./reference/graph.schema.json) — machine-readable document schema.
- [Node reference](./reference/nodes.md) — ports, persisted data, defaults, and evaluation behavior.
- [MaxShelf configurator logic](./reference/maxshelf-configurator.md) — reverse-engineered product
  rules from the retained HTML prototype.

## Implemented features

- [Nested graphs](./implementation/nested-graphs.md) — graph definitions, instances, boundaries,
  navigation, and entry inputs.
- [Viewport editor](./implementation/viewport-editor.md) — viewport ownership, node previews,
  transform tools, and asset selection.
- [Graph editor architecture](./implementation/graph-editor-architecture.md) — root ownership,
  graph state, commands, shared history, React bridge, and Three.js coordination.
- [Scene metadata](./implementation/scene-metadata.md) — graph evaluation IR, asset instances,
  transforms, materials, provenance, and scene construction.
- [Editor UI](./implementation/editor-ui.md) — graph toolbar and configuration-panel behavior.
- [Project saving](./implementation/project-saving.md) — autosave, Save as, rename, and dirty state.
- [Mesh asset helper](./implementation/asset-helper.md) — asset browsing, previews, and insertion.
- [Application shell](./implementation/application-shell.md) — routing, authenticated user menu,
  and shared component conventions.

## Operations

- [Local development](./guides/local-development.md) — startup, local login, reset, and diagnostics.
- [Hosted Supabase setup](./guides/supabase-setup.md) — schema, OAuth, deployment, rebuild, and
  verification steps.

## Planned work

- [Implementation queue](./todo/index.md) — active proposals only.
