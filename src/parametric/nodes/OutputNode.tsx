import { Position, type NodeProps } from '@xyflow/react'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

export function OutputNode({}: NodeProps<ParametricFlowNode>) {
	const { document, activeGraphId } = useGraphSnapshot()
	const output = document.requireGraph(activeGraphId).output
	return (
		<div className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md">
			<TypedHandle
				id={output.id}
				type="target"
				position={Position.Left}
				valueType={output.valueType}
			/>
			<div className="mb-2 flex items-center justify-between gap-2">
				<div className="text-sm font-semibold text-foreground">{output.label}</div>
				<span className="w-6" aria-hidden="true" />
			</div>
			<div className="h-6 rounded border border-border bg-input" />
		</div>
	)
}
