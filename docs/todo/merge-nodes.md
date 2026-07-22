experimental architecture change to reduce inber of created nodes

refactor node system

node is composable from reusable parts or interfaces (choose name and best fir implementation for this abstraction)

transform part should be reused, group part should be reused

any node producing 3d object output should have transform values available to edit right away in the node view

group transform ui as section and make collapsible

any node accepting 3d object input automatically groups it's inputs, 3d input can have several input connections

describe it in the input type as property of this particular kind of input

there will be possibly more input types behaving like that

analyze and prepare plan for implemntation such composability

need to keep in mind provision to add more of such composables

if complexity will be too high or code reusability and composability too low, creating too much maintenace complication this apprach will be discarded

since this is an experiment, any feedback, input, analysis and better solutions are welcome
