import { Position, type NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGroupNode } from '@/parametric/hooks/useGraphNode'

export function GroupNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useGroupNode(id)
	if (!binding) return null

	return (
		<div className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md">
			<div className="mb-2 flex items-center justify-between gap-2">
				<div className="text-sm font-semibold text-foreground">Group</div>
				<GeometryNodeActions nodeId={id} nodeLabel="Group" />
			</div>
			<div className="flex flex-col gap-2">
				{binding.inputPorts.map((port) => (
					<div key={port.id} className="relative h-6 rounded border border-border bg-input">
						<TypedHandle
							id={port.id}
							type="target"
							position={Position.Left}
							valueType="geometry"
							style={{ top: '50%' }}
						/>
					</div>
				))}
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
