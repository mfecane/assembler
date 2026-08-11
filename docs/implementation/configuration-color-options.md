# Configuration color options

## Ownership

Graph color inputs are scalar RGB values, not enumerations. They persist an arbitrary `#RRGGBB`
default and graph-input, graph-instance, Color, and Material nodes edit values with the shared RGB
picker.

The customer-facing palette belongs to a root input's `color` configuration control. Its
`options` array is the single source of truth for the choices rendered by the runtime configurator.
This avoids copying the same palette through every graph interface that forwards a color.

## Editing and reconciliation

The Configuration Panel dialog lets authors add, remove, and edit RGB choices directly on a color
UI item. A palette is non-empty and unique. Removing or changing the currently selected customer
color reconciles that root's value to the first remaining choice, while graph defaults and child
instance overrides remain independent arbitrary RGB values.

## Persistence

Color graph inputs no longer accept `options`. Color configuration controls require a non-empty,
unique RGB `options` list. The checked-in MaxShelf project, default graph copy, JSON Schema, seed
validation, serializer, and model validation all use this shape. The change intentionally has no
backward-compatibility migration.

## Verification

Static TypeScript and JSON checks cover integration. The project owner must verify RGB picker
interaction, palette add/edit/remove behavior, selection reconciliation, undo/redo, import/export,
project reset, and seeded-project creation in the running application.
