import { Position, type NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useField, useNumericField } from '@/parametric/hooks/useGraphNode'
import type { Axis } from '@/parametric/model/GraphNode'

export function MultiArrayNode({ id }: NodeProps<ParametricFlowNode>) {
	const axis = useField<Axis>(id, 'axis', 'x')
	const offset = useNumericField(id, 'offset', 'Step distance')

	return (
		<div
			data-id={`multi-array-node-${id}`}
			className="min-w-52 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<div className="flex flex-col gap-2 text-xs">
				<div className="relative flex min-h-7 items-center text-muted-foreground">
					<TypedHandle id="meshes" type="target" position={Position.Left} valueType="meshArray" />
					<span>Mesh array</span>
				</div>
				<div className="relative flex min-h-7 items-center text-muted-foreground">
					<TypedHandle id="counts" type="target" position={Position.Left} valueType="numberArray" />
					<span>Counts</span>
				</div>
				<div className="nodrag flex items-center justify-between gap-2 text-muted-foreground">
					<Label htmlFor={`${id}-axis`} className="text-xs">Axis</Label>
					<Select value={axis.value} onValueChange={(next) => axis.setValue(next as Axis)}>
						<SelectTrigger id={`${id}-axis`} className="h-7 w-16 px-2 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="x">X</SelectItem>
							<SelectItem value="y">Y</SelectItem>
							<SelectItem value="z">Z</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="nodrag flex items-center justify-between gap-2 text-muted-foreground">
					<Label htmlFor={`${id}-step-distance`} className="text-xs">Step</Label>
					<NumericInput id={`${id}-step-distance`} field={offset} />
				</div>
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
