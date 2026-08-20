# Material system

`MaterialRepository` is the source of truth for reusable PBR material definitions. Each definition
contains a stable ID, display label, optional texture URL, roughness, and metalness.
`MaterialRegistrar` collects registrations at the composition boundary; the current catalog registers
Wood, Marble, and Plastic from `assets/textures`, plus textureless Metallic Metal.

Graph values use the `materialInstance` connection type. A material-typed Input node emits a
`MaterialInstance` for its selected catalog ID and accepts a `color` input from the predefined hex
palette. Exported Input and Graph Instance nodes can forward the same value through graph boundaries.
Apply Material consumes a geometry input and material instance,
then records the material ID on every output scene instance. Primitive, Mesh Asset, and Stretchable
Asset nodes also accept a material-instance input directly; an unconnected input resolves to Plastic.

The Three.js scene synchronizer resolves that ID through `MaterialRepository`, loads the registered
texture when one is provided, and creates a `MeshStandardMaterial` using the definition's PBR
roughness and metalness.
The selected color is preserved on scene material metadata and applied as the Three.js material tint.
