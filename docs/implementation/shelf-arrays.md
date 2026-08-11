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

Root, Wing, and Wing Section now forward one `shelf-counts` value. Root exposes it as **Shelves by
size**, with **Big shelves** and **Small shelves** entries, whole-number steps, and a combined maximum
of six. Wing Section builds the two complete shelf bundles, collects them through Mesh Array, and
places them through one y-axis Multi Array with a 0.2-unit step.

`projects/maxshelf/maxshelf.json` and `src/data/defaultGraph.json` are kept byte-identical. The local
Supabase seed script validates the new number-array shape and requires both shelf node types.

## Verification

Static TypeScript, JSON, seed-script syntax, retained-graph identity, endpoint, and shelf-wiring
checks cover the implementation. Runtime graph editing and rendering remain for the project owner
to verify under the repository execution policy.
