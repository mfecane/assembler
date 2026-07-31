# 3D Node-Based Product Editor

A one-shot MVP for experimenting with configurable products assembled from reusable 3D mesh
parts. Authors build document-local node graphs; the application evaluates the active graph into
a Three.js scene and exposes selected entry inputs in a customer-facing configuration panel.

## Local development

Start the application and local Supabase services:

```sh
docker compose up --build
```

Open <http://localhost:5175/assembler/> and choose **Continue as local developer**.
Credentials, reset behavior, and troubleshooting are in the
[local development guide](./docs/guides/local-development.md).

## Architecture

```text
Persisted graph document
        ↓
Graph model ← commands → graph controller
        ├─ React hooks → React Flow editor and configuration panel
        └─ evaluator → Three.js viewport editor
```

- `src/parametric/model/` owns framework-independent graph state and serialization.
- `src/parametric/nodes/defaultNodeRegistry.ts` defines built-in node behavior.
- `src/parametric/controller/` is the graph mutation boundary.
- `src/parametric/hooks/` adapts graph state and commands for React.
- `src/parametric/evaluation/` evaluates graph outputs into mesh instances.
- `src/parametric/three/` synchronizes evaluated geometry with the viewport.

UI code sends commands through the controller instead of mutating graph models directly. Every
graph definition has one immutable Graph Output node. The entry graph output is rendered in the
viewport; graph instances evaluate child definitions from the same document.

## Documentation

See the [documentation index](./docs/index.md) for current product behavior, graph and node
references, implementation notes, setup guides, and the active implementation queue.

## Scope

This repository intentionally favors quick iteration and simple current-state schemas. It does
not target production asset management, collaboration, manufacturing, pricing, ordering,
advanced geometry operations, or legacy document compatibility.
