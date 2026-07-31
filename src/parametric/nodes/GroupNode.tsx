import { Position, type NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import { TransformSection } from '@/parametric/components/TransformSection'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGroupNode } from '@/parametric/hooks/useGraphNode'

export function GroupNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useGroupNode(id)
	if (!binding) return null

	return (
		<div
			data-id={`group-node-${id}`}
			className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<div className="mb-2 flex items-center justify-between gap-2">
				<div className="text-sm font-semibold text-foreground">Group</div>
				<GeometryNodeActions nodeId={id} nodeLabel="Group" />
			</div>
			<div className="relative h-6 rounded border border-border bg-input">
				<TypedHandle
					id="geometry"
					type="target"
					position={Position.Left}
					valueType="geometry"
					style={{ top: '50%' }}
				/>
				<span className="sr-only">{binding.connected ? 'Connected' : 'Not connected'}</span>
			</div>
			<TransformSection nodeId={id} />
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
