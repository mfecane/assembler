# Shelf array configuration

## Value and configuration flow

`numberArray` is a public graph-input value containing ordered non-negative numbers. It can cross
Graph Instance boundaries like the existing scalar input types. Root configuration can expose it
through a `numberArray` control containing:

- one display label per value;
- a positive numeric step;
- one non-negative maximum total shared by all values.

The runtime editor clamps the changed item to the remaining total. Changing the authored label
count resizes the saved root value in the same command, preserving matching positions and reducing
later values first when the total is lowered.

The former standalone configuration-constraint entity and its persisted `constraints` collection
were removed. This document shape is intentionally not backward compatible.

## Shelf nodes

Mesh Array accepts any number of geometry connections and emits an ordered `meshArray`. Every
connection remains one geometry bundle, so a shelf, its near bracket, and its far bracket can be
grouped before entering the node without losing that grouping.

Multi Array accepts `meshArray` plus `numberArray`. It requires equal lengths, pairs items by index,
floors each count, and repeats the matching bundle. Copy indices continue across bundle boundaries,
so all shelf sizes share one axis and step distance.

## MaxShelf fixture

Root, Wing, and Wing Section forward one `shelf-counts` value. Root exposes it as **Shelves by size**,
with **Big shelves** and **Small shelves** entries, whole-number steps, and a combined maximum of six.

The reusable `Shelf` subgraph owns the complete big and small shelf branches. Its `shelf-size` enum
input accepts **Big** or **Small** and drives one Geometry Switch whose two inputs receive the
complete shelf bundles. The selected branch retains its original shelf, near bracket, far bracket,
and placement transforms. Wing Section contains one Big and one Small Shelf instance, collects
their outputs through Mesh Array, and places them through one y-axis Multi Array with a 0.2-unit
step.

`projects/maxshelf/maxshelf.json` and `src/data/defaultGraph.json` are kept byte-identical. The local
Supabase seed script validates the number-array shape and requires Mesh Array, Multi Array,
Geometry Switch, and Geometry Toggle. Wing Section uses the Toggle directly for its optional
mirrored shelves and bases instead of mapping the boolean through a Sum and zero-offset Array.

## Verification

Static TypeScript, JSON, retained-graph identity, graph-reference, and shelf-wiring checks cover the
implementation. Runtime graph editing and rendering remain for the project owner to verify under
the repository execution policy.
