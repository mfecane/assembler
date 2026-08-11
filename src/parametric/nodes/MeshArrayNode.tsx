import { Position, type NodeProps } from '@xyflow/react'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

export function MeshArrayNode({ id }: NodeProps<ParametricFlowNode>) {
	return (
		<div
			data-id={`mesh-array-node-${id}`}
			className="min-w-48 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<TypedHandle id="geometry" type="target" position={Position.Left} valueType="geometry" />
			<NodeHeader nodeId={id} />
			<p className="text-[11px] text-muted-foreground">
				Connect any number of mesh or geometry bundles in the required order.
			</p>
			<TypedHandle id="meshes" type="source" position={Position.Right} valueType="meshArray" />
		</div>
	)
}
