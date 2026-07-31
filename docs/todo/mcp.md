# LLM graph editing

## Goal

Let an LLM inspect and edit project graph documents through a small, reliable tool interface.

## Open questions

- Which operations need dedicated tools beyond reading, validating, importing, and exporting the
  existing graph JSON?
- Which catalog metadata must accompany a graph, including asset dimensions, origins, and allowed
  identifiers?
- How should validation failures identify the graph, node, edge, port, and invalid value with
  enough context for a model to repair them?
- Is MCP needed for the MVP, or is a documented JSON-plus-metadata exchange sufficient?

Do not design a production-grade protocol until a concrete editing workflow requires it.
