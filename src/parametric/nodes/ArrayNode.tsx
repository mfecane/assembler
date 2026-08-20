import { Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useNumericField } from '@/parametric/hooks/useGraphNode'

export function ArrayNode({ id }: NodeProps<ParametricFlowNode>) {
	const countX = useNumericField(id, 'countX', 'X count')
	const countY = useNumericField(id, 'countY', 'Y count')
	const countZ = useNumericField(id, 'countZ', 'Z count')
	const offsetX = useNumericField(id, 'offsetX', 'X offset')
	const offsetY = useNumericField(id, 'offsetY', 'Y offset')
	const offsetZ = useNumericField(id, 'offsetZ', 'Z offset')

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
				<ArrayAxisInputs axis="X" count={countX} offset={offsetX} />
				<ArrayAxisInputs axis="Y" count={countY} offset={offsetY} />
				<ArrayAxisInputs axis="Z" count={countZ} offset={offsetZ} />
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}

interface ArrayAxisInputsProps {
	axis: 'X' | 'Y' | 'Z'
	count: ReturnType<typeof useNumericField>
	offset: ReturnType<typeof useNumericField>
}

function ArrayAxisInputs({ axis, count, offset }: ArrayAxisInputsProps) {
	return (
		<div className="flex flex-col gap-2 text-muted-foreground">
			<div className="nodrag relative flex items-center justify-between gap-2">
				<TypedHandle
					id={`count${axis}`}
					type="target"
					position={Position.Left}
					valueType="number"
				/>
				<span>{axis} count</span>
				<NumericInput
					value={count.value}
					onValueChange={count.setValue}
					min={1}
					step={1}
					roundStep={1}
				/>
			</div>
			{count.value > 1 && (
				<div className="nodrag relative flex items-center justify-between gap-2">
					<TypedHandle
						id={`offset${axis}`}
						type="target"
						position={Position.Left}
						valueType="number"
					/>
					<span>{axis} offset</span>
					<NumericInput value={offset.value} onValueChange={offset.setValue} step={0.01} />
				</div>
			)}
		</div>
	)
}
