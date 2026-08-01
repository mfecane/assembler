Experimental architecture change to reduce number of nodes in graph.

Issue: any grph node output has group node before it

Issue: any mesh asset node has transform node after it

Make nodes be composed of several Capability objects (common interface)

Transform capability

reused for asset placement, asset select, and assembly instance nodes - adds collapsible transform section to node.

Array nodes deliberately expose duplication distance instead of transform capability. Their 3D
editor affordance is a dedicated single-axis distance gizmo, not the shared transform widget.

only standalone transform node does produce connectable inputs.

when used as capability in other nodes does not produce connectable inputs.

Group capability

any node accepting 3d object input automatically groups it's inputs, 3d input can have several input connections

describe it in the input type as property of this particular kind of input

Toggle capability

swith current node on/off, making it noop

there will be possibly more capabilities

keep in mind separation of concerns, interface segregation, composition over inheritance

analyze and prepare plan for implemntation such composability

describe capability interface and how nodes use it

if complexity will be too high or code reusability and composability too low, creating too much maintenace complication this apprach will be discarded

since this is an experiment, any feedback, input, analysis and better solutions are welcome
