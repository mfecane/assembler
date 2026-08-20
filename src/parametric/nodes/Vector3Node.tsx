import { Position, type NodeProps } from '@xyflow/react'
import { AxisLabel } from '@/parametric/components/AxisLabel'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

const axes = ['x', 'y', 'z'] as const

export function Vector3Node({ id }: NodeProps<ParametricFlowNode>) {
	return (
		<div
			data-id={`vector3-node-${id}`}
			className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} />
			<div data-id={`vector3-inputs-${id}`} className="flex flex-col gap-1.5 text-xs">
				{axes.map((axis) => (
					<div
						key={axis}
						data-id={`vector3-input-${id}-${axis}`}
						className="relative flex h-7 items-center rounded border border-border bg-input px-2"
					>
						<TypedHandle id={axis} type="target" position={Position.Left} valueType="number" />
						<AxisLabel axis={axis} />
					</div>
				))}
			</div>
			<TypedHandle id="vector3" type="source" position={Position.Right} valueType="vector3" />
		</div>
	)
}
