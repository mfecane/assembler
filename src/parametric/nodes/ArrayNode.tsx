import { Position, type NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
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

export function ArrayNode({ id }: NodeProps<ParametricFlowNode>) {
	const axis = useField<Axis>(id, 'axis', 'x')
	const count = useNumericField(id, 'count', 'Count')
	const offset = useNumericField(id, 'offset', 'Duplication distance')

	return (
		<div
			data-id={`array-node-${id}`}
			className={cn(
				'min-w-48 rounded-md border border-border bg-surface',
				'px-3 py-2 shadow-md'
			)}
		>
			<TypedHandle id="geometry" type="target" position={Position.Left} valueType="geometry" />
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<div className="flex flex-col gap-2 text-xs">
				<div className="nodrag relative flex items-center justify-between gap-2 text-muted-foreground">
					<TypedHandle id="count" type="target" position={Position.Left} valueType="number" style={{ top: '50%' }} />
					<span>Count</span>
					<NumericInput field={count} min={1} step={1} />
				</div>
				<div className="nodrag flex items-center justify-between gap-2 text-muted-foreground">
					<Label htmlFor={`${id}-axis`} className="text-xs text-muted-foreground">Axis</Label>
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
					<Label htmlFor={`${id}-duplication-distance`} className="text-xs text-muted-foreground">
						Distance
					</Label>
					<NumericInput id={`${id}-duplication-distance`} field={offset} />
				</div>
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
