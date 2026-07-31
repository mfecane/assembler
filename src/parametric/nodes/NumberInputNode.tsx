import { Position, type NodeProps } from '@xyflow/react'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { NodeDeleteButton } from '@/parametric/components/NodeDeleteButton'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useNumberInputNode } from '@/parametric/hooks/useGraphNode'

export function NumberInputNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useNumberInputNode(id)
	if (!binding) return null

	return (
		<div
			data-id={`number-node-${id}`}
			className="min-w-44 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} actions={<NodeDeleteButton nodeId={id} nodeLabel="Number" />} />
			<div className="flex flex-col gap-2 text-xs">
				<DraftNumberInput
					value={binding.value}
					onValueChange={binding.setValue}
					step={0.1}
					className="nodrag h-8 px-2 text-xs"
				/>
			</div>
			<TypedHandle id="number" type="source" position={Position.Right} valueType="number" />
		</div>
	)
}
