# Scene metadata intermediate representation

## Purpose

Graph evaluation produces a plain-data `SceneMetadata` object. The Three.js viewport builds and
synchronizes render objects from that metadata; evaluated graph values do not contain Three.js
matrices, geometries, materials, or scene objects.

This runtime intermediate representation is not part of the persisted graph document.

## Shape

`SceneMetadata.assetInstances` contains the final asset instances needed to build a scene. Each
instance records:

- a deterministic `instanceId` used to synchronize the corresponding rendered mesh;
- the catalog or primitive asset ID and asset kind;
- the requested asset size;
- a plain 16-number transformation matrix;
- the final optional standard material description;
- the graph ID, node ID, and scoped node-instance ID of the node that introduced the asset.

The scoped origin ID distinguishes occurrences of the same asset node reached through different
nested Graph Instance nodes. The graph and node IDs remain available for navigating back to the
node definition.

## Evaluation

Geometry ports carry `SceneMetadata`. Asset and Primitive nodes create instances, while Material,
Transform, Array, Group, and Graph Instance nodes return new metadata with the relevant fields or
identities updated. Nested graph evaluation scopes scene-instance IDs and origin-node instance IDs
without losing the defining graph and node references.

The public graph-output and geometry-preview evaluator methods always return `SceneMetadata`,
using an empty instance list when no valid geometry output exists. Scalar node-output evaluation
continues to return number, enum, and color graph values.

## Scene construction

The scene synchronizer resolves each metadata asset through `MeshRepository`, scales its cloned
geometry, creates its material, applies its matrix, and stores the source metadata on the rendered
mesh for viewport interaction. Primitive metadata is rendered but remains excluded from catalog
asset selection.

Scene-construction failures identify the rendered instance, asset, defining graph and node, and
scoped origin-node instance. The viewport also reports the active graph and preview/transform
context.
