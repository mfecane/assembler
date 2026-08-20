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
- [Database schema](./reference/database-schema.md) — runtime model registrar, per-model metadata,
  project storage, and access rules.
- [Node reference](./reference/nodes.md) — ports, persisted data, defaults, and evaluation behavior.
- [MaxShelf configurator logic](./reference/maxshelf-configurator.md) — reverse-engineered product
  rules from the retained HTML prototype.

## Implemented features

- [Nested graphs](./implementation/nested-graphs.md) — graph definitions, instances, boundaries,
  navigation, and public inputs.
- [Root graphs](./implementation/root-graphs.md) — multiple top-level assemblies, active-root
  navigation, independent values, and per-root configuration panels.
- [Shared document enums](./implementation/shared-enums.md) — reusable enum definitions, graph-input
  references, dialog editing, and dependent-value reconciliation.
- [Material system](./implementation/material-system.md) — registered textured PBR materials,
  material-instance graph values, and scene application.
- [Viewport editor](./implementation/viewport-editor.md) — viewport ownership, node previews,
  transform tools, and asset selection.
- [Mesh mapping and viewport alignment](./implementation/mesh-mapping-and-alignment.md) — separate
  mesh inputs for indexed choices and bounding-box alignment into stored translations.
- [Graph editor architecture](./implementation/graph-editor-architecture.md) — root ownership,
  graph state, commands, shared history, React bridge, and Three.js coordination.
- [Scene metadata](./implementation/scene-metadata.md) — graph evaluation IR, asset instances,
  transforms, materials, provenance, and scene construction.
- [Editor UI](./implementation/editor-ui.md) — graph toolbar and configuration-panel behavior.
- [Project saving](./implementation/project-saving.md) — autosave, Save as, rename, and dirty state.
- [Product layouts](./implementation/product-layouts.md) — row/single product composition, reusable
  slot rules, graph instances, per-instance controls, and 3D slot actions.
- [Model editor](./implementation/model-editor.md) — client-scoped model navigation, standalone 3D
  preview, editable stretch regions and gizmos, temporary deformation tests, and metadata saving.
- [Mesh asset helper](./implementation/asset-helper.md) — asset browsing, previews, and insertion.
- [Application shell](./implementation/application-shell.md) — routing, authenticated user menu,
  and shared component conventions.
- [Node fields and capabilities](./implementation/node-field-capabilities.md) — generic scalar
  fields, embedded transforms, multi-connect inputs, and node bypass behavior.
- [Shelf array configuration](./implementation/shelf-arrays.md) — number-array inputs and widgets,
  ordered mesh bundles, Multi Array placement, and the MaxShelf wiring.
- [Kitchen cabinet assembly](./implementation/kitchen-cabinet.md) — reusable frame, facade, and
  tabletop graphs with explicit visibility mappings and root assembly wiring.

## Reviews

- [Node graph model review](./reviews/node-graph-model-review.md) — architecture review of the
  node/registry/controller/hook layers against the goal of adding hundreds of node types cheaply.

## Operations

- [Local development](./guides/local-development.md) — startup, local login, reset, and diagnostics.
- [Hosted Supabase setup](./guides/supabase-setup.md) — schema, OAuth, deployment, rebuild, and
  verification steps.

## Planned work

- [Implementation queue](./todo/index.md) — active proposals only.
