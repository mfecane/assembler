import { Position, type NodeProps } from '@xyflow/react'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

export function OutputNode({ id }: NodeProps<ParametricFlowNode>) {
	const { document, activeGraphId } = useGraphSnapshot()
	const output = document.requireGraph(activeGraphId).output
	return (
		<div
			data-id={`output-node-${id}`}
			className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<TypedHandle
				id={output.id}
				type="target"
				position={Position.Left}
				valueType={output.valueType}
			/>
			<NodeHeader nodeId={id} />
			<div className="h-6 rounded border border-border bg-input" />
		</div>
	)
}
