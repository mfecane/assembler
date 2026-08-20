import { Position, type NodeProps } from '@xyflow/react'
import { AxisLabel } from '@/parametric/components/AxisLabel'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

const axes = ['x', 'y', 'z'] as const

export function Vector3ComponentsNode({ id }: NodeProps<ParametricFlowNode>) {
	return (
		<div
			data-id={`vector3-components-node-${id}`}
			className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} />
			<div data-id={`vector3-components-outputs-${id}`} className="flex flex-col gap-1.5 text-xs">
				<div className="relative flex h-7 items-center rounded border border-border bg-input px-2">
					<TypedHandle id="vector3" type="target" position={Position.Left} valueType="vector3" />
					<span>Vector 3</span>
				</div>
				{axes.map((axis) => (
					<div
						key={axis}
						data-id={`vector3-components-output-${id}-${axis}`}
						className="relative flex h-7 items-center rounded border border-border bg-input px-2"
					>
						<AxisLabel axis={axis} />
						<TypedHandle id={axis} type="source" position={Position.Right} valueType="number" />
					</div>
				))}
			</div>
		</div>
	)
}
