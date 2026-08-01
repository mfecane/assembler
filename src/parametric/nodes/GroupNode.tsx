import { Position, type NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGroupNode } from '@/parametric/hooks/useGraphNode'

export function GroupNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useGroupNode(id)
	return (
		<div data-id={`group-node-${id}`} className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md">
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<div className="relative h-7 rounded border border-border bg-input px-2 text-xs text-muted-foreground">
				<TypedHandle id="geometry" type="target" position={Position.Left} valueType="geometry" />
				<span className="flex h-full items-center">{binding.connectedInputCount} connected</span>
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
