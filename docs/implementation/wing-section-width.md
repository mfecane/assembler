# Wing Section Width Graph Input

MaxShelf now uses one canonical graph for both supported wing-section widths. The shared
`wing-section-width` enum has `1000 mm` and `660 mm` options and is exposed by both root assemblies.
The 660 mm option intentionally selects the available 665 mm catalog assets.

The indexed choice is forwarded through Wing, Wing Section, and Shelf graph instances. Reusable
Choice-to-Scalar nodes drive Array offsets (`-1.26` or `-0.87` scene units). Choice-to-Vector-3 nodes
drive terminal post, base, and shelf-bracket translations through the Transform node's vector3
translation input. Mesh Asset nodes feeding Choice-to-Mesh maps choose width-specific backplates,
shelves, post alignment, and base alignment.

`projects/maxshelf/maxshelf.json` remains the detailed MaxShelf fixture and is copied to
`scripts/data/maxshelf/defaultGraph.json` for local seeding. The New Project action instead uses the
shared one-primitive `scripts/data/defaultGraph.json` template.

This is an intentionally non-backwards-compatible node-schema change: `enumNumberMap` was replaced
by `choiceToScalarMap`, and `choiceToVector3Map` plus the internal `vector3` connection value were
added. No migration or legacy deserialization path is provided.
