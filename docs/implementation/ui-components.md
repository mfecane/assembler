# UI components

The shadcn CLI is configured by the root `components.json` for the local TypeScript/Vite setup:
New York style, Radix primitives, Tailwind CSS v4 with CSS variables, Lucide icons, and the existing
`@/*` source alias. New components should be installed through the CLI so dependencies and local
component files stay synchronized.

The local shadcn component set includes `ButtonGroup`, `ButtonGroupText`, and
`ButtonGroupSeparator` for grouping related actions with horizontal or vertical orientation.
Button groups compose with the existing `Button` component and use the local `Separator`
primitive when a visual divider is needed.
