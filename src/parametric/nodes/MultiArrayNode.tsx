import { Position, type NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { AXIS_TEXT_CLASSES, AxisLabel } from '@/parametric/components/AxisLabel'
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
						<SelectTrigger
							id={`${id}-axis`}
							className={cn('h-7 w-16 px-2 text-xs', AXIS_TEXT_CLASSES[axis.value])}
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="x"><AxisLabel axis="x" /></SelectItem>
							<SelectItem value="y"><AxisLabel axis="y" /></SelectItem>
							<SelectItem value="z"><AxisLabel axis="z" /></SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="nodrag flex items-center justify-between gap-2 text-muted-foreground">
					<Label htmlFor={`${id}-step-distance`} className="text-xs">Step</Label>
					<NumericInput
						id={`${id}-step-distance`}
						value={offset.value}
						onValueChange={offset.setValue}
						step={0.01}
					/>
				</div>
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
