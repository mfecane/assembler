# 3D node preview and transform movement

## Implemented

- Transform movement snaps to `0.01` scene units.
- Transform rotation snaps to `15` degrees.
- Transform scale snaps to `0.01`.
- Selecting a React Flow node does not open or close anything in the 3D editor.
- **Open node output in 3D editor** is the only node action that opens a node result.
- An opened node result is rendered opaque.
- The current graph output is rendered as a transparent ghost behind the opened node result.
- Preview evaluation is scoped to the graph currently open in React Flow. Parent graph output is
  ignored.
- When exactly one connection is selected, adding a compatible node inserts it between the
  connection's source and target ports. An incompatible node is added normally.

## Verification

Static TypeScript validation is required. Runtime interaction verification remains manual because
the workspace workflow does not permit agents to launch the application.
