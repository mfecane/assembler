# Composable node capabilities

## Status

Experimental proposal. Analyze before implementation and discard it if the resulting abstraction
cost exceeds the reuse it provides.

## Problem

Geometry-producing nodes may need repeated behaviors without requiring users to create additional
standalone nodes. Two candidate capabilities are:

- **Transform** — add a collapsible transform section to Mesh Asset, Mesh Selector, and Array.
  Embedded transforms would not expose connectable ports; the standalone Transform node would.
- **Multiple geometry inputs** — let selected geometry inputs accept and group several incoming
  connections instead of requiring a separate Group node.

## Analysis required

- Define a small capability interface and show how node definitions, serialization, evaluation,
  and React views would consume it.
- Keep capabilities independent and composed rather than inherited.
- Determine whether multi-connection behavior belongs to a reusable capability or to input-port
  metadata.
- Compare the reduction in graph nodes with the added persistence and UI complexity.
- Describe how existing MaxShelf graph structure would be preserved when the schema changes.

Do not implement until the proposal demonstrates meaningful reuse without creating a parallel
node abstraction.
