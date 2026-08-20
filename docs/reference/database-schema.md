# Database schema

[`supabase/schema.sql`](../../supabase/schema.sql) is the sole source of truth for the current
application database. The MVP rebuilds this schema from scratch and does not keep migrations.

## Runtime model registrar and metadata

Clients and models are runtime concepts, not database records. The client identifier stored in graph
documents is currently `maxshelf` or `kitchen`. The runtime mesh registrar is the sole source of
truth for which selectable models belong to each client, including their stable IDs and labels.

`model_metadata` optionally stores one metadata record keyed by a registered model ID:

- `model_id` is the primary key. It deliberately has no foreign key: model registration is runtime-only.
- `metadata` is a required JSON object when the record exists. An empty object is valid.
- Every supported metadata field is optional. Missing bounding-box coordinates fall back to the
  loaded geometry, missing pivot coordinates fall back to zero, missing `stretchEnabled` falls back
  to `false`, and missing `stretchAxes` falls back to an empty list.
- `metadata.pivot`, when present, stores finite local-space X/Y/Z coordinates used as the model's
  scaling pivot.
- `metadata.stretchEnabled`, when present, is the persisted master switch for stretch behavior;
  disabling it preserves configured axes.
- `metadata.texelSizeRatio`, when present, is a finite number from `0.01` to `10` describing the
  magnitude of UV compensation per model-space unit introduced by stretch deformation. Missing
  values default to `1`; Y-to-V compensation applies this magnitude in the inverse direction.
- `metadata.stretchAxes`, when present, contains up to three distinct X/Y/Z stretch axes. Each axis
  stores a non-empty `boxes` list and an optional nullable `textureAxis`. Every box contains finite
  source-space `min`/`max` coordinates; values are rounded to three decimal places when loaded.
  Boxes on the same axis are ordered and cannot intersect.
  Missing `textureAxis` behaves as `null`. `u` or `v`
  scales that UV coordinate during a stretch test; `null` leaves UVs unchanged. U and V may each be
  assigned to only one geometry axis.
- `updated_at` records the latest successful metadata save.

The local seed validates the current multi-box stretch shape, including box bounds and intersection
rules, then upserts the checked-in optional per-model metadata.
Authenticated users may read and upsert model metadata; saving an empty model creates an empty metadata
object. The model editor exports saved metadata only for models currently registered for the selected
client, in the `scripts/data/<client>/metadata.json` seed format. This seed format intentionally contains
no coordinate-system prose or scaling-status flags.

## Projects

`projects` stores user-owned editable graph documents and their author identity. Projects remain
independent of database metadata: their current client is declared by `graph_document.client`, while
mesh nodes reference runtime-registered models by their stable IDs.

Authenticated users can read and collaborate on all projects. Creation records the authenticated
user, while updates are limited to the project name and graph document.
